export type AppStatus = "draft" | "active" | "paused" | "archived";

export interface AppMetadata {
  id: string;
  name: string;
  description?: string;
  status: AppStatus;
  updatedAt: string;
  createdAt: string;
  tags?: string[];
}

export interface ProjectMetadata {
  id: string;
  name: string;
  rootFlowId: string;
  version: string;
  createdAt: string;
  updatedAt: string;
}

export interface InstructionCategory {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  order: number;
}

export const APP_STATUSES: readonly AppStatus[] = [
  "draft",
  "active",
  "paused",
  "archived"
];

export const DEFAULT_APP_METADATA: AppMetadata = {
  id: "app-demo",
  name: "Untitled app",
  description: "LightSaberRPA sample application",
  status: "draft",
  createdAt: "2026-04-04T00:00:00.000Z",
  updatedAt: "2026-04-04T00:00:00.000Z",
  tags: ["sample", "demo"]
};

export const DEFAULT_PROJECT_METADATA: ProjectMetadata = {
  id: "project-demo",
  name: "LightSaberRPA Demo",
  rootFlowId: "main.flow",
  version: "0.1.0",
  createdAt: "2026-04-04T00:00:00.000Z",
  updatedAt: "2026-04-04T00:00:00.000Z"
};

export const INSTRUCTION_CATEGORIES: readonly InstructionCategory[] = [
  {
    id: "control",
    name: "Flow control",
    icon: "branch",
    description: "Conditions, loops, waits, and exception handling",
    order: 10
  },
  {
    id: "web",
    name: "Web automation",
    icon: "globe",
    description: "Browser control, locators, extraction, and form actions",
    order: 20
  },
  {
    id: "desktop",
    name: "Desktop automation",
    icon: "window",
    description: "Windows, controls, keyboard and mouse actions",
    order: 30
  },
  {
    id: "data",
    name: "Data processing",
    icon: "table",
    description: "Text, lists, tables, and structured transforms",
    order: 40
  },
  {
    id: "file",
    name: "File operations",
    icon: "folder",
    description: "Files, folders, watching, and path helpers",
    order: 50
  }
];
