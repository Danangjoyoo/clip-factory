'use client';

import { EditorShell } from './EditorShell';

export function EditorLocalPage() {
  return (
    <EditorShell
      clips={[]}
      onSelect={() => undefined}
      onAddClip={() => undefined}
      onRenderSelected={() => undefined}
      onRenderAll={() => undefined}
    />
  );
}
