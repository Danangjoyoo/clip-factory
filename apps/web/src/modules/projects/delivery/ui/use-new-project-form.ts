import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_NEW_PROJECT_VALUES,
  type EstimateRequest,
  type ModelCatalogOption,
  type ModelAccessState,
  type NewProjectCatalog,
  type NewProjectFormValues,
  type NewProjectValidationErrors,
  type PreflightEstimate,
  buildCreateProjectRequest,
  estimateHash,
  isSupportedSource,
  modelHasReasoning,
  validateIntegerRange,
  validateLanguage,
  validateSpendUsd,
} from './new-project.presentation';

export type NewProjectSubmitRequest = Readonly<{
  request: ReturnType<typeof buildCreateProjectRequest>;
  estimateHash: string | null;
  estimate: PreflightEstimate | null;
  values: NewProjectFormValues;
}>;

export type NewProjectFormActions = Readonly<{
  onEstimate: (input: EstimateRequest, signal: AbortSignal) => Promise<PreflightEstimate>;
  onSubmit: (input: NewProjectSubmitRequest) => Promise<void>;
}>;

export type NewProjectFormHook = Readonly<{
  values: NewProjectFormValues;
  errors: NewProjectValidationErrors;
  modelCatalog: readonly ModelCatalogOption[];
  selectedModelAvailability: ModelAccessState;
  estimatedReasoning: readonly string[];
  estimate: PreflightEstimate | null;
  estimateHash: string | null;
  estimateBusy: boolean;
  estimateError: string | null;
  uploadParts: number;
  setField: <T extends keyof NewProjectFormValues>(
    key: T,
    value: NewProjectFormValues[T],
  ) => void;
  submit: () => Promise<void>;
  canSubmit: boolean;
  isSubmitBlocked: boolean;
  submitError: string | null;
}>
;

const estimateDelayMs = 300;

const sanitizeEstimatePayload = (
  values: NewProjectFormValues,
  sourceMethod: NewProjectFormValues['sourceMethod'],
  sourcePath: string,
  uploadFile: File | null,
): EstimateRequest => ({
  model: values.model,
  reasoning: values.reasoning,
  maximumClips: values.maximumClips,
  sourceMethod,
  requestHash: estimateHash({
    model: values.model,
    reasoning: values.reasoning,
    maximumClips: values.maximumClips,
    sourceMethod,
    requestHash: `${sourceMethod}:${sourcePath}:${uploadFile?.size ?? 0}`,
  }),
});

const validateSourcePath = (sourceMethod: string, path: string, file: File | null): string | null => {
  if (sourceMethod === 'FILEPATH') {
    if (!path) return 'Source path is required';
    if (!/^([A-Za-z]:\\|[A-Za-z]:\/|\/)/u.test(path)) {
      return 'Source path must be absolute';
    }
    if (!isSupportedSource(path)) {
      return 'Unsupported extension. Use mp4, mov, mkv, webm';
    }
    return null;
  }
  if (!file) return 'Upload file is required';
  if (!isSupportedSource(file.name)) {
    return 'Unsupported extension. Use mp4, mov, mkv, webm';
  }
  return null;
};

const validateModelSelection = (
  selectedModel: ModelCatalogOption | undefined,
  reasoning: string,
  discoverHighlights: boolean,
): NewProjectValidationErrors => {
  if (!discoverHighlights) return {};
  if (!selectedModel) {
    return { model: 'No compatible model configured' };
  }
  if (selectedModel.availability !== 'available') {
    return { model: selectedModel.availabilityMessage };
  }
  if (!modelHasReasoning(selectedModel, reasoning)) {
    return { reasoning: 'Reasoning profile is not available for this model' };
  }
  return {};
};

