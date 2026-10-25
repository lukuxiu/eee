import { describe, it, expect } from 'vitest';
import { wordMatchesCategory, calculateCategoryStats } from './categoryEngine';
import { WordEntry, WordStudyRecord } from '../types';
import { createDefaultStudyRecord, MS_PER_DAY } from './spacedRepetition';

describe('Category Engine & Dynamic Tags', () => {
  const dummyWord: WordEntry = {
    id: 'e1-will',
    word: 'will',
    phonetic: '/wɪl/',
    totalFreq: 168,
    morphology: '暂无数据',
    senses: [
      {
        id: 'e1-will-s1',
        num: 1,
        pos: 'modal.',
        definition: '将；会',
        freq: 162,
        examples: [],
      },
      {
        id: 'e1-will-s2',
        num: 2,
        pos: 'n.',
        definition: '意志；意愿',
        freq: 2,
        examples: [],
      },
    ],
    examSource: 'e1',
    page: 2,
  };

  const now = 1700000000000;

  it('correctly matches "all" and "high_freq_weak" for unstudied words', () => {
    expect(wordMatchesCategory(dummyWord, undefined, 'all', now)).toBe(true);
    expect(wordMatchesCategory(dummyWord, undefined, 'high_freq_weak', now)).toBe(true);
    expect(wordMatchesCategory(dummyWord, undefined, 'today_new', now)).toBe(false);
  });

  it('correctly identifies recently mistaken words', () => {
    const rec: WordStudyRecord = {
      ...createDefaultStudyRecord('e1-will', 'will', 'e1'),
      firstStudyTime: now - 3600000,
      history: [
        {
          id: '1',
          timestamp: now - 1000,
          wordId: 'e1-will',
          rating: 'dont_know',
          wasCorrected: true,
          originalRating: 'know',
          mode: 'new',
        },
      ],
    };

    expect(wordMatchesCategory(dummyWord, rec, 'recently_mistaken', now)).toBe(true);
    expect(wordMatchesCategory(dummyWord, rec, 'dont_know', now)).toBe(true);
  });

  it('correctly identifies partially mastered words with sense disparities', () => {
    const rec: WordStudyRecord = {
      ...createDefaultStudyRecord('e1-will', 'will', 'e1'),
      firstStudyTime: now - 86400000,
      senseMasteries: {
        'e1-will-s1': {
          senseId: 'e1-will-s1',
          consecutiveCorrect: 3,
          reviewCount: 3,
          errorCount: 0,
          masteryLevel: 3,
          intervalDays: 7,
          easeFactor: 2.6,
        },
        'e1-will-s2': {
          senseId: 'e1-will-s2',
          consecutiveCorrect: 0,
          reviewCount: 1,
          errorCount: 1,
          masteryLevel: 1,
          intervalDays: 0.1,
          easeFactor: 2.3,
        },
      },
    };

    expect(wordMatchesCategory(dummyWord, rec, 'partially_mastered', now)).toBe(true);
  });

  it('computes category stats correctly across multiple words', () => {
    const words = [dummyWord];
    const records = {
      'e1-will': {
        ...createDefaultStudyRecord('e1-will', 'will', 'e1'),
        firstStudyTime: now,
        isFavorite: true,
        customTags: ['重点词'],
      },
    };

    const stats = calculateCategoryStats(words, records, now);
    const favStat = stats.find((s) => s.key === 'favorite');
    const customStat = stats.find((s) => s.key === 'custom:重点词');

    expect(favStat?.count).toBe(1);
    expect(customStat?.count).toBe(1);
  });
});
