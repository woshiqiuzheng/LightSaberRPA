export {};

type WorkspaceState = Record<string, unknown> | null;

declare global {
  interface Window {
    lightSaberStudio: {
      ping: () => Promise<{ ok: true; timestamp: number }>;
      loadWorkspaceState: () => Promise<WorkspaceState>;
      saveWorkspaceState: (
        workspaceState: WorkspaceState
      ) => Promise<{ ok: true; path: string; timestamp: number }>;
    };
  }
}
