# Clip Factory UI Revision Design

## Purpose

Restore the desktop-first editing-studio experience approved during the original
brainstorm. The UI must make the complete source-to-short journey coherent:
project library, source intake, processing, clip editing, local downloads,
YouTube account connection, publishing, and project settings.

## Scope

This revision changes presentation, client-side theme preference, and
delivery-layer state handling. It consumes existing Phase 1 and approved Phase
2 contracts; it does not change the MVP render contract: output remains
vertical 9:16 at 1080×1920, H.264/AAC MP4. Additional output resolutions are
explicitly out of scope.

## Visual direction

Clip Factory is a control room for creators turning long recordings into
vertical social clips. It is not a generic dashboard. The shared chrome uses a
quiet, dark studio surface; the video preview, waveform, captions, and the
selected clip are the visual focus.

One responsive information architecture serves all themes. A theme only
changes CSS tokens and never moves controls or changes an action's name.

### Theme tokens

| Theme | Canvas | Surface | Text | Accent | Active-word accent |
| --- | --- | --- | --- | --- | --- |
| Tactile Cutting Room | `#15191D` | `#20231F` | `#F5E7BD` | `#D6B66A` | `#F5E7BD` |
| Midnight Signal | `#101827` | `#172437` | `#E7FBFF` | `#88D8E6` | `#98F0FF` |
| Creator Signal | `#1B1021` | `#29152F` | `#FFE2F8` | `#EE7BD2` | `#FBD66C` |

Use a system sans-serif stack for controls and data. Use a slightly wider,
uppercase utility treatment for project, timing, and cost metadata. No new font
dependency is needed.

### Theme behaviour

- Provide a labelled theme selector in the global application header.
- Persist the selected theme in `localStorage` under one stable key.
- Respect the stored theme on later visits; use Midnight Signal when no choice
  exists.
- Keep keyboard focus, contrast, and reduced-motion behaviour intact in every
  theme.

## Shared application shell

On desktop, a compact header contains the Clip Factory mark, navigation
(Projects, Usage, Settings), current worker health, and the theme selector.
The primary workspace remains directly below it without a marketing-style
hero. On narrow screens the header wraps and the editing workspace stacks.

The shell is presentation-only. Existing page components retain ownership of
their own data and actions.

## Screen revisions

### Projects library

Replace plain card grid treatment with a project workbench. Each project shows
its name, source health, current state, percentage/progress text, ETA when
available, accepted/rendered clip counts, spend, and last update. The empty
state gives one clear action: **Create your first project**.

### New project

Use a two-column desktop form: required project title and source selection on
the left; analysis controls on the right. The source supports upload and local
path methods. A validation failure preserves the title and all configuration,
clearly states the failing source condition, blocks analysis, and offers the
single relevant recovery action: replace or relink the source.

Replace the binary highlight toggle with an `AI-assisted mode` selector:

| Mode | Behaviour |
| --- | --- |
| Manual | No OpenAI calls. Clip selection, metadata, and publishing details are manual. Local transcription and media rendering remain available. |
| Partial | AI suggests highlight candidates for clip editing. Captions and publishing details stay manual. |
| Advanced | AI suggests highlights and drafts YouTube metadata for review. |
| Complete | AI suggests highlights, metadata, and publishing times. The user still confirms every upload and schedule. |

The analysis area also groups language, model, reasoning, budget cap, maximum
clips, maximum clip duration, output frame, and optional instruction. Output
frame is displayed as `Vertical 9:16 · 1080×1920`; it is a fixed MVP render
capability, not a multi-option resolution selector. Form selects share one
label, selected-value, chevron, focus, and menu treatment.

Add a concise preflight/cost panel using available data. The hard spend limit
applies to every selected AI-assisted step. No estimate API is invented.

### Processing

Present the processing state as a focused run sheet: current stage, numeric
progress, ETA, budget status, pause/resume/cancel actions, and sanitized logs.
The stage timeline should use the theme accent only as a supplement to explicit
status labels. Explain that the ETA is based on completed worker-stage timings.

### Editor

Preserve the original approved editing topology at desktop widths:

```text
filmstrip | vertical preview + trim timeline | inspector
          | render actions                   |
```

The selected clip is visually distinct. The vertical preview remains the
largest element. The waveform selection, selected thumbnail, and caption
active word use the current theme accent. The inspector retains caption, frame,
and metadata tabs, including model/reasoning/cost provenance. At narrow widths,
the regions stack in the same working order: selected clip, preview, timeline,
inspector, actions.

The editor shows the project output-frame default beside the selected source
range. Individual clips may override crop/focal point, not output resolution.
The Frame tab contains reframe mode, focal point, and safe-area controls. The
Metadata tab is read-only provenance: candidate score, model, reasoning,
selection cost, source range, transcript language, and inherited output frame.

