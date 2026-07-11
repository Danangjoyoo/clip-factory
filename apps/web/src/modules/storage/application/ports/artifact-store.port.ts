export interface ArtifactStorePort {
  head(key: string): Promise<{ sizeBytes: bigint; versionId: string | null; sha256: string | null }>;
  deleteMany(keys: readonly string[]): Promise<void>;
}

export type ImmutableObjectReference = Readonly<{
  key: string;
  versionId: string | null;
  sha256: string;
  sizeBytes: bigint;
}>;
