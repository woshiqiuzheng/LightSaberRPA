import type { StudioBridge } from "./index";

declare global {
  interface Window {
    lightSaberStudio: StudioBridge;
  }
}

export {};
