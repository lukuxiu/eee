import { WordEntry, WordStudyRecord, CategoryFilterKey } from '../types';
import { isWordDue, isWordOverdue, MS_PER_DAY } from './spacedRepetition';

export interface CategoryMeta {
  key: CategoryFilterKey;
  label: string;
  description: string;
  count: number;
}

export function isSameDay(t1: number, t2: number): boolean {
  const d1 = new Date(t1);
  const d2 = new Date(t2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * 判断单词是否匹配指定动态分类
 */
export function wordMatchesCategory(
  word: WordEntry,
  record: WordStudyRecord | undefined,
  categoryKey: CategoryFilterKey,
  now: number = Date.now()
): boolean {
  if (categoryKey === 'all') {
    return true;
  }

  if (categoryKey === 'favorite') {
    return !!record && record.isFavorite;
  }

  // 高频 1199 专榜（不要求已学记录）
  if (categoryKey === 'high_freq_1199') {
    return !!word.isHighFreq1199;
  }
  if (categoryKey === 'high_freq_1199_e1') {
    return !!word.isHighFreq1199 && word.examSource === 'e1';
  }
  if (categoryKey === 'high_freq_1199_e2') {
    return !!word.isHighFreq1199 && word.examSource === 'e2';
  }

  if (categoryKey.startsWith('custom:')) {
    const tag = categoryKey.replace('custom:', '');
    return !!record && record.customTags && record.customTags.includes(tag);
  }

  // 以下所有学习状态分类依赖于已学记录
  if (!record || !record.firstStudyTime) {
    if (categoryKey === 'high_freq_weak') {
      return word.totalFreq >= 20; // 未学的高频词也属于高频薄弱
    }
    return false;
  }

  switch (categoryKey) {
    case 'today_new':
      return isSameDay(record.firstStudyTime, now);

    case 'today_due':
      return isWordDue(record, now);

    case 'overdue':
      return isWordOverdue(record, now);

    case 'unfamiliar': {
      const last = record.history[record.history.length - 1];
      return last?.rating === 'unfamiliar';
    }

    case 'dont_know': {
      const last = record.history[record.history.length - 1];
      return last?.rating === 'dont_know';
    }

    case 'recently_mistaken': {
      // 近 3 天内有过点击“记错了”修正
      const threeDaysAgo = now - 3 * MS_PER_DAY;
      return record.history.some(
        (h) => h.wasCorrected && (h.correctedAt || h.timestamp) >= threeDaysAgo
      );
    }

    case 'frequent_mistakes':
      // 累计出错 2 次及以上且连续正确不足 3 次
      return record.errorCount >= 2 && record.consecutiveCorrect < 3;

    case 'partially_mastered': {
      // 多义词存在不同释义掌握程度差异
      if (word.senses.length <= 1) return false;
      const senseValues = Object.values(record.senseMasteries || {});
      if (senseValues.length < 2) return false;
      const hasStrong = senseValues.some((s) => s.masteryLevel >= 2);
      const hasWeak = senseValues.some((s) => s.masteryLevel <= 1);
      return hasStrong && hasWeak;
    }

    case 'mastered':
      // 综合掌握：等级>=4，连续正确>=3，间隔>=14天
      return (
        record.masteryLevel >= 4 &&
        record.consecutiveCorrect >= 3 &&
        record.intervalDays >= 14
      );

    case 'context_weak':
      // 真题语境有出错且语境正确率低于 60%
      if (record.contextErrorCount === 0) return false;
      const totalCtx = record.contextCorrectCount + record.contextErrorCount;
      return totalCtx > 0 && record.contextCorrectCount / totalCtx < 0.6;

    case 'high_freq_weak':
      // 真题考频>=20 且 掌握等级<3
      return word.totalFreq >= 20 && record.masteryLevel < 3;

    default:
      return true;
  }
}

/**
 * 实时统计各动态分类的单词数量
 */
export function calculateCategoryStats(
  words: WordEntry[],
  records: Record<string, WordStudyRecord>,
  now: number = Date.now()
): CategoryMeta[] {
  const customTagsSet = new Set<string>();
  for (const rec of Object.values(records)) {
    if (rec.customTags) {
      rec.customTags.forEach((t) => customTagsSet.add(t));
    }
  }

  const baseCategories: { key: CategoryFilterKey; label: string; description: string }[] = [
    { key: 'all', label: '全部单词', description: '收录的考研真题核心词库' },
    { key: 'high_freq_1199', label: '🔥 高频1199全榜', description: 'LazyNote 考研真题最高频 1199 核心词汇' },
    { key: 'high_freq_1199_e1', label: '🔥 高频 · 英一核心', description: '1199 词中考研英语一覆盖词' },
    { key: 'high_freq_1199_e2', label: '🔥 高频 · 英二核心', description: '1199 词中考研英语二覆盖词' },
    { key: 'today_new', label: '今日新词', description: '今日首次学习的词汇' },
    { key: 'today_due', label: '今日待复习', description: '到达艾宾浩斯复习节点的单词' },
    { key: 'overdue', label: '已超期', description: '逾期超过 12 小时未复习的词' },
    { key: 'recently_mistaken', label: '近期记错', description: '选择认识后点击「记错了」的词' },
    { key: 'frequent_mistakes', label: '反复出错', description: '错误 2 次以上且尚未稳固的词' },
    { key: 'dont_know', label: '不认识', description: '最近一次自评为不认识的词' },
    { key: 'unfamiliar', label: '不熟悉', description: '自评有印象但回忆不完整的词' },
    { key: 'partially_mastered', label: '部分掌握', description: '多义词中个别释义薄弱的词' },
    { key: 'high_freq_weak', label: '高频词薄弱', description: '考频≥20次且尚未稳固的真题核心词' },
    { key: 'context_weak', label: '真题语境薄弱', description: '考研真题长难句语境测试易错词' },
    { key: 'mastered', label: '已掌握', description: '连续正确多次且复习间隔≥14天' },
    { key: 'favorite', label: '收藏单词', description: '点击星标标记的重点词汇' },
  ];

  // 加上自定义标签
  const allCategories = [...baseCategories];
  for (const tag of customTagsSet) {
    allCategories.push({
      key: `custom:${tag}`,
      label: tag,
      description: `用户自定义分类：${tag}`,
    });
  }

  // 统计每类数量
  return allCategories.map((cat) => {
    let count = 0;
    for (const w of words) {
      if (wordMatchesCategory(w, records[w.id], cat.key, now)) {
        count++;
      }
    }
    return {
      ...cat,
      count,
    };
  });
}