export const useNewProjectForm = (
  catalog: NewProjectCatalog,
  actions: NewProjectFormActions,
): NewProjectFormHook => {
  const [values, setValues] = useState<NewProjectFormValues>(
    DEFAULT_NEW_PROJECT_VALUES,
  );
  const [errors, setErrors] = useState<NewProjectValidationErrors>({});
  const [estimate, setEstimate] = useState<PreflightEstimate | null>(null);
  const [estimateBusy, setEstimateBusy] = useState(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [estimateRequestHash, setEstimateRequestHash] = useState<string | null>(
    null,
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [estimateVersion, setEstimateVersion] = useState(0);
  const activeAbort = useRef<AbortController | null>(null);

  const selectedModel = catalog.models.find(
    (item) => item.modelId === values.model,
  );
  const estimatedReasoning =
    selectedModel?.reasoning.map((item) => item.effort) ?? [];

  const uploadParts =
    values.sourceMethod === 'UPLOAD' && values.uploadFile
      ? Math.max(1, Math.ceil(values.uploadFile.size / (5 * 1024 * 1024)))
      : 0;

  const validate = useCallback(
    (next: NewProjectFormValues): NewProjectValidationErrors => {
      const nextErrors: NewProjectValidationErrors = {
        sourcePath: validateSourcePath(
          next.sourceMethod,
          next.sourcePath,
          next.uploadFile,
        ),
        language: validateLanguage(next.language),
        maximumSpendUsd: validateSpendUsd(next.maximumSpendUsd),
        maximumClips: validateIntegerRange(next.maximumClips, 1, 50),
        maximumClipSeconds: validateIntegerRange(next.maximumClipSeconds, 1, 10800),
        instruction:
          next.instruction.length > 2000
            ? 'Instruction is limited to 2000 characters'
            : null,
      };
      return {
        ...nextErrors,
        ...validateModelSelection(
          catalog.models.find((item) => item.modelId === next.model),
          next.reasoning,
          next.discoverHighlights,
        ),
      };
    },
    [catalog.models],
  );

  useEffect(() => {
    setErrors(validate(values));
  }, [values, validate]);

  useEffect(() => {
    const hasAi = values.discoverHighlights;
    const sourceError = validateSourcePath(
      values.sourceMethod,
      values.sourcePath,
      values.uploadFile,
    );
    const modelError = validateModelSelection(
      catalog.models.find((item) => item.modelId === values.model),
      values.reasoning,
      hasAi,
    );
    const languageError = validateLanguage(values.language);
    if (!hasAi || sourceError || languageError || modelError.model || modelError.reasoning) {
      setEstimate(null);
      setEstimateError(null);
      setEstimateBusy(false);
      return;
    }

    setEstimateBusy(true);
    setEstimateError(null);

    const version = estimateVersion + 1;
    const timer = window.setTimeout(async () => {
      const request = sanitizeEstimatePayload(
        values,
        values.sourceMethod,
        values.sourcePath,
        values.uploadFile,
      );
      const controller = new AbortController();
      const previous = activeAbort.current;
      activeAbort.current?.abort();
      activeAbort.current = controller;
      try {
        const nextEstimate = await actions.onEstimate(request, controller.signal);
        if (controller.signal.aborted || version !== estimateVersion + 1) return;
        setEstimate(nextEstimate);
        setEstimateRequestHash(request.requestHash);
        setEstimateBusy(false);
        setEstimateError(null);
      } catch (error) {
        if (controller.signal.aborted) return;
        if (error instanceof Error) {
          setEstimateError(error.message);
        } else {
          setEstimateError('Failed to estimate cost');
        }
      } finally {
        if (!controller.signal.aborted) {
          setEstimateBusy(false);
        }
      }
      void previous;
    }, estimateDelayMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [values, actions.onEstimate, catalog.models, estimateVersion]);

  const setField = useCallback(
    <T extends keyof NewProjectFormValues>(
      key: T,
      value: NewProjectFormValues[T],
    ) => {
      setValues((current) => ({ ...current, [key]: value }));
    },
    [],
  );

  const submit = useCallback(async () => {
    setSubmitError(null);
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.values(nextErrors).some((value): value is string => Boolean(value))) {
      return;
    }

    try {
      await actions.onSubmit({
        request: buildCreateProjectRequest(values),
        estimateHash: estimateRequestHash,
        estimate,
        values,
      });
      setEstimateRequestHash(null);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to submit');
    }
  }, [actions.onSubmit, estimate, estimateRequestHash, validate, values]);

  const canSubmit = useMemo(() => {
    const hasValidationError = Object.values(errors).some(
      (value): value is string => Boolean(value),
    );
    if (hasValidationError) return false;
    if (!values.discoverHighlights) return true;
    if (estimateBusy) return false;
    if (!estimate) return false;
    if (estimateError) return false;
    return true;
  }, [estimate, estimateBusy, estimateError, errors, values.discoverHighlights]);

  const selectedModelAvailability = selectedModel?.availability ?? 'unknown';

  return {
    values,
    errors,
    modelCatalog: catalog.models,
    selectedModelAvailability,
    estimatedReasoning,
    estimate,
    estimateHash: estimateRequestHash,
    estimateBusy,
    estimateError,
    uploadParts,
    setField,
    submit,
    canSubmit,
    isSubmitBlocked: !canSubmit,
    submitError,
  };
};
