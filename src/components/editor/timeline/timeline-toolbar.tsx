import { useEffect, useRef, useState } from "react";
import { usePlaybackStore } from "@/stores/playback-store";
import { useStudioStore } from "@/stores/studio-store";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  Pause,
  Play,
  SkipBack,
  Magnet,
  ZoomOut,
  ZoomIn,
  Copy,
  Trash2,
  ArrowLeftToLine,
  ArrowRightToLine,
  Scissors,
  Plus,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { DEFAULT_FPS } from "@/stores/project-store";
import { formatTimeCode } from "@/lib/time";
import { EditableTimecode } from "@/components/ui/editable-timecode";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconPlayerSkipBack,
  IconPlayerSkipForward,
} from "@tabler/icons-react";

type QuickTrackType = "Video" | "Image" | "Audio" | "Text";

const ADD_TRACK_OPTIONS: Array<{ type: QuickTrackType; label: string }> = [
  { type: "Video", label: "\u89c6\u9891\u8f68\u9053" },
  { type: "Image", label: "\u56fe\u7247\u8f68\u9053" },
  { type: "Audio", label: "\u97f3\u9891\u8f68\u9053" },
  { type: "Text", label: "\u6587\u5b57\u8f68\u9053" },
];

export function TimelineToolbar({
  zoomLevel,
  setZoomLevel,
  onDelete,
  onDuplicate,
  onSplit,
  onAddTrack,
}: {
  zoomLevel: number;
  setZoomLevel: (zoom: number) => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onSplit?: () => void;
  onAddTrack?: (trackType: QuickTrackType) => void;
}) {
  const { currentTime, duration, isPlaying, toggle, seek } = usePlaybackStore();
  const { studio, selectedClips } = useStudioStore();
  const [isOriginalAudioMuted, setIsOriginalAudioMuted] = useState(false);
  const [isTogglingOriginalAudio, setIsTogglingOriginalAudio] = useState(false);
  const originalVolumeByClipIdRef = useRef<Map<string, number>>(new Map());

  const isSelected = selectedClips.length > 0;
  const isLocked = selectedClips.some((clip) => !!(clip as any)?.locked);

  const getVideoClips = () => {
    const studioClips = (((studio as any)?.clips || []) as any[]).filter(
      (clip) => clip?.type === "Video" && typeof clip?.id === "string",
    );

    return studioClips.map((clip) => {
      const rawVolume = Number(clip.volume);
      return {
        id: clip.id as string,
        volume: Number.isFinite(rawVolume) ? rawVolume : 1,
      };
    });
  };

  const applyVideoVolumeUpdates = async (
    updates: Array<{ id: string; updates: { volume: number } }>,
  ) => {
    if (!studio || updates.length === 0) return;

    const batchUpdate = (studio as any).updateClips;
    if (typeof batchUpdate === "function") {
      await batchUpdate.call(studio, updates);
      return;
    }

    const singleUpdate = (studio as any).updateClip;
    if (typeof singleUpdate === "function") {
      for (const update of updates) {
        await singleUpdate.call(studio, update.id, update.updates);
      }
    }
  };

  const handleToggleOriginalAudio = async () => {
    if (!studio || isTogglingOriginalAudio) return;

    const videoClips = getVideoClips();
    if (videoClips.length === 0) {
      toast.info("时间线上还没有视频片段。");
      return;
    }

    setIsTogglingOriginalAudio(true);
    try {
      if (!isOriginalAudioMuted) {
        const updates = videoClips.map((clip) => {
          originalVolumeByClipIdRef.current.set(clip.id, clip.volume);
          return { id: clip.id, updates: { volume: 0 } };
        });

        await applyVideoVolumeUpdates(updates);
        setIsOriginalAudioMuted(true);
        toast.success("已关闭视频原声。");
      } else {
        const updates = videoClips.map((clip) => ({
          id: clip.id,
          updates: { volume: originalVolumeByClipIdRef.current.get(clip.id) ?? 1 },
        }));

        await applyVideoVolumeUpdates(updates);
        originalVolumeByClipIdRef.current.clear();
        setIsOriginalAudioMuted(false);
        toast.success("已恢复视频原声。");
      }
    } catch (error) {
      console.error("Failed to toggle original video audio:", error);
      toast.error("切换原声失败，请重试。");
    } finally {
      setIsTogglingOriginalAudio(false);
    }
  };

  useEffect(() => {
    if (!studio || !isOriginalAudioMuted) return;

    const handleClipsAdded = async ({ clips }: { clips?: any[] }) => {
      const addedVideoClips = (clips || [])
        .filter((clip: any) => clip?.type === "Video" && typeof clip?.id === "string")
        .map((clip: any) => {
          const rawVolume = Number(clip.volume);
          const volume = Number.isFinite(rawVolume) ? rawVolume : 1;
          originalVolumeByClipIdRef.current.set(clip.id, volume);
          return { id: clip.id as string, updates: { volume: 0 } };
        });

      if (addedVideoClips.length === 0) return;

      try {
        await applyVideoVolumeUpdates(addedVideoClips);
      } catch (error) {
        console.error("Failed to auto-mute newly added video clips:", error);
      }
    };

    studio.on("clips:added", handleClipsAdded);
    return () => {
      studio.off("clips:added", handleClipsAdded);
    };
  }, [studio, isOriginalAudioMuted]);

  const handleZoomIn = () => {
    setZoomLevel(Math.min(3.5, zoomLevel + 0.15));
  };

  const handleZoomOut = () => {
    setZoomLevel(Math.max(0.15, zoomLevel - 0.15));
  };

  const handleZoomSliderChange = (values: number[]) => {
    setZoomLevel(values[0]);
  };

  return (
    <div className="flex items-center justify-between px-2 py-1 border-b h-10">
      <div className="flex items-center gap-1">
        <TooltipProvider delayDuration={500}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onSplit}
                disabled={!isSelected || isLocked}
              >
                <Scissors className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>分割 (Ctrl+S)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onDuplicate}
                disabled={!isSelected || isLocked}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>复制 (Ctrl+D)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onDelete}
                disabled={!isSelected || isLocked}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>删除 (Delete)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <Magnet className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>自动吸附</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => void handleToggleOriginalAudio()}
                disabled={!studio || isTogglingOriginalAudio}
              >
                {isOriginalAudioMuted ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isOriginalAudioMuted ? "恢复原声" : "关闭原声"}</TooltipContent>
          </Tooltip>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={!onAddTrack}
                title="\u65b0\u5efa\u8f68\u9053"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="bottom">
              <DropdownMenuLabel>{"\u65b0\u5efa\u8f68\u9053"}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {ADD_TRACK_OPTIONS.map((option) => (
                <DropdownMenuItem key={option.type} onClick={() => onAddTrack?.(option.type)}>
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </TooltipProvider>
      </div>

      <div className="flex items-center gap-0">
        <TooltipProvider delayDuration={500}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button className="size-7" variant="ghost" size="icon" onClick={() => seek(0)}>
                <IconPlayerSkipBack className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>回到起点 (Home / Enter)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={toggle}>
                {isPlaying ? (
                  <IconPlayerPauseFilled className="size-5" />
                ) : (
                  <IconPlayerPlayFilled className="size-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isPlaying ? "暂停 (Space)" : "播放 (Space)"}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button className="size-7" variant="ghost" size="icon" onClick={() => seek(0)}>
                <IconPlayerSkipForward className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>回到起点 (Home / Enter)</TooltipContent>
          </Tooltip>
          {/* Time Display */}
          <div className="flex flex-row items-center justify-center px-2">
            <EditableTimecode
              time={currentTime}
              duration={duration}
              format="MM:SS"
              fps={DEFAULT_FPS}
              onTimeChange={seek}
              className="text-center"
            />
            <div className="text-xs text-muted-foreground px-2">/</div>
            <div className="text-xs text-muted-foreground text-center">
              {formatTimeCode(duration, "MM:SS")}
            </div>
          </div>
        </TooltipProvider>
      </div>

      <div className="flex items-center gap-1">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Slider
            className="w-24"
            value={[zoomLevel]}
            onValueChange={handleZoomSliderChange}
            min={0.15}
            max={3.5}
            step={0.15}
          />
          <Button variant="ghost" size="icon" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
