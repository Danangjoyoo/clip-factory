import {
  aiModeCopy,
  models,
  type AiAssistedMode,
  type CatalogView,
  type ModelId,
} from './new-project.presentation';
export function AnalysisSettings({
  mode,
  model,
  reasoning,
  catalog,
  onMode,
  onModel,
  onReasoning,
  openAiApiKeyConfigured = true,
}: {
  mode: AiAssistedMode;
  model: ModelId;
  reasoning: string;
  catalog: CatalogView;
  onMode: (value: AiAssistedMode) => void;
  onModel: (value: ModelId) => void;
  onReasoning: (value: string) => void;
  openAiApiKeyConfigured?: boolean;
}) {
  return (
    <section aria-label="Analysis settings">
      {!openAiApiKeyConfigured ? (
        <p role="alert">
          OpenAI API KEY is missing, AI Assisted Mode is disabled
        </p>
      ) : null}
      <label>
        AI-assisted mode
        <select
          aria-label="AI-assisted mode"
          value={openAiApiKeyConfigured ? mode : 'MANUAL'}
          onChange={(e) => onMode(e.target.value as AiAssistedMode)}
        >
          <option value="MANUAL">Manual</option>
          <option value="PARTIAL" disabled={!openAiApiKeyConfigured}>
            Partial
          </option>
          <option value="ADVANCED" disabled={!openAiApiKeyConfigured}>
            Advanced
          </option>
          <option value="COMPLETE" disabled={!openAiApiKeyConfigured}>
            Complete
          </option>
        </select>
      </label>
      <p>{aiModeCopy[openAiApiKeyConfigured ? mode : 'MANUAL']}</p>
      {openAiApiKeyConfigured && mode !== 'MANUAL' ? (
        <>
          <label>
            Model
            <select
              aria-label="Model"
              value={model}
              onChange={(e) => onModel(e.target.value as ModelId)}
            >
              {(Object.keys(models) as ModelId[]).map((id) => (
                <option
                  key={id}
                  value={id}
                  disabled={catalog.models?.[id]?.available === false}
                >
                  {id}
                  {catalog.models?.[id]?.available === false
                    ? ' (unavailable)'
                    : ''}
                </option>
              ))}
            </select>
          </label>
          <label>
            Reasoning
            <select
              aria-label="Reasoning"
              value={reasoning}
              onChange={(e) => onReasoning(e.target.value)}
            >
              {models[model].map((effort) => (
                <option key={effort}>{effort}</option>
              ))}
            </select>
          </label>
          <small>
            Generated-token ceiling includes reasoning and visible output.
          </small>
        </>
      ) : null}
    </section>
  );
}
