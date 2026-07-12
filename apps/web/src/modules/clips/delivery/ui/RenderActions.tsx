'use client';
export function RenderActions({
  hasSelection,
  selectedIsUpdating = false,
  hasAcceptedClips,
  onRenderSelected,
  onRenderAll,
}: {
  hasSelection: boolean;
  selectedIsUpdating?: boolean;
  hasAcceptedClips: boolean;
  onRenderSelected: () => void;
  onRenderAll: () => void;
}) {
  return (
    <div>
      <button
        type="button"
        disabled={!hasSelection || selectedIsUpdating}
        onClick={onRenderSelected}
      >
        Render selected clip
      </button>
      <button type="button" disabled={!hasAcceptedClips} onClick={onRenderAll}>
        Render all
      </button>
    </div>
  );
}
