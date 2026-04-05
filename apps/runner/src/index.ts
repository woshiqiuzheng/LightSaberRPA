import {
  getExecutableFlowNodes,
  type ExecutionContext,
  type FlowActionNode,
  type FlowDefinition,
  type FlowNode,
  type FlowNodeStatus,
  type FlowRunRecord
} from "@lightsaber-rpa/flow-core";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import * as XLSX from "xlsx";

export type RunnerMode = "run" | "debug";
export type RunnerSource = "manual" | "file-trigger" | "schedule-trigger";

export interface RunnerExecuteFlowRequest {
  flow: FlowDefinition;
  mode?: RunnerMode;
  source?: RunnerSource;
  triggerTaskId?: string;
  triggerLabel?: string;
}

export interface RunnerExecuteFlowOptions {
  onEvent?: (event: RunnerEvent) => void;
  signal?: AbortSignal;
}

export interface RunnerExecuteFlowResult {
  run: FlowRunRecord;
  variables: Record<string, unknown>;
  logs: string[];
}

export type RunnerEvent =
  | {
      type: "run.started";
      runId: string;
      flowId: string;
      mode: RunnerMode;
      source: RunnerSource;
      timestamp: string;
      totalSteps: number;
      triggerTaskId?: string;
      triggerLabel?: string;
      message: string;
    }
  | {
      type: "step.started";
      runId: string;
      flowId: string;
      source: RunnerSource;
      nodeId: string;
      nodeName: string;
      instructionId?: string;
      timestamp: string;
      stepIndex: number;
      totalSteps: number;
      triggerTaskId?: string;
      triggerLabel?: string;
      message: string;
    }
  | {
      type: "step.completed";
      runId: string;
      flowId: string;
      source: RunnerSource;
      nodeId: string;
      nodeName: string;
      instructionId?: string;
      timestamp: string;
      stepIndex: number;
      totalSteps: number;
      output?: Record<string, unknown>;
      triggerTaskId?: string;
      triggerLabel?: string;
      message: string;
    }
  | {
      type: "step.failed";
      runId: string;
      flowId: string;
      source: RunnerSource;
      nodeId: string;
      nodeName: string;
      instructionId?: string;
      timestamp: string;
      stepIndex: number;
      totalSteps: number;
      errorMessage: string;
      triggerTaskId?: string;
      triggerLabel?: string;
      message: string;
    }
  | {
      type: "run.completed";
      runId: string;
      flowId: string;
      source: RunnerSource;
      timestamp: string;
      status: FlowNodeStatus;
      triggerTaskId?: string;
      triggerLabel?: string;
      message: string;
    };

type ExecutionResult = Record<string, unknown>;

