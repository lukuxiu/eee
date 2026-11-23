import { describe, it, expect } from 'vitest';
import { mergeSensesByPos } from './senseFormatter';
import { WordSense } from '../types';

describe('senseFormatter - mergeSensesByPos', () => {
  it('groups senses by POS, sorts by totalFreq descending, and removes duplicate sub-terms', () => {
    const senses: WordSense[] = [
      { id: 's1', num: 1, pos: 'v.', definition: '指出；提请注意', freq: 12, examples: [] },
      { id: 's2', num: 2, pos: 'n.', definition: '分数；分', freq: 5, examples: [] },
      { id: 's3', num: 3, pos: 'v.', definition: '指向；指出', freq: 2, examples: [] },
      { id: 's4', num: 4, pos: 'n.', definition: '观点；要点', freq: 4, examples: [] },
      { id: 's5', num: 5, pos: 'v.', definition: '指出', freq: 3, examples: [] },
    ];

    const groups = mergeSensesByPos(senses);
    expect(groups.length).toBe(2);

    // v. totalFreq = 12 + 3 + 2 = 17 > n. totalFreq = 9
    expect(groups[0].pos).toBe('v.');
    expect(groups[0].totalFreq).toBe(17);
    // s5 ("指出", freq 3) fully merged into s1 (12 + 3 = 15); s3 deduplicated to "指向" (2)
    expect(groups[0].items.map((i) => ({ def: i.definition, freq: i.freq }))).toEqual([
      { def: '指出；提请注意', freq: 15 },
      { def: '指向', freq: 2 },
    ]);

    expect(groups[1].pos).toBe('n.');
    expect(groups[1].totalFreq).toBe(9);
    expect(groups[1].items.length).toBe(2);
  });
});
