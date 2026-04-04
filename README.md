# LightSaberRPA

LightSaberRPA is a Windows-first, local-first desktop RPA product inspired by tools like ShadowBot/影刀. The initial goal is to let end users assemble repeatable automation flows through a low-code visual studio, then run them locally with triggers, logs, and debugging support.

## Product direction

- Desktop studio built for personal and small-team automation use cases
- Core scenarios: web automation, file triggers, Excel/file processing, and foundational desktop automation
- Local execution first, with room to add cloud sync and multi-machine scheduling later

## Repository layout

```text
apps/
  studio/        Electron + React desktop studio
  runner/        Local orchestration service and trigger engine
  win-agent/     Windows native automation agent (.NET)
packages/
  flow-core/     Flow DSL, execution engine, and runtime contracts
  instruction-manifests/
                 Built-in instruction metadata and schemas
  shared/        Shared types, utilities, and constants
docs/
  architecture.md
  mvp-plan.md
```

## Current status

The repository is initialized with a monorepo structure and planning documents. The implementation scaffolding for the desktop studio, runner, and native Windows agent will be added next.

## Recommended toolchain

- Node.js 22+
- pnpm 10+
- .NET 8 SDK
- Windows 11 for local desktop automation development

## Next implementation milestones

1. Scaffold `apps/studio` with Electron + React + TypeScript
2. Scaffold `apps/runner` for local flow execution and triggers
3. Define the first version of the flow DSL in `packages/flow-core`
4. Add built-in instruction manifests for web, file, Excel, and desktop automation
5. Start the Windows automation agent for UI Automation-based desktop control
