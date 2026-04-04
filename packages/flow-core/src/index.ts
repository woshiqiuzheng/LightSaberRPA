import type { InstructionCategory, ProjectMetadata } from "@lightsaber-rpa/shared";

export type FlowNodeKind =
  | "start"
  | "end"
  | "action"
  | "condition"
  | "loop"
  | "group"
  | "comment";

export type FlowValueType = "string" | "number" | "boolean" | "object" | "array" | "null";

export type FlowNodeStatus = "idle" | "running" | "success" | "failed" | "skipped";

export interface FlowArgument {
  name: string;
  value: unknown;
  valueType?: FlowValueType;
}

export interface FlowNodeBase {
  id: string;
  kind: FlowNodeKind;
  name: string;
  description?: string;
  position?: {
    x: number;
    y: number;
  };
  inputs?: FlowArgument[];
  outputs?: FlowArgument[];
}

export interface FlowActionNode extends FlowNodeBase {
  kind: "action";
  instructionId: string;
  config: Record<string, unknown>;
}

export interface FlowConditionNode extends FlowNodeBase {
  kind: "condition";
  expression: string;
  thenNodeIds: string[];
  elseNodeIds?: string[];
}

export interface FlowLoopNode extends FlowNodeBase {
  kind: "loop";
  iterator: string;
  collectionExpression: string;
  bodyNodeIds: string[];
}

export interface FlowGroupNode extends FlowNodeBase {
  kind: "group";
  childNodeIds: string[];
}

export interface FlowCommentNode extends FlowNodeBase {
  kind: "comment";
  text: string;
}

export interface FlowStartNode extends FlowNodeBase {
  kind: "start";
  nextNodeId?: string;
}

export interface FlowEndNode extends FlowNodeBase {
  kind: "end";
}

export type FlowNode =
  | FlowStartNode
  | FlowEndNode
  | FlowActionNode
  | FlowConditionNode
  | FlowLoopNode
  | FlowGroupNode
  | FlowCommentNode;

export interface FlowEdge {
  from: string;
  to: string;
  label?: string;
}

export interface FlowDefinition {
  id: string;
  name: string;
  description?: string;
  version: string;
  projectId: ProjectMetadata["id"];
  nodes: FlowNode[];
  edges: FlowEdge[];
  metadata?: Record<string, unknown>;
}

export interface ExecutionContext {
  flowId: FlowDefinition["id"];
  projectId: ProjectMetadata["id"];
  runId: string;
  startedAt: string;
  variables: Record<string, unknown>;
  status: FlowNodeStatus;
}

export interface FlowRunRecord {
  id: string;
  flowId: string;
  projectId: string;
  status: FlowNodeStatus;
  startedAt: string;
  endedAt?: string;
  errorMessage?: string;
}

export interface InstructionManifest {
  id: string;
  categoryId: InstructionCategory["id"];
  name: string;
  description?: string;
  tags?: string[];
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
}

export const FLOW_NODE_KINDS: readonly FlowNodeKind[] = [
  "start",
  "end",
  "action",
  "condition",
  "loop",
  "group",
  "comment"
];

export const DEFAULT_FLOW_DEFINITION: FlowDefinition = {
  id: "main.flow",
  name: "main.flow",
  description: "Default sample flow for LightSaberRPA",
  version: "0.1.0",
  projectId: "project-demo",
  nodes: [
    {
      id: "start",
      kind: "start",
      name: "Start",
      nextNodeId: "action-open-page"
    },
    {
      id: "action-open-page",
      kind: "action",
      name: "Open page",
      description: "Launch a controlled browser and navigate to the target page",
      instructionId: "web.open",
      config: {
        url: "https://example.com"
      }
    },
    {
      id: "action-read-list",
      kind: "action",
      name: "Capture list",
      description: "Read a repeated list of cards from the target page",
      instructionId: "web.read-list",
      config: {
        locator: ".video-card"
      }
    },
    {
      id: "end",
      kind: "end",
      name: "End"
    }
  ],
  edges: [
    {
      from: "start",
      to: "action-open-page"
    },
    {
      from: "action-open-page",
      to: "action-read-list"
    },
    {
      from: "action-read-list",
      to: "end"
    }
  ]
};

export const DEFAULT_EXECUTION_CONTEXT: ExecutionContext = {
  flowId: DEFAULT_FLOW_DEFINITION.id,
  projectId: DEFAULT_FLOW_DEFINITION.projectId,
  runId: "run-demo",
  startedAt: "2026-04-04T00:00:00.000Z",
  variables: {},
  status: "idle"
};
