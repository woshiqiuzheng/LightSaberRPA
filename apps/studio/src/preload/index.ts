import type { FlowDefinition } from "@lightsaber-rpa/flow-core";
import type { RunnerEvent, RunnerExecuteFlowRequest, RunnerMode } from "@lightsaber-rpa/runner";
import { contextBridge, ipcRenderer } from "electron";

export type WorkspaceState = Record<string, unknown> | null;

export type StudioRunRequest = {
  flow: FlowDefinition;
  mode: RunnerMode;
};

contextBridge.exposeInMainWorld("lightSaberStudio", {
  ping: () => ipcRenderer.invoke("studio:ping"),
  loadWorkspaceState: () => ipcRenderer.invoke("studio:workspace-state:load") as Promise<WorkspaceState>,
  saveWorkspaceState: (workspaceState: WorkspaceState) =>
    ipcRenderer.invoke("studio:workspace-state:save", workspaceState),
  executeFlow: (request: StudioRunRequest) =>
    ipcRenderer.invoke("studio:run:execute", request as RunnerExecuteFlowRequest),
  onRunEvent: (listener: (event: RunnerEvent) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, payload: RunnerEvent) => {
      listener(payload);
    };

    ipcRenderer.on("studio:run:event", subscription);

    return () => {
      ipcRenderer.off("studio:run:event", subscription);
    };
  }
});

export type StudioBridge = {
  ping: () => Promise<{ ok: true; timestamp: number }>;
  loadWorkspaceState: () => Promise<WorkspaceState>;
  saveWorkspaceState: (
    workspaceState: WorkspaceState
  ) => Promise<{ ok: true; path: string; timestamp: number }>;
  executeFlow: (request: StudioRunRequest) => Promise<{ ok: true; startedAt: number }>;
  onRunEvent: (listener: (event: RunnerEvent) => void) => () => void;
};