export async function executeFlow(
  request: RunnerExecuteFlowRequest,
  options: RunnerExecuteFlowOptions = {}
): Promise<RunnerExecuteFlowResult> {
  const mode = request.mode ?? "run";
  const source = request.source ?? "manual";
  const runId = crypto.randomUUID();
  const executableNodes = getExecutableFlowNodes(request.flow);
  const logs: string[] = [];
  const context: ExecutionContext = {
    flowId: request.flow.id,
    projectId: request.flow.projectId,
    runId,
    startedAt: new Date().toISOString(),
    variables: {},
    status: "running"
  };

  emitEvent(
    {
      type: "run.started",
      runId,
      flowId: request.flow.id,
      mode,
      source,
      timestamp: new Date().toISOString(),
      totalSteps: executableNodes.length,
      triggerTaskId: request.triggerTaskId,
      triggerLabel: request.triggerLabel,
      message: `Started ${mode} for ${request.flow.name}`
    },
    options,
    logs
  );

  for (const [index, node] of executableNodes.entries()) {
    assertNotAborted(options.signal);

    emitEvent(
      {
        type: "step.started",
        runId,
        flowId: request.flow.id,
        source,
        nodeId: node.id,
        nodeName: node.name,
        instructionId: node.kind === "action" ? node.instructionId : undefined,
        timestamp: new Date().toISOString(),
        stepIndex: index,
        totalSteps: executableNodes.length,
        triggerTaskId: request.triggerTaskId,
        triggerLabel: request.triggerLabel,
        message: `Running ${node.name}`
      },
      options,
      logs
    );

    try {
      const output = await executeNode(node, context);
      context.variables.lastResult = output;
      context.variables[`node:${node.id}`] = output;

      emitEvent(
        {
          type: "step.completed",
          runId,
          flowId: request.flow.id,
          source,
          nodeId: node.id,
          nodeName: node.name,
          instructionId: node.kind === "action" ? node.instructionId : undefined,
          timestamp: new Date().toISOString(),
          stepIndex: index,
          totalSteps: executableNodes.length,
          output,
          triggerTaskId: request.triggerTaskId,
          triggerLabel: request.triggerLabel,
          message: `Completed ${node.name}`
        },
        options,
        logs
      );
    } catch (error) {
      const errorMessage = toErrorMessage(error);

      context.status = "failed";

      emitEvent(
        {
          type: "step.failed",
          runId,
          flowId: request.flow.id,
          source,
          nodeId: node.id,
          nodeName: node.name,
          instructionId: node.kind === "action" ? node.instructionId : undefined,
          timestamp: new Date().toISOString(),
          stepIndex: index,
          totalSteps: executableNodes.length,
          errorMessage,
          triggerTaskId: request.triggerTaskId,
          triggerLabel: request.triggerLabel,
          message: `Failed ${node.name}: ${errorMessage}`
        },
        options,
        logs
      );

      const endedAt = new Date().toISOString();
      const failedRun: FlowRunRecord = {
        id: runId,
        flowId: request.flow.id,
        projectId: request.flow.projectId,
        status: "failed",
        startedAt: context.startedAt,
        endedAt,
        errorMessage
      };

      emitEvent(
        {
          type: "run.completed",
          runId,
          flowId: request.flow.id,
          source,
          timestamp: endedAt,
          status: "failed",
          triggerTaskId: request.triggerTaskId,
          triggerLabel: request.triggerLabel,
          message: `Run failed after ${node.name}`
        },
        options,
        logs
      );

      return {
        run: failedRun,
        variables: context.variables,
        logs
      };
    }

    if (mode === "debug") {
      await delay(450, undefined, {
        signal: options.signal
      });
    }
  }

  context.status = "success";

  const endedAt = new Date().toISOString();
  const completedRun: FlowRunRecord = {
    id: runId,
    flowId: request.flow.id,
    projectId: request.flow.projectId,
    status: "success",
    startedAt: context.startedAt,
    endedAt
  };

  emitEvent(
    {
      type: "run.completed",
      runId,
      flowId: request.flow.id,
      source,
      timestamp: endedAt,
      status: "success",
      triggerTaskId: request.triggerTaskId,
      triggerLabel: request.triggerLabel,
      message: `Run completed for ${request.flow.name}`
    },
    options,
    logs
  );

  return {
    run: completedRun,
    variables: context.variables,
    logs
  };
}

async function executeNode(node: FlowNode, context: ExecutionContext): Promise<ExecutionResult> {
  if (node.kind !== "action") {
    return {
      kind: node.kind,
      note: "Non-action nodes are not executed in the linear MVP runner."
    };
  }

  switch (node.instructionId) {
    case "file.read-text":
      return executeReadText(node, context);
    case "file.write-json":
      return executeWriteJson(node, context);
    case "file.move":
      return executeMoveFile(node);
    case "network.http-request":
      return executeHttpRequest(node, context);
    case "web.open":
      return executeWebOpen(node, context);
    case "web.read-list":
    case "web.read-table":
      return executeWebReadRows(node, context);
    case "excel.open-workbook":
      return executeOpenWorkbook(node, context);
    case "excel.read-range":
      return executeReadRange(node, context);
    case "excel.append-rows":
      return executeAppendRows(node, context);
    case "data.set-variable":
      return executeSetVariable(node, context);
    case "data.compose-text":
      return executeComposeText(node, context);
    case "data.parse-json":
    case "data.json-parse":
      return executeParseJson(node, context);
    default:
      return {
        instructionId: node.instructionId,
        placeholder: true,
        note: "Instruction executor not implemented yet. The runner recorded a placeholder result."
      };
  }
}

