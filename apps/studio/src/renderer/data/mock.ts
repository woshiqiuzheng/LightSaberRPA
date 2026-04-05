import {
  getInstructionManifestsByCategory,
  INSTRUCTION_CATEGORIES,
  type InstructionCategoryId,
  type InstructionManifestSpec
} from "@lightsaber-rpa/instruction-manifests";
import {
  DEFAULT_FLOW_DEFINITION,
  type FlowDefinition,
  type FlowNode
} from "@lightsaber-rpa/flow-core";
import {
  DEFAULT_APP_METADATA,
  DEFAULT_PROJECT_METADATA,
  type AppMetadata,
  type ProjectMetadata
} from "@lightsaber-rpa/shared";

import type {
  BottomPanelRecord,
  InstructionGroup,
  NavItem,
  ResourceStat,
  StudioAppRecord,
  StudioTaskRecord
} from "../types";

export const navItems: NavItem[] = [
  { id: "apps", label: "Apps", shortLabel: "Apps", count: 8 },
  { id: "triggers", label: "Triggers", shortLabel: "Triggers", count: 1 },
  { id: "market", label: "Market", shortLabel: "Market" },
  { id: "tutorials", label: "Guides", shortLabel: "Guides" },
  { id: "community", label: "Community", shortLabel: "Community" }
];

export const instructionGroups: InstructionGroup[] = [
  ...INSTRUCTION_CATEGORIES.map((category) => {
    const manifests = getInstructionManifestsByCategory(category.id);

    return {
      id: category.id,
      label: category.name,
      description: category.description ?? "",
      tags: deriveGroupTags(manifests),
      instructions: manifests.map((manifest) => ({
        ...manifest,
        defaultConfig: buildDefaultConfig(manifest)
      }))
    };
  })
];

export const studioApps: StudioAppRecord[] = [
  createStudioApp({
    id: "douyin-capture",
    name: "Douyin Video Capture",
    domain: "Web scraping",
    updatedAt: "Today",
    badge: "DY",
    status: "draft",
    scenario: "Collect creator video metadata, write rows to Excel, and archive exports.",
    focusFields: ["title", "author", "likes", "publishedAt"],
    lastRunLabel: "Debugged 18 minutes ago",
    nodes: [
      actionNode("action-open-page", "Open Douyin page", "web.open", {
        url: "https://www.douyin.com/"
      }, "Launch the controlled browser and restore session"),
      actionNode("action-capture-list", "Capture video list", "web.read-list", {
        locator: ".video-card"
      }, "Extract title, author, likes, and publish time from repeated cards"),
      actionNode("action-write-excel", "Append rows to workbook", "excel.append-rows", {
        file: "D:/exports/douyin.xlsx"
      }, "Append collected rows into the reporting workbook")
    ]
  }),
  createStudioApp({
    id: "bank-client",
    name: "Bank Desktop Client",
    domain: "Desktop automation",
    updatedAt: "Yesterday",
    badge: "BK",
    status: "draft",
    scenario: "Launch the bank desktop client, sign in, and export statement snapshots.",
    focusFields: ["window", "account", "statementFile"],
    lastRunLabel: "Last successful run yesterday",
    nodes: [
      actionNode("action-launch-client", "Launch desktop client", "desktop.launch-app", {
        executable: "C:/Program Files/Bank/client.exe"
      }, "Start the desktop banking client"),
      actionNode("action-focus-login", "Activate login window", "desktop.activate-window", {
        windowTitle: "Bank Login"
      }, "Wait for the login window and bring it to front"),
      actionNode("action-export-statement", "Export statement", "desktop.click-control", {
        automationId: "ExportStatementButton"
      }, "Trigger the statement export from the account dashboard")
    ]
  }),
  createStudioApp({
    id: "u8-reconcile",
    name: "Yonyou U8 Reconcile",
    domain: "Finance",
    updatedAt: "2 days ago",
    badge: "U8",
    status: "active",
    scenario: "Read pending vouchers, compare values, and write reconciled rows back out.",
    focusFields: ["voucherId", "amount", "vendor", "status"],
    lastRunLabel: "Scheduled run completed this morning",
    nodes: [
      actionNode("action-open-u8", "Open U8 page", "web.open", {
        url: "https://u8.example.com/dashboard"
      }, "Open the U8 web dashboard"),
      actionNode("action-read-vouchers", "Read voucher table", "web.read-table", {
        locator: "#voucher-grid"
      }, "Pull pending vouchers into a structured table"),
      actionNode("action-save-results", "Write reconciliation file", "file.write-json", {
        path: "D:/exports/u8-reconcile.json"
      }, "Persist reconciliation results for the downstream workflow")
    ]
  })
];

