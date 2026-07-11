import type { CaptionDocumentV1 } from '../../domain/caption';
import type { CaptionStyleV1 } from '../../application/dto/entity/caption-style-entity.dto';
export type CaptionEdit = {
  document: CaptionDocumentV1;
  style: CaptionStyleV1;
  title: string | null;
};
export function CaptionInspector({
  value,
  onSave,
}: Readonly<{ value: CaptionEdit; onSave: (value: CaptionEdit) => void }>) {
  const update = (next: Partial<CaptionEdit>): CaptionEdit => ({
    ...value,
    ...next,
  });
  const updateStyle = (next: Partial<CaptionStyleV1>) =>
    onSave(update({ style: { ...value.style, ...next } }));
  const updateWord = (id: string, text: string) =>
    onSave(
      update({
        document: {
          ...value.document,
          cues: value.document.cues.map((cue) => ({
            ...cue,
            words: cue.words.map((word) =>
              word.id === id ? { ...word, text } : word,
            ),
          })),
        },
      }),
    );
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave(value);
      }}
      aria-label="Caption inspector"
    >
      <label>
        Title
        <input
          value={value.title ?? ''}
          onChange={(e) => onSave(update({ title: e.target.value || null }))}
        />
      </label>
      <label>
        Font
        <select
          value={value.style.fontFamily}
          onChange={(e) =>
            updateStyle({
              fontFamily: e.target.value as CaptionStyleV1['fontFamily'],
            })
          }
        >
          <option>Inter</option>
          <option>Arial</option>
          <option>Helvetica Neue</option>
        </select>
      </label>
      <label>
        Font size
        <input
          type="number"
          min={8}
          max={160}
          value={value.style.fontSizePx}
          onChange={(e) => updateStyle({ fontSizePx: Number(e.target.value) })}
        />
      </label>
      <label>
        Text color
        <input
          type="color"
          value={value.style.textColor}
          onChange={(e) => updateStyle({ textColor: e.target.value })}
        />
      </label>
      <label>
        Outline color
        <input
          type="color"
          value={value.style.outlineColor}
          onChange={(e) => updateStyle({ outlineColor: e.target.value })}
        />
      </label>
      <label>
        Background color
        <input
          type="color"
          value={value.style.backgroundColor}
          onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
        />
      </label>
      <label>
        Active word color
        <input
          type="color"
          value={value.style.activeWordColor}
          onChange={(e) => updateStyle({ activeWordColor: e.target.value })}
        />
      </label>
      <label>
        Vertical position
        <input
          type="number"
          min={0}
          max={1_000_000}
          value={value.style.verticalPositionMicros}
          onChange={(e) =>
            updateStyle({ verticalPositionMicros: Number(e.target.value) })
          }
        />
      </label>
      <label>
        Max words per line
        <input
          type="number"
          min={1}
          max={20}
          value={value.style.maxWordsPerLine}
          onChange={(e) =>
            updateStyle({ maxWordsPerLine: Number(e.target.value) })
          }
        />
      </label>
      <label>
        Active word emphasis
        <input
          type="checkbox"
          checked={value.style.activeWordEmphasis}
          onChange={(e) =>
            updateStyle({ activeWordEmphasis: e.target.checked })
          }
        />
      </label>
      {value.document.cues
        .flatMap((cue) => cue.words)
        .map((word) => (
          <label key={word.id}>
            Caption {word.id}
            <input
              aria-label={`Caption ${word.id}`}
              value={word.text}
              onChange={(e) => updateWord(word.id, e.target.value)}
            />
          </label>
        ))}
      <button type="submit">Save caption</button>
    </form>
  );
}
