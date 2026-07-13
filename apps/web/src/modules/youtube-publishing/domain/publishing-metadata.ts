const utf8 = new TextEncoder();

export type PublishingMetadata = {
  title: string;
  description: string;
  hashtags: readonly string[];
  keywordTags: readonly string[];
  categoryId: string;
  defaultLanguage: string;
  madeForKids: boolean;
  containsSyntheticMedia: boolean;
};

export class InvalidPublishingMetadataError extends Error {
  readonly code = 'INVALID_PUBLISHING_METADATA';
}

export function youtubeKeywordTagLength(tags: readonly string[]): number {
  return tags.reduce(
    (total, tag, index) =>
      total +
      (tag.includes(' ') ? tag.length + 2 : tag.length) +
      (index === 0 ? 0 : 1),
    0,
  );
}

export function parsePublishingMetadata<T extends PublishingMetadata>(
  input: T,
): T {
  if (Array.from(input.title).length === 0) throw invalid('title is required');
  if (Array.from(input.title).length > 100)
    throw invalid('title exceeds 100 characters');
  if (/[<>]/u.test(input.title)) throw invalid('title contains < or >');
  if (utf8.encode(input.description).length > 5000)
    throw invalid('description exceeds 5000 UTF-8 bytes');
  if (/[<>]/u.test(input.description))
    throw invalid('description contains < or >');
  if (input.hashtags.length >= 60)
    throw invalid('60 or more hashtags are not allowed');
  if (new Set(input.hashtags).size !== input.hashtags.length)
    throw invalid('hashtags must be unique');
  if (input.hashtags.some((tag) => !/^#[^\s#]+$/u.test(tag)))
    throw invalid('hashtags cannot contain spaces');
  if (youtubeKeywordTagLength(input.keywordTags) > 500)
    throw invalid('keyword tags exceed 500 characters');
  if (!/^[0-9]+$/u.test(input.categoryId))
    throw invalid('categoryId must be numeric');
  if (!/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/u.test(input.defaultLanguage))
    throw invalid('defaultLanguage must be a BCP-47 language tag');
  return Object.freeze({
    ...input,
    hashtags: Object.freeze([...input.hashtags]),
    keywordTags: Object.freeze([...input.keywordTags]),
  }) as T;
}

export function parseGeneratedPublishingMetadata<T extends PublishingMetadata>(
  input: T,
): T {
  const metadata = parsePublishingMetadata(input);
  if (metadata.hashtags.length > 8)
    throw invalid('generated metadata exceeds eight hashtags');
  return metadata;
}

function invalid(message: string): InvalidPublishingMetadataError {
  return new InvalidPublishingMetadataError(message);
}