async function executeReadText(node: FlowActionNode, context: ExecutionContext) {
  const filePath = readStringConfig(node, "path");
  const encoding = readStringConfig(node, "encoding", "utf8");
  const content = await readFile(resolve(filePath), encoding as BufferEncoding);

  context.variables.lastText = content;
  context.variables.lastFilePath = filePath;

  return {
    path: filePath,
    content,
    length: content.length
  };
}

async function executeWriteJson(node: FlowActionNode, context: ExecutionContext) {
  const filePath = readStringConfig(node, "path");
  const value =
    node.config.value ??
    context.variables.lastRows ??
    context.variables.lastResult ??
    context.variables;

  await ensureParentDirectory(filePath);
  await writeFile(resolve(filePath), JSON.stringify(value, null, 2), "utf8");

  return {
    path: filePath,
    written: true
  };
}

async function executeMoveFile(node: FlowActionNode) {
  const source = readStringConfig(node, "source");
  const target = readStringConfig(node, "target", readStringConfig(node, "destination"));

  await ensureParentDirectory(target);
  await rename(resolve(source), resolve(target));

  return {
    source,
    target
  };
}

async function executeHttpRequest(node: FlowActionNode, context: ExecutionContext) {
  const method = readStringConfig(node, "method", "GET").toUpperCase();
  const url = readStringConfig(node, "url");
  const body = node.config.body;
  const response = await fetch(url, {
    method,
    body: typeof body === "string" ? body : body ? JSON.stringify(body) : undefined,
    headers: typeof body === "object" && body !== null ? { "content-type": "application/json" } : undefined
  });
  const responseText = await response.text();

  context.variables.lastResponseText = responseText;
  context.variables.lastHttpStatus = response.status;

  return {
    method,
    status: response.status,
    url,
    body: truncateText(responseText, 1200)
  };
}

async function executeWebOpen(node: FlowActionNode, context: ExecutionContext) {
  const url = readStringConfig(node, "url");

  try {
    const response = await fetch(url);
    const html = await response.text();
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    const title = titleMatch?.[1]?.trim() || url;

    context.variables.currentPage = {
      url,
      status: response.status,
      html,
      title
    };
    context.variables.lastText = stripHtmlTags(html).slice(0, 5000);

    return {
      url,
      status: response.status,
      title,
      htmlLength: html.length
    };
  } catch (error) {
    const warning = `Web fetch unavailable: ${toErrorMessage(error)}`;

    context.variables.currentPage = {
      url,
      status: 0,
      html: "",
      title: url,
      warning
    };

    return {
      url,
      status: 0,
      title: url,
      htmlLength: 0,
      warning
    };
  }
}

async function executeWebReadRows(node: FlowActionNode, context: ExecutionContext) {
  const currentPage = context.variables.currentPage as
    | {
        html?: string;
      }
    | undefined;
  const html = currentPage?.html ?? "";
  const rows = extractRowsFromHtml(html);

  context.variables.lastRows = rows;

  return {
    locator: node.config.locator ?? "",
    rowCount: rows.length,
    rows
  };
}

async function executeOpenWorkbook(node: FlowActionNode, context: ExecutionContext) {
  const filePath = readStringConfig(node, "file");
  const workbook = XLSX.readFile(resolve(filePath));
  const sheetNames = workbook.SheetNames;

  context.variables.currentWorkbook = {
    file: filePath,
    sheetNames
  };

  return {
    file: filePath,
    sheetNames
  };
}

async function executeReadRange(node: FlowActionNode, context: ExecutionContext) {
  const filePath =
    readOptionalStringConfig(node, "file") ??
    ((context.variables.currentWorkbook as { file?: string } | undefined)?.file ?? "");
  const sheetName = readStringConfig(node, "sheet", "Sheet1");
  const workbook = XLSX.readFile(resolve(filePath));
  const worksheet = workbook.Sheets[sheetName];

  if (!worksheet) {
    throw new Error(`Worksheet "${sheetName}" not found in ${filePath}.`);
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: ""
  });

  context.variables.lastRows = rows;

  return {
    file: filePath,
    sheet: sheetName,
    rowCount: rows.length,
    rows
  };
}

