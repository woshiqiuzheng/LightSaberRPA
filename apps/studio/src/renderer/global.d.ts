export {};

declare global {
  interface Window {
    lightSaberStudio?: {
      ping: () => Promise<{ ok: true; timestamp: number }>;
    };
  }
}
