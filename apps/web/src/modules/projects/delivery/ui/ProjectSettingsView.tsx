'use client';

import { useState } from 'react';
import type { ProjectSettingsViewModel } from './project.presentation';
import styles from './ProjectSettingsView.module.css';

export type { ProjectSettingsViewModel } from './project.presentation';

type Section = 'general' | 'source' | 'defaults' | 'danger';

type Props = Readonly<{
  value: ProjectSettingsViewModel;
  onSaveGeneral: (value: { title: string; instruction: string }) => void;
  onRelinkSource: () => void;
  onSaveDefaults: (value: {
    platform: string;
    maxDuration: string;
    captionStyle: string;
  }) => void;
  onDeleteProject: () => void;
}>;

const tabs: ReadonlyArray<{ id: Section; label: string }> = [
  { id: 'general', label: 'General' },
  { id: 'source', label: 'Source' },
  { id: 'defaults', label: 'Defaults' },
  { id: 'danger', label: 'Danger zone' },
];

export function ProjectSettingsView({
  value,
  onSaveGeneral,
  onRelinkSource,
  onSaveDefaults,
  onDeleteProject,
}: Props) {
  const [section, setSection] = useState<Section>('general');
  const [title, setTitle] = useState(value.projectTitle);
  const [instruction, setInstruction] = useState(value.instruction);
  const [platform, setPlatform] = useState(value.platformLabel);
  const [maxDuration, setMaxDuration] = useState(value.maxDurationLabel);
  const [captionStyle, setCaptionStyle] = useState(value.captionStyleLabel);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const moveTab = (current: Section, key: string) => {
    const index = tabs.findIndex((tab) => tab.id === current);
    const nextIndex =
      key === 'Home'
        ? 0
        : key === 'End'
          ? tabs.length - 1
          : (index + (key === 'ArrowUp' ? -1 : 1) + tabs.length) % tabs.length;
    const next = tabs[nextIndex];
    if (!next) return;
    setSection(next.id);
    document.getElementById(`project-settings-tab-${next.id}`)?.focus();
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <a href={`/projects/${value.projectId}`}>Back to project</a>
          <p className={styles.eyebrow}>Project settings</p>
          <h1>{value.projectTitle}</h1>
          <p>
            Keep this project’s source, clip defaults, and local lifecycle in
            one place.
          </p>
        </div>
      </header>
      <div className={styles.layout}>
        <nav className={styles.rail} aria-label="Project settings sections">
          <div role="tablist" aria-orientation="vertical">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                id={`project-settings-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={section === tab.id}
                aria-controls={`project-settings-${tab.id}`}
                tabIndex={section === tab.id ? 0 : -1}
                onClick={() => setSection(tab.id)}
                onKeyDown={(event) => {
                  if (
                    ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)
                  ) {
                    event.preventDefault();
                    moveTab(tab.id, event.key);
                  }
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>
        <section
          id={`project-settings-${section}`}
          className={styles.panel}
          role="tabpanel"
          aria-labelledby={`project-settings-tab-${section}`}
        >
          {section === 'general' ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                onSaveGeneral({ title, instruction });
              }}
            >
              <h2>General</h2>
              <p>
                Set the project identity and the instruction used during
                analysis.
              </p>
              <label>
                Project title
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                />
              </label>
              <label>
                Instruction
                <textarea
                  value={instruction}
                  onChange={(event) => setInstruction(event.target.value)}
                  rows={5}
                />
              </label>
              <button type="submit">Save general</button>
            </form>
          ) : null}
          {section === 'source' ? (
            <div>
              <h2>Source</h2>
              <p>
                Relink the source when the local filepath moved. Existing clips
                stay intact.
              </p>
              <dl className={styles.details}>
                <div>
                  <dt>Status</dt>
                  <dd>{value.sourceHealthLabel}</dd>
                </div>
                <div>
                  <dt>Source</dt>
                  <dd>{value.sourceLabel}</dd>
                </div>
              </dl>
              <button type="button" onClick={onRelinkSource}>
                Relink source
              </button>
            </div>
          ) : null}
          {section === 'defaults' ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                onSaveDefaults({
                  platform,
                  maxDuration,
                  captionStyle,
                });
              }}
            >
              <h2>Defaults for new manual clips</h2>
              <p>
                These values apply to new manual clips only. Existing clips keep
                their own edits.
              </p>
              <dl className={styles.details}>
                <div>
                  <dt>Output frame</dt>
                  <dd>{value.outputFrameLabel}</dd>
                </div>
                <div>
                  <dt>Platform</dt>
                  <dd>
                    <select
                      aria-label="Platform"
                      value={platform}
                      onChange={(event) => setPlatform(event.target.value)}
                    >
                      <option>YouTube Shorts</option>
                      <option>Instagram Reels</option>
                      <option>TikTok</option>
                    </select>
                  </dd>
                </div>
                <div>
                  <dt>Maximum duration</dt>
                  <dd>
                    <input
                      aria-label="Maximum duration"
                      value={maxDuration}
                      onChange={(event) => setMaxDuration(event.target.value)}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Caption style</dt>
                  <dd>
                    <input
                      aria-label="Caption style"
                      value={captionStyle}
                      onChange={(event) => setCaptionStyle(event.target.value)}
                    />
                  </dd>
                </div>
              </dl>
              <button type="submit">Save defaults</button>
            </form>
          ) : null}
          {section === 'danger' ? (
            <div>
              <h2>Danger zone</h2>
              <p>
                Delete this project’s local Clip Factory record. Source files,
                rendered files, and remote uploads are never deleted.
              </p>
              <button
                className={styles.danger}
                type="button"
                onClick={() => setConfirmingDelete(true)}
              >
                Delete project
              </button>
              {confirmingDelete ? (
                <div
                  className={styles.confirmation}
                  role="alertdialog"
                  aria-modal="true"
                  aria-labelledby="delete-project-title"
                >
                  <h3 id="delete-project-title">Delete project?</h3>
                  <p>
                    Rendered files and remote YouTube uploads are untouched.
                  </p>
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className={styles.danger}
                    type="button"
                    onClick={onDeleteProject}
                  >
                    Delete project permanently
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

export function ProjectSettingsLocalPage({
  projectId,
}: Readonly<{ projectId: string }>) {
  const [value, setValue] = useState<ProjectSettingsViewModel>({
    projectId,
    projectTitle: 'Project settings',
    instruction: '',
    sourceHealthLabel: 'Source ready',
    sourceLabel: 'Local filepath source',
    outputFrameLabel: 'Vertical 9:16 · 1080×1920',
    platformLabel: 'YouTube Shorts',
    maxDurationLabel: '45 seconds',
    captionStyleLabel: 'Bold lower third',
  });

  return (
    <ProjectSettingsView
      value={value}
      onSaveGeneral={(general) =>
        setValue((current) => ({
          ...current,
          projectTitle: general.title,
          instruction: general.instruction,
        }))
      }
      onRelinkSource={() =>
        setValue((current) => ({
          ...current,
          sourceHealthLabel: 'Awaiting relink',
          sourceLabel: 'Choose a local filepath',
        }))
      }
      onSaveDefaults={(defaults) =>
        setValue((current) => ({
          ...current,
          platformLabel: defaults.platform,
          maxDurationLabel: defaults.maxDuration,
          captionStyleLabel: defaults.captionStyle,
        }))
      }
      onDeleteProject={() =>
        setValue((current) => ({
          ...current,
          projectTitle: 'Project deleted locally',
          sourceHealthLabel: 'Deleted',
        }))
      }
    />
  );
}
