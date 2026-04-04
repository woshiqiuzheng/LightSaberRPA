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

export interface FlowActionNodeInput {
  id: string;
  name: string;
  instructionId: string;
  config?: Record<string, unknown>;
  description?: string;
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

export function createFlowActionNode(input: FlowActionNodeInput): FlowActionNode {
  return {
    id: input.id,
    kind: "action",
    name: input.name,
    instructionId: input.instructionId,
    description: input.description,
    config: input.config ?? {}
  };
}

export function findFlowNode(
  flow: FlowDefinition,
  nodeId: FlowNode["id"] | undefined
): FlowNode | undefined {
  return nodeId ? flow.nodes.find((node) => node.id === nodeId) : undefined;
}

export function getExecutableFlowNodes(flow: FlowDefinition): FlowNode[] {
  return flow.nodes.filter((node) => node.kind !== "start" && node.kind !== "end");
}

export function getFirstExecutableNodeId(flow: FlowDefinition): FlowNode["id"] | undefined {
  return getExecutableFlowNodes(flow)[0]?.id;
}

export function insertActionNodeAfter(
  flow: FlowDefinition,
  targetNodeId: FlowNode["id"] | undefined,
  node: FlowActionNode
): FlowDefinition {
  const executableNodes = getExecutableFlowNodes(flow);
  const insertIndex = targetNodeId
    ? executableNodes.findIndex((item) => item.id === targetNodeId)
    : executableNodes.length - 1;

  const nextExecutableNodes = [...executableNodes];
  nextExecutableNodes.splice(insertIndex >= 0 ? insertIndex + 1 : executableNodes.length, 0, node);

  return rebuildLinearFlow(flow, nextExecutableNodes);
}

export function updateFlowNode(
  flow: FlowDefinition,
  nodeId: FlowNode["id"],
  updater: (node: FlowNode) => FlowNode
): FlowDefinition {
  return {
    ...flow,
    nodes: flow.nodes.map((node) => (node.id === nodeId ? updater(node) : node))
  };
}

export function removeFlowNode(
  flow: FlowDefinition,
  nodeId: FlowNode["id"]
): FlowDefinition {
  return rebuildLinearFlow(
    flow,
    getExecutableFlowNodes(flow).filter((node) => node.id !== nodeId)
  );
}

export function moveFlowNode(
  flow: FlowDefinition,
  nodeId: FlowNode["id"],
  direction: "up" | "down"
): FlowDefinition {
  const executableNodes = [...getExecutableFlowNodes(flow)];
  const currentIndex = executableNodes.findIndex((node) => node.id === nodeId);

  if (currentIndex < 0) {
    return flow;
  }

  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

  if (targetIndex < 0 || targetIndex >= executableNodes.length) {
    return flow;
  }

  const [node] = executableNodes.splice(currentIndex, 1);
  executableNodes.splice(targetIndex, 0, node);

  return rebuildLinearFlow(flow, executableNodes);
}

export function rebuildLinearFlow(
  flow: FlowDefinition,
  executableNodes: FlowNode[]
): FlowDefinition {
  const startNode = flow.nodes.find((node): node is FlowStartNode => node.kind === "start") ?? {
    id: "start",
    kind: "start",
    name: "Start"
  };

  const endNode = flow.nodes.find((node): node is FlowEndNode => node.kind === "end") ?? {
    id: "end",
    kind: "end",
    name: "End"
  };

  const nodes: FlowNode[] = [
    {
      ...startNode,
      nextNodeId: executableNodes[0]?.id ?? endNode.id
    },
    ...executableNodes,
    endNode
  ];

  const edges: FlowEdge[] = [
    {
      from: startNode.id,
      to: executableNodes[0]?.id ?? endNode.id
    },
    ...executableNodes.map((node, index) => ({
      from: node.id,
      to: executableNodes[index + 1]?.id ?? endNode.id
    }))
  ];

  return {
    ...flow,
    nodes,
    edges
  };
}
