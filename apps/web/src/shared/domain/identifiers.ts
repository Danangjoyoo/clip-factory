export type ProjectId = string & { readonly __projectId: unique symbol };
export const projectId = (value: string): ProjectId => value as ProjectId;
export type YouTubeConnectionId = string & {
  readonly __brand: 'YouTubeConnectionId';
};
export type PublishingMetadataDraftId = string & {
  readonly __brand: 'PublishingMetadataDraftId';
};
export type PublicationId = string & { readonly __brand: 'PublicationId' };
export type PublicationAttemptId = string & {
  readonly __brand: 'PublicationAttemptId';
};
export type ClipId = string & { readonly __brand: 'ClipId' };
export type RenderId = string & { readonly __brand: 'RenderId' };
export type AIUsageEventId = string & { readonly __brand: 'AIUsageEventId' };
export type WorkflowId = string & { readonly __brand: 'WorkflowId' };
export type PaidCallReservationId = string & {
  readonly __brand: 'PaidCallReservationId';
};
