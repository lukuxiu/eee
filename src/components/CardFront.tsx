import React from 'react';
import { Volume2, Star, Eye } from 'lucide-react';
import { WordEntry, WordStudyRecord, UserSettings } from '../types';
import { playWordPronunciation } from '../utils/sound';

interface CardFrontProps {
  word: WordEntry;
  record?: WordStudyRecord;
  settings: UserSettings;
  currentIndex: number;
  totalCards: number;
  onReveal: () => void;
  onToggleFavorite: () => void;
}

export const CardFront: React.FC<CardFrontProps> = ({
  word,
  record,
  settings,
  currentIndex,
  totalCards,
  onReveal,
  onToggleFavorite,
}) => {
  const isFavorite = record?.isFavorite || false;
  const examLabel = word.examSource === 'e1' ? '英语一' : '英语二';

  return (
    <div className="w-full max-w-xl mx-auto bg-white dark:bg-paper-900 border border-paper-200 dark:border-paper-800 rounded-xl shadow-xs flex flex-col min-h-[340px] sm:min-h-[420px] p-4 sm:p-7 justify-between transition-colors">
      {/* Top Bar: Progress & Exam Source */}
      <div className="flex items-center justify-between text-xs text-stone-400 dark:text-stone-500">
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
          {settings.showFreqOnFront && word.totalFreq > 0 && !word.kaoyanRank && (
            <span className="bg-paper-100 dark:bg-paper-800 text-stone-600 dark:text-stone-400 px-1.5 py-0.5 rounded font-mono text-[10px]">
              考频 {word.totalFreq}次
            </span>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          title={isFavorite ? '取消收藏' : '加入收藏 (快捷键 F)'}
          className={`p-1.5 rounded transition-colors ${
            isFavorite
              ? 'text-amber-500 hover:text-amber-600 bg-amber-50 dark:bg-amber-950/60'
              : 'text-stone-300 dark:text-stone-600 hover:text-stone-600 dark:hover:text-stone-300'
          }`}
        >
          <Star className="w-4 h-4 sm:w-5 sm:h-5" fill={isFavorite ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Center: English Word, Phonetics, Audio */}
      <div className="flex flex-col items-center justify-center my-auto py-6 sm:py-10 text-center select-none">
        <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-stone-900 dark:text-stone-100 font-serif">
          {word.word}
        </h2>

        {settings.showPhonetic && word.phonetic && (
          <div className="flex items-center gap-2 mt-3 text-stone-500 dark:text-stone-400 font-mono text-sm sm:text-base">
            <span>{word.phonetic}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                playWordPronunciation(word.word);
              }}
              title="播放发音 (快捷键 S)"
              className="p-1 text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-paper-100 dark:hover:bg-paper-800 rounded transition-colors"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>
        )}

        <p className="mt-5 text-[11px] text-stone-400 dark:text-stone-500 max-w-xs leading-relaxed">
          先主动回忆中文释义与真题考法，再揭晓答案
        </p>
      </div>

      {/* Bottom: Reveal Button */}
      <div className="pt-2">
        <button
          onClick={onReveal}
          className="w-full py-3 sm:py-3.5 bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900 rounded-lg font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99] shadow-xs"
        >
          <Eye className="w-4 h-4" />
          <span>揭晓释义与例句</span>
          <span className="text-stone-400 dark:text-stone-500 text-xs font-mono ml-0.5 hidden sm:inline">[Space]</span>
        </button>
      </div>
    </div>
  );
};