export const tasks: StudioTaskRecord[] = [
  {
    id: "task-file-watch",
    appId: "douyin-capture",
    name: "Plan 00",
    trigger: "File trigger",
    app: "Douyin Video Capture",
    condition: "Watch D:/watch/douyin for new or updated .txt / .xlsx files",
    enabled: false,
    config: {
      directory: "D:/watch/douyin",
      filePattern: "*.{txt,xlsx}",
      recursive: true,
      eventTypes: ["rename", "change"]
    }
  },
  {
    id: "task-daily-reconcile",
    appId: "u8-reconcile",
    name: "Daily reconcile",
    trigger: "Schedule",
    app: "Yonyou U8 Reconcile",
    condition: "Run every weekday at 09:30 and post the output to the audit folder",
    enabled: true
  }
];

export function getTasksForApp(appId: string): StudioTaskRecord[] {
  return tasks.filter((task) => task.appId === appId);
}

export function deriveResourceStats(record: StudioAppRecord): ResourceStat[] {
  const actionCount = record.flow.nodes.filter((node) => node.kind === "action").length;
  const branchCount = record.flow.nodes.filter((node) => node.kind === "condition" || node.kind === "loop").length;

  return [
    {
      label: "Flow nodes",
      value: String(record.flow.nodes.length),
      note: `${actionCount} executable actions wired in ${record.flow.name}.`
    },
    {
      label: "Branch points",
      value: String(branchCount),
      note: "Conditions and loops that change execution direction."
    },
    {
      label: "Focus fields",
      value: String(record.focusFields.length),
      note: `Working set: ${record.focusFields.join(", ")}.`
    }
  ];
}

export function deriveBottomPanels(
  record: StudioAppRecord,
  appTasks: StudioTaskRecord[]
): BottomPanelRecord[] {
  const actionableNodes = record.flow.nodes.filter((node) => node.kind === "action");

  return [
    {
      id: "element-library",
      label: "Element Library",
      status: `${actionableNodes.length} mapped actions`,
      items: actionableNodes.slice(0, 3).map((node) => `${node.name} -> ${getInstructionRef(node)}`)
    },
    {
      id: "image-library",
      label: "Image Library",
      status: record.domain === "Desktop automation" ? "OCR fallback enabled" : "Optional fallback",
      items: [
        "Window snapshots ready for capture replay",
        "Template matching reserved for non-UIA elements",
        "Screenshot timeline will land here next"
      ]
    },
    {
      id: "run-log",
      label: "Run Logs",
      status: record.lastRunLabel,
      items: [
        `Loaded ${record.flow.name}`,
        `Prepared ${record.focusFields.length} focus fields`,
        appTasks.length > 0 ? `Found ${appTasks.length} trigger bindings` : "No trigger bindings yet"
      ]
    },
    {
      id: "data-table",
      label: "Data Table",
      status: `${record.focusFields.length} columns staged`,
      items: record.focusFields.map((field) => `Column: ${field}`)
    },
    {
      id: "flow-params",
      label: "Flow Params",
      status: `v${record.project.version}`,
      items: [
        `rootFlowId = ${record.project.rootFlowId}`,
        `status = ${record.app.status}`,
        `updatedAt = ${record.app.updatedAt}`
      ]
    }
  ];
}

