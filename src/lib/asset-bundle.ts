import type { AifilmMediaItem } from "@/lib/aifilm-media";
import { storageService } from "@/lib/storage/storage-service";
import type { MediaType } from "@/types/media";
import { createZipArchive } from "@/lib/zip-utils";

const LOCAL_STORAGE_UPLOAD_KEY = "designcombo_uploads";
const LOCAL_UPLOADS_PROJECT_ID = "local-uploads";

type BundleSource = "local" | "aifilm";
type BundleAssetType = MediaType | "other";

type BundleAsset = {
  id: string;
  name: string;
  type: BundleAssetType;
  source: BundleSource;
  src?: string;
  file?: File;
};

type BundleManifest = {
  createdAt: string;
  projectId: string | null;
  totalAssets: number;
  successCount: number;
  failedCount: number;
  warnings: string[];
  items: Array<{
    id: string;
    name: string;
    type: BundleAssetType;
    source: BundleSource;
    src?: string;
    status: "ok" | "failed";
    filePath?: string;
    size?: number;
    mimeType?: string;
    error?: string;
  }>;
};

export type ProjectAssetBundleResult = {
  fileName: string;
  successCount: number;
  failedCount: number;
  totalAssets: number;
};

function normalizeAssetType(type: unknown): BundleAssetType {
  if (type === "video" || type === "image" || type === "audio") {
    return type;
  }
  return "other";
}

function sanitizeFileName(fileName: string) {
  const trimmed = fileName.trim() || "asset";
  return trimmed.replace(/[\\/:*?"<>|]+/g, "_");
}

function removeExtension(fileName: string) {
  return fileName.replace(/\.[a-zA-Z0-9]+$/, "");
}

function inferExtensionFromMimeType(mimeType: string) {
  const normalized = mimeType.toLowerCase();
  const mapping: Record<string, string> = {
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/flac": "flac",
    "audio/ogg": "ogg",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg",
  };

  return mapping[normalized] || "";
}

function getAssetFolder(assetType: BundleAssetType) {
  if (assetType === "video") return "video";
  if (assetType === "image") return "image";
  if (assetType === "audio") return "audio";
  return "other";
}

function parseLocalStorageAssets(): BundleAsset[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_UPLOAD_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => item && typeof item === "object")
      .map((item, index) => {
        const record = item as Record<string, unknown>;
        const id =
          typeof record.id === "string" && record.id.trim()
            ? record.id.trim()
            : `local-${index}-${Date.now()}`;

        const name =
          typeof record.name === "string" && record.name.trim()
            ? record.name.trim()
            : `asset-${index}`;

        const src =
          typeof record.src === "string" && record.src.trim() ? record.src.trim() : undefined;

        return {
          id,
          name,
          src,
          type: normalizeAssetType(record.type),
          source: "local" as const,
        };
      })
      .filter((asset) => Boolean(asset.src || asset.id));
  } catch {
    return [];
  }
}

function mapAifilmItemToBundleAsset(item: AifilmMediaItem): BundleAsset | null {
  const src = item.url?.trim();
  if (!src) return null;

  return {
    id: item.id,
    name: item.filename || item.id,
    src,
    type: normalizeAssetType(item.mediaType),
    source: "aifilm",
  };
}

async function loadAifilmAssets(projectId?: string) {
  const warnings: string[] = [];

  try {
    const query = new URLSearchParams();
    if (projectId?.trim()) {
      query.set("projectId", projectId.trim());
    }
    const endpoint = query.size > 0 ? `/api/aifilm/media?${query.toString()}` : "/api/aifilm/media";
    const response = await fetch(endpoint, { cache: "no-store" });
    const payload = (await response.json().catch(() => ({}))) as {
      items?: AifilmMediaItem[];
      error?: string;
    };

    if (!response.ok) {
      warnings.push(payload.error || `AIFilm media request failed with status ${response.status}.`);
      return { assets: [] as BundleAsset[], warnings };
    }

    const assets = (payload.items || [])
      .map(mapAifilmItemToBundleAsset)
      .filter((asset): asset is BundleAsset => Boolean(asset));

    return { assets, warnings };
  } catch (error) {
    warnings.push(error instanceof Error ? error.message : "Failed to load AIFilm assets.");
    return { assets: [] as BundleAsset[], warnings };
  }
}

async function loadLocalOpfsAssets() {
  if (!storageService.isOPFSSupported()) return [] as BundleAsset[];

  const files = await storageService.loadAllMediaFiles({ projectId: LOCAL_UPLOADS_PROJECT_ID });
  return files.map((file, index) => ({
    id: file.id || `opfs-${index}-${Date.now()}`,
    name: file.name || `asset-${index}`,
    type: normalizeAssetType(file.type),
    source: "local" as const,
    src: file.url,
    file: file.file,
  }));
}

