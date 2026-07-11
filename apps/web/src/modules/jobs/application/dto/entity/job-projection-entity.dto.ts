export interface JobProjectionEntityDto {
  id: string;
  projectId: string;
  workflowId: string;
  status: string;
  terminalResult: ApplyWorkerResultResponse | null;
}
export interface ApplyWorkerResultResponse {
  workflowId: string;
  projectId: string;
  status: string;
  completedAt: string | null;
  transcriptObject?:
    | { bucket: string; key: string; versionId: string | null; sha256: string }
    | null
    | undefined;
  clipIds?: string[] | undefined;
  error?: { code: string; message: string } | null | undefined;
  uncertainReservedMicrousd?: string | undefined;
  requiredAction?: 'AUTHORIZE_FRESH_RESERVATION' | undefined;
  acknowledgePossiblePriorSpend?: boolean | undefined;
}
