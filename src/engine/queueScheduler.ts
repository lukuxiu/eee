import { WordEntry, WordStudyRecord, StudyMode, CustomDeckConfig } from '../types';
import { isWordDue, isWordOverdue, getDuePriorityScore } from './spacedRepetition';
import { wordMatchesCategory } from './categoryEngine';

export interface BuildQueueOptions {
  mode: StudyMode;
  words: WordEntry[];
  records: Record<string, WordStudyRecord>;
  dailyNewLimit: number;
  dailyReviewLimit: number;
  examFilter: 'e1' | 'e2' | 'all';
  customConfig?: CustomDeckConfig;
  selectedYear?: number;
  now?: number;
}

/**
 * 提取所有真题年份及各年份包含的独立考点单词数量
 */
export function extractAvailableExamYears(words: WordEntry[]): { year: number; count: number }[] {
  const map = new Map<number, Set<string>>();
  for (const w of words) {
    for (const s of w.senses) {
      if (s.examples) {
        for (const ex of s.examples) {
          if (ex.year) {
            if (!map.has(ex.year)) map.set(ex.year, new Set());
            map.get(ex.year)!.add(w.id);
          }
        }
      }
    }
  }
  return Array.from(map.entries())
    .map(([year, set]) => ({ year, count: set.size }))
    .sort((a, b) => b.year - a.year);
}

