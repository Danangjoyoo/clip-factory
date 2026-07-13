# UI Brainstorm Page Parity Audit

Date: 2026-07-13

Scope: compare the current Next.js app routes and delivery UI against the approved HTML review artifacts in `docs/superpowers/plans/ui-revision/brainstorm`.

Status key:

| Status | Meaning |
| --- | --- |
| Implemented | Route/component exists and broadly matches the approved brainstorm screen. |
| Partial | Core surface exists, but important content, interaction, data wiring, or visual details differ. |
| Missing | Approved brainstorm page/state has no current route/component implementation. |
| Different | Feature exists, but its current visual style or behavior intentionally or accidentally diverges from the approved design. |

## Current App Page Coverage

| App page / route | Current implementation | Closest brainstorm artifact(s) | Status | Missing / different design notes |
| --- | --- | --- | --- | --- |
| `/` project library | `ProjectLibraryPage`, `ProjectLibrary`, `ProjectCard` | `e2e-01-home-library.html` | Partial | Workbench, cards, empty CTA, theme shell exist. Live cards currently map `etaLabel`, `candidateCount`, and `renderCount` to `null`; monthly spend side panel is generic/static rather than the artifact's concrete spend meter. |
| `/projects/new` source intake | `NewProjectPage`, `NewProjectForm`, `SourceMethodFields`, `AnalysisSettings` | `e2e-02-source-intake-v2-title.html`, `e2e-02c-source-intake-output-frame.html`, `e2e-02d-source-intake-output-frame-layout.html`, `e2e-02g-ai-assisted-mode.html` | Partial | Project title, upload/local path, AI-assisted mode, model/reasoning, budget, max clips, max duration, instruction, and fixed `Vertical 9:16 - 1080x1920` frame exist. Advanced/Complete modes are blocked as presentation-only, and the cost panel is a reserve note rather than the brainstorm's richer estimate/preflight panel. |
| Source validation recovery | `SourceValidationPanel` | `e2e-02b-source-validation-failed.html` | Partial | Component preserves title and shows `Replace source`, but `NewProjectPage` does not currently wire a validation-failed route/state from the project/workflow result; failed project creation falls back to a generic submit error. |
| Intake output-frame open state | Read-only input in `NewProjectForm` | `e2e-02e-output-frame-dropdown.html` | Different | Current UI uses a read-only input for the single supported frame. Brainstorm shows an open selector explaining the single MVP option and per-clip crop/focal-point override. |
| Intake dropdown states | Native `<select>` controls | `e2e-02f-form-dropdowns.html` | Different | Native selects match plan constraints, but the visual open-menu treatment from the artifact is not represented in-app. Browser-native open states are not custom styled. |
| `/projects/[projectId]/processing` | `ProcessingLocalPage`, `ProcessingView`, `StageTimeline`, logs/budget panels | `e2e-03-processing.html` | Partial | Run sheet, percentage, ETA explanation, budget guard, controls, and sanitized logs exist. `ProcessingLocalPage` POSTs once and redirects to editor on completion; it does not maintain the artifact's richer live stage projection, concrete allocated cost, candidate target, or active ETA updates unless supplied by a fuller projection. |
| `/projects/[projectId]/editor` | `EditorLocalPage`, `EditorShell`, filmstrip, preview, timeline, inspector tabs | `e2e-04-editor.html`, `e2e-04b-editor-inspector-tabs.html`, `e2e-04c-editor-workspace-output-frame.html` | Partial | Desktop topology exists: filmstrip, preview/timeline, inspector. Differences: preview is a plain video element without the artifact's phone/safe-area/caption composition; timeline is range inputs rather than waveform/ruler selection; frame inspector lacks visible safe-area and reframe-mode controls; provenance appears only when supplied by clip data. |
| Manual clip dialog | `AddClipDialog` | `e2e-04d-manual-clip.html` | Partial | Start/end timecode inputs and transcript reuse note exist. Dialog validates format/order locally, but source-range and max-duration enforcement are left to the service layer; no transcript excerpt or explicit `$0.00 selection cost` display appears in the current dialog. |
| Clip-local update state | `previewState`, `ClipUpdateOverlay`, filmstrip status text | `e2e-04e-editor-updating.html`, `e2e-04f-editor-updating-clip-local.html` | Partial | Updating overlay and selected-render disable exist; ready clips remain selectable. Copy and visual treatment are much thinner than the artifact, and filmstrip does not show the same explicit ready/updating badge treatment. |
| `/projects/[projectId]/clips` local downloads | `ResultsDashboard` | `e2e-06-results-downloads.html` | Partial | Local results cards, poster block, render state, duration, origin, file size, format, editor action, and `Download MP4` behavior exist. The route currently does not pass `onDownloadAll`, so `Download all (.zip)` is absent in normal page rendering; selection controls are also absent. |
| `/projects/[projectId]/youtube` publishing workspace | No route or delivery UI directory | `e2e-05-youtube-publishing.html`, `e2e-05b-youtube-details-drawer.html`, `e2e-05c-youtube-detail-tabs.html` | Missing | Approved YouTube gallery/list, card `Details` action, details drawer, Publishing/Metadata/Thumbnail/Schedule tabs, upload/schedule controls, and per-clip publishing records are not implemented. The project workspace tab renders as disabled text on Clips and Project settings. |
| YouTube connection/channel/account states | No delivery UI components | `e2e-05d-youtube-connect-channel.html`, `e2e-05e-youtube-account-menu.html` | Missing | `Connect YouTube`, sanitized channel chooser, connected channel chip, account menu, switch channel, disconnect, and connection health UI are absent. Persistence/data-service modules exist under `youtube-publishing`, but delivery UI does not. |
| `/projects/[projectId]/settings` | `ProjectSettingsLocalPage`, `ProjectSettingsView` | `e2e-07-project-settings-v2.html`, `e2e-07-project-settings.html`, `e2e-07b-project-settings-tabs.html` | Partial | Side rail and four sections exist: General, Source, Defaults, Danger zone. Current route uses placeholder client-local state rather than a project-backed view model, and the YouTube tab is disabled. Current implementation shows one tab panel at a time, matching task intent and `07b`, but not the all-sections-at-once `07` mockup. |
| `/usage` | `UsageView`, `CostSummary`, `UsageTable` | UI revision spec says to apply shared table/panel treatment | Implemented | No dedicated brainstorm HTML page. Current route uses the shared dark studio/table language. |
| `/settings` global settings | `SettingsPage`, `SettingsOpenAIForm` | UI revision spec says to apply shared panel treatment | Partial | OpenAI settings are styled in the studio language. YouTube/global account surfaces implied by the brainstorm account menu are not present here or elsewhere. |

