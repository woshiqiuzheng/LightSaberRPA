import type { InstructionManifestSpec } from "@lightsaber-rpa/instruction-manifests";
import type { FlowDefinition } from "@lightsaber-rpa/flow-core";
import type { AppMetadata, ProjectMetadata } from "@lightsaber-rpa/shared";

export type NavSectionId = "apps" | "triggers" | "market" | "tutorials" | "community";

export type InstructionGroupId =
  | "control"
  | "web"
  | "desktop"
  | "data"
  | "excel"
  | "file"
  | "network"
  | "system";

export type PanelId = "element-library" | "image-library" | "run-log" | "data-table" | "flow-params";

export interface NavItem {
  id: NavSectionId;
  label: string;
  shortLabel: string;
  count?: number;
}

export interface InstructionGroup {
  id: InstructionGroupId;
  label: string;
  description: string;
  tags: string[];
  instructions: InstructionPaletteEntry[];
}

export interface InstructionDefinition {
  defaultConfig: Record<string, unknown>;
}

export type InstructionPaletteEntry = InstructionManifestSpec & InstructionDefinition;

export interface StudioAppRecord {
  app: AppMetadata;
  project: ProjectMetadata;
  flow: FlowDefinition;
  badge: string;
  scenario: string;
  domain: string;
  focusFields: string[];
  lastRunLabel: string;
}

export interface StudioTaskRecord {
  id: string;
  appId: string;
  name: string;
  trigger: string;
  app: string;
  condition: string;
  enabled: boolean;
}

export interface ResourceStat {
  label: string;
  value: string;
  note: string;
}

export interface BottomPanelRecord {
  id: PanelId;
  label: string;
  status: string;
  items: string[];
}
