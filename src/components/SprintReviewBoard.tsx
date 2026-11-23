import React, { useState, useMemo, useEffect } from 'react';
import {
  Zap,
  Flame,
  AlertTriangle,
  Calendar,
  BookOpen,
  Volume2,
  Star,
  Eye,
  EyeOff,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Layers,
  Play,
  SlidersHorizontal,
} from 'lucide-react';
import { WordEntry, WordStudyRecord, UserSettings, RecallRating } from '../types';
import {
  SPRINT_PACKS,
  SprintPackKey,
  getSprintWords,
  calculateExamCountdown,
} from '../engine/sprintEngine';
import {
  getStoredExamTargetDate,
  saveExamTargetDate,
  getStoredSprintState,
  saveSprintState,
} from '../storage/sessionStore';
import { playWordPronunciation } from '../utils/sound';

interface SprintReviewBoardProps {
  words: WordEntry[];
  records: Record<string, WordStudyRecord>;
  settings: UserSettings;
  onQuickRate: (wordId: string, rating: RecallRating) => void;
  onToggleFavorite: (wordId: string) => void;
  onStartSprintDeck: (deckWords: WordEntry[], deckTitle?: string) => void;
  onInspectWord: (word: WordEntry) => void;
}

const PAGE_SIZE = 30;

