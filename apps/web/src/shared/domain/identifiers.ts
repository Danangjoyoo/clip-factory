export type ProjectId = string & { readonly __projectId: unique symbol };
export const projectId = (value: string): ProjectId => value as ProjectId;
