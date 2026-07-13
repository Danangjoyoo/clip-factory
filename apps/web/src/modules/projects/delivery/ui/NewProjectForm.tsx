'use client';
import { useEffect, useState } from 'react';
import { AnalysisSettings } from './AnalysisSettings';
import { SourceMethodFields } from './SourceMethodFields';
import {
  SourceValidationPanel,
  type SourceValidationError,
} from './SourceValidationPanel';
import { useNewProjectForm } from './use-new-project-form';
import type { NewProjectFormValue } from './use-new-project-form';
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
  submitting = false,
  submitError,
  openAiApiKeyConfigured = true,
}: {
  catalog?: CatalogView;
  sourceValidationError?: SourceValidationError;
  onEstimate?: (value: unknown) => void;
  onSubmit?: (value: NewProjectFormValue) => void | Promise<void>;
  submitting?: boolean;
  submitError?: string;
  openAiApiKeyConfigured?: boolean;
}) {
  const form = useNewProjectForm(
    openAiApiKeyConfigured ? defaults.aiMode : 'MANUAL',
  );
  const [sourceError, setSourceError] = useState(sourceValidationError);
  useEffect(
    () => setSourceError(sourceValidationError),
    [sourceValidationError],
  );
  const unavailableMode =
    form.value.aiMode === 'ADVANCED' || form.value.aiMode === 'COMPLETE';
  const aiControlsVisible =
    openAiApiKeyConfigured && form.value.aiMode !== 'MANUAL';
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.valid || sourceError || unavailableMode) return;
    const value = { ...form.value, mode: projectModeFor(form.value.aiMode) };
    onEstimate?.(value);
    void onSubmit?.(value);
  };
  return (
    <form className={styles.form} onSubmit={submit}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>New project</p>
        <h1>New project</h1>
        <h2>Name it, then bring in your source.</h2>
        <p>
          Create a review-ready clip project without losing control of the final
          frame, quality, or spend.
        </p>
      </header>
      <section className={`${styles.panel} ${styles.source}`}>
        <label className={styles.project}>
          <span>Project title</span>
          <input
            aria-label="Project name"
            required
            value={form.value.name}
            onChange={(e) => form.update({ name: e.target.value })}
          />
        </label>
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
          {...(sourceError ? { error: sourceError } : {})}
          onReplace={() => {
            setSourceError(undefined);
            form.update({ sourceMethod: 'FILEPATH' });
          }}
        />
      </section>
      <section className={`${styles.panel} ${styles.analysis}`}>
        <span className={styles.panelLabel}>Analysis plan</span>
        <AnalysisSettings
          mode={form.value.aiMode}
          model={form.value.model}
          reasoning={form.value.reasoning}
          catalog={catalog}
          openAiApiKeyConfigured={openAiApiKeyConfigured}
          onMode={(aiMode) => form.update({ aiMode })}
          onModel={(model) =>
            form.update({ model, reasoning: defaults.reasoning })
          }
          onReasoning={(reasoning) => form.update({ reasoning })}
        />
        {aiControlsVisible ? (
          <>
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
                  onChange={(e) =>
                    form.update({ maximumSpendUsd: e.target.value })
                  }
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
                    form.update({
                      maximumClipSeconds: Number(e.target.value),
                    })
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
                  onChange={(e) =>
                    form.update({ instruction: e.target.value })
                  }
                />
              </label>
            </div>
            <aside className={styles.cost} aria-label="Cost and reserve">
              <strong>Every clip inherits Vertical 9:16 · 1080×1920.</strong>
              <p>
                Up to ${form.value.maximumSpendUsd} is reserved before AI
                analysis. Per-clip crop and focal point are editable later.
              </p>
              {unavailableMode ? (
                <p>
                  Advanced and Complete publishing are presentation-only until
                  Phase 2 is connected.
                </p>
              ) : null}
            </aside>
          </>
        ) : (
          <aside className={styles.cost} aria-label="Manual mode">
            <strong>Manual mode uses no OpenAI calls.</strong>
            <p>
              The source still processes into a transcript. Clip selection,
              metadata, and publishing details stay manual.
            </p>
          </aside>
        )}
      </section>
      <footer className={styles.footer}>
        <span>
          You can edit clip boundaries, captions, and per-clip framing before
          rendering.
        </span>
        <button
          type="submit"
          disabled={
            !form.valid || Boolean(sourceError) || unavailableMode || submitting
          }
        >
          {submitting ? 'Creating project…' : 'Create project'}
        </button>
      </footer>
      {submitError ? <p role="alert">{submitError}</p> : null}
    </form>
  );
}
