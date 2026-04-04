import type { InstructionManifest } from "@lightsaber-rpa/flow-core";
import type { InstructionCategory } from "@lightsaber-rpa/shared";

export type InstructionCategoryId =
  | "control"
  | "web"
  | "desktop"
  | "data"
  | "excel"
  | "file"
  | "network"
  | "system";

export interface InstructionCategoryManifest extends InstructionCategory {
  id: InstructionCategoryId;
}

export type InstructionManifestSpec = Omit<InstructionManifest, "categoryId"> & {
  categoryId: InstructionCategoryId;
};

export const INSTRUCTION_CATEGORY_IDS = [
  "control",
  "web",
  "desktop",
  "data",
  "excel",
  "file",
  "network",
  "system"
] as const satisfies readonly InstructionCategoryId[];

export const INSTRUCTION_CATEGORIES = [
  {
    id: "control",
    name: "Flow control",
    icon: "branch",
    description: "Conditions, loops, waits, retries, and exception handling.",
    order: 10
  },
  {
    id: "web",
    name: "Web automation",
    icon: "globe",
    description: "Browser navigation, element capture, extraction, and form actions.",
    order: 20
  },
  {
    id: "desktop",
    name: "Desktop automation",
    icon: "window",
    description: "Window control, UIA actions, keyboard, mouse, and OCR fallback.",
    order: 30
  },
  {
    id: "data",
    name: "Data processing",
    icon: "table",
    description: "Text, lists, tables, JSON, and structured transforms.",
    order: 40
  },
  {
    id: "excel",
    name: "Excel / WPS",
    icon: "sheet",
    description: "Workbook read/write, ranges, formulas, filters, and formatting.",
    order: 50
  },
  {
    id: "file",
    name: "Files and folders",
    icon: "folder",
    description: "Copy, move, rename, delete, iterate, and watch file system changes.",
    order: 60
  },
  {
    id: "network",
    name: "Network",
    icon: "cloud",
    description: "HTTP requests, webhooks, mail, FTP, and API callbacks.",
    order: 70
  },
  {
    id: "system",
    name: "System",
    icon: "settings",
    description: "Clipboard, dialogs, screenshots, and OS helper actions.",
    order: 80
  }
] as const satisfies readonly InstructionCategoryManifest[];

function defineInstructionManifest<T extends InstructionManifestSpec>(manifest: T): T {
  return manifest;
}