export function createDraftStudioApp(seed: number): StudioAppRecord {
  return createStudioApp({
    id: `draft-app-${seed}`,
    name: `Untitled App ${seed}`,
    domain: "New automation",
    updatedAt: "Just now",
    badge: `N${seed}`,
    status: "draft",
    scenario: "Start with an empty flow, then add instructions from the palette.",
    focusFields: ["input", "output"],
    lastRunLabel: "Draft created just now",
    nodes: []
  });
}

function createStudioApp(config: {
  id: string;
  name: string;
  domain: string;
  updatedAt: string;
  badge: string;
  status: AppMetadata["status"];
  scenario: string;
  focusFields: string[];
  lastRunLabel: string;
  nodes: FlowNode[];
}): StudioAppRecord {
  const projectId = `${config.id}-project`;
  const flowId = `${config.id}.flow`;

  const app: AppMetadata = {
    ...DEFAULT_APP_METADATA,
    id: config.id,
    name: config.name,
    status: config.status,
    updatedAt: config.updatedAt,
    createdAt: DEFAULT_APP_METADATA.createdAt,
    description: config.scenario,
    tags: [config.domain.toLowerCase().replace(/\s+/g, "-")]
  };

  const project: ProjectMetadata = {
    ...DEFAULT_PROJECT_METADATA,
    id: projectId,
    name: config.name,
    rootFlowId: flowId,
    updatedAt: config.updatedAt
  };

  const flow: FlowDefinition = {
    ...DEFAULT_FLOW_DEFINITION,
    id: flowId,
    name: flowId,
    projectId,
    description: config.scenario,
    nodes: [
      {
        id: `${config.id}-start`,
        kind: "start",
        name: "Start",
        nextNodeId: config.nodes[0]?.id
      },
      ...config.nodes,
      {
        id: `${config.id}-end`,
        kind: "end",
        name: "End"
      }
    ],
    edges: [
      {
        from: `${config.id}-start`,
        to: config.nodes[0]?.id ?? `${config.id}-end`
      },
      ...config.nodes.map((node, index) => ({
        from: node.id,
        to: config.nodes[index + 1]?.id ?? `${config.id}-end`
      }))
    ]
  };

  return {
    app,
    project,
    flow,
    badge: config.badge,
    scenario: config.scenario,
    domain: config.domain,
    focusFields: config.focusFields,
    lastRunLabel: config.lastRunLabel
  };
}

function actionNode(
  id: string,
  name: string,
  instructionId: string,
  config: Record<string, unknown>,
  description: string
): FlowNode {
  return {
    id,
    kind: "action",
    name,
    instructionId,
    config,
    description
  };
}

function getInstructionRef(node: FlowNode): string {
  return node.kind === "action" ? node.instructionId : node.kind;
}

function buildDefaultConfig(manifest: InstructionManifestSpec) {
  const schema = manifest.inputSchema ?? {};

  return Object.fromEntries(
    Object.entries(schema).map(([key, descriptor]) => [key, getSchemaDefaultValue(descriptor)])
  );
}

function deriveGroupTags(manifests: readonly InstructionManifestSpec[]) {
  return Array.from(new Set(manifests.flatMap((manifest) => manifest.tags ?? []))).slice(0, 3);
}

function getSchemaDefaultValue(descriptor: unknown) {
  if (!descriptor || typeof descriptor !== "object" || !("type" in descriptor)) {
    return "";
  }

  const type = descriptor.type;

  if (type === "number") {
    return 0;
  }

  if (type === "boolean") {
    return false;
  }

  if (type === "array") {
    return [];
  }

  if (type === "object") {
    return {};
  }

  return "";
}
