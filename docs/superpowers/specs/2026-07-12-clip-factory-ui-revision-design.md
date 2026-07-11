# Clip Factory UI Revision Design

## Purpose

Restore the desktop-first editing-studio experience approved during the original
brainstorm. The UI must make the source-to-short workflow feel coherent: start
a project, understand the spending decision, track processing, review clips,
edit a selected clip, and render it.

## Scope

This revision changes presentation and client-side theme preference only. It
does not change API contracts, domain services, persistence models, job state,
or render behaviour.

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

Use a two-column desktop form: source selection and file/path input on the
left; analysis controls on the right. The analysis area groups language,
OpenAI highlight toggle, model, reasoning, budget cap, max clips, maximum clip
duration, platform guide, and optional instruction. Keep the existing form
field labels and submission behaviour. Add a concise preflight/cost panel using
available form data; do not invent an estimate API.

### Processing

Present the processing state as a focused run sheet: current stage, numeric
progress, ETA, budget status, pause/resume/cancel actions, and sanitized logs.
The stage timeline should use the theme accent only as a supplement to explicit
status labels.

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

## Out of scope

- New backend endpoints or data models.
- Custom font loading, image generation, video rendering changes, or animation
  systems.
- A different information architecture for each theme.

## Self-review

- No placeholders or unresolved decisions remain.
- Theme changes are isolated to the delivery layer and do not alter API/domain
  contracts.
- The scope is a single cohesive UI-system revision with testable page updates.
