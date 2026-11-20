import { create } from "zustand";
import { env } from "../../utils/env";

export enum FeatureKey {
  DuplicateWindow = "duplicateWindow",
  FloatingFloor = "floatingFloor",
}

type Feature = {
  key: FeatureKey;
  label: string;
  isEnabled: boolean;
  isVRFeature: boolean;
  isDesktopFeature: boolean;
};

interface FeatureFlagStore {
  featureList: Feature[];
  setFeatureEnabled: (key: FeatureKey | string, isEnabled: boolean) => void;
  isFeatureEnabled: (key: FeatureKey | string, isXR: boolean) => boolean;
}

const initialFeatureList: Feature[] = [
  {
    key: FeatureKey.DuplicateWindow,
    label: "Duplicate Window",
    isEnabled: env("VITE_NDMVR_DUPLICATE_WINDOW_ENABLED"),
    isVRFeature: true,
    isDesktopFeature: true,
  },

  // {
  //   key: FeatureKey.FloatingFloor,
  //   label: "Floating Floor",
  //   isEnabled: env("VITE_NDMVR_FLOATING_FLOOR_ENABLED"),
  //   isVRFeature: true,
  //   isDesktopFeature: false,
  // },
];

export const useFeatureFlagStore = create<FeatureFlagStore>((set, get) => ({
  featureList: initialFeatureList,

  setFeatureEnabled: (key, isEnabled) =>
    set((state) => ({
      featureList: state.featureList.map((feature) =>
        feature.key === key ? { ...feature, isEnabled } : feature,
      ),
    })),

  isFeatureEnabled: (key, isXR) => {
    const feature = get().featureList.find((f) => f.key === key);
    if (!feature?.isEnabled) return false;

    return isXR ? feature.isVRFeature : feature.isDesktopFeature;
  },
}));