function upsertAsset(map: Map<string, BundleAsset>, asset: BundleAsset, fallbackSerial: number) {
  const key =
    asset.source === "local" && asset.id
      ? `local:${asset.id}`
      : `src:${asset.src || fallbackSerial}`;
  const existing = map.get(key);
  if (!existing) {
    map.set(key, asset);
    return;
  }

  map.set(key, {
    ...existing,
    src: existing.src || asset.src,
    file: existing.file || asset.file,
    type: existing.type === "other" ? asset.type : existing.type,
    name: existing.name || asset.name,
  });
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const aEl = document.createElement("a");
  aEl.href = url;
  aEl.download = fileName;
  document.body.appendChild(aEl);
  aEl.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    if (document.body.contains(aEl)) {
      document.body.removeChild(aEl);
    }
  }, 100);
}

export async function createAndDownloadProjectAssetBundle({
  projectId,
  includeAifilm = false,
}: {
  projectId?: string;
  includeAifilm?: boolean;
}): Promise<ProjectAssetBundleResult> {
  if (typeof window === "undefined") {
    throw new Error("Asset bundling is only available in the browser.");
  }

  const warnings: string[] = [];
  const [localStorageAssets, opfsAssets, remote] = await Promise.all([
    Promise.resolve(parseLocalStorageAssets()),
    loadLocalOpfsAssets(),
    includeAifilm
      ? loadAifilmAssets(projectId)
      : Promise.resolve({ assets: [] as BundleAsset[], warnings: [] as string[] }),
  ]);

  warnings.push(...remote.warnings);

  const assetMap = new Map<string, BundleAsset>();
  let serial = 0;
  for (const asset of [...localStorageAssets, ...opfsAssets, ...remote.assets]) {
    serial += 1;
    upsertAsset(assetMap, asset, serial);
  }
  const assets = Array.from(assetMap.values());

  const manifest: BundleManifest = {
    createdAt: new Date().toISOString(),
    projectId: projectId?.trim() || null,
    totalAssets: assets.length,
    successCount: 0,
    failedCount: 0,
    warnings,
    items: [],
  };

  const usedFileNames = new Set<string>();
  const zipEntries: Array<{ name: string; data: Uint8Array }> = [];

  for (const asset of assets) {
    try {
      let blob: Blob;
      if (asset.file) {
        blob = asset.file;
      } else if (asset.src) {
        const response = await fetch(asset.src, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        blob = await response.blob();
      } else {
        throw new Error("Asset source is missing.");
      }

      const mimeType = blob.type || "application/octet-stream";
      const bytes = new Uint8Array(await blob.arrayBuffer());

      const originalName = sanitizeFileName(asset.name);
      const extensionMatch = originalName.match(/\.([a-zA-Z0-9]+)$/);
      const extension =
        extensionMatch?.[1]?.toLowerCase() || inferExtensionFromMimeType(mimeType) || "bin";
      const baseName = sanitizeFileName(removeExtension(originalName)) || "asset";
      const folder = getAssetFolder(asset.type);

      let fileName = `${baseName}.${extension}`;
      let counter = 1;
      while (usedFileNames.has(`${folder}/${fileName}`)) {
        counter += 1;
        fileName = `${baseName}_${counter}.${extension}`;
      }
      usedFileNames.add(`${folder}/${fileName}`);

      const filePath = `assets/${folder}/${fileName}`;
      zipEntries.push({
        name: filePath,
        data: bytes,
      });

      manifest.successCount += 1;
      manifest.items.push({
        id: asset.id,
        name: asset.name,
        type: asset.type,
        source: asset.source,
        src: asset.src,
        status: "ok",
        filePath,
        size: bytes.length,
        mimeType,
      });
    } catch (error) {
      manifest.failedCount += 1;
      manifest.items.push({
        id: asset.id,
        name: asset.name,
        type: asset.type,
        source: asset.source,
        src: asset.src,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown asset read error.",
      });
    }
  }

  const encoder = new TextEncoder();
  zipEntries.push({
    name: "manifest.json",
    data: encoder.encode(JSON.stringify(manifest, null, 2)),
  });

  const zipBlob = createZipArchive(zipEntries);
  const normalizedProjectId = (projectId || "project").trim().replace(/[^\w.-]+/g, "_");
  const fileName = `assets-bundle-${normalizedProjectId || "project"}-${Date.now()}.zip`;
  triggerDownload(zipBlob, fileName);

  return {
    fileName,
    successCount: manifest.successCount,
    failedCount: manifest.failedCount,
    totalAssets: manifest.totalAssets,
  };
}
