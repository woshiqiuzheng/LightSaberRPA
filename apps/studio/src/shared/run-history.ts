import type { RunnerEvent, RunnerMode, RunnerSource } from "@lightsaber-rpa/runner";

export type StudioRunHistoryStatus = "running" | "success" | "failed";

export interface StudioRunHistoryStepRecord {
  nodeId: string;
  nodeName: string;
  instructionId?: string;
  stepIndex: number;
  status: StudioRunHistoryStatus;
  startedAt?: string;
  endedAt?: string;
  message: string;
  errorMessage?: string;
}

export interface StudioRunHistoryRecord {
  runId: string;
  flowId: string;
  appId?: string;
  appName?: string;
  mode: RunnerMode;
  source: RunnerSource;
  status: StudioRunHistoryStatus;
  startedAt: string;
  endedAt?: string;
  summary: string;
  triggerTaskId?: string;
  triggerLabel?: string;
  steps: StudioRunHistoryStepRecord[];
}

export interface RunHistoryAppLookup {
  appId?: string;
  appName?: string;
}

const runHistoryLimit = 120;

export function applyRunnerEventToRunHistory(
  records: StudioRunHistoryRecord[],
  event: RunnerEvent,
  appLookup?: RunHistoryAppLookup
) {
  if (event.type === "run.started") {
    return upsertRunHistoryRecord(records, {
      runId: event.runId,
      flowId: event.flowId,
      appId: appLookup?.appId,
      appName: appLookup?.appName,
      mode: event.mode,
      source: event.source,
      status: "running",
      startedAt: event.timestamp,
      summary: event.message,
      triggerTaskId: event.triggerTaskId,
      triggerLabel: event.triggerLabel,
      steps: []
    });
  }

  const currentRecord = records.find((record) => record.runId === event.runId);

  if (!currentRecord) {
    return records;
  }

  if (event.type === "step.started") {
    return upsertRunHistoryRecord(
      records,
      updateRunHistoryRecord(currentRecord, {
        summary: event.message,
        steps: upsertStepRecord(currentRecord.steps, {
          nodeId: event.nodeId,
          nodeName: event.nodeName,
          instructionId: event.instructionId,
          stepIndex: event.stepIndex,
          status: "running",
          startedAt: event.timestamp,
          message: event.message
        })
      })
    );
  }

  if (event.type === "step.completed") {
    return upsertRunHistoryRecord(
      records,
      updateRunHistoryRecord(currentRecord, {
        summary: event.message,
        steps: upsertStepRecord(currentRecord.steps, {
          nodeId: event.nodeId,
          nodeName: event.nodeName,
          instructionId: event.instructionId,
          stepIndex: event.stepIndex,
          status: "success",
          startedAt:
            currentRecord.steps.find((step) => step.nodeId === event.nodeId)?.startedAt ??
            event.timestamp,
          endedAt: event.timestamp,
          message: event.message
        })
      })
    );
  }

  if (event.type === "step.failed") {
    return upsertRunHistoryRecord(
      records,
      updateRunHistoryRecord(currentRecord, {
        status: "failed",
        summary: event.message,
        steps: upsertStepRecord(currentRecord.steps, {
          nodeId: event.nodeId,
          nodeName: event.nodeName,
          instructionId: event.instructionId,
          stepIndex: event.stepIndex,
          status: "failed",
          startedAt:
            currentRecord.steps.find((step) => step.nodeId === event.nodeId)?.startedAt ??
            event.timestamp,
          endedAt: event.timestamp,
          message: event.message,
          errorMessage: event.errorMessage
        })
      })
    );
  }

  return upsertRunHistoryRecord(
    records,
    updateRunHistoryRecord(currentRecord, {
      status: event.status === "success" ? "success" : "failed",
      endedAt: event.timestamp,
      summary: event.message
    })
  );
}

function updateRunHistoryRecord(
  record: StudioRunHistoryRecord,
  updates: Partial<StudioRunHistoryRecord>
) {
  return {
    ...record,
    ...updates
  };
}

function upsertRunHistoryRecord(
  records: StudioRunHistoryRecord[],
  nextRecord: StudioRunHistoryRecord
) {
  return [nextRecord, ...records.filter((record) => record.runId !== nextRecord.runId)]
    .sort((left, right) => Date.parse(right.startedAt) - Date.parse(left.startedAt))
    .slice(0, runHistoryLimit);
}

function upsertStepRecord(
  steps: StudioRunHistoryStepRecord[],
  nextStep: StudioRunHistoryStepRecord
) {
  return [nextStep, ...steps.filter((step) => step.nodeId !== nextStep.nodeId)]
    .sort((left, right) => left.stepIndex - right.stepIndex);
}
