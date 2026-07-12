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
                type="button"
                role="tab"
                aria-selected={section === tab.id}
                onClick={() => setSection(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>
        <section
          className={styles.panel}
          role="tabpanel"
          aria-label={`${tabs.find((tab) => tab.id === section)?.label} settings`}
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
                  platform: value.platformLabel,
                  maxDuration: value.maxDurationLabel,
                  captionStyle: value.captionStyleLabel,
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
                  <dd>{value.platformLabel}</dd>
                </div>
                <div>
                  <dt>Maximum duration</dt>
                  <dd>{value.maxDurationLabel}</dd>
                </div>
                <div>
                  <dt>Caption style</dt>
                  <dd>{value.captionStyleLabel}</dd>
                </div>
              </dl>
              <button type="submit">Save defaults</button>
            </form>
          ) : null}
          {section === 'danger' ? (
            <div>
              <h2>Danger zone</h2>
              <p>
                Delete this project’s metadata and generated clips from Clip
                Factory. Local filepath source files are never deleted.
              </p>
              <button
                className={styles.danger}
                type="button"
                onClick={onDeleteProject}
              >
                Delete project
              </button>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