## Brainstorm Artifact Coverage

| Brainstorm artifact | Target page/state | Current status | Notes |
| --- | --- | --- | --- |
| `e2e-01-home-library.html` | Home/project library workbench | Partial | Route exists; data richness and spend meter are incomplete. |
| `e2e-02-source-intake.html` | Initial source intake without title/output-frame revisions | Superseded/Partial | Later `2c/2d/v2/g` variants are closer to current target. |
| `e2e-02-source-intake-v2-title.html` | Source intake with project title | Partial | Title exists. |
| `e2e-02b-source-validation-failed.html` | Failed source validation recovery | Partial | Component exists, route/data wiring is incomplete. |
| `e2e-02c-source-intake-output-frame.html` | Intake with output-frame default | Partial | Fixed frame exists; explanatory selector state is absent. |
| `e2e-02d-source-intake-output-frame-layout.html` | Refined intake layout | Partial | Two-column layout exists. |
| `e2e-02e-output-frame-dropdown.html` | Output-frame selector open state | Different | Implemented as read-only input, not open selector. |
| `e2e-02f-form-dropdowns.html` | Consistent form dropdown states | Different | Native selects exist; custom visual open state absent. |
| `e2e-02g-ai-assisted-mode.html` | AI-assisted mode levels | Partial | Modes exist; downstream Advanced/Complete behavior is not wired. |
| `e2e-03-processing.html` | Processing run sheet | Partial | Surface exists; live/projection richness is limited. |
| `e2e-04-editor.html` | Clip editor | Partial | Topology exists; preview, waveform, and inspector visuals are simplified. |
| `e2e-04b-editor-inspector-tabs.html` | Inspector tab contents | Partial | Tabs exist; frame/caption controls are thinner. |
| `e2e-04c-editor-workspace-output-frame.html` | Editor with inherited output frame | Partial | Output frame can display via props but current page does not guarantee populated project output-frame data. |
| `e2e-04d-manual-clip.html` | Add manual clip modal | Partial | Dialog exists; transcript excerpt, cost copy, and full validation feedback are missing. |
| `e2e-04e-editor-updating.html` | Selected clip updating overlay | Partial | Overlay exists; artifact-level copy/progress styling is simplified. |
| `e2e-04f-editor-updating-clip-local.html` | Clip-local updating with ready siblings selectable | Partial | Behavior exists; visual badges and explanatory rail note are missing. |
| `e2e-05-youtube-publishing.html` | YouTube publishing gallery | Missing | No route/components. |
| `e2e-05b-youtube-details-drawer.html` | Clean gallery with Details drawer | Missing | No route/components. |
| `e2e-05c-youtube-detail-tabs.html` | Details drawer tab contents | Missing | No drawer/tabs. |
| `e2e-05d-youtube-connect-channel.html` | Connect YouTube and choose channel | Missing | No connection/channel chooser UI. |
| `e2e-05e-youtube-account-menu.html` | Switch/disconnect account menu | Missing | No account menu UI. |
| `e2e-06-results-downloads.html` | Local result downloads | Partial | Results route exists; ZIP/select actions not wired by route. |
| `e2e-07-project-settings.html` | Project settings all-section mockup | Partial | Current implementation prefers side-tab content rather than all sections visible. |
| `e2e-07-project-settings-v2.html` | Project settings revised shell | Partial | Surface exists with placeholder state. |
| `e2e-07b-project-settings-tabs.html` | Project settings side-tab contents | Implemented | Closest match among settings artifacts, subject to placeholder data wiring. |
| `original-source-input-workflow.html` | Legacy source-method concept | Implemented | Upload and local filepath methods both exist. |
| `original-end-to-end-workflow.html` | Legacy pipeline overview | Partial | Core route sequence exists; YouTube extension and some render/download controls are incomplete. |
| `original-review-workspace.html` | Legacy editor layout exploration | Partial | Current editor follows the selected filmstrip/preview/inspector topology. |
| `original-youtube-publishing-gallery.html` | Legacy Phase 2 publishing workspace | Missing | Same missing YouTube delivery UI as `e2e-05*`. |

