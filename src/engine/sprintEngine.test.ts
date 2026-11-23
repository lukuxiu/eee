import { describe, it, expect } from 'vitest';
import { getSprintWords, calculateExamCountdown } from './sprintEngine';
import { buildStudyQueue } from './queueScheduler';
import { WordEntry, WordStudyRecord } from '../types';
import { createDefaultStudyRecord, processRecall } from './spacedRepetition';

describe('Sprint Engine & Countdown', () => {
  const mockWords: WordEntry[] = [
    {
      id: 'w1',
      word: 'state',
      phonetic: '/steɪt/',
      examSource: 'e1',
      totalFreq: 120,
      kaoyanRank: 2,
      isHighFreq1199: true,
      page: 2,
      morphology: '暂无',
      senses: [
        { id: 's1', num: 1, pos: 'n.', definition: '州', freq: 96, examples: [{ id: 'e1', sentence: 'At the state level.', translation: '在州一级。', source: '2025 阅读', year: 2025, isAuthentic: true }] },
        { id: 's2', num: 2, pos: 'n.', definition: '国家', freq: 9, examples: [] },
        { id: 's3', num: 3, pos: 'v.', definition: '陈述', freq: 4, examples: [] },
      ],
    },
    {
      id: 'w2',
      word: 'subtle',
      phonetic: '/ˈsʌtl/',
      examSource: 'e1',
      totalFreq: 18,
      kaoyanRank: 150,
      isHighFreq1199: true,
      page: 10,
      morphology: '暂无',
      senses: [
        { id: 's4', num: 1, pos: 'adj.', definition: '微妙的', freq: 18, examples: [{ id: 'e2', sentence: 'Subtle changes.', translation: '微妙变化。', source: '2016 阅读', year: 2016, isAuthentic: true }] },
      ],
    },
    {
      id: 'w3',
      word: 'obsolete',
      phonetic: '/ˌɒbsəˈliːt/',
      examSource: 'e2',
      totalFreq: 6,
      page: 20,
      morphology: '暂无',
      senses: [
        { id: 's5', num: 1, pos: 'adj.', definition: '过时的', freq: 6, examples: [{ id: 'e3', sentence: 'Obsolete tools.', translation: '过时的工具。', source: '2024 阅读', year: 2024, isAuthentic: true }] },
      ],
    },
  ];

  it('filters and sorts high_freq_1199 words by kaoyanRank ascending', () => {
    const res = getSprintWords(mockWords, {}, 'all', 'high_freq_1199', false);
    expect(res.map((w) => w.id)).toEqual(['w1', 'w2']);
  });

  it('filters recent_5_years (2022–2026) and polysemy_killer (>=3 senses)', () => {
    const recent = getSprintWords(mockWords, {}, 'all', 'recent_5_years', false);
    expect(recent.map((w) => w.id)).toEqual(['w1', 'w3']);

    const poly = getSprintWords(mockWords, {}, 'all', 'polysemy_killer', false);
    expect(poly.map((w) => w.id)).toEqual(['w1']);
  });

  it('excludes masteryLevel >= 4 words when onlyUnmastered=true and catches mistakes', () => {
    const now = 1700000000000;
    const records: Record<string, WordStudyRecord> = {};

    const r1 = createDefaultStudyRecord('w1', 'state', 'e1');
    r1.masteryLevel = 5;
    r1.firstStudyTime = now - 10000;
    records['w1'] = r1;

    const r2 = createDefaultStudyRecord('w2', 'subtle', 'e1');
    records['w2'] = processRecall(r2, { rating: 'dont_know', mode: 'sprint', now });

    const unmastered = getSprintWords(mockWords, records, 'all', 'high_freq_1199', true, now);
    expect(unmastered.map((w) => w.id)).toEqual(['w2']);

    const mistakes = getSprintWords(mockWords, records, 'all', 'mistakes_clear', true, now);
    expect(mistakes.map((w) => w.id)).toEqual(['w2']);

    const queue = buildStudyQueue({
      mode: 'sprint',
      words: mockWords,
      records,
      dailyNewLimit: 25,
      dailyReviewLimit: 40,
      examFilter: 'all',
      now,
    });
    expect(queue.map((w) => w.id)).toEqual(['w2', 'w3']);
  });

  it('calculateExamCountdown computes remaining days accurately', () => {
    const nowNov23 = new Date(2026, 10, 23, 22, 0, 0).getTime(); // 2026-11-23
    const { daysLeft, isPast } = calculateExamCountdown('2026-12-19', nowNov23);
    expect(daysLeft).toBe(26);
    expect(isPast).toBe(false);
  });
});
