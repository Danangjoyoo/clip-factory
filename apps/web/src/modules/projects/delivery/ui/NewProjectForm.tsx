'use client';
import { useEffect, useState } from 'react';
import { AnalysisSettings } from './AnalysisSettings';
import { SourceMethodFields } from './SourceMethodFields';
import {
  SourceValidationPanel,
  type SourceValidationError,
} from './SourceValidationPanel';
import { useNewProjectForm } from './use-new-project-form';
import {
  defaults,
  projectModeFor,
  type CatalogView,
} from './new-project.presentation';
import styles from './NewProjectForm.module.css';
export function NewProjectForm({
  catalog = {},
  sourceValidationError,
  onEstimate,
  onSubmit,
}: {
  catalog?: CatalogView;
  sourceValidationError?: SourceValidationError;
  onEstimate?: (value: unknown) => void;
  onSubmit?: (value: unknown) => void;
}) {
  const form = useNewProjectForm();
  const [sourceError, setSourceError] = useState(sourceValidationError);
  useEffect(
    () => setSourceError(sourceValidationError),
    [sourceValidationError],
  );
  const unavailableMode =
    form.value.aiMode === 'ADVANCED' || form.value.aiMode === 'COMPLETE';
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.valid || sourceError || unavailableMode) return;
    const value = { ...form.value, mode: projectModeFor(form.value.aiMode) };
    onEstimate?.(value);
    onSubmit?.(value);
  };
  return (
    <form className={styles.form} onSubmit={submit}>
      <h1>New project</h1>
      <label className={styles.project}>
        Project name
        <input
          aria-label="Project name"
          required
          value={form.value.name}
          onChange={(e) => form.update({ name: e.target.value })}
        />
      </label>
      <div className={styles.source}>
        <SourceMethodFields
          method={form.value.sourceMethod}
          path={form.value.path}
          file={form.value.file}
          onMethod={(sourceMethod) => form.update({ sourceMethod })}
          onPath={(path) => form.update({ path })}
          onFile={(file) => form.update({ file })}
        />
        <SourceValidationPanel
          title={form.value.name}
          error={sourceError}
          onReplace={() => {
            setSourceError(undefined);
            form.update({ sourceMethod: 'FILEPATH' });
          }}
        />
      </div>
      <div className={styles.analysis}>
        <AnalysisSettings
          mode={form.value.aiMode}
          model={form.value.model}
          reasoning={form.value.reasoning}
          catalog={catalog}
          onMode={(aiMode) => form.update({ aiMode })}
          onModel={(model) =>
            form.update({ model, reasoning: defaults.reasoning })
          }
          onReasoning={(reasoning) => form.update({ reasoning })}
        />
      </div>
      <div className={styles.controls}>
        <label className={styles.control}>
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
        <label className={styles.control}>
          Maximum spend (USD)
          <input
            aria-label="Maximum spend (USD)"
            value={form.value.maximumSpendUsd}
            onChange={(e) => form.update({ maximumSpendUsd: e.target.value })}
          />
        </label>
        <label className={styles.control}>
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
        <label className={styles.control}>
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
        <label className={styles.control}>
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
        <label className={styles.control}>
          Output frame
          <input readOnly value="Vertical 9:16 · 1080×1920" />
        </label>
        <label className={styles.control}>
          Instruction
          <textarea
            aria-label="Instruction"
            value={form.value.instruction}
            onChange={(e) => form.update({ instruction: e.target.value })}
          />
        </label>
      </div>
      <aside className={styles.cost} aria-label="Cost and reserve">
        <strong>Cost reserve</strong>
        <p>Up to ${form.value.maximumSpendUsd} reserved before AI analysis.</p>
        {unavailableMode ? (
          <p>
            Advanced and Complete publishing are presentation-only until Phase 2
            is connected.
          </p>
        ) : null}
      </aside>
      <button
        type="submit"
        disabled={!form.valid || Boolean(sourceError) || unavailableMode}
      >
        Create project
      </button>
    </form>
  );
}