`Add manual clip` accepts only start and end source timecodes. The range must be
within the source and under the project maximum duration. It reuses the existing
transcript to create captions, creates a manual candidate with zero OpenAI
selection cost, and opens the candidate in the editor. Source audio and burned-
in captions are stitched at render time, not on manual-clip creation.

After a frame, trim, or caption change requiring regeneration, display a
clip-local `Updating preview` state. The affected candidate shows progress in
the left filmstrip and has rendering disabled; ready candidates remain
selectable and editable. Completion replaces the preview and re-enables
rendering for that candidate.

### Results and local downloads

The project `Clips` tab is the local result dashboard, independent of YouTube.
Each rendered clip shows poster, duration, origin/score, file size, render
format, and `Download MP4`. Finished clips may be downloaded individually or
as an explicit selected/all ZIP action while other clips continue rendering.

### YouTube connection and publishing

The approved Phase 2 native OAuth design remains authoritative. The UI path is:
`Connect YouTube` → system-browser Google consent → return to Clip Factory →
choose an available personal or Brand channel → unlock project publishing for
that selected channel. OAuth secrets and tokens never enter the browser,
Docker, Git, logs, Redis, PostgreSQL, or MinIO; the native worker and macOS
Keychain own the sensitive flow.

The connected-channel chip opens account management. `Switch channel` performs
an explicit disconnect/reconnect and fresh channel selection; it never moves
existing uploads or schedules. `Disconnect` removes/revokes the token while
preserving nonsecret local publication history and drafts.

The project `YouTube` tab provides a clean, consistent gallery/list of rendered
clips. Cards show only poster, duration, title, compact status, and one
`Details` action. Details opens a drawer with these tabs:

- `Publishing`: visibility, upload state, and YouTube Studio URL.
- `Metadata`: reviewed title, description, hashtags/tags, and AI provenance.
- `Thumbnail`: selected cover frame or upload flow, without promising Shorts
  thumbnail placement where YouTube does not support it.
- `Schedule`: per-clip date, time, IANA timezone, and reviewed publish state.

Each schedule and upload remains explicit. Complete AI-assisted mode can
recommend a publishing time but never creates a schedule or upload without user
confirmation.

### Project settings

Project settings are limited to the current project and use a stable side rail:
`General`, `Source`, `Defaults`, and `Danger zone`. General changes title and
project instruction. Source exposes current validation health and relinking.
Defaults apply only to new manual clips: output frame, platform guide, maximum
clip duration, and caption style. Existing clips retain their own edits.
Danger-zone deletion removes local project data only; downloaded files and
remote YouTube videos are never deleted automatically.

### Usage and settings

Apply the shared panel, data-table, heading, and button treatments. Do not
change their domain content or add charts without data already supplied by the
page.

## Component boundaries

- `AppShell` owns navigation, health display, and theme selection.
- `ThemeProvider` owns the `data-theme` value and local preference persistence.
- Page-level components own layout composition only.
- Existing domain-connected form, processing, editor, and usage components
  keep their current props and actions.
- CSS modules own local layouts; global styles own reset, tokens, focus, and
  shared primitives.

The project-level AI mode, clip-local preview state, and publishing drawer are
delivery-layer projections of their respective approved application/workflow
contracts. Any missing contract is added in its owning module; components do
not invent or persist business state themselves.

This preserves clean architecture: a theme is a delivery-layer concern and
must not enter application or domain code.

## Accessibility and verification

- Theme selector is a labelled native control and works with keyboard input.
- Every primary action has visible focus and text, not color-only meaning.
- The desktop editor remains usable at 1024px and stacks at narrower widths.
- Add component tests for theme persistence/default selection and shell
  navigation labels. Keep existing UI interaction tests green.
- Verify the project library, new-project form, processing view, editor, usage,
  and settings pages render inside the shared shell.
- Verify source-validation recovery preserves setup values; manual clip timecode
  validation and transcript-caption reuse remain visible; and a clip-local
  update does not disable ready filmstrip candidates.
- Verify YouTube connection, channel switch/disconnect, details-drawer tabs,
  local result downloads, and project settings use plain-language, explicit
  actions.

## Out of scope

- Custom font loading, image generation, video rendering changes, or animation
  systems.
- A different information architecture for each theme.
- Multiple output resolutions or per-clip resolution overrides.
- Automatic uploads or publication without user confirmation.

## Self-review

- No placeholders or unresolved decisions remain.
- Theme changes are isolated to the delivery layer; new workflow states are
  consumed through their owning module rather than stored in UI components.
- The scope covers one cohesive, testable UI-system revision and its already
  approved Phase 2 publishing surfaces.
