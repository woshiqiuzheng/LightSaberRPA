# Architecture Overview

## Principles

- Windows-first and local-first for the MVP
- Studio and runner are separated so background execution survives UI failures
- Flow definitions are stored as JSON DSL, not embedded directly in UI state
- Web automation and desktop automation share one orchestration layer but use different execution adapters

## High-level components

### `apps/studio`

- Electron shell
- React-based low-code studio
- Flow editor, variable panel, resource panel, logs, and debugging UI

### `apps/runner`

- Local process responsible for flow execution
- Trigger engine for manual, scheduled, and file-based starts
- Run history, screenshots, and retry/error handling

### `apps/win-agent`

- Native Windows automation bridge
- UI Automation-based element capture and control
- Mouse/keyboard, window management, OCR/image fallback hooks

### `packages/flow-core`

- Flow DSL types
- Runtime context and execution contracts
- Node lifecycle, validation, and shared engine primitives

### `packages/instruction-manifests`

- Built-in instruction catalog
- Parameter schemas
- Category metadata for the studio instruction tree

### `packages/shared`

- Shared IDs, enums, DTOs, and helper functions

## Runtime flow

1. The studio edits or records a flow and stores it locally.
2. The runner loads the flow definition and executes it step by step.
3. Web instructions go through the browser adapter; desktop instructions go through the Windows agent.
4. The runner writes step logs, screenshots, and final run state to local storage.
5. Triggers can start flows without the studio being open.

## MVP boundaries

- In scope: web automation, file triggers, Excel/file processing, foundational desktop automation
- Out of scope: cloud scheduling, mobile automation, marketplace, AI-assisted flow generation
