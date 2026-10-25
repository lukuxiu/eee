import { describe, it, expect } from 'vitest';
import { extractAvailableExamYears, buildStudyQueue } from './queueScheduler';
import { WordEntry, WordStudyRecord } from '../types';
import { createDefaultStudyRecord, processRecall } from './spacedRepetition';

describe('Queue Scheduler - Year Mode & Available Years', () => {
  const mockWords: WordEntry[] = [
    {
      id: 'w1',
      word: 'contemplate',
      phonetic: '/ˈkɒntəmpleɪt/',
      examSource: 'e1',
      totalFreq: 12,
      kaoyanRank: 10,
      page: 1,
      morphology: '暂无',
      senses: [
        {
          id: 's1',
          num: 1,
          pos: 'v.',
          definition: '沉思，考虑',
          examples: [
            { id: 'ex1', sentence: 'They contemplated the issue.', translation: '他们深思了这个问题。', year: 2024, source: '2024年阅读 Text 1', isAuthentic: true },
            { id: 'ex2', sentence: 'He contemplated leaving.', translation: '他考虑离开。', year: 2020, source: '2020年阅读 Text 2', isAuthentic: true }
          ]
        }
      ]
    },
    {
      id: 'w2',
      word: 'resilient',
      phonetic: '/rɪˈzɪliənt/',
      examSource: 'e1',
      totalFreq: 8,
      kaoyanRank: 25,
      page: 2,
      morphology: '暂无',
      senses: [
        {
          id: 's2',
          num: 1,
          pos: 'adj.',
          definition: '有弹性的；适应力强的',
          examples: [
            { id: 'ex3', sentence: 'A resilient economy can weather the storm.', translation: '有韧性的经济体能经受风暴。', year: 2024, source: '2024年新题型', isAuthentic: true }
          ]
        }
      ]
    },
    {
      id: 'w3',
      word: 'arbitrary',
      phonetic: '/ˈɑːbɪtrəri/',
      examSource: 'e2',
      totalFreq: 15,
      kaoyanRank: 5,
      page: 3,
      morphology: '暂无',
      senses: [
        {
          id: 's3',
          num: 1,
          pos: 'adj.',
          definition: '任意的，专断的',
          examples: [
            { id: 'ex4', sentence: 'An arbitrary decision was made.', translation: '做出了武断的决定。', year: 2023, source: '2023年完型', isAuthentic: true }
          ]
        }
      ]
    }
  ];

  it('extractAvailableExamYears extracts unique years and counts accurately in descending order', () => {
    const years = extractAvailableExamYears(mockWords);
    expect(years).toEqual([
      { year: 2024, count: 2 }, // w1 and w2
      { year: 2023, count: 1 }, // w3
      { year: 2020, count: 1 }, // w1
    ]);
  });

  it('buildStudyQueue with mode="year" filters words by selectedYear and prioritizes mistakes > unstudied', () => {
    const now = 1700000000000;
    const records: Record<string, WordStudyRecord> = {};

    // w2 was studied and marked 'dont_know'
    const r2 = createDefaultStudyRecord('w2', 'resilient', 'e1');
    records['w2'] = processRecall(r2, { rating: 'dont_know', mode: 'year', now });

    const queue = buildStudyQueue({
      mode: 'year',
      selectedYear: 2024,
      words: mockWords,
      records,
      dailyNewLimit: 20,
      dailyReviewLimit: 50,
      examFilter: 'all',
      now,
    });

    // Both w2 (mistake) and w1 (unstudied) are from 2024. w3 is only from 2023.
    expect(queue.length).toBe(2);
    // Mistake word w2 should come before unstudied word w1
    expect(queue[0].id).toBe('w2');
    expect(queue[1].id).toBe('w1');
  });
});
