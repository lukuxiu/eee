import { WordSense, ExamSentence } from '../types';

export interface MergedSubMeaning {
  id: string;
  definition: string;
  freq: number;
  examples: ExamSentence[];
}

export interface MergedPosGroup {
  pos: string;
  totalFreq: number;
  maxFreq: number;
  items: MergedSubMeaning[];
}

/**
 * 按分号切分释义（忽略括号内部的分号）
 */
function splitTopLevelSegments(def: string): string[] {
  const segments: string[] = [];
  let current = '';
  let depth = 0;

  for (const ch of def) {
    if (ch === '（' || ch === '(') {
      depth++;
      current += ch;
    } else if (ch === '）' || ch === ')') {
      depth = Math.max(0, depth - 1);
      current += ch;
    } else if ((ch === '；' || ch === ';') && depth === 0) {
      const trimmed = current.trim();
      if (trimmed) segments.push(trimmed);
      current = '';
    } else {
      current += ch;
    }
  }
  const last = current.trim();
  if (last) segments.push(last);
  return segments;
}

/**
 * 按词性合并释义、按考频降序排列，并自动去除同词性下重复出现的子词义
 */
export function mergeSensesByPos(senses: WordSense[]): MergedPosGroup[] {
  const posOrder: string[] = [];
  const rawGroups = new Map<string, WordSense[]>();

  for (const sense of senses) {
    const pos = (sense.pos || '释义').trim();
    const key = pos.toLowerCase();
    if (!rawGroups.has(key)) {
      rawGroups.set(key, []);
      posOrder.push(key);
    }
    rawGroups.get(key)!.push(sense);
  }

  const groups: MergedPosGroup[] = [];

  for (const key of posOrder) {
    const list = [...rawGroups.get(key)!].sort((a, b) => (b.freq || 0) - (a.freq || 0));
    const displayPos = (list[0].pos || '释义').trim();

    const items: MergedSubMeaning[] = [];
    const seenTerms = new Map<string, MergedSubMeaning>();

    for (const sense of list) {
      const rawDef = (sense.definition || '').trim();
      if (!rawDef) continue;

      const freq = sense.freq || 0;
      const examples = sense.examples || [];
      const segments = splitTopLevelSegments(rawDef);

      const uniqueSegments: string[] = [];
      let duplicateTarget: MergedSubMeaning | undefined;

      for (const seg of segments) {
        const norm = seg.replace(/\s+/g, '');
        if (!norm) continue;
        if (seenTerms.has(norm)) {
          if (!duplicateTarget) duplicateTarget = seenTerms.get(norm);
        } else {
          uniqueSegments.push(seg);
        }
      }

      if (uniqueSegments.length === 0 && duplicateTarget) {
        // 完全重复的释义：合并考频与例句到高频释义中
        duplicateTarget.freq += freq;
        const existingSentences = new Set(duplicateTarget.examples.map((e) => e.sentence));
        for (const ex of examples) {
          if (!existingSentences.has(ex.sentence)) {
            duplicateTarget.examples.push(ex);
            existingSentences.add(ex.sentence);
          }
        }
      } else {
        const mergedDef = uniqueSegments.length > 0 ? uniqueSegments.join('；') : rawDef;
        const item: MergedSubMeaning = {
          id: sense.id,
          definition: mergedDef,
          freq,
          examples: [...examples],
        };
        items.push(item);
        for (const seg of uniqueSegments) {
          seenTerms.set(seg.replace(/\s+/g, ''), item);
        }
      }
    }

    // 组内按考频降序
    items.sort((a, b) => b.freq - a.freq);

    const totalFreq = items.reduce((sum, item) => sum + item.freq, 0);
    const maxFreq = items.reduce((max, item) => Math.max(max, item.freq), 0);

    groups.push({
      pos: displayPos,
      totalFreq,
      maxFreq,
      items,
    });
  }

  // 不同词性按总考频降序排列
  groups.sort((a, b) => {
    if (b.totalFreq !== a.totalFreq) return b.totalFreq - a.totalFreq;
    return b.maxFreq - a.maxFreq;
  });

  return groups;
}
