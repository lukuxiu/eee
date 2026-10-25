import React, { useMemo } from 'react';
import { WordEntry, WordStudyRecord, UserSettings } from '../types';
import { isSameDay, wordMatchesCategory } from '../engine/categoryEngine';
import { isWordDue, isWordOverdue, MS_PER_DAY } from '../engine/spacedRepetition';
import { 
  BarChart2, 
  Calendar, 
  CheckCircle, 
  TrendingUp, 
  Target, 
  Clock, 
  Layers,
  Sparkles,
  Flame
} from 'lucide-react';

interface StatsDashboardProps {
  words: WordEntry[];
  records: Record<string, WordStudyRecord>;
  settings: UserSettings;
}

export const StatsDashboard: React.FC<StatsDashboardProps> = ({
  words,
  records,
  settings,
}) => {
  const now = Date.now();

  const filteredWords = useMemo(() => {
    return words.filter((w) => {
      if (settings.examFilter === 'all') return true;
      return w.examSource === settings.examFilter;
    });
  }, [words, settings.examFilter]);

  const metrics = useMemo(() => {
    let todayNew = 0;
    let todayReviewed = 0;
    let dueCount = 0;
    let overdueCount = 0;
    let masteredCount = 0;
    let highFreqCount = 0;
    let highFreqMastered = 0;
    let totalErrors = 0;
    let totalCorrected = 0; // 点击“记错了”的次数
    let totalDirectKnow = 0;
    let totalUnfamiliar = 0;
    let totalDontKnow = 0;

    let contextCorrectTotal = 0;
    let contextErrorTotal = 0;

    const future7DaysForecast: Record<string, number> = {};
    for (let i = 1; i <= 7; i++) {
      const d = new Date(now + i * MS_PER_DAY);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      future7DaysForecast[key] = 0;
    }

    // Top error words tracker
    const errorWordsList: { word: WordEntry; rec: WordStudyRecord }[] = [];

    for (const w of filteredWords) {
      const rec = records[w.id];
      if (w.totalFreq >= 20) {
        highFreqCount++;
        if (rec && rec.masteryLevel >= 4) {
          highFreqMastered++;
        }
      }

      if (!rec || !rec.firstStudyTime) continue;

      if (isSameDay(rec.firstStudyTime, now)) {
        todayNew++;
      }
      if (rec.lastReviewTime && isSameDay(rec.lastReviewTime, now)) {
        todayReviewed++;
      }

      if (isWordOverdue(rec, now)) {
        overdueCount++;
      } else if (isWordDue(rec, now)) {
        dueCount++;
      }

      if (rec.masteryLevel >= 4) {
        masteredCount++;
      }

      if (rec.errorCount > 0) {
        totalErrors += rec.errorCount;
        errorWordsList.push({ word: w, rec });
      }

      contextCorrectTotal += rec.contextCorrectCount || 0;
      contextErrorTotal += rec.contextErrorCount || 0;

      // Scan history logs for accurate metrics
      if (rec.history) {
        for (const ev of rec.history) {
          if (ev.wasCorrected) {
            totalCorrected++;
          }
          if (ev.rating === 'know') totalDirectKnow++;
          else if (ev.rating === 'unfamiliar') totalUnfamiliar++;
          else if (ev.rating === 'dont_know') totalDontKnow++;
        }
      }

      // 7-day forecast
      if (rec.nextReviewTime && rec.nextReviewTime > now) {
        const diffDays = Math.ceil((rec.nextReviewTime - now) / MS_PER_DAY);
        if (diffDays >= 1 && diffDays <= 7) {
          const d = new Date(rec.nextReviewTime);
          const key = `${d.getMonth() + 1}/${d.getDate()}`;
          if (future7DaysForecast[key] !== undefined) {
            future7DaysForecast[key]++;
          }
        }
      }
    }

    // Sort error words descending
    errorWordsList.sort((a, b) => b.rec.errorCount - a.rec.errorCount);
    const topErrorWords = errorWordsList.slice(0, 8);

    // True Accuracy Calculation
    const totalRecallActions = totalDirectKnow + totalUnfamiliar + totalDontKnow;
    const trueAccuracy =
      totalRecallActions > 0
        ? Math.round((totalDirectKnow / totalRecallActions) * 100)
        : 0;

    const initialAccuracy =
      totalRecallActions > 0
        ? Math.round(((totalDirectKnow + totalCorrected) / totalRecallActions) * 100)
        : 0;

    const mistakeRatio =
      totalDirectKnow + totalCorrected > 0
        ? Math.round((totalCorrected / (totalDirectKnow + totalCorrected)) * 100)
        : 0;

    const contextTotal = contextCorrectTotal + contextErrorTotal;
    const contextAccuracy =
      contextTotal > 0 ? Math.round((contextCorrectTotal / contextTotal) * 100) : 0;

    return {
      todayNew,
      todayReviewed,
      dueCount,
      overdueCount,
      masteredCount,
      totalLearned: Object.keys(records).length,
      highFreqMasteredRate:
        highFreqCount > 0 ? Math.round((highFreqMastered / highFreqCount) * 100) : 0,
      totalErrors,
      totalCorrected,
      trueAccuracy,
      initialAccuracy,
      mistakeRatio,
      contextAccuracy,
      contextTotal,
      future7DaysForecast,
      topErrorWords,
    };
  }, [filteredWords, records, now]);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-5">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-paper-900 border border-paper-200 dark:border-paper-800 p-4 rounded-lg space-y-1 transition-colors">
          <div className="text-xs text-stone-400 dark:text-stone-500 flex items-center justify-between">
            <span>今日新学 / 复习</span>
            <Sparkles className="w-3.5 h-3.5 text-stone-900 dark:text-stone-100" />
          </div>
          <div className="text-2xl font-bold font-mono text-stone-900 dark:text-stone-100">
            {metrics.todayNew} <span className="text-xs font-normal text-stone-500">/ {metrics.todayReviewed}</span>
          </div>
          <div className="text-[10px] text-stone-400">词汇增量与温习</div>
        </div>

        <div className="bg-white dark:bg-paper-900 border border-paper-200 dark:border-paper-800 p-4 rounded-lg space-y-1 transition-colors">
          <div className="text-xs text-stone-400 dark:text-stone-500 flex items-center justify-between">
            <span>累计已学 / 总词量</span>
            <Layers className="w-3.5 h-3.5 text-stone-900 dark:text-stone-100" />
          </div>
          <div className="text-2xl font-bold font-mono text-stone-900 dark:text-stone-100">
            {metrics.totalLearned} <span className="text-xs font-normal text-stone-500">/ {filteredWords.length}</span>
          </div>
          <div className="text-[10px] text-stone-400">
            覆盖率 {filteredWords.length > 0 ? Math.round((metrics.totalLearned / filteredWords.length) * 100) : 0}%
          </div>
        </div>

        <div className="bg-white dark:bg-paper-900 border border-paper-200 dark:border-paper-800 p-4 rounded-lg space-y-1 transition-colors">
          <div className="text-xs text-stone-400 dark:text-stone-500 flex items-center justify-between">
            <span>今日到期 / 逾期待学</span>
            <Clock className="w-3.5 h-3.5 text-stone-900 dark:text-stone-100" />
          </div>
          <div className="text-2xl font-bold font-mono text-stone-900 dark:text-stone-100">
            {metrics.dueCount} <span className="text-xs font-normal text-stone-500">/ {metrics.overdueCount}</span>
          </div>
          <div className="text-[10px] text-stone-400">待复习 / 逾期12小时以上</div>
        </div>

        <div className="bg-white dark:bg-paper-900 border border-paper-200 dark:border-paper-800 p-4 rounded-lg space-y-1 transition-colors">
          <div className="text-xs text-stone-400 dark:text-stone-500 flex items-center justify-between">
            <span>综合已掌握</span>
            <CheckCircle className="w-3.5 h-3.5 text-stone-900 dark:text-stone-100" />
          </div>
          <div className="text-2xl font-bold font-mono text-stone-900 dark:text-stone-100">
            {metrics.masteredCount}
          </div>
          <div className="text-[10px] text-stone-400">稳固精通（仍参与定期抽查）</div>
        </div>
      </div>

      {/* Accuracy & Correction Insight */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* True Mastery vs Self-Assessment */}
        <div className="bg-white dark:bg-paper-900 border border-paper-200 dark:border-paper-800 p-5 rounded-lg space-y-3 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-900 dark:text-stone-100">真实回忆正确率</span>
            <Target className="w-4 h-4 text-stone-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-stone-900 dark:text-stone-100">
              {metrics.trueAccuracy}%
            </span>
            <span className="text-xs text-stone-400">
              (初判认识: {metrics.initialAccuracy}%)
            </span>
          </div>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
            剔除了点击“记错了”撤销后的纯净回忆正确率，反映最客观的词汇留存水平。
          </p>
        </div>

        {/* "记错了" False Positive Rate */}
        <div className="bg-white dark:bg-paper-900 border border-paper-200 dark:border-paper-800 p-5 rounded-lg space-y-3 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-900 dark:text-stone-100">「记错了」纠错偏离度</span>
            <Flame className="w-4 h-4 text-stone-800 dark:text-stone-200" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-stone-900 dark:text-stone-100">
              {metrics.mistakeRatio}%
            </span>
            <span className="text-xs text-stone-400">
              (纠错 {metrics.totalCorrected} 次)
            </span>
          </div>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
            选择“认识”后承认记错的比例。此数值越低，说明自我评价越敏锐准确、无虚假掌握。
          </p>
        </div>

        {/* Authentic Context Accuracy */}
        <div className="bg-white dark:bg-paper-900 border border-paper-200 dark:border-paper-800 p-5 rounded-lg space-y-3 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-900 dark:text-stone-100">真题长难句语境正确率</span>
            <TrendingUp className="w-4 h-4 text-stone-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-stone-900 dark:text-stone-100">
              {metrics.contextAccuracy}%
            </span>
            <span className="text-xs text-stone-400">
              (已测 {metrics.contextTotal} 句)
            </span>
          </div>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
            真题语境主动回忆模式下的实战准确率，衡量能否跨越生词表真正读懂真题原文。
          </p>
        </div>
      </div>

      {/* Future 7 Days Forecast */}
      <div className="bg-white dark:bg-paper-900 border border-paper-200 dark:border-paper-800 p-5 rounded-lg space-y-4 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-stone-500" />
            未来 7 天到期复习量预估
          </span>
          <span className="text-[11px] text-stone-400 font-mono">
            基于艾宾浩斯与 SM-2 动态时间表
          </span>
        </div>

        <div className="grid grid-cols-7 gap-2 pt-2">
          {Object.entries(metrics.future7DaysForecast).map(([dateStr, count]) => (
            <div key={dateStr} className="text-center bg-paper-50 dark:bg-paper-850 p-2.5 rounded border border-paper-200 dark:border-paper-800">
              <div className="text-[11px] text-stone-500 dark:text-stone-400 font-mono">{dateStr}</div>
              <div className="text-lg font-bold font-mono text-stone-900 dark:text-stone-100 mt-1">{count}</div>
              <div className="text-[10px] text-stone-400 mt-0.5">词到期</div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Recurring Mistake Words */}
      <div className="bg-white dark:bg-paper-900 border border-paper-200 dark:border-paper-800 p-5 rounded-lg space-y-4 transition-colors">
        <div className="flex items-center justify-between border-b border-paper-100 dark:border-paper-800 pb-2">
          <span className="text-xs font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-stone-800 dark:text-stone-200" />
            反复出错最多的单词及薄弱释义
          </span>
          <span className="text-[11px] text-stone-400">重点关注熟词僻义与语境混淆</span>
        </div>

        {metrics.topErrorWords.length > 0 ? (
          <div className="divide-y divide-paper-100 dark:divide-paper-800">
            {metrics.topErrorWords.map(({ word, rec }) => (
              <div key={word.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-sm text-stone-900 dark:text-stone-100 font-serif">
                      {word.word}
                    </span>
                    <span className="text-stone-400 font-mono text-[11px]">
                      {word.phonetic}
                    </span>
                    <span className="text-stone-500 dark:text-stone-400 bg-paper-100 dark:bg-paper-800 px-1 py-0.2 rounded font-mono text-[10px]">
                      考频 {word.totalFreq}次
                    </span>
                  </div>
                  <div className="text-stone-600 dark:text-stone-300 line-clamp-1">
                    {word.senses.map((s) => `${s.pos} ${s.definition}`).join('; ')}
                  </div>
                </div>

                <div className="text-right flex-shrink-0 font-mono pl-4">
                  <div className="text-stone-900 dark:text-stone-100 font-bold">错 {rec.errorCount} 次</div>
                  <div className="text-[10px] text-stone-400">
                    掌握度 {rec.masteryLevel}/5 星
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-xs text-stone-400">
            暂无反复出错词汇，保持专注复习！
          </div>
        )}
      </div>
    </div>
  );
};
