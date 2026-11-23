import { WordEntry, WordStudyRecord } from '../types';
import { wordMatchesCategory } from './categoryEngine';

export type SprintPackKey =
  | 'high_freq_1199'
  | 'mistakes_clear'
  | 'recent_5_years'
  | 'polysemy_killer'
  | 'unstudied_high_freq'
  | 'favorite_sprint';

export interface SprintPackMeta {
  key: SprintPackKey;
  label: string;
  shortLabel: string;
  description: string;
}

export const SPRINT_PACKS: SprintPackMeta[] = [
  {
    key: 'high_freq_1199',
    label: '高频 1199 救命保底',
    shortLabel: '高频 1199',
    description: '按考研高频榜排名优先，死守试卷核心基本盘',
  },
  {
    key: 'mistakes_clear',
    label: '考前必清错题',
    shortLabel: '必清错题',
    description: '近期记错、不认识、不熟悉与高频错词集中扫雷',
  },
  {
    key: 'recent_5_years',
    label: '近 5 年真题核心',
    shortLabel: '近5年真题',
    description: '2022–2026 真题高频考点词，紧贴最新命题风向',
  },
  {
    key: 'polysemy_killer',
    label: '多义 / 熟词僻义',
    shortLabel: '熟词僻义',
    description: '真题多义（≥3义）高频杀手词，防止阅读翻译踩坑',
  },
  {
    key: 'unstudied_high_freq',
    label: '高频未学盲区',
    shortLabel: '未学盲区',
    description: '尚未学习过的高考频词汇急救，优先按考频降序突破',
  },
  {
    key: 'favorite_sprint',
    label: '星标重点收藏',
    shortLabel: '星标收藏',
    description: '考前手动标记的重点疑难词快速复核',
  },
];

const RECENT_MIN_YEAR = 2022;

function getRecentYearHitCount(word: WordEntry): number {
  let hits = 0;
  for (const s of word.senses) {
    if (!s.examples) continue;
    for (const ex of s.examples) {
      if (ex.year && ex.year >= RECENT_MIN_YEAR) {
        hits += 1;
      }
    }
  }
  return hits;
}

function isMistakeCandidate(
  word: WordEntry,
  rec: WordStudyRecord | undefined,
  now: number
): boolean {
  if (!rec || !rec.firstStudyTime) return false;
  return (
    wordMatchesCategory(word, rec, 'recently_mistaken', now) ||
    wordMatchesCategory(word, rec, 'frequent_mistakes', now) ||
    wordMatchesCategory(word, rec, 'dont_know', now) ||
    wordMatchesCategory(word, rec, 'unfamiliar', now) ||
    (rec.errorCount > 0 && rec.masteryLevel < 4)
  );
}

function deduplicateBySpelling(list: WordEntry[]): WordEntry[] {
  const seen = new Set<string>();
  const out: WordEntry[] = [];
  for (const w of list) {
    const key = w.word.trim().toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(w);
    }
  }
  return out;
}

/**
 * 获取考前冲刺专题对应的筛选与排序后词单
 */
export function getSprintWords(
  words: WordEntry[],
  records: Record<string, WordStudyRecord>,
  examFilter: 'e1' | 'e2' | 'all',
  packKey: SprintPackKey,
  onlyUnmastered: boolean = false,
  now: number = Date.now()
): WordEntry[] {
  const pool = words.filter((w) => {
    if (examFilter !== 'all' && w.examSource !== examFilter) return false;
    if (onlyUnmastered) {
      const rec = records[w.id];
      if (rec && rec.masteryLevel >= 4) return false;
    }
    return true;
  });

  let result: WordEntry[];
  switch (packKey) {
    case 'high_freq_1199': {
      result = pool
        .filter((w) => w.isHighFreq1199 || (w.kaoyanRank !== undefined && w.kaoyanRank <= 1199))
        .sort((a, b) => {
          const rankA = a.kaoyanRank ?? 9999;
          const rankB = b.kaoyanRank ?? 9999;
          if (rankA !== rankB) return rankA - rankB;
          return b.totalFreq - a.totalFreq;
        });
      break;
    }

    case 'mistakes_clear': {
      result = pool
        .filter((w) => isMistakeCandidate(w, records[w.id], now))
        .sort((a, b) => {
          const recA = records[a.id];
          const recB = records[b.id];
          const errA = (recA?.errorCount || 0) * 10 + (recA?.lastCorrectionTime ? 50 : 0);
          const errB = (recB?.errorCount || 0) * 10 + (recB?.lastCorrectionTime ? 50 : 0);
          if (errB !== errA) return errB - errA;
          return b.totalFreq - a.totalFreq;
        });
      break;
    }

    case 'recent_5_years': {
      result = pool
        .filter((w) => getRecentYearHitCount(w) > 0)
        .sort((a, b) => {
          const hitDiff = getRecentYearHitCount(b) - getRecentYearHitCount(a);
          if (hitDiff !== 0) return hitDiff;
          return b.totalFreq - a.totalFreq;
        });
      break;
    }

    case 'polysemy_killer': {
      result = pool
        .filter((w) => w.senses.length >= 3 && w.totalFreq >= 3)
        .sort((a, b) => {
          if (b.senses.length !== a.senses.length) return b.senses.length - a.senses.length;
          return b.totalFreq - a.totalFreq;
        });
      break;
    }

    case 'unstudied_high_freq': {
      result = pool
        .filter((w) => {
          const rec = records[w.id];
          return !rec || !rec.firstStudyTime;
        })
        .sort((a, b) => {
          const rankA = a.kaoyanRank ?? 9999;
          const rankB = b.kaoyanRank ?? 9999;
          if (rankA !== rankB) return rankA - rankB;
          return b.totalFreq - a.totalFreq;
        });
      break;
    }

    case 'favorite_sprint': {
      result = pool
        .filter((w) => Boolean(records[w.id]?.isFavorite))
        .sort((a, b) => b.totalFreq - a.totalFreq);
      break;
    }

    default:
      result = pool.sort((a, b) => b.totalFreq - a.totalFreq);
  }

  return examFilter === 'all' ? deduplicateBySpelling(result) : result;
}

/**
 * 计算距目标考试日期的剩余天数（本地日期精确对齐）
 */
export function calculateExamCountdown(examDateStr: string, nowMs: number = Date.now()): {
  daysLeft: number;
  isPast: boolean;
} {
  const parts = examDateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    return { daysLeft: 0, isPast: false };
  }
  const [y, m, d] = parts;
  const targetMidnight = new Date(y, m - 1, d).getTime();
  const nowDate = new Date(nowMs);
  const todayMidnight = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate()).getTime();
  const diffDays = Math.ceil((targetMidnight - todayMidnight) / (24 * 60 * 60 * 1000));
  return {
    daysLeft: Math.max(0, diffDays),
    isPast: diffDays < 0,
  };
}
