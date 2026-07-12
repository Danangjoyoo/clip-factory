# Clip Factory UI Revision Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement these tasks in order. Each task file uses checkbox tracking.

**Goal:** Deliver the approved Clip Factory editing-studio UI from project intake through local downloads, project settings, and the approved Phase 2 YouTube surfaces.

**Architecture:** Keep theme and presentation state in the delivery layer. Existing project, clip, processing, and rendering modules remain owners of their data and actions. New UI state is passed through explicit view props; Phase 2 publishing components consume the contracts defined in the approved YouTube publishing design rather than storing secrets or business state in React.

**Tech Stack:** Next.js App Router, React, TypeScript, CSS Modules, Vitest, Testing Library, existing clean-architecture modules, Prisma/Temporal/worker contracts where already owned.

## Global Constraints

- Work on `feature/phase-2-mvp`; do not touch the user-owned `.env.example` deletion.
- Use the three approved token themes: Tactile Cutting Room, Midnight Signal, and Creator Signal. Default to Midnight Signal and persist choice in `localStorage`.
- Use native `<select>` controls for form and theme menus; do not add a dropdown dependency.
- MVP output is fixed to 9:16 at 1080×1920. Crop/focal point is per clip; output resolution is not.
- Manual clip creation uses existing transcript words and has zero OpenAI selection cost. Rendering is the later source-audio/caption-stitching operation.
- A clip-local preview update must not block selecting a ready clip in the filmstrip.
- Complete AI-assisted mode recommends metadata/schedules but never uploads or schedules without explicit user confirmation.
- OAuth tokens, codes, state, and PKCE material remain outside the browser, Docker, Git, logs, Redis, PostgreSQL, and MinIO as specified in the approved Phase 2 OAuth design.
- Follow Clean Architecture, SOLID, DRY, accessibility basics, visible focus, and reduced-motion support. No new dependencies unless an existing platform/browser feature cannot satisfy the requirement.

## Task Sequence

1. [Shared theme system and studio application shell](./task-1.md)
2. [Projects library, new-project intake, source recovery, and AI-assisted modes](./task-2.md)
3. [Processing, local result dashboard, and download presentation](./task-3.md)
4. [Editor workspace, inspector, manual clips, and clip-local update states](./task-4.md)
5. [Project settings side rail and scoped settings surfaces](./task-5.md)
6. [YouTube connection, channel/account management, publishing gallery, and Details drawer](./task-6.md)
7. [Cross-journey integration, accessibility, responsive, and regression verification](./task-7.md)

## Approved review artifacts

The `brainstorm/` directory preserves visual-review HTML for this revision.
Each artifact documents one screen or transition in the user journey.

## Approved journey

Home and project library → create project → source validation recovery →
processing → clip editor → manual clip creation → local result downloads →
YouTube connection/channel selection → publishing gallery → project settings.

## Design-review sequence

1. Home and project library.
2. Source intake, project title, output-frame default, validation recovery, and
   AI-assisted mode.
3. Processing status, ETA, budget, and logs.
4. Editor, inspector tabs, manual clips, and clip-local update processing.
5. Local rendered-result downloads.
6. YouTube connection/channel selection, account switching, gallery, details
   drawer, and publishing tabs.
7. Project settings and side-tab content.
