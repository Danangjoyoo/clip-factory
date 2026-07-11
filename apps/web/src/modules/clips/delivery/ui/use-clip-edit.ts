import { useCallback, useState } from 'react';

export type EditStatus = 'Saved' | 'Saving' | 'Error';
export function useClipEdit<T>(save: (value: T) => Promise<void> | void) {
  const [status, setStatus] = useState<EditStatus>('Saved');
  const commit = useCallback(
    async (value: T) => {
      setStatus('Saving');
      try {
        await save(value);
        setStatus('Saved');
      } catch {
        setStatus('Error');
      }
    },
    [save],
  );
  return { status, commit } as const;
}