export function buildStudyQueue(options: BuildQueueOptions): WordEntry[] {
  const {
    mode,
    words,
    records,
    dailyNewLimit,
    dailyReviewLimit,
    examFilter,
    customConfig,
    selectedYear,
    now = Date.now(),
  } = options;

  // 1. 过滤所属题库（英语一 / 英语二 / 合并）
  const pool = words.filter((w) => {
    if (examFilter === 'all') return true;
    return w.examSource === examFilter;
  });

  // 2. 根据不同学习模式构建队列
  switch (mode) {
    case 'year': {
      const targetYear = selectedYear || 2026;
      // 筛选在指定年份真题中出现过考点例句的单词
      const yearWords = pool.filter((w) =>
        w.senses.some((s) => s.examples && s.examples.some((ex) => ex.year === targetYear))
      );

      // 排序优先级：
      // 1. 本年份错词 (不认识、记错、不熟悉)
      // 2. 本年份未学词 (按考频降序)
      // 3. 本年份已学温习词 (按考频降序)
      const errorWords: WordEntry[] = [];
      const unstudiedWords: WordEntry[] = [];
      const reviewedWords: WordEntry[] = [];

      for (const w of yearWords) {
        const rec = records[w.id];
        if (!rec || !rec.firstStudyTime) {
          unstudiedWords.push(w);
        } else if (
          wordMatchesCategory(w, rec, 'recently_mistaken', now) ||
          wordMatchesCategory(w, rec, 'dont_know', now) ||
          wordMatchesCategory(w, rec, 'unfamiliar', now)
        ) {
          errorWords.push(w);
        } else {
          reviewedWords.push(w);
        }
      }

      errorWords.sort((a, b) => b.totalFreq - a.totalFreq);
      unstudiedWords.sort((a, b) => b.totalFreq - a.totalFreq);
      reviewedWords.sort((a, b) => b.totalFreq - a.totalFreq);

      const combined = [...errorWords, ...unstudiedWords, ...reviewedWords];
      return combined.slice(0, Math.max(30, dailyReviewLimit));
    }

    case 'new': {
      // 仅从未学习过的单词中提取，按真题考频从高到低排序，限制每日上限
      const unstudied = pool
        .filter((w) => !records[w.id] || !records[w.id].firstStudyTime)
        .sort((a, b) => b.totalFreq - a.totalFreq);
      return unstudied.slice(0, dailyNewLimit);
    }

    case 'due': {
      // 提取所有已到期或超期的复习词，按优先级得分排序（逾期长+错误多+高频优先）
      const dueWords = pool
        .filter((w) => {
          const rec = records[w.id];
          return rec && isWordDue(rec, now);
        })
        .sort((a, b) => {
          const scoreA = getDuePriorityScore(records[a.id], a.totalFreq, now);
          const scoreB = getDuePriorityScore(records[b.id], b.totalFreq, now);
          return scoreB - scoreA;
        });
      return dueWords.slice(0, dailyReviewLimit);
    }

    case 'error': {
      // 错词强化：记错了 + 反复出错 + 不认识 + 不熟悉
      const errorWords = pool.filter((w) => {
        const rec = records[w.id];
        if (!rec || !rec.firstStudyTime) return false;
        return (
          wordMatchesCategory(w, rec, 'recently_mistaken', now) ||
          wordMatchesCategory(w, rec, 'frequent_mistakes', now) ||
          wordMatchesCategory(w, rec, 'dont_know', now) ||
          wordMatchesCategory(w, rec, 'unfamiliar', now)
        );
      });
      // 优先复习最近出错和错误次数多的单词
      errorWords.sort((a, b) => {
        const recA = records[a.id];
        const recB = records[b.id];
        const mistakeA = recA.lastMistakeTime || 0;
        const mistakeB = recB.lastMistakeTime || 0;
        if (mistakeB !== mistakeA) return mistakeB - mistakeA;
        return recB.errorCount - recA.errorCount;
      });
      return errorWords.slice(0, dailyReviewLimit);
    }

    case 'context': {
      // 真题例句主动回忆模式：优先选择语境薄弱词，再选择有代表性真题例句的高频词
      const withExamples = pool.filter((w) =>
        w.senses.some((s) => s.examples && s.examples.length > 0)
      );

      const weakContext = withExamples.filter((w) => {
        const rec = records[w.id];
        return rec && wordMatchesCategory(w, rec, 'context_weak', now);
      });

      const others = withExamples
        .filter((w) => !weakContext.includes(w))
        .sort((a, b) => b.totalFreq - a.totalFreq);

      return [...weakContext, ...others].slice(0, Math.min(30, dailyReviewLimit));
    }

    case 'custom': {
      if (!customConfig) return pool.slice(0, 20);
      let matched = pool.filter(
        (w) => w.totalFreq >= customConfig.minFreq && w.totalFreq <= customConfig.maxFreq
      );

      if (customConfig.selectedYear) {
        matched = matched.filter((w) =>
          w.senses.some((s) => s.examples && s.examples.some((ex) => ex.year === customConfig.selectedYear))
        );
      }

      if (customConfig.selectedCategories && customConfig.selectedCategories.length > 0) {
        matched = matched.filter((w) => {
          const rec = records[w.id];
          return customConfig.selectedCategories.some((catKey) =>
            wordMatchesCategory(w, rec, catKey, now)
          );
        });
      }

      // 洗牌或按考频
      matched.sort(() => Math.random() - 0.5);
      return matched.slice(0, customConfig.limit);
    }

    case 'mixed':
    default: {
      // 综合推荐队列优先级：
      // 1. 已超期 (Overdue)
      // 2. 近期记错及连续出错 (Recent mistakes)
      // 3. 今日到期普通复习 (Due today)
      // 4. 真题语境薄弱 (Context weak)
      // 5. 今日新词 (New words up to limit)
      // 6. 已掌握词抽查 (Mastered spot-check: 少量)

      const overdueWords: WordEntry[] = [];
      const mistakeWords: WordEntry[] = [];
      const dueWords: WordEntry[] = [];
      const contextWeakWords: WordEntry[] = [];
      const newWords: WordEntry[] = [];
      const masteredWords: WordEntry[] = [];

      for (const w of pool) {
        const rec = records[w.id];
        if (!rec || !rec.firstStudyTime) {
          newWords.push(w);
        } else if (isWordOverdue(rec, now)) {
          overdueWords.push(w);
        } else if (wordMatchesCategory(w, rec, 'recently_mistaken', now) || rec.errorCount >= 2) {
          mistakeWords.push(w);
        } else if (isWordDue(rec, now)) {
          dueWords.push(w);
        } else if (wordMatchesCategory(w, rec, 'context_weak', now)) {
          contextWeakWords.push(w);
        } else if (wordMatchesCategory(w, rec, 'mastered', now)) {
          masteredWords.push(w);
        }
      }

      // 排序与抽样
      overdueWords.sort((a, b) => b.totalFreq - a.totalFreq);
      mistakeWords.sort((a, b) => (records[b.id]?.errorCount || 0) - (records[a.id]?.errorCount || 0));
      dueWords.sort((a, b) => b.totalFreq - a.totalFreq);
      newWords.sort((a, b) => b.totalFreq - a.totalFreq);

      // 已掌握词随机抽查 3~5 词，避免遗忘
      const spotCheckMastered = masteredWords.sort(() => Math.random() - 0.5).slice(0, 3);

      const combined = [
        ...overdueWords,
        ...mistakeWords,
        ...dueWords,
        ...contextWeakWords,
        ...newWords.slice(0, dailyNewLimit),
        ...spotCheckMastered,
      ];

      // 去重保序
      const seen = new Set<string>();
      const result: WordEntry[] = [];
      for (const w of combined) {
        if (!seen.has(w.id)) {
          seen.add(w.id);
          result.push(w);
        }
      }

      return result.slice(0, dailyReviewLimit);
    }
  }
}