## Missing Files From Approved UI Task 6

`docs/superpowers/plans/ui-revision/task-6.md` lists these deliverables. None were found in the current app tree.

| Planned file | Current status |
| --- | --- |
| `apps/web/src/modules/youtube-publishing/delivery/ui/YouTubeConnectionView.tsx` | Missing |
| `apps/web/src/modules/youtube-publishing/delivery/ui/YouTubeAccountMenu.tsx` | Missing |
| `apps/web/src/modules/youtube-publishing/delivery/ui/PublishingGallery.tsx` | Missing |
| `apps/web/src/modules/youtube-publishing/delivery/ui/PublicationDetailsDrawer.tsx` | Missing |
| `apps/web/src/modules/youtube-publishing/delivery/ui/PublishingView.module.css` | Missing |
| `apps/web/src/modules/youtube-publishing/delivery/ui/PublishingGallery.test.tsx` | Missing |
| `apps/web/src/app/projects/[projectId]/youtube/page.tsx` | Missing |
| `apps/web/src/modules/youtube-publishing/delivery/http/publishing-ui.controller.ts` | Missing |

Related evidence: `apps/web/src/modules/youtube-publishing` currently contains domain/application/persistence/composition code, but no `delivery/` directory. Project workspace navigation renders YouTube as disabled text in `ResultsDashboard` and `ProjectSettingsView`.

## Style And Design Differences

