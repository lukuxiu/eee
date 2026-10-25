import { WordStudyRecord, SenseMastery, RecallRating, RecallLogEvent, StudyMode } from '../types';

export const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const MS_PER_HOUR = 60 * 60 * 1000;
export const MS_PER_MINUTE = 60 * 1000;

export interface ProcessRecallOptions {
  rating: RecallRating;
  mode: StudyMode;
  now?: number;
  senseId?: string;
  isContextTest?: boolean;
}

export function createDefaultSenseMastery(senseId: string): SenseMastery {
  return {
    senseId,
    consecutiveCorrect: 0,
    reviewCount: 0,
    errorCount: 0,
    masteryLevel: 0,
    intervalDays: 0,
    easeFactor: 2.5,
  };
}

export function createDefaultStudyRecord(wordId: string, word: string, examSource: 'e1' | 'e2'): WordStudyRecord {
  return {
    wordId,
    word,
    examSource,
    firstStudyTime: 0,
    lastReviewTime: 0,
    nextReviewTime: 0,
    consecutiveCorrect: 0,
    reviewCount: 0,
    errorCount: 0,
    masteryLevel: 0,
    intervalDays: 0,
    easeFactor: 2.5,
    isFavorite: false,
    customTags: [],
    senseMasteries: {},
    history: [],
    contextCorrectCount: 0,
    contextErrorCount: 0,
  };
}

/**
 * SM-2 based interval calculator
 */
export function calculateIntervalDays(
  consecutiveCorrect: number,
  rating: RecallRating,
  prevInterval: number,
  easeFactor: number
): number {
  if (rating === 'dont_know') {
    // 立即安排短时强化（约 15 分钟）
    return 15 / (24 * 60); // 0.0104 天
  }

  if (rating === 'unfamiliar') {
    // 不熟悉：安排当日稍后或次日（约 6 小时 ~ 12 小时）
    return 0.35; // 约 8.4 小时
  }

  // rating === 'know'
  if (consecutiveCorrect <= 1) {
    return 1.0; // 首次认识：1 天
  } else if (consecutiveCorrect === 2) {
    return 3.0; // 连续 2 次认识：3 天
  } else if (consecutiveCorrect === 3) {
    return Math.round(7.0 * (easeFactor / 2.5) * 10) / 10; // 约 7 天
  } else if (consecutiveCorrect === 4) {
    return Math.round(15.0 * (easeFactor / 2.5) * 10) / 10; // 约 15 天
  } else {
    // 5 次及以上：上一间隔 * 难度因子，上限 120 天
    const nextInterval = (prevInterval > 0 ? prevInterval : 15.0) * easeFactor;
    return Math.min(120, Math.round(nextInterval * 10) / 10);
  }
}

/**
 * 调整 SM-2 难度因子
 */
export function updateEaseFactor(currentEF: number, rating: RecallRating): number {
  let newEF = currentEF;
  if (rating === 'know') {
    newEF = currentEF + 0.1;
  } else if (rating === 'unfamiliar') {
    newEF = currentEF - 0.15;
  } else if (rating === 'dont_know') {
    newEF = currentEF - 0.25;
  }
  // 难度系数边界限制在 [1.3, 3.0] 之间
  return Math.max(1.3, Math.min(3.0, Math.round(newEF * 100) / 100));
}

/**
 * 计算综合掌握等级 0 ~ 5
 */
export function calculateMasteryLevel(
  consecutiveCorrect: number,
  intervalDays: number,
  errorCount: number,
  reviewCount: number
): number {
  if (reviewCount === 0) return 0; // 未学习
  if (consecutiveCorrect === 0) return 1; // 刚出错/生词
  if (consecutiveCorrect === 1 && intervalDays <= 1) return 2; // 初识
  if (consecutiveCorrect >= 2 && intervalDays < 7) return 3; // 熟悉
  if (consecutiveCorrect >= 3 && intervalDays >= 7 && intervalDays < 20) return 4; // 稳固
  if (consecutiveCorrect >= 4 && intervalDays >= 20 && errorCount <= Math.max(1, reviewCount * 0.2)) {
    return 5; // 精通
  }
  return Math.min(4, Math.max(1, consecutiveCorrect));
}

