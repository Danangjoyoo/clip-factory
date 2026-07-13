import { describe, expect, it } from 'vitest';

import {
  parseGeneratedPublishingMetadata,
  parsePublishingMetadata,
  youtubeKeywordTagLength,
} from './publishing-metadata';

const valid = {
  title: 'One useful idea',
  description: 'A concise description',
  hashtags: ['#ClipFactory', '#VideoTips'],
  keywordTags: ['clip factory', 'video tips'],
  categoryId: '22',
  defaultLanguage: 'en',
  madeForKids: false,
  containsSyntheticMedia: false,
} as const;

describe('publishing metadata', () => {
  it('accepts reviewed metadata at documented limits', () => {
    const metadata = parsePublishingMetadata({
      ...valid,
      title: '😀'.repeat(100),
      description: 'é'.repeat(2500),
    });
    expect(Array.from(metadata.title)).toHaveLength(100);
    expect(new TextEncoder().encode(metadata.description)).toHaveLength(5000);
  });

  it.each([
    ['empty title', { ...valid, title: '' }, 'title is required'],
    [
      'long title',
      { ...valid, title: 'a'.repeat(101) },
      'title exceeds 100 characters',
    ],
    [
      'angle bracket title',
      { ...valid, title: 'A <title>' },
      'title contains < or >',
    ],
    [
      'angle bracket description',
      { ...valid, description: 'A <description>' },
      'description contains < or >',
    ],
    [
      'long description',
      { ...valid, description: 'é'.repeat(2501) },
      'description exceeds 5000 UTF-8 bytes',
    ],
    [
      'spaced hashtag',
      { ...valid, hashtags: ['#two words'] },
      'hashtags cannot contain spaces',
    ],
    [
      'sixty hashtags',
      {
        ...valid,
        hashtags: Array.from({ length: 60 }, (_, index) => `#h${index}`),
      },
      '60 or more hashtags are not allowed',
    ],
    [
      'duplicate hashtags',
      { ...valid, hashtags: ['#same', '#same'] },
      'hashtags must be unique',
    ],
    [
      'invalid category',
      { ...valid, categoryId: 'people' },
      'categoryId must be numeric',
    ],
    [
      'invalid language',
      { ...valid, defaultLanguage: 'english' },
      'defaultLanguage must be a BCP-47 language tag',
    ],
  ])('rejects %s', (_name, input, message) => {
    expect(() => parsePublishingMetadata(input)).toThrow(message);
  });

  it('uses YouTube quoted-space accounting for keyword tags', () => {
    expect(youtubeKeywordTagLength(['clip', 'video tips'])).toBe(17);
    expect(() =>
      parsePublishingMetadata({
        ...valid,
        keywordTags: ['two words'.repeat(56)],
      }),
    ).toThrow('keyword tags exceed 500 characters');
  });

  it('limits generated metadata to eight hashtags without narrowing manual review', () => {
    const nine = Array.from({ length: 9 }, (_, index) => `#relevant${index}`);
    expect(() =>
      parseGeneratedPublishingMetadata({ ...valid, hashtags: nine }),
    ).toThrow('generated metadata exceeds eight hashtags');
    expect(() =>
      parsePublishingMetadata({ ...valid, hashtags: nine }),
    ).not.toThrow();
    expect(() => parseGeneratedPublishingMetadata(valid)).not.toThrow();
  });

  it('freezes accepted collections', () => {
    const metadata = parsePublishingMetadata(valid);
    expect(Object.isFrozen(metadata)).toBe(true);
    expect(Object.isFrozen(metadata.hashtags)).toBe(true);
  });
});