| Area | Approved design | Current app | Status |
| --- | --- | --- | --- |
| Shared shell | Compact dark studio bar with brand, nav, worker status, theme selector | Present in `AppShell`; broadly matches | Implemented |
| Theme persistence | Default Midnight Signal, store `clip-factory.theme` | Present in `ThemeProvider` | Implemented |
| Creator Signal tokens | Spec token table: purple/pink/yellow palette (`#1B1021`, `#29152F`, `#FFE2F8`, `#EE7BD2`, `#FBD66C`) | Current `signal` theme is blue/green (`#141623`, `#202235`, `#f4f7ff`, `#8ee6b6`, `#fbd66c`) | Different |
| Midnight Signal tokens | Spec token table uses surface `#172437` and accent `#88D8E6`; brainstorm HTML uses more cyan-heavy `#98f0ff` | Current app follows the cyan-heavy brainstorm more than the spec table | Different |
| Select/dropdown styling | Consistent label/value/chevron/open menu treatment in artifacts | Native selects with browser open state | Different by plan constraint |
| Project tabs | Clips, YouTube, Usage, Project settings as peer project workspace tabs | Clips/settings routes show YouTube as disabled and Usage links to global `/usage` | Partial |
| Visual media surfaces | Mock phone/poster/safe-area/waveform visuals guide the workflow | Current results cards have simple poster blocks; editor preview is plain video; no waveform/safe-area preview in the main preview | Partial |
| Data richness | Artifacts show concrete ETA, cost, candidate counts, render counts, source duration, schedule/timezone, channel health | Many current pages accept props for these but local/page composition often supplies placeholders, `null`, or no handler | Partial |

## Root Cause Summary

| Gap | Likely root cause from repo evidence |
| --- | --- |
| YouTube UI missing | UI revision task 6 depends on Phase 2 YouTube Tasks 8, 13, and 14 exposing sanitized connection/publication view models. The current repo has YouTube persistence/data services, but no delivery UI route/components. |
| Source validation recovery incomplete | The recovery panel was added as a component, but `NewProjectPage` only passes generic submit errors and does not route project validation failures back into the recovery screen. |
| Processing page less rich than artifact | The local processing page starts the workflow with one POST and redirects on completion, so it does not yet consume a live stage projection comparable to the brainstorm run sheet. |
| Downloads missing route-level ZIP action | `ResultsDashboard` supports `onDownloadAll`, but `/projects/[projectId]/clips/page.tsx` only passes clip data. |
| Project settings uses placeholder data | `/projects/[projectId]/settings/page.tsx` renders `ProjectSettingsLocalPage`, which owns client-local placeholder state instead of a project-backed view model. |
| Several visual differences remain | The existing `2026-07-13-ui-brainstorm-parity.md` plan was a CSS/static-review pass with no automated tests and did not cover missing delivery routes or data wiring. |

## Priority Fix Table

| Priority | Page / area | Work needed |
| --- | --- | --- |
| P0 | YouTube publishing | Implement task 6 delivery UI: `/projects/[projectId]/youtube`, connection view, channel chooser, account menu, publishing gallery, Details drawer, drawer tabs, and sanitized controller/view models. |
| P1 | Project workspace navigation | Replace disabled YouTube tab with a real project YouTube route once P0 lands; decide whether Usage is global or project-scoped. |
| P1 | Processing | Wire `ProcessingView` to live job/stage projection instead of one-shot local POST state, including concrete allocated cost/candidate target when available. |
| P1 | Source validation recovery | Route validation failures into `SourceValidationPanel` with preserved setup values and explicit replace/relink action. |
| P1 | Results downloads | Pass ZIP/select actions into `ResultsDashboard` or remove the brainstorm expectation from scope. |
| P2 | Project settings | Replace `ProjectSettingsLocalPage` placeholder state with a project-backed composition/view model. |
| P2 | Editor polish | Add richer preview/safe-area/waveform/provenance visuals where data exists; make update and manual-clip states match artifact copy more closely. |
| P2 | Theme parity | Decide whether `Creator Signal` should match the approved spec table or the later CSS pass; update tokens accordingly. |
