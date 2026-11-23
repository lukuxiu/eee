import React, { useMemo } from 'react';
import { Volume2, Star, RotateCcw, AlertTriangle, History, ArrowRight } from 'lucide-react';
import { WordEntry, WordStudyRecord, UserSettings, RecallRating, ExamSentence } from '../types';
import { playWordPronunciation } from '../utils/sound';
import { mergeSensesByPos } from '../utils/senseFormatter';

interface CardBackProps {
  word: WordEntry;
  record?: WordStudyRecord;
  settings: UserSettings;
  currentIndex: number;
  totalCards: number;
  selectedYear?: number;
  lastRatingForThisCard?: RecallRating | null;
  hasCorrectedThisCard: boolean;
  onSelectRating: (rating: RecallRating) => void;
  onRevokeAndCorrect: () => void;
  onToggleFavorite: () => void;
  onNextCard: () => void;
}

export const CardBack: React.FC<CardBackProps> = ({
  word,
  record,
  settings,
  currentIndex,
  totalCards,
  selectedYear,
  lastRatingForThisCard,
  hasCorrectedThisCard,
  onSelectRating,
  onRevokeAndCorrect,
  onToggleFavorite,
  onNextCard,
}) => {
  const isFavorite = record?.isFavorite || false;
  const examLabel = word.examSource === 'e1' ? '英语一' : '英语二';

  // 1. 按词性合并释义、去重并按考频降序排列
  const mergedPosGroups = useMemo(() => {
    return mergeSensesByPos(word.senses);
  }, [word.senses]);

  // 2. 汇总提取所有考研例句（去重，放在释义下方，优先置顶当年考点例句）
  const allExamples = useMemo(() => {
    const list: {
      ex: ExamSentence;
      senseDef: string;
      sensePos: string;
      freq?: number;
    }[] = [];
    const seenSentences = new Set<string>();

    for (const group of mergedPosGroups) {
      for (const item of group.items) {
        for (const ex of item.examples) {
          if (seenSentences.has(ex.sentence)) continue;
          seenSentences.add(ex.sentence);
          list.push({
            ex,
            senseDef: item.definition,
            sensePos: group.pos,
            freq: item.freq,
          });
        }
      }
    }

    if (selectedYear) {
      list.sort((a, b) => {
        const aYear = a.ex.year === selectedYear ? 1 : 0;
        const bYear = b.ex.year === selectedYear ? 1 : 0;
        return bYear - aYear;
      });
    }

    return list;
  }, [mergedPosGroups, selectedYear]);

  // 高亮例句中的核心考点生词
  const highlightWordInSentence = (sentence: string, targetWord: string) => {
    if (!sentence || !targetWord) return sentence;
    const regex = new RegExp(`\\b(${targetWord}[a-z]*)\\b`, 'gi');
    const parts = sentence.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <span 
          key={i} 
          className="font-bold underline decoration-stone-900 dark:decoration-stone-100 underline-offset-2 text-stone-900 dark:text-stone-100 bg-paper-100 dark:bg-paper-800 px-0.5 rounded"
        >
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-white dark:bg-paper-900 border border-paper-200 dark:border-paper-800 rounded-xl shadow-xs flex flex-col p-4 sm:p-7 space-y-3.5 transition-colors">
      {/* 顶部状态栏：进度、词书、高频榜位、收藏 */}
      <div className="flex items-center justify-between text-xs text-stone-400 dark:text-stone-500 border-b border-paper-100 dark:border-paper-800 pb-2.5">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <span className="font-mono text-stone-800 dark:text-stone-200 bg-paper-100 dark:bg-paper-800 px-2 py-0.5 rounded text-[11px] font-semibold border border-paper-200 dark:border-paper-700">
            {currentIndex + 1} / {totalCards}
          </span>
          <span className="text-stone-500 dark:text-stone-400 text-[11px] font-medium">{examLabel}</span>

          {word.kaoyanRank && (
            <span className="bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-1.5 py-0.5 rounded font-mono text-[10px] font-bold tracking-tight">
              🔥高频 #{word.kaoyanRank}
            </span>
          )}
          {word.cefr && (
            <span className="bg-paper-100 dark:bg-paper-800 text-stone-700 dark:text-stone-300 px-1.5 py-0.5 rounded font-mono text-[10px] border border-paper-200 dark:border-paper-700">
              {word.cefr}
            </span>
          )}
          {word.totalFreq > 0 && !word.kaoyanRank && (
            <span className="bg-paper-100 dark:bg-paper-800 text-stone-600 dark:text-stone-400 px-1.5 py-0.5 rounded font-mono text-[10px]">
              考频 {word.totalFreq}次
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {record && record.reviewCount > 0 && (
            <span className="text-stone-400 dark:text-stone-500 text-[10px] font-mono flex items-center gap-1">
              <History className="w-3 h-3" />
              复习 {record.reviewCount} · 错 {record.errorCount}
            </span>
          )}
          <button
            onClick={onToggleFavorite}
            title={isFavorite ? '取消收藏' : '加入收藏 (快捷键 F)'}
            className={`p-1 rounded ${
              isFavorite
                ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/60'
                : 'text-stone-300 dark:text-stone-600 hover:text-stone-600 dark:hover:text-stone-300'
            }`}
          >
            <Star className="w-4 h-4" fill={isFavorite ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>

      {/* 单词主标题区：拼写、音标、原声朗读 */}
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2.5 flex-wrap">
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-stone-900 dark:text-stone-100 font-serif">
            {word.word}
          </h2>
          {word.phonetic && (
            <span className="text-stone-500 dark:text-stone-400 font-mono text-xs sm:text-sm">
              {word.phonetic}
            </span>
          )}
          <button
            onClick={() => playWordPronunciation(word.word)}
            title="播放发音 (快捷键 S)"
            className="p-1 text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 rounded transition-colors"
          >
            <Volume2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {record && (
          <div className="text-[11px] font-mono text-stone-500 dark:text-stone-400 flex-shrink-0">
            掌握度 {record.masteryLevel}/5 星
          </div>
        )}
      </div>

      {/* 🌟 核心布局调整 1：自评操作按钮提到最上面（彻底解决反复向下翻页的痛点） */}
      <div className="bg-paper-100/70 dark:bg-paper-800/50 p-2 sm:p-2.5 rounded-lg border border-paper-200 dark:border-paper-700/60 space-y-2">
        {/* 三档记忆评级按钮 */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => onSelectRating('dont_know')}
            className={`py-2 px-1 sm:px-2 rounded-lg border text-center transition-all active:scale-[0.98] ${
              lastRatingForThisCard === 'dont_know'
                ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 border-stone-900 dark:border-stone-100 shadow-xs'
                : 'bg-white dark:bg-paper-850 hover:bg-paper-100 dark:hover:bg-paper-800 text-stone-800 dark:text-stone-200 border-paper-300 dark:border-paper-700'
            }`}
          >
            <div className="text-xs sm:text-sm font-bold">不认识</div>
            <div className="text-[9px] opacity-60">想不起 [1]</div>
          </button>

          <button
            onClick={() => onSelectRating('unfamiliar')}
            className={`py-2 px-1 sm:px-2 rounded-lg border text-center transition-all active:scale-[0.98] ${
              lastRatingForThisCard === 'unfamiliar'
                ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 border-stone-900 dark:border-stone-100 shadow-xs'
                : 'bg-white dark:bg-paper-850 hover:bg-paper-100 dark:hover:bg-paper-800 text-stone-800 dark:text-stone-200 border-paper-300 dark:border-paper-700'
            }`}
          >
            <div className="text-xs sm:text-sm font-bold">不熟悉</div>
            <div className="text-[9px] opacity-60">有印象 [2]</div>
          </button>

          <button
            onClick={() => onSelectRating('know')}
            className={`py-2 px-1 sm:px-2 rounded-lg border text-center transition-all active:scale-[0.98] ${
              lastRatingForThisCard === 'know' && !hasCorrectedThisCard
                ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 border-stone-900 dark:border-stone-100 shadow-xs'
                : 'bg-white dark:bg-paper-850 hover:bg-paper-100 dark:hover:bg-paper-800 text-stone-800 dark:text-stone-200 border-paper-300 dark:border-paper-700'
            }`}
          >
            <div className="text-xs sm:text-sm font-bold">认识</div>
            <div className="text-[9px] opacity-60">回忆准确 [3]</div>
          </button>
        </div>

        {/* 评级后即时动作区：“记错了”撤销修正与“下一个单词”入口 */}
        {(lastRatingForThisCard || hasCorrectedThisCard) && (
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-paper-200/60 dark:border-paper-700/40 text-xs">
            {lastRatingForThisCard === 'know' && !hasCorrectedThisCard && (
              <button
                onClick={onRevokeAndCorrect}
                className="px-2 py-1 text-[11px] text-stone-600 dark:text-stone-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 border border-paper-300 dark:border-paper-700 rounded flex items-center gap-1 transition-colors"
                title="刚才其实想不起来，撤销认识并记为错词 (快捷键 Z)"
              >
                <RotateCcw className="w-3 h-3 text-red-500" />
                <span>记错了？立即纠错 [Z]</span>
              </button>
            )}

            {hasCorrectedThisCard && (
              <div className="text-red-600 dark:text-red-400 text-[11px] flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                <span>已纠正为错词，系统已安排短期复测</span>
              </div>
            )}

            <button
              onClick={onNextCard}
              className="ml-auto py-1 px-3 text-xs bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 rounded-md flex items-center gap-1 font-medium hover:bg-black dark:hover:bg-white transition-colors shadow-xs"
            >
              <span>下一个单词 [Space/Enter]</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* 构词分析（轻量紧凑） */}
      {word.morphology !== '暂无数据' && (
        <div className="bg-paper-100/70 dark:bg-paper-800/60 border border-paper-200 dark:border-paper-700/60 rounded px-2.5 py-1.5 text-[11px] text-stone-700 dark:text-stone-300 leading-snug font-mono">
          <span className="font-semibold text-stone-500 dark:text-stone-400 mr-1.5 font-sans">构词分析:</span>
          {word.morphology}
        </div>
      )}

      {/* 🌟 核心布局调整 2：同词性合并去重，按考频降序紧凑排布 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] font-semibold text-stone-500 dark:text-stone-400">
          <span>考研真题释义（同词性已合并 · 按考频降序）</span>
          <span className="text-[10px] font-mono text-stone-400 dark:text-stone-500">
            {mergedPosGroups.length} 个词性
          </span>
        </div>

        <div className="bg-paper-50/60 dark:bg-paper-950/30 border border-paper-200/80 dark:border-paper-800 rounded-lg divide-y divide-paper-200/60 dark:divide-paper-800/80">
          {mergedPosGroups.map((group) => (
            <div
              key={group.pos}
              className="px-3 py-2.5 flex items-start justify-between gap-2.5 text-xs"
            >
              <div className="flex items-baseline gap-2 min-w-0 flex-1">
                <span className="font-serif italic font-semibold text-stone-700 dark:text-stone-200 bg-paper-200/70 dark:bg-paper-800 px-1.5 py-0.5 rounded text-[11px] min-w-[42px] text-center flex-shrink-0">
                  {group.pos}
                </span>
                <div className="leading-relaxed text-stone-900 dark:text-stone-100 font-medium break-words">
                  {group.items.map((item, i) => (
                    <React.Fragment key={item.id || i}>
                      {i > 0 && (
                        <span className="text-stone-300 dark:text-stone-600 mx-1.5 select-none">·</span>
                      )}
                      <span>{item.definition}</span>
                      {item.freq > 0 && (
                        <span className="ml-1 text-[10px] font-mono text-amber-700 dark:text-amber-300">
                          ({item.freq}次)
                        </span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
              {group.totalFreq > 0 && (
                <span className="flex-shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/40 whitespace-nowrap mt-0.5">
                  {group.items.length > 1 ? `共 ${group.totalFreq}次` : `考频 ${group.totalFreq}次`}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 🌟 核心布局调整 3：真题例句放到释义下方，纵向可滚动态显示 */}
      {allExamples.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-paper-100 dark:border-paper-800">
          <div className="flex items-center justify-between text-[11px] font-semibold text-stone-500 dark:text-stone-400">
            <span>真题考点长难句与例句 ({allExamples.length} 条)</span>
            {selectedYear && (
              <span className="text-[10px] text-amber-700 dark:text-amber-300 font-mono">
                优先标注 {selectedYear} 年考题
              </span>
            )}
          </div>

          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {allExamples.map((item, exIdx) => {
              const { ex, senseDef, sensePos } = item;
              const isTargetYear = selectedYear && ex.year === selectedYear;
              return (
                <div
                  key={ex.id || exIdx}
                  className={`p-2.5 rounded-lg border text-xs transition-colors space-y-1.5 ${
                    isTargetYear
                      ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-200/70 dark:border-amber-900/50'
                      : 'bg-paper-50/40 dark:bg-paper-800/30 border-paper-200/60 dark:border-paper-700/40'
                  }`}
                >
                  {/* 考查释义对应说明与年份徽章 */}
                  <div className="flex items-center justify-between text-[10px] text-stone-400 dark:text-stone-500 font-mono">
                    <span className="text-stone-600 dark:text-stone-300 font-sans">
                      考查: {sensePos} {senseDef}
                    </span>
                    {isTargetYear && (
                      <span className="bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 px-1 py-0.2 rounded font-bold font-sans">
                        🎯 {selectedYear}考点原句
                      </span>
                    )}
                  </div>

                  {/* 英文原句 */}
                  <p className="text-stone-800 dark:text-stone-200 leading-relaxed font-serif text-[11px] sm:text-xs">
                    {highlightWordInSentence(ex.sentence, word.word)}
                  </p>

                  {/* 中文译文 */}
                  <p className="text-stone-500 dark:text-stone-400 leading-relaxed text-[11px]">
                    {ex.translation}
                  </p>

                  {/* 真题出处信息 */}
                  <p className="text-[9px] text-stone-400 dark:text-stone-500 font-mono">
                    {ex.source}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
