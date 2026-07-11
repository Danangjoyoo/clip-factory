'use client';
import { useState } from 'react';
import type { EditorClip } from './editor.presentation';
export function useEditor(initial: EditorClip[] = []) {
  const [clips, setClips] = useState(initial);
  const [selectedClipId, setSelected] = useState(initial[0]?.id);
  return {
    clips,
    selectedClipId,
    selectClip: setSelected,
    addClip: (clip: EditorClip) => {
      setClips((current) => [...current, clip]);
      setSelected(clip.id);
    },
  };
}