export const INSTRUCTION_MANIFESTS = [
  defineInstructionManifest({
    id: "flow.wait",
    categoryId: "control",
    name: "Wait",
    description: "Pause execution for a fixed duration or until a condition is true.",
    tags: ["delay", "polling", "retry"],
    inputSchema: {
      durationMs: { type: "number", minimum: 0 },
      until: { type: "string", optional: true }
    },
    outputSchema: {
      resumedAt: { type: "string" }
    }
  }),
  defineInstructionManifest({
    id: "flow.if",
    categoryId: "control",
    name: "If / else",
    description: "Branch execution based on a boolean expression.",
    tags: ["branch", "condition"],
    inputSchema: {
      expression: { type: "string" },
      thenLabel: { type: "string", optional: true },
      elseLabel: { type: "string", optional: true }
    },
    outputSchema: {
      branchTaken: { type: "string" }
    }
  }),
  defineInstructionManifest({
    id: "flow.for-each",
    categoryId: "control",
    name: "For each",
    description: "Iterate through a list or table and expose the current item.",
    tags: ["loop", "iteration"],
    inputSchema: {
      collection: { type: "string" },
      itemName: { type: "string" },
      indexName: { type: "string", optional: true }
    },
    outputSchema: {
      currentItem: { type: "unknown" }
    }
  }),
  defineInstructionManifest({
    id: "flow.try-catch",
    categoryId: "control",
    name: "Try / catch",
    description: "Wrap fragile steps and route errors to a recovery branch.",
    tags: ["error", "recovery"],
    inputSchema: {
      retryCount: { type: "number", minimum: 0, optional: true },
      retryDelayMs: { type: "number", minimum: 0, optional: true }
    },
    outputSchema: {
      errorMessage: { type: "string", optional: true }
    }
  }),
  defineInstructionManifest({
    id: "web.open",
    categoryId: "web",
    name: "Open page",
    description: "Open a URL in the controlled browser session.",
    tags: ["browser", "navigation"],
    inputSchema: {
      url: { type: "string" },
      waitForLoad: { type: "boolean", optional: true }
    },
    outputSchema: {
      pageTitle: { type: "string", optional: true }
    }
  }),
  defineInstructionManifest({
    id: "web.click",
    categoryId: "web",
    name: "Click element",
    description: "Click a captured locator or selector on the current page.",
    tags: ["locator", "interaction"],
    inputSchema: {
      locator: { type: "string" },
      timeoutMs: { type: "number", optional: true }
    },
    outputSchema: {
      clicked: { type: "boolean" }
    }
  }),
  defineInstructionManifest({
    id: "web.read-text",
    categoryId: "web",
    name: "Read text",
    description: "Read visible text from a page element or region.",
    tags: ["extraction", "text"],
    inputSchema: {
      locator: { type: "string" },
      trim: { type: "boolean", optional: true }
    },
    outputSchema: {
      text: { type: "string" }
    }
  }),
  defineInstructionManifest({
    id: "web.read-list",
    categoryId: "web",
    name: "Read repeated list",
    description: "Extract a repeated list of similar cards or rows into structured records.",
    tags: ["list", "scraping"],
    inputSchema: {
      locator: { type: "string" },
      fields: { type: "array" }
    },
    outputSchema: {
      rows: { type: "array" }
    }
  }),
  defineInstructionManifest({
    id: "desktop.launch-app",
    categoryId: "desktop",
    name: "Launch app",
    description: "Start a desktop application from an executable path.",
    tags: ["window", "process"],
    inputSchema: {
      executable: { type: "string" },
      arguments: { type: "string", optional: true }
    },
    outputSchema: {
      processId: { type: "number", optional: true }
    }
  }),
  defineInstructionManifest({
    id: "desktop.activate-window",
    categoryId: "desktop",
    name: "Activate window",
    description: "Bring a target window to the foreground.",
    tags: ["window", "focus"],
    inputSchema: {
      windowTitle: { type: "string" },
      partialMatch: { type: "boolean", optional: true }
    },
    outputSchema: {
      isFocused: { type: "boolean" }
    }
  }),
  defineInstructionManifest({
    id: "desktop.click-control",
    categoryId: "desktop",
    name: "Click control",
    description: "Click a UI Automation control by automation id, name, or path.",
    tags: ["uia", "interaction"],
    inputSchema: {
      automationId: { type: "string", optional: true },
      name: { type: "string", optional: true },
      controlType: { type: "string", optional: true }
    },
    outputSchema: {
      clicked: { type: "boolean" }
    }
  }),
  defineInstructionManifest({
    id: "desktop.read-text",
    categoryId: "desktop",
    name: "Read control text",
    description: "Read the visible text from a desktop control or fallback region.",
    tags: ["uia", "ocr"],
    inputSchema: {
      locator: { type: "string" },
      preferOcr: { type: "boolean", optional: true }
    },
    outputSchema: {
      text: { type: "string" }
    }
  }),
  defineInstructionManifest({
    id: "data.set-variable",
    categoryId: "data",
    name: "Set variable",
    description: "Create or update a flow variable with any value.",
    tags: ["variable", "state"],
    inputSchema: {
      name: { type: "string" },
      value: { type: "unknown" }
    },
    outputSchema: {
      name: { type: "string" }
    }
  }),
  defineInstructionManifest({
    id: "data.compose-text",
    categoryId: "data",
    name: "Compose text",
    description: "Combine text fragments, variables, and expressions into one string.",
    tags: ["string", "template"],
    inputSchema: {
      template: { type: "string" },
      variables: { type: "object", optional: true }
    },
    outputSchema: {
      text: { type: "string" }
    }
  }),
  defineInstructionManifest({
    id: "data.json-parse",
    categoryId: "data",
    name: "Parse JSON",
    description: "Parse a JSON string into an object or array.",
    tags: ["json", "parse"],
    inputSchema: {
      json: { type: "string" }
    },
    outputSchema: {
      value: { type: "object" }
    }
  }),
  defineInstructionManifest({
    id: "data.list-filter",
    categoryId: "data",
    name: "Filter list",
    description: "Filter a list by predicate or property rule.",
    tags: ["list", "filter"],
    inputSchema: {
      collection: { type: "string" },
      predicate: { type: "string" }
    },
    outputSchema: {
      collection: { type: "array" }
    }
  }),
  defineInstructionManifest({
    id: "excel.open-workbook",
    categoryId: "excel",
    name: "Open workbook",
    description: "Open an Excel or WPS workbook for read/write operations.",
    tags: ["workbook", "sheet"],
    inputSchema: {
      file: { type: "string" },
      readOnly: { type: "boolean", optional: true }
    },
    outputSchema: {
      workbookId: { type: "string" }
    }
  }),
  defineInstructionManifest({
    id: "excel.read-range",
    categoryId: "excel",
    name: "Read range",
    description: "Read a worksheet range into a table structure.",
    tags: ["range", "table"],
    inputSchema: {
      sheetName: { type: "string" },
      range: { type: "string" }
    },
    outputSchema: {
      rows: { type: "array" }
    }
  }),
  defineInstructionManifest({
    id: "excel.write-range",
    categoryId: "excel",
    name: "Write range",
    description: "Write a table back into a worksheet range.",
    tags: ["write", "table"],
    inputSchema: {
      sheetName: { type: "string" },
      startCell: { type: "string" },
      values: { type: "array" }
    },
    outputSchema: {
      writtenCells: { type: "number" }
    }
  }),
  defineInstructionManifest({
    id: "excel.append-rows",
    categoryId: "excel",
    name: "Append rows",
    description: "Append one or more rows to the end of a worksheet.",
    tags: ["append", "report"],
    inputSchema: {
      file: { type: "string" },
      sheetName: { type: "string", optional: true },
      rows: { type: "array" }
    },
    outputSchema: {
      appendedRows: { type: "number" }
    }
  }),
  defineInstructionManifest({
    id: "file.watch-folder",
    categoryId: "file",
    name: "Watch folder",
    description: "Monitor a folder for create, update, delete, or rename events.",
    tags: ["trigger", "watch"],
    inputSchema: {
      folder: { type: "string" },
      includeSubfolders: { type: "boolean", optional: true }
    },
    outputSchema: {
      eventType: { type: "string" }
    }
  }),
  defineInstructionManifest({
    id: "file.copy",
    categoryId: "file",
    name: "Copy file",
    description: "Copy a file or folder to a destination path.",
    tags: ["copy", "path"],
    inputSchema: {
      source: { type: "string" },
      target: { type: "string" }
    },
    outputSchema: {
      targetPath: { type: "string" }
    }
  }),
  defineInstructionManifest({
    id: "file.move",
    categoryId: "file",
    name: "Move file",
    description: "Move a file or folder to a destination path.",
    tags: ["move", "path"],
    inputSchema: {
      source: { type: "string" },
      target: { type: "string" }
    },
    outputSchema: {
      targetPath: { type: "string" }
    }
  }),
  defineInstructionManifest({
    id: "file.read-text",
    categoryId: "file",
    name: "Read text file",
    description: "Read a plain text file using the configured encoding.",
    tags: ["read", "text"],
    inputSchema: {
      path: { type: "string" },
      encoding: { type: "string", optional: true }
    },
    outputSchema: {
      content: { type: "string" }
    }
  }),
  defineInstructionManifest({
    id: "network.http-request",
    categoryId: "network",
    name: "HTTP request",
    description: "Send an HTTP request and capture the response body.",
    tags: ["api", "request"],
    inputSchema: {
      method: { type: "string" },
      url: { type: "string" },
      body: { type: "unknown", optional: true }
    },
    outputSchema: {
      status: { type: "number" },
      body: { type: "unknown" }
    }
  }),
  defineInstructionManifest({
    id: "network.webhook",
    categoryId: "network",
    name: "Webhook callback",
    description: "Post a payload to a webhook endpoint.",
    tags: ["webhook", "callback"],
    inputSchema: {
      url: { type: "string" },
      payload: { type: "unknown" }
    },
    outputSchema: {
      delivered: { type: "boolean" }
    }
  }),
  defineInstructionManifest({
    id: "network.download-file",
    categoryId: "network",
    name: "Download file",
    description: "Download a remote file to local storage.",
    tags: ["download", "file"],
    inputSchema: {
      url: { type: "string" },
      targetPath: { type: "string" }
    },
    outputSchema: {
      savedPath: { type: "string" }
    }
  }),
  defineInstructionManifest({
    id: "network.upload-file",
    categoryId: "network",
    name: "Upload file",
    description: "Upload a local file to an HTTP endpoint or API.",
    tags: ["upload", "file"],
    inputSchema: {
      url: { type: "string" },
      filePath: { type: "string" }
    },
    outputSchema: {
      uploaded: { type: "boolean" }
    }
  }),
  defineInstructionManifest({
    id: "system.clipboard-read",
    categoryId: "system",
    name: "Read clipboard",
    description: "Read the current clipboard text or structured payload.",
    tags: ["clipboard", "system"],
    inputSchema: {
      preferHtml: { type: "boolean", optional: true }
    },
    outputSchema: {
      text: { type: "string", optional: true }
    }
  }),
  defineInstructionManifest({
    id: "system.clipboard-write",
    categoryId: "system",
    name: "Write clipboard",
    description: "Write text or data to the system clipboard.",
    tags: ["clipboard", "write"],
    inputSchema: {
      text: { type: "string" }
    },
    outputSchema: {
      written: { type: "boolean" }
    }
  }),
  defineInstructionManifest({
    id: "system.screenshot",
    categoryId: "system",
    name: "Screenshot",
    description: "Capture a screenshot of the desktop or target window.",
    tags: ["image", "capture"],
    inputSchema: {
      region: { type: "string", optional: true }
    },
    outputSchema: {
      filePath: { type: "string" }
    }
  }),
  defineInstructionManifest({
    id: "system.dialog",
    categoryId: "system",
    name: "Show dialog",
    description: "Display an alert, confirm, or prompt dialog to the user.",
    tags: ["dialog", "prompt"],
    inputSchema: {
      message: { type: "string" },
      kind: { type: "string", optional: true }
    },
    outputSchema: {
      response: { type: "string", optional: true }
    }
  })
] as const satisfies readonly InstructionManifestSpec[];

export const INSTRUCTION_MANIFEST_MAP = Object.fromEntries(
  INSTRUCTION_MANIFESTS.map((manifest) => [manifest.id, manifest] as const)
) as Record<string, InstructionManifestSpec>;

export function listInstructionCategories(): readonly InstructionCategoryManifest[] {
  return INSTRUCTION_CATEGORIES;
}

export function listInstructionManifests(): readonly InstructionManifestSpec[] {
  return INSTRUCTION_MANIFESTS;
}

export function getInstructionManifest(id: string): InstructionManifestSpec | undefined {
  return INSTRUCTION_MANIFEST_MAP[id];
}

export function getInstructionManifestsByCategory(
  categoryId: InstructionCategoryId
): readonly InstructionManifestSpec[] {
  return INSTRUCTION_MANIFESTS.filter((manifest) => manifest.categoryId === categoryId);
}
