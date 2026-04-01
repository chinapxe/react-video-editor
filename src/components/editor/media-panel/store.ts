import { Icons } from "@/components/shared/icons";
import {
  IconFolder,
  type IconProps,
  IconLetterT,
  IconMicrophone,
  IconMusic,
  IconPhoto,
  IconVideo,
  IconWaveSine,
} from "@tabler/icons-react";

import type { ComponentType } from "react";
import { create } from "zustand";

export type Tab =
  | "uploads"
  | "images"
  | "videos"
  | "music"
  | "text"
  | "captions"
  | "effects"
  | "elements"
  | "voiceovers"
  | "sfx"
  | "transitions";

export type MediaTabConfig = {
  icon: ComponentType<IconProps>;
  label: string;
};
const IconsTransition: ComponentType<IconProps> = Icons.transition as ComponentType<IconProps>;

export const tabs = {
  uploads: {
    icon: IconFolder,
    label: "素材",
  },
  images: {
    icon: IconPhoto,
    label: "图片",
  },
  videos: {
    icon: IconVideo,
    label: "视频",
  },
  text: {
    icon: IconLetterT,
    label: "文字",
  },
  music: {
    icon: IconMusic,
    label: "音乐",
  },
  voiceovers: {
    icon: IconMicrophone,
    label: "配音",
  },
  sfx: {
    icon: IconWaveSine,
    label: "音效",
  },
  transitions: {
    icon: IconsTransition,
    label: "转场",
  },
  // captions/effects/elements are intentionally hidden for now.
} satisfies Partial<Record<Tab, MediaTabConfig>>;

interface MediaPanelStore {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  highlightMediaId: string | null;
  requestRevealMedia: (mediaId: string) => void;
  clearHighlight: () => void;
  showProperties: boolean;
  setShowProperties: (show: boolean) => void;
}

export const useMediaPanelStore = create<MediaPanelStore>((set) => ({
  activeTab: "uploads",
  setActiveTab: (tab) => set({ activeTab: tab, showProperties: false }),
  highlightMediaId: null,
  requestRevealMedia: (mediaId) =>
    set({
      activeTab: "uploads",
      highlightMediaId: mediaId,
      showProperties: false,
    }),
  clearHighlight: () => set({ highlightMediaId: null }),
  showProperties: false,
  setShowProperties: (show) => set({ showProperties: show }),
}));