/**
 * 处理单次主动回忆事件
 */
export function processRecall(
  record: WordStudyRecord,
  options: ProcessRecallOptions
): WordStudyRecord {
  const now = options.now || Date.now();
  const { rating, mode, senseId, isContextTest } = options;

  const updated: WordStudyRecord = {
    ...record,
    senseMasteries: { ...record.senseMasteries },
    history: [...record.history],
  };

  if (!updated.firstStudyTime) {
    updated.firstStudyTime = now;
  }
  updated.lastReviewTime = now;
  updated.reviewCount += 1;

  if (isContextTest) {
    if (rating === 'know') {
      updated.contextCorrectCount += 1;
    } else {
      updated.contextErrorCount += 1;
    }
  }

  // 1. 更新连续正确与累计错误
  if (rating === 'know') {
    updated.consecutiveCorrect += 1;
  } else if (rating === 'unfamiliar') {
    updated.consecutiveCorrect = Math.max(0, updated.consecutiveCorrect - 1);
  } else {
    // dont_know
    updated.consecutiveCorrect = 0;
    updated.errorCount += 1;
    updated.lastMistakeTime = now;
  }

  // 2. 更新难度系数与复习间隔
  updated.easeFactor = updateEaseFactor(updated.easeFactor, rating);
  updated.intervalDays = calculateIntervalDays(
    updated.consecutiveCorrect,
    rating,
    updated.intervalDays,
    updated.easeFactor
  );
  updated.nextReviewTime = now + Math.round(updated.intervalDays * MS_PER_DAY);

  // 3. 更新掌握等级
  updated.masteryLevel = calculateMasteryLevel(
    updated.consecutiveCorrect,
    updated.intervalDays,
    updated.errorCount,
    updated.reviewCount
  );

  // 4. 更新特定释义的掌握度（若指定或语境模式）
  if (senseId) {
    const prevSense = updated.senseMasteries[senseId] || createDefaultSenseMastery(senseId);
    let sConsecutive = prevSense.consecutiveCorrect;
    let sError = prevSense.errorCount;

    if (rating === 'know') {
      sConsecutive += 1;
    } else if (rating === 'unfamiliar') {
      sConsecutive = Math.max(0, sConsecutive - 1);
    } else {
      sConsecutive = 0;
      sError += 1;
    }

    const sEase = updateEaseFactor(prevSense.easeFactor, rating);
    const sInterval = calculateIntervalDays(sConsecutive, rating, prevSense.intervalDays, sEase);

    updated.senseMasteries[senseId] = {
      senseId,
      consecutiveCorrect: sConsecutive,
      reviewCount: prevSense.reviewCount + 1,
      errorCount: sError,
      easeFactor: sEase,
      intervalDays: sInterval,
      masteryLevel: calculateMasteryLevel(sConsecutive, sInterval, sError, prevSense.reviewCount + 1),
      lastReviewTime: now,
      nextReviewTime: now + Math.round(sInterval * MS_PER_DAY),
    };
  }

  // 5. 记录历史事件
  const event: RecallLogEvent = {
    id: `log-${now}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: now,
    wordId: record.wordId,
    rating,
    wasCorrected: false,
    mode,
    senseId,
    isContextTest: !!isContextTest,
  };
  updated.history.push(event);

  return updated;
}

/**
 * 「记错了」纠错机制
 * 仅对最近一次选择“认识”的学习事件生效：
 * 1. 撤销本次「认识」带来的掌握度增长
 * 2. 将本次结果修正为「不认识」（记错了）
 * 3. 记录一次错误回忆事件，保留原 rating 作为统计依据
 * 4. 连续正确次数清零，错误次数 +1
 * 5. 立即重新计算下一次复习时间为短间隔
 * 6. 严防重复点击与重复扣减
 */
export function revokeAndCorrect(
  record: WordStudyRecord,
  now: number = Date.now()
): { updatedRecord: WordStudyRecord; success: boolean; reason?: string } {
  if (!record.history || record.history.length === 0) {
    return { updatedRecord: record, success: false, reason: '没有学习历史记录可供修正' };
  }

  // 找到最近一次记录
  const lastIndex = record.history.length - 1;
  const lastEvent = record.history[lastIndex];

  // 校验：必须是刚刚选择了 'know' 且未被纠错过的事件
  if (lastEvent.rating !== 'know' || lastEvent.wasCorrected) {
    return {
      updatedRecord: record,
      success: false,
      reason: '当前最新记录不是未经修正的“认识”，无法纠错',
    };
  }

  // 避免短时间内重复点击
  if (record.lastCorrectionTime && now - record.lastCorrectionTime < 500) {
    return { updatedRecord: record, success: false, reason: '请勿重复提交纠错' };
  }

  const updated: WordStudyRecord = {
    ...record,
    senseMasteries: { ...record.senseMasteries },
    history: [...record.history],
  };

  // 1. 修正最近的历史事件
  const correctedEvent: RecallLogEvent = {
    ...lastEvent,
    originalRating: 'know',
    rating: 'dont_know',
    wasCorrected: true,
    correctedAt: now,
  };
  updated.history[lastIndex] = correctedEvent;

  // 2. 撤销连续正确，增加错误计数
  updated.consecutiveCorrect = 0;
  updated.errorCount += 1;
  updated.lastMistakeTime = now;
  updated.lastCorrectionTime = now;

  // 3. 重新计算难度因子与间隔（按 dont_know 重新安排短时复习）
  updated.easeFactor = Math.max(1.3, Math.round((updated.easeFactor - 0.25) * 100) / 100);
  updated.intervalDays = 15 / (24 * 60); // 15 分钟短间隔
  updated.nextReviewTime = now + Math.round(updated.intervalDays * MS_PER_DAY);

  // 4. 重新计算掌握等级
  updated.masteryLevel = 1; // 刚纠错，归入生词/错词状态

  // 5. 若有对应释义，同步修正
  if (lastEvent.senseId && updated.senseMasteries[lastEvent.senseId]) {
    const s = updated.senseMasteries[lastEvent.senseId];
    const sEase = Math.max(1.3, Math.round((s.easeFactor - 0.25) * 100) / 100);
    const sInterval = 15 / (24 * 60);
    updated.senseMasteries[lastEvent.senseId] = {
      ...s,
      consecutiveCorrect: 0,
      errorCount: s.errorCount + 1,
      easeFactor: sEase,
      intervalDays: sInterval,
      masteryLevel: 1,
      nextReviewTime: now + Math.round(sInterval * MS_PER_DAY),
    };
  }

  // 6. 如果是真题语境测试，将语境统计修正
  if (lastEvent.isContextTest) {
    updated.contextCorrectCount = Math.max(0, updated.contextCorrectCount - 1);
    updated.contextErrorCount += 1;
  }

  return { updatedRecord: updated, success: true };
}

/**
 * 判断单词当前是否到期
 */
export function isWordDue(record: WordStudyRecord, now: number = Date.now()): boolean {
  if (!record.firstStudyTime || record.nextReviewTime === 0) return false;
  return now >= record.nextReviewTime;
}

/**
 * 判断单词是否已经超期（逾期超过 12 小时）
 */
export function isWordOverdue(record: WordStudyRecord, now: number = Date.now()): boolean {
  if (!record.firstStudyTime || record.nextReviewTime === 0) return false;
  return now - record.nextReviewTime > 12 * MS_PER_HOUR;
}

/**
 * 计算复习优先级权重（分数越高越先复习）
 * 逾期严重度 + 考研词频 + 错误历史权重
 */
export function getDuePriorityScore(record: WordStudyRecord, totalFreq: number, now: number = Date.now()): number {
  if (!record.firstStudyTime) return 0;
  
  const overdueHours = (now - record.nextReviewTime) / MS_PER_HOUR;
  const overdueScore = Math.max(0, overdueHours) * 2;
  const errorScore = record.errorCount * 10;
  const freqScore = Math.min(50, totalFreq * 0.5);
  const lowMasteryScore = (5 - record.masteryLevel) * 5;

  return overdueScore + errorScore + freqScore + lowMasteryScore;
}