export const SprintReviewBoard: React.FC<SprintReviewBoardProps> = ({
  words,
  records,
  settings,
  onQuickRate,
  onToggleFavorite,
  onStartSprintDeck,
  onInspectWord,
}) => {
  const initialStored = useMemo(() => getStoredSprintState(), []);

  const [examDate, setExamDate] = useState<string>(() => getStoredExamTargetDate());
  const [isEditingDate, setIsEditingDate] = useState(false);

  const [activePack, setActivePack] = useState<SprintPackKey>(
    (initialStored?.packKey as SprintPackKey) || 'high_freq_1199'
  );
  const [pageIndex, setPageIndex] = useState<number>(initialStored?.pageIndex || 0);
  const [onlyUnmastered, setOnlyUnmastered] = useState<boolean>(
    initialStored?.onlyUnmastered ?? true
  );
  const [hideDefinitions, setHideDefinitions] = useState<boolean>(
    initialStored?.hideDefinitions ?? true
  );
  const [clearedIds, setClearedIds] = useState<string[]>(initialStored?.clearedWordIds || []);
  const [flaggedIds, setFlaggedIds] = useState<string[]>(initialStored?.flaggedWordIds || []);

  // 单个词条在遮罩模式下的临时展开集合 & 例句展开集合
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [expandedExampleIds, setExpandedExampleIds] = useState<Set<string>>(new Set());

  // 持久化冲刺面板状态
  useEffect(() => {
    saveSprintState({
      packKey: activePack,
      pageIndex,
      clearedWordIds: clearedIds,
      flaggedWordIds: flaggedIds,
      onlyUnmastered,
      hideDefinitions,
    });
  }, [activePack, pageIndex, clearedIds, flaggedIds, onlyUnmastered, hideDefinitions]);

  const countdown = useMemo(() => calculateExamCountdown(examDate), [examDate]);

  // 计算各冲刺专题实时词量
  const packCounts = useMemo(() => {
    const counts: Record<SprintPackKey, number> = {
      high_freq_1199: 0,
      mistakes_clear: 0,
      recent_5_years: 0,
      polysemy_killer: 0,
      unstudied_high_freq: 0,
      favorite_sprint: 0,
    };
    for (const pack of SPRINT_PACKS) {
      counts[pack.key] = getSprintWords(
        words,
        records,
        settings.examFilter,
        pack.key,
        onlyUnmastered
      ).length;
    }
    return counts;
  }, [words, records, settings.examFilter, onlyUnmastered]);

  // 当前专题全部匹配词汇
  const packWords = useMemo(() => {
    return getSprintWords(words, records, settings.examFilter, activePack, onlyUnmastered);
  }, [words, records, settings.examFilter, activePack, onlyUnmastered]);

  // 高频 1199 总体掌握进度
  const highFreqOverview = useMemo(() => {
    const all1199 = getSprintWords(words, records, settings.examFilter, 'high_freq_1199', false);
    const mastered1199 = all1199.filter((w) => (records[w.id]?.masteryLevel || 0) >= 4).length;
    return {
      total: all1199.length,
      mastered: mastered1199,
      remaining: Math.max(0, all1199.length - mastered1199),
    };
  }, [words, records, settings.examFilter]);

  const totalPages = Math.max(1, Math.ceil(packWords.length / PAGE_SIZE));
  const safePageIndex = Math.min(pageIndex, totalPages - 1);

  const currentGroupWords = useMemo(() => {
    const start = safePageIndex * PAGE_SIZE;
    return packWords.slice(start, start + PAGE_SIZE);
  }, [packWords, safePageIndex]);

  const clearedSet = useMemo(() => new Set(clearedIds), [clearedIds]);
  const flaggedSet = useMemo(() => new Set(flaggedIds), [flaggedIds]);

  const currentGroupClearedCount = useMemo(
    () => currentGroupWords.filter((w) => clearedSet.has(w.id)).length,
    [currentGroupWords, clearedSet]
  );

  // 建议每日过词组数
  const recommendedGroupsPerDay = useMemo(() => {
    const days = Math.max(1, countdown.daysLeft);
    const remainingGroups = Math.ceil(Math.max(30, highFreqOverview.remaining) / PAGE_SIZE);
    return Math.min(8, Math.max(1, Math.ceil(remainingGroups / days)));
  }, [countdown.daysLeft, highFreqOverview.remaining]);

  const handleSelectPack = (key: SprintPackKey) => {
    setActivePack(key);
    setPageIndex(0);
    setRevealedIds(new Set());
  };

  const toggleRevealRow = (wordId: string) => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(wordId)) next.delete(wordId);
      else next.add(wordId);
      return next;
    });
  };

  const toggleExpandExample = (wordId: string) => {
    setExpandedExampleIds((prev) => {
      const next = new Set(prev);
      if (next.has(wordId)) next.delete(wordId);
      else next.add(wordId);
      return next;
    });
  };

  const handleMarkKnow = (word: WordEntry) => {
    onQuickRate(word.id, 'know');
    if (!clearedSet.has(word.id)) {
      setClearedIds((prev) => [...prev, word.id]);
    }
    if (flaggedSet.has(word.id)) {
      setFlaggedIds((prev) => prev.filter((id) => id !== word.id));
    }
  };

  const handleMarkWeak = (word: WordEntry) => {
    onQuickRate(word.id, 'dont_know');
    if (!flaggedSet.has(word.id)) {
      setFlaggedIds((prev) => [...prev, word.id]);
    }
    if (clearedSet.has(word.id)) {
      setClearedIds((prev) => prev.filter((id) => id !== word.id));
    }
    // 标错后自动展开该词条释义以便及时记忆
    setRevealedIds((prev) => {
      const next = new Set(prev);
      next.add(word.id);
      return next;
    });
  };

  const handleMarkGroupCleared = () => {
    const newIds = new Set(clearedIds);
    for (const w of currentGroupWords) {
      if (!flaggedSet.has(w.id)) {
        newIds.add(w.id);
      }
    }
    setClearedIds(Array.from(newIds));
  };

  const handleResetSprintMarks = () => {
    setClearedIds([]);
    setFlaggedIds([]);
    setRevealedIds(new Set());
  };

  const flaggedWordsList = useMemo(
    () => words.filter((w) => flaggedSet.has(w.id)),
    [words, flaggedSet]
  );

  const activePackMeta = SPRINT_PACKS.find((p) => p.key === activePack);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4">
      {/* 1. 考前倒计时与冲刺策略横幅 */}
      <div className="bg-white dark:bg-paper-900 border border-paper-200 dark:border-paper-800 rounded-xl p-4 sm:p-5 shadow-xs transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 text-[11px] font-bold border border-amber-200 dark:border-amber-900">
                <Zap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                考前最后冲刺专区
              </span>
              <span className="text-xs font-mono text-stone-500 dark:text-stone-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                目标考试日：{examDate}
              </span>
              <button
                onClick={() => setIsEditingDate((v) => !v)}
                className="text-[11px] text-stone-500 hover:text-stone-900 dark:hover:text-stone-200 underline"
              >
                {isEditingDate ? '收起' : '修改日期'}
              </button>
            </div>

            {isEditingDate && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="date"
                  value={examDate}
                  onChange={(e) => {
                    if (e.target.value) {
                      setExamDate(e.target.value);
                      saveExamTargetDate(e.target.value);
                    }
                  }}
                  className="text-xs px-2 py-1 rounded border border-paper-300 dark:border-paper-700 bg-paper-50 dark:bg-paper-850 text-stone-800 dark:text-stone-100 font-mono"
                />
                <span className="text-[11px] text-stone-400">2027考研初试通常为 2026年12月19日左右</span>
              </div>
            )}

            <h2 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
              {countdown.isPast ? (
                '考研冲刺进行中 · 全速扫清盲区'
              ) : (
                <>
                  距初试仅剩{' '}
                  <span className="font-mono text-2xl sm:text-3xl text-amber-600 dark:text-amber-400 mx-0.5">
                    {countdown.daysLeft}
                  </span>{' '}
                  天 · 高频保底极速过词
                </>
              )}
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
              建议节奏：每天极速过{' '}
              <span className="font-semibold text-stone-800 dark:text-stone-200">
                {recommendedGroupsPerDay} 组（{recommendedGroupsPerDay * PAGE_SIZE} 词）
              </span>
              ，一屏快速扫盲，卡壳词顺手标红导入卡片集中攻坚。
            </p>
          </div>

          {/* 高频 1199 与本轮扫描统计 */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 flex-shrink-0 text-center">
            <div className="bg-paper-50 dark:bg-paper-850 border border-paper-200 dark:border-paper-800 rounded-lg px-3 py-2">
              <div className="text-[10px] text-stone-400">1199 剩余盲区</div>
              <div className="text-base sm:text-lg font-mono font-bold text-stone-900 dark:text-stone-100 mt-0.5">
                {highFreqOverview.remaining}
              </div>
            </div>
            <div className="bg-paper-50 dark:bg-paper-850 border border-paper-200 dark:border-paper-800 rounded-lg px-3 py-2">
              <div className="text-[10px] text-stone-400">本轮已过</div>
              <div className="text-base sm:text-lg font-mono font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                {clearedIds.length}
              </div>
            </div>
            <div className="bg-paper-50 dark:bg-paper-850 border border-paper-200 dark:border-paper-800 rounded-lg px-3 py-2">
              <div className="text-[10px] text-stone-400">标错待强化</div>
              <div className="text-base sm:text-lg font-mono font-bold text-red-600 dark:text-red-400 mt-0.5">
                {flaggedIds.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 六大考前靶向冲刺专题切换 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {SPRINT_PACKS.map((pack) => {
          const isActive = activePack === pack.key;
          const count = packCounts[pack.key];
          return (
            <button
              key={pack.key}
              onClick={() => handleSelectPack(pack.key)}
              className={`p-2.5 rounded-lg border text-left transition-all ${
                isActive
                  ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 border-stone-900 dark:border-stone-100 shadow-xs'
                  : 'bg-white dark:bg-paper-900 hover:bg-paper-100 dark:hover:bg-paper-850 text-stone-800 dark:text-stone-200 border-paper-200 dark:border-paper-800'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold truncate">{pack.shortLabel}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                    isActive
                      ? 'bg-white/20 text-white dark:bg-black/15 dark:text-stone-900'
                      : 'bg-paper-100 dark:bg-paper-800 text-stone-600 dark:text-stone-400'
                  }`}
                >
                  {count}
                </span>
              </div>
              <div className="text-[10px] opacity-70 mt-1 line-clamp-1">{pack.description}</div>
            </button>
          );
        })}
      </div>

      {/* 3. 极速过词控制栏 */}
      <div className="bg-white dark:bg-paper-900 border border-paper-200 dark:border-paper-800 rounded-xl p-3 sm:p-4 space-y-3 shadow-xs transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              {activePackMeta?.label}
            </span>
            <span className="text-[11px] font-mono text-stone-400">
              共 {packWords.length} 词 · 第 {safePageIndex + 1}/{totalPages} 组
            </span>
          </div>

          {/* 快捷功能开关 */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <button
              onClick={() => setHideDefinitions((v) => !v)}
              className={`px-2.5 py-1.5 rounded-md border flex items-center gap-1.5 text-[11px] font-medium transition-colors ${
                hideDefinitions
                  ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 border-stone-900 dark:border-stone-100'
                  : 'bg-paper-50 dark:bg-paper-850 text-stone-700 dark:text-stone-300 border-paper-300 dark:border-paper-700'
              }`}
              title="自测模式遮盖释义，点击词条即刻揭晓；关闭则全部展开适合口袋清单通读"
            >
              {hideDefinitions ? (
                <>
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>遮住中文（点击揭晓）</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  <span>全部显示中文</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                setOnlyUnmastered((v) => !v);
                setPageIndex(0);
              }}
              className={`px-2.5 py-1.5 rounded-md border flex items-center gap-1.5 text-[11px] font-medium transition-colors ${
                onlyUnmastered
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800'
                  : 'bg-paper-50 dark:bg-paper-850 text-stone-600 dark:text-stone-400 border-paper-200 dark:border-paper-700'
              }`}
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>{onlyUnmastered ? '已过滤熟词 (≥4星)' : '包含全部词'}</span>
            </button>

            {currentGroupWords.length > 0 && (
              <button
                onClick={() =>
                  onStartSprintDeck(
                    currentGroupWords,
                    `${activePackMeta?.shortLabel} · 第${safePageIndex + 1}组`
                  )
                }
                className="px-2.5 py-1.5 rounded-md bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900 text-[11px] font-bold flex items-center gap-1 transition-colors shadow-xs"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>本组导入卡片精学</span>
              </button>
            )}

            {flaggedWordsList.length > 0 && (
              <button
                onClick={() => onStartSprintDeck(flaggedWordsList, '冲刺标错词集中强化')}
                className="px-2.5 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold flex items-center gap-1 transition-colors shadow-xs"
              >
                <AlertTriangle className="w-3 h-3" />
                <span>只刷标错词 ({flaggedWordsList.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* 组别分页与本组进度条 */}
        {packWords.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-paper-100 dark:border-paper-800">
            <div className="flex items-center gap-2 flex-1">
              <div className="flex items-center gap-1">
                <button
                  disabled={safePageIndex <= 0}
                  onClick={() => setPageIndex(Math.max(0, safePageIndex - 1))}
                  className="p-1 rounded border border-paper-200 dark:border-paper-700 text-stone-600 dark:text-stone-300 disabled:opacity-30 hover:bg-paper-100 dark:hover:bg-paper-800"
                  title="上一组"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <select
                  value={safePageIndex}
                  onChange={(e) => {
                    setPageIndex(Number(e.target.value));
                    setRevealedIds(new Set());
                  }}
                  className="text-xs font-mono py-1 px-2 rounded bg-paper-50 dark:bg-paper-850 border border-paper-200 dark:border-paper-700 text-stone-800 dark:text-stone-200"
                >
                  {Array.from({ length: totalPages }).map((_, idx) => {
                    const start = idx * PAGE_SIZE + 1;
                    const end = Math.min(packWords.length, (idx + 1) * PAGE_SIZE);
                    return (
                      <option key={idx} value={idx}>
                        第 {idx + 1} 组 ({start}–{end})
                      </option>
                    );
                  })}
                </select>
                <button
                  disabled={safePageIndex >= totalPages - 1}
                  onClick={() => setPageIndex(Math.min(totalPages - 1, safePageIndex + 1))}
                  className="p-1 rounded border border-paper-200 dark:border-paper-700 text-stone-600 dark:text-stone-300 disabled:opacity-30 hover:bg-paper-100 dark:hover:bg-paper-800"
                  title="下一组"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Progress indicator */}
              <div className="flex-1 max-w-xs flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-paper-200 dark:bg-paper-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 dark:bg-emerald-500 transition-all duration-300"
                    style={{
                      width: `${
                        currentGroupWords.length > 0
                          ? Math.round((currentGroupClearedCount / currentGroupWords.length) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <span className="text-[11px] font-mono text-stone-500 dark:text-stone-400 whitespace-nowrap">
                  {currentGroupClearedCount}/{currentGroupWords.length} 已过
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px]">
              <button
                onClick={handleMarkGroupCleared}
                className="px-2 py-1 rounded border border-paper-200 dark:border-paper-700 text-stone-600 dark:text-stone-300 hover:bg-paper-100 dark:hover:bg-paper-800 transition-colors"
              >
                本组全标已过
              </button>
              {(clearedIds.length > 0 || flaggedIds.length > 0) && (
                <button
                  onClick={handleResetSprintMarks}
                  className="px-2 py-1 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 flex items-center gap-1 transition-colors"
                  title="清空本轮扫描标记"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>重置标记</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 4. 极速扫描词汇清单（每组 30 词，点击词条即揭晓按考频排列释义） */}
      {currentGroupWords.length === 0 ? (
        <div className="bg-white dark:bg-paper-900 border border-paper-200 dark:border-paper-800 rounded-xl p-10 text-center space-y-3">
          <Layers className="w-8 h-8 text-stone-300 dark:text-stone-600 mx-auto" />
          <div className="text-sm font-bold text-stone-800 dark:text-stone-200">
            太棒了！当前冲刺专题下暂无待突破单词
          </div>
          <p className="text-xs text-stone-400">
            你可以关闭「已过滤熟词」开关来通读复习全部词汇，或切换其他考前专题。
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-paper-900 border border-paper-200 dark:border-paper-800 rounded-xl divide-y divide-paper-100 dark:divide-paper-800 shadow-xs overflow-hidden">
          {currentGroupWords.map((word, idx) => {
            const rec = records[word.id];
            const isCleared = clearedSet.has(word.id);
            const isFlagged = flaggedSet.has(word.id);
            const isFavorite = rec?.isFavorite || false;
            const isMeaningVisible = !hideDefinitions || revealedIds.has(word.id);
            const isExampleOpen = expandedExampleIds.has(word.id);

            // 按考频降序排列释义
            const sortedSenses = [...word.senses].sort((a, b) => (b.freq || 0) - (a.freq || 0));
            const firstExample = sortedSenses.find((s) => s.examples && s.examples.length > 0)?.examples[0];

            return (
              <div
                key={word.id}
                onClick={() => hideDefinitions && toggleRevealRow(word.id)}
                className={`p-3 sm:px-4 sm:py-3 transition-colors ${
                  hideDefinitions ? 'cursor-pointer' : ''
                } ${
                  isFlagged
                    ? 'bg-red-50/60 dark:bg-red-950/25 hover:bg-red-50 dark:hover:bg-red-950/35'
                    : isCleared
                    ? 'bg-paper-50/60 dark:bg-paper-950/40 opacity-65 hover:opacity-100'
                    : 'hover:bg-paper-50/80 dark:hover:bg-paper-850/60'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                  {/* 左侧：序号、英文、音标、标签 */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-[11px] font-mono text-stone-400 w-5 text-right shrink-0">
                        {safePageIndex * PAGE_SIZE + idx + 1}.
                      </span>
                      <span className="font-serif font-bold text-base sm:text-lg text-stone-900 dark:text-stone-100">
                        {word.word}
                      </span>
                      {word.phonetic && (
                        <span className="text-xs font-mono text-stone-400 dark:text-stone-500">
                          {word.phonetic}
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          playWordPronunciation(word.word);
                        }}
                        title="播放发音"
                        className="p-1 text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 rounded transition-colors"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>

                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-paper-100 dark:bg-paper-800 text-stone-500 dark:text-stone-400 font-mono">
                        {word.examSource === 'e1' ? '英一' : '英二'}
                      </span>

                      {word.kaoyanRank ? (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-mono font-bold">
                          #{word.kaoyanRank}
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-paper-100 dark:bg-paper-800 text-stone-600 dark:text-stone-400 font-mono">
                          频{word.totalFreq}
                        </span>
                      )}

                      {rec && rec.errorCount > 0 && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-300 font-mono">
                          错{rec.errorCount}次
                        </span>
                      )}
                    </div>

                    {/* 中间释义区：默认遮罩时点击词条即揭晓，按考频展示 */}
                    <div className="pl-7">
                      {isMeaningVisible ? (
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs">
                            {sortedSenses.map((s, sIdx) => (
                              <span key={s.id || sIdx} className="inline-flex items-baseline gap-1">
                                <span className="font-serif italic text-[11px] font-semibold text-stone-500 dark:text-stone-400">
                                  {s.pos}
                                </span>
                                <span className="text-stone-800 dark:text-stone-200 font-medium">
                                  {s.definition}
                                </span>
                                {s.freq && s.freq > 0 ? (
                                  <span className="text-[10px] font-mono text-amber-700 dark:text-amber-300">
                                    ({s.freq}次)
                                  </span>
                                ) : null}
                              </span>
                            ))}
                          </div>

                          {/* 可选微展开真题例句或查看全量词条 */}
                          <div className="flex items-center gap-3 pt-0.5 text-[11px]">
                            {firstExample && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleExpandExample(word.id);
                                }}
                                className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 underline"
                              >
                                {isExampleOpen ? '收起真题例句' : '看真题例句'}
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onInspectWord(word);
                              }}
                              className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 flex items-center gap-0.5"
                            >
                              <BookOpen className="w-3 h-3" />
                              <span>完整解析</span>
                            </button>
                          </div>

                          {isExampleOpen && firstExample && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="mt-1.5 p-2 rounded bg-paper-50 dark:bg-paper-850 border border-paper-200 dark:border-paper-800 text-xs space-y-0.5"
                            >
                              <p className="font-serif text-stone-800 dark:text-stone-200 text-[11px] leading-relaxed">
                                {firstExample.sentence}
                              </p>
                              <p className="text-stone-500 dark:text-stone-400 text-[11px]">
                                {firstExample.translation}
                              </p>
                              <p className="text-[9px] font-mono text-stone-400">{firstExample.source}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-paper-100/80 dark:bg-paper-800/70 text-[11px] text-stone-400 dark:text-stone-500 border border-dashed border-paper-300 dark:border-paper-700">
                          <Eye className="w-3 h-3" />
                          <span>点击词条揭晓按考频排列释义</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 右侧：极速过词快捷操作按钮 */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 pl-7 sm:pl-0 shrink-0 self-end sm:self-center"
                  >
                    <button
                      onClick={() => onToggleFavorite(word.id)}
                      title={isFavorite ? '取消收藏' : '加入收藏'}
                      className={`p-1.5 rounded border transition-colors ${
                        isFavorite
                          ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-900'
                          : 'text-stone-300 dark:text-stone-600 border-paper-200 dark:border-paper-700 hover:text-stone-600 dark:hover:text-stone-300'
                      }`}
                    >
                      <Star className="w-3.5 h-3.5" fill={isFavorite ? 'currentColor' : 'none'} />
                    </button>

                    <button
                      onClick={() => handleMarkWeak(word)}
                      className={`px-2.5 py-1.5 rounded text-xs font-medium border flex items-center gap-1 transition-all ${
                        isFlagged
                          ? 'bg-red-600 text-white border-red-600 shadow-xs'
                          : 'bg-white dark:bg-paper-850 text-stone-700 dark:text-stone-200 border-paper-300 dark:border-paper-700 hover:bg-red-50 hover:text-red-700 hover:border-red-300 dark:hover:bg-red-950/50 dark:hover:text-red-300'
                      }`}
                      title="标记为不熟/错词，将加入错词库并在卡片中强化"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>不熟</span>
                    </button>

                    <button
                      onClick={() => handleMarkKnow(word)}
                      className={`px-2.5 py-1.5 rounded text-xs font-medium border flex items-center gap-1 transition-all ${
                        isCleared
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white dark:bg-paper-850 text-stone-800 dark:text-stone-100 border-paper-300 dark:border-paper-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-300'
                      }`}
                      title="标记为已过/认识"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>认识</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 底部快速翻组按钮 */}
      {totalPages > 1 && currentGroupWords.length > 0 && (
        <div className="flex items-center justify-between bg-white dark:bg-paper-900 border border-paper-200 dark:border-paper-800 rounded-xl p-3 text-xs">
          <button
            disabled={safePageIndex <= 0}
            onClick={() => {
              setPageIndex(Math.max(0, safePageIndex - 1));
              setRevealedIds(new Set());
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="px-3 py-1.5 rounded border border-paper-200 dark:border-paper-700 text-stone-700 dark:text-stone-200 disabled:opacity-30 hover:bg-paper-100 dark:hover:bg-paper-800 flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>上一组 (30词)</span>
          </button>

          <span className="font-mono text-stone-500">
            第 {safePageIndex + 1} / {totalPages} 组
          </span>

          <button
            disabled={safePageIndex >= totalPages - 1}
            onClick={() => {
              setPageIndex(Math.min(totalPages - 1, safePageIndex + 1));
              setRevealedIds(new Set());
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="px-3 py-1.5 rounded bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 disabled:opacity-30 hover:bg-stone-800 flex items-center gap-1 font-medium"
          >
            <span>下一组 (30词)</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
