import React from 'react';
import { Volume2, Star, RotateCcw, AlertTriangle, CheckCircle, History, ArrowRight } from 'lucide-react';
import { WordEntry, WordStudyRecord, UserSettings, RecallRating } from '../types';
import { playWordPronunciation } from '../utils/sound';

interface CardBackProps {
  word: WordEntry;
  record?: WordStudyRecord;
  settings: UserSettings;
  currentIndex: number;
  totalCards: number;
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
  lastRatingForThisCard,
  hasCorrectedThisCard,
  onSelectRating,
  onRevokeAndCorrect,
  onToggleFavorite,
  onNextCard,
}) => {
  const isFavorite = record?.isFavorite || false;
  const examLabel = word.examSource === 'e1' ? '英语一' : '英语二';

  // Highlight target word occurrences in authentic sentence
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
    <div className="w-full max-w-xl mx-auto bg-white dark:bg-paper-900 border border-paper-200 dark:border-paper-800 rounded-xl shadow-xs flex flex-col p-4 sm:p-7 space-y-4 transition-colors">
      {/* Top Bar: Progress, Meta, Favorite */}
      <div className="flex items-center justify-between text-xs text-stone-400 dark:text-stone-500 border-b border-paper-100 dark:border-paper-800 pb-2.5">
        <div className="flex items-center gap-1.5 sm:gap-2">
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

      {/* Word Header */}
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

      {/* Morphology (Compact) */}
      {word.morphology !== '暂无数据' && (
        <div className="bg-paper-100/70 dark:bg-paper-800/60 border border-paper-200 dark:border-paper-700/60 rounded px-2.5 py-1.5 text-[11px] text-stone-700 dark:text-stone-300 leading-snug font-mono">
          <span className="font-semibold text-stone-500 dark:text-stone-400 mr-1.5 font-sans">构词分析:</span>
          {word.morphology}
        </div>
      )}

      {/* All Recorded Senses and Authentic Exam Examples */}
      <div className="space-y-3">
        <div className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 tracking-wider uppercase">
          考研真题已考词义与例句
        </div>

        <div className="space-y-3 divide-y divide-paper-100 dark:divide-paper-800">
          {word.senses.map((sense, idx) => (
            <div key={sense.id || idx} className="pt-2.5 first:pt-0 space-y-1.5">
              {/* Sense line */}
              <div className="flex items-baseline gap-1.5 text-xs">
                <span className="font-mono font-bold text-stone-400 dark:text-stone-500 text-[11px]">
                  {sense.num || idx + 1}.
                </span>
                {sense.pos && (
                  <span className="font-serif italic font-semibold text-stone-700 dark:text-stone-300 bg-paper-100 dark:bg-paper-800 px-1 py-0.2 rounded text-[11px]">
                    {sense.pos}
                  </span>
                )}
                <span className="font-medium text-stone-900 dark:text-stone-100 leading-snug">
                  {sense.definition}
                </span>
                {sense.freq !== undefined && sense.freq > 0 && (
                  <span className="text-[10px] font-mono text-stone-400 dark:text-stone-500 ml-auto whitespace-nowrap">
                    考频 {sense.freq}次
                  </span>
                )}
              </div>

              {/* Authentic Sentence */}
              {sense.examples && sense.examples.length > 0 ? (
                <div className="space-y-1 pl-3 border-l-2 border-paper-200 dark:border-paper-700 text-xs">
                  {sense.examples.map((ex, exIdx) => (
                    <div key={ex.id || exIdx} className="space-y-0.5">
                      <p className="text-stone-800 dark:text-stone-200 leading-relaxed font-serif text-[11px] sm:text-xs">
                        {highlightWordInSentence(ex.sentence, word.word)}
                      </p>
                      <p className="text-stone-500 dark:text-stone-400 leading-relaxed text-[11px]">
                        {ex.translation}
                      </p>
                      <p className="text-[9px] text-stone-400 dark:text-stone-500 font-mono">
                        {ex.source}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {/* Evaluation & "记错了" Section */}
      <div className="pt-3 border-t border-paper-200 dark:border-paper-800 space-y-2">
        {/* Correction Bar */}
        {lastRatingForThisCard === 'know' && !hasCorrectedThisCard && (
          <div className="flex items-center justify-between bg-paper-100 dark:bg-paper-800/80 border border-paper-200 dark:border-paper-700 px-3 py-1.5 rounded text-[11px]">
            <span className="text-stone-700 dark:text-stone-300 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5 text-stone-900 dark:text-stone-100" />
              自评为「认识」
            </span>
            <button
              onClick={onRevokeAndCorrect}
              className="px-2 py-0.5 text-[11px] text-stone-700 dark:text-stone-200 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 border border-paper-300 dark:border-paper-700 rounded flex items-center gap-1 transition-colors"
              title="刚才其实想不起来，撤销认识并记为错词 (快捷键 Z)"
            >
              <RotateCcw className="w-3 h-3" />
              <span>记错了？立即纠错 [Z]</span>
            </button>
          </div>
        )}

        {hasCorrectedThisCard && (
          <div className="bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 px-3 py-1.5 rounded text-[11px] flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>已修正为「记错了」，系统已安排 15 分钟后强化复测。</span>
          </div>
        )}

        {/* Three-Tier Self Evaluation Buttons */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => onSelectRating('dont_know')}
            className={`py-2.5 px-1 sm:px-3 rounded-lg border text-center transition-all active:scale-[0.98] ${
              lastRatingForThisCard === 'dont_know'
                ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 border-stone-900 dark:border-stone-100'
                : 'bg-white dark:bg-paper-850 hover:bg-paper-100 dark:hover:bg-paper-800 text-stone-800 dark:text-stone-200 border-paper-300 dark:border-paper-700'
            }`}
          >
            <div className="text-xs sm:text-sm font-bold">不认识</div>
            <div className="text-[9px] opacity-60">想不起 [1]</div>
          </button>

          <button
            onClick={() => onSelectRating('unfamiliar')}
            className={`py-2.5 px-1 sm:px-3 rounded-lg border text-center transition-all active:scale-[0.98] ${
              lastRatingForThisCard === 'unfamiliar'
                ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 border-stone-900 dark:border-stone-100'
                : 'bg-white dark:bg-paper-850 hover:bg-paper-100 dark:hover:bg-paper-800 text-stone-800 dark:text-stone-200 border-paper-300 dark:border-paper-700'
            }`}
          >
            <div className="text-xs sm:text-sm font-bold">不熟悉</div>
            <div className="text-[9px] opacity-60">有印象 [2]</div>
          </button>

          <button
            onClick={() => onSelectRating('know')}
            className={`py-2.5 px-1 sm:px-3 rounded-lg border text-center transition-all active:scale-[0.98] ${
              lastRatingForThisCard === 'know' && !hasCorrectedThisCard
                ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 border-stone-900 dark:border-stone-100'
                : 'bg-white dark:bg-paper-850 hover:bg-paper-100 dark:hover:bg-paper-800 text-stone-800 dark:text-stone-200 border-paper-300 dark:border-paper-700'
            }`}
          >
            <div className="text-xs sm:text-sm font-bold">认识</div>
            <div className="text-[9px] opacity-60">回忆准确 [3]</div>
          </button>
        </div>

        {/* Next Card Button */}
        {lastRatingForThisCard && (
          <div className="pt-1 flex justify-end">
            <button
              onClick={onNextCard}
              className="py-2 px-3 text-xs bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 rounded-lg flex items-center gap-1 font-medium hover:bg-black transition-colors"
            >
              <span>下一个单词</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
