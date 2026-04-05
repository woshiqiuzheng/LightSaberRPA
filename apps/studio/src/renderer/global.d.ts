import type { FlowDefinition } from "@lightsaber-rpa/flow-core";
import type { RunnerEvent, RunnerMode } from "@lightsaber-rpa/runner";

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
      executeFlow: (request: {
        flow: FlowDefinition;
        mode: RunnerMode;
      }) => Promise<{ ok: true; startedAt: number }>;
      onRunEvent: (listener: (event: RunnerEvent) => void) => () => void;
    };
  }
}
