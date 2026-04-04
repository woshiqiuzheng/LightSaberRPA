import { contextBridge, ipcRenderer } from "electron";

export type WorkspaceState = Record<string, unknown> | null;

contextBridge.exposeInMainWorld("lightSaberStudio", {
  ping: () => ipcRenderer.invoke("studio:ping"),
  loadWorkspaceState: () => ipcRenderer.invoke("studio:workspace-state:load") as Promise<WorkspaceState>,
  saveWorkspaceState: (workspaceState: WorkspaceState) =>
    ipcRenderer.invoke("studio:workspace-state:save", workspaceState)
});

export type StudioBridge = {
  ping: () => Promise<{ ok: true; timestamp: number }>;
  loadWorkspaceState: () => Promise<WorkspaceState>;
  saveWorkspaceState: (
    workspaceState: WorkspaceState
  ) => Promise<{ ok: true; path: string; timestamp: number }>;
};