async function executeAppendRows(node: FlowActionNode, context: ExecutionContext) {
  const filePath = readStringConfig(node, "file");
  const sheetName = readStringConfig(node, "sheet", "Sheet1");
  const rows = resolveRows(context, node.config.rows);
  const absolutePath = resolve(filePath);

  let workbook: XLSX.WorkBook;

  try {
    workbook = XLSX.readFile(absolutePath);
  } catch {
    workbook = XLSX.utils.book_new();
  }

  let worksheet = workbook.Sheets[sheetName];

  if (!worksheet) {
    worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  } else if (rows.length > 0) {
    XLSX.utils.sheet_add_json(worksheet, rows, {
      skipHeader: false,
      origin: -1
    });
  }

  await ensureParentDirectory(filePath);
  XLSX.writeFile(workbook, absolutePath);

  return {
    file: filePath,
    sheet: sheetName,
    appendedRows: rows.length
  };
}

async function executeSetVariable(node: FlowActionNode, context: ExecutionContext) {
  const variableName = readStringConfig(node, "variable", readStringConfig(node, "name", "value"));
  const value = node.config.value ?? "";

  context.variables[variableName] = value;

  return {
    variable: variableName,
    value
  };
}

async function executeComposeText(node: FlowActionNode, context: ExecutionContext) {
  const template = readStringConfig(node, "template", "");
  const explicitVariables =
    typeof node.config.variables === "object" && node.config.variables !== null
      ? (node.config.variables as Record<string, unknown>)
      : {};
  const resolvedText = template.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_match, key) => {
    const value = explicitVariables[key] ?? context.variables[key];
    return value == null ? "" : String(value);
  });

  context.variables.lastText = resolvedText;

  return {
    text: resolvedText
  };
}

async function executeParseJson(node: FlowActionNode, context: ExecutionContext) {
  const source =
    readOptionalStringConfig(node, "json") ??
    readOptionalStringConfig(node, "source") ??
    String(context.variables.lastText ?? "");
  const value = JSON.parse(source);

  context.variables.lastResult = value;

  return {
    parsed: true,
    value
  };
}

function resolveRows(context: ExecutionContext, explicitRows: unknown) {
  if (Array.isArray(explicitRows)) {
    return explicitRows.map((row, index) => normalizeRow(row, index));
  }

  if (Array.isArray(context.variables.lastRows)) {
    return (context.variables.lastRows as unknown[]).map((row, index) => normalizeRow(row, index));
  }

  return [];
}

function normalizeRow(row: unknown, index: number) {
  if (typeof row === "object" && row !== null && !Array.isArray(row)) {
    return row as Record<string, unknown>;
  }

  return {
    index,
    value: row
  };
}

function extractRowsFromHtml(html: string) {
  const tableRows = Array.from(html.matchAll(/<tr[^>]*>(.*?)<\/tr>/gis))
    .map((match) => Array.from(match[1].matchAll(/<(td|th)[^>]*>(.*?)<\/(td|th)>/gis)).map((cell) => stripHtmlTags(cell[2])))
    .filter((cells) => cells.length > 0)
    .slice(0, 25);

  if (tableRows.length > 0) {
    return tableRows.map((cells, index) => ({
      index,
      columns: cells
    }));
  }

  const anchors = Array.from(html.matchAll(/<a[^>]*>(.*?)<\/a>/gis))
    .map((match) => stripHtmlTags(match[1]))
    .filter(Boolean)
    .slice(0, 25);

  return anchors.map((text, index) => ({
    index,
    text
  }));
}

function stripHtmlTags(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function readOptionalStringConfig(node: FlowActionNode, key: string) {
  const value = node.config[key];
  return value == null ? undefined : String(value);
}

function readStringConfig(node: FlowActionNode, key: string, fallback?: string) {
  const value = readOptionalStringConfig(node, key);

  if (value == null || value === "") {
    if (fallback != null) {
      return fallback;
    }

    throw new Error(`Missing required config "${key}" for instruction ${node.instructionId}.`);
  }

  return value;
}

async function ensureParentDirectory(filePath: string) {
  await mkdir(dirname(resolve(filePath)), {
    recursive: true
  });
}

function truncateText(value: string, maxLength: number) {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength)}...`;
}

function emitEvent(event: RunnerEvent, options: RunnerExecuteFlowOptions, logs: string[]) {
  logs.push(event.message);
  options.onEvent?.(event);
}

function assertNotAborted(signal: AbortSignal | undefined) {
  if (signal?.aborted) {
    throw new Error("Execution aborted.");
  }
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
