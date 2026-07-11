'use client';
export function RenderActions({
  hasSelection,
  hasAcceptedClips,
  onRenderSelected,
  onRenderAll,
}: {
  hasSelection: boolean;
  hasAcceptedClips: boolean;
  onRenderSelected: () => void;
  onRenderAll: () => void;
}) {
  return (
    <div>
      <button type="button" disabled={!hasSelection} onClick={onRenderSelected}>
        Render selected
      </button>
      <button type="button" disabled={!hasAcceptedClips} onClick={onRenderAll}>
        Render all
      </button>
    </div>
  );
}
