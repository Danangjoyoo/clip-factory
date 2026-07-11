'use client';
import { AnalysisSettings } from './AnalysisSettings';
import { SourceMethodFields } from './SourceMethodFields';
import { useNewProjectForm } from './use-new-project-form';
import { defaults, type CatalogView } from './new-project.presentation';
export function NewProjectForm({
  catalog = {},
  onEstimate,
  onSubmit,
}: {
  catalog?: CatalogView;
  onEstimate?: (value: unknown) => void;
  onSubmit?: (value: unknown) => void;
}) {
  const form = useNewProjectForm();
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.valid) return;
    onEstimate?.(form.value);
    onSubmit?.(form.value);
  };
  return (
    <form onSubmit={submit}>
      <h1>New project</h1>
      <label>
        Project name
        <input aria-label="Project name" required />
      </label>
      <SourceMethodFields
        method={form.value.sourceMethod}
        path={form.value.path}
        file={form.value.file}
        onMethod={(sourceMethod) => form.update({ sourceMethod })}
        onPath={(path) => form.update({ path })}
        onFile={(file) => form.update({ file })}
      />
      <AnalysisSettings
        discover={form.value.discoverHighlights}
        model={form.value.model}
        reasoning={form.value.reasoning}
        catalog={catalog}
        onDiscover={(discoverHighlights) => form.update({ discoverHighlights })}
        onModel={(model) =>
          form.update({ model, reasoning: defaults.reasoning })
        }
        onReasoning={(reasoning) => form.update({ reasoning })}
      />
      <label>
        Language
        <select
          aria-label="Language"
          value={form.value.language}
          onChange={(e) => form.update({ language: e.target.value })}
        >
          <option value="en">English</option>
          <option value="es">Spanish</option>
          <option value="ja">Japanese</option>
        </select>
      </label>
      <label>
        Maximum spend (USD)
        <input
          aria-label="Maximum spend (USD)"
          value={form.value.maximumSpendUsd}
          onChange={(e) => form.update({ maximumSpendUsd: e.target.value })}
        />
      </label>
      <label>
        Maximum clips
        <input
          aria-label="Maximum clips"
          type="number"
          value={form.value.maximumClips}
          onChange={(e) =>
            form.update({ maximumClips: Number(e.target.value) })
          }
        />
      </label>
      <label>
        Maximum clip length (seconds)
        <input
          aria-label="Maximum clip length (seconds)"
          type="number"
          value={form.value.maximumClipSeconds}
          onChange={(e) =>
            form.update({ maximumClipSeconds: Number(e.target.value) })
          }
        />
      </label>
      <label>
        Platform guide
        <select
          aria-label="Platform guide"
          value={form.value.platform}
          onChange={(e) => form.update({ platform: e.target.value })}
        >
          <option value="YOUTUBE_SHORTS">YouTube Shorts</option>
          <option value="INSTAGRAM_REELS">Instagram Reels</option>
          <option value="TIKTOK">TikTok</option>
        </select>
      </label>
      <label>
        Instruction
        <textarea
          aria-label="Instruction"
          value={form.value.instruction}
          onChange={(e) => form.update({ instruction: e.target.value })}
        />
      </label>
      <button type="submit" disabled={!form.valid}>
        Create project
      </button>
    </form>
  );
}
