import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("lightSaberStudio", {
  ping: () => ipcRenderer.invoke("studio:ping")
});

export type StudioBridge = {
  ping: () => Promise<{ ok: true; timestamp: number }>;
};
