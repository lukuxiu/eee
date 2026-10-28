import React, { useState, useEffect } from 'react';
import { WordEntry, WordStudyRecord, UserSettings, ExamSentence, WordSense } from '../types';
import { Volume2, Check, X, RotateCcw, HelpCircle, ArrowRight } from 'lucide-react';
import { playWordPronunciation } from '../utils/sound';

interface ContextRecallDeckProps {
  words: WordEntry[];
  records: Record<string, WordStudyRecord>;
  settings: UserSettings;
  onRecordContextRecall: (wordId: string, senseId: string, isCorrect: boolean) => void;
  onExit: () => void;
}

interface ContextItem {
  word: WordEntry;
  sense: WordSense;
  example: ExamSentence;
}

export const ContextRecallDeck: React.FC<ContextRecallDeckProps> = ({
  words,
  records,
  settings,
  onRecordContextRecall,
  onExit,
}) => {
  const [items, setItems] = useState<ContextItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [sessionAnswered, setSessionAnswered] = useState(0);
  const [sessionCorrect, setSessionCorrect] = useState(0);

  const initDeck = () => {
    const list: ContextItem[] = [];
    for (const w of words) {
      if (settings.examFilter !== 'all' && w.examSource !== settings.examFilter) {
        continue;
      }
      for (const s of w.senses) {
        if (s.examples && s.examples.length > 0) {
          list.push({
            word: w,
            sense: s,
            example: s.examples[0],
          });
        }
      }
    }
    list.sort(() => Math.random() - 0.5);
    setItems(list.slice(0, 25));
    setCurrentIndex(0);
    setIsRevealed(false);
    setIsCompleted(false);
    setSessionAnswered(0);
    setSessionCorrect(0);
  };

  useEffect(() => {
    initDeck();
  }, [words, settings.examFilter]);

  const current = items[currentIndex];

  const handleEvaluate = (isCorrect: boolean) => {
    if (!current) return;
    onRecordContextRecall(current.word.id, current.sense.id, isCorrect);
    setSessionAnswered((prev) => prev + 1);
    if (isCorrect) setSessionCorrect((prev) => prev + 1);

    if (currentIndex + 1 < items.length) {
      setCurrentIndex((prev) => prev + 1);
      setIsRevealed(false);
    } else {
      setIsCompleted(true);
    }
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (!isRevealed) {
          setIsRevealed(true);
        }
      } else if (isRevealed) {
        if (e.key === '1' || e.key === 'j' || e.key === 'J') {
          e.preventDefault();
          handleEvaluate(false);
        } else if (e.key === '2' || e.key === 'k' || e.key === 'K' || e.key === '3' || e.key === 'l' || e.key === 'L') {
          e.preventDefault();
          handleEvaluate(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRevealed, current]);

  if (isCompleted) {
    const accuracy = sessionAnswered > 0 ? Math.round((sessionCorrect / sessionAnswered) * 100) : 0;
    return (
      <div className="max-w-md mx-auto my-12 p-6 sm:p-8 bg-white dark:bg-paper-900 border border-paper-200 dark:border-paper-800 rounded-xl text-center space-y-5 shadow-xs">
        <div className="w-10 h-10 bg-paper-100 dark:bg-paper-800 border border-paper-200 dark:border-paper-700 rounded-full flex items-center justify-center mx-auto text-stone-900 dark:text-stone-100 font-bold">
          ✓
        </div>
        <div>
          <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">真题语境测试已完成</h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            已将长难句语境理解表现同步至各个单词释义的记忆档案中
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 py-3 border-y border-paper-200 dark:border-paper-800 text-center font-mono">
          <div>
            <div className="text-lg font-bold text-stone-900 dark:text-stone-100">{sessionAnswered}</div>
            <div className="text-[10px] text-stone-400 dark:text-stone-500 font-sans">测试句数</div>
          </div>
          <div>
            <div className="text-lg font-bold text-stone-900 dark:text-stone-100">{sessionCorrect}</div>
            <div className="text-[10px] text-stone-400 dark:text-stone-500 font-sans">准确理解</div>
          </div>
          <div>
            <div className="text-lg font-bold text-stone-900 dark:text-stone-100">{accuracy}%</div>
            <div className="text-[10px] text-stone-400 dark:text-stone-500 font-sans">语境正确率</div>
          </div>
        </div>

        <div className="space-y-2 pt-1">
          <button
            onClick={initDeck}
            className="w-full py-2.5 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg text-xs font-semibold hover:bg-stone-800 transition-colors shadow-xs"
          >
            开启新一轮真题语境测试
          </button>
          <button
            onClick={onExit}
            className="w-full py-2.5 bg-white dark:bg-paper-850 text-stone-700 dark:text-stone-300 border border-paper-300 dark:border-paper-700 rounded-lg text-xs font-semibold hover:bg-paper-100 transition-colors"
          >
            返回卡片主动回忆
          </button>
        </div>
      </div>
    );
  }

  if (!current || items.length === 0) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white dark:bg-paper-900 border border-paper-200 dark:border-paper-800 rounded-xl text-center space-y-4">
        <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">暂无真题例句语境数据</h3>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          当前筛选条件下未找到带有考研真题例句的单词。请检查题库开关设置。
        </p>
        <button
          onClick={onExit}
          className="px-4 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded text-sm font-medium"
        >
          返回卡片复习
        </button>
      </div>
    );
  }

  const highlightTargetWord = (sentence: string, target: string) => {
    const regex = new RegExp(`\\b(${target}[a-z]*)\\b`, 'gi');
    const parts = sentence.split(regex);
    return parts.map((p, i) =>
      regex.test(p) ? (
        <span
          key={i}
          className="bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-1.5 py-0.5 rounded font-bold underline decoration-white dark:decoration-stone-900 underline-offset-2 mx-0.5"
        >
          {p}
        </span>
      ) : (
        p
      )
    );
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Top Session Progress Bar */}
      <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 bg-white dark:bg-paper-900 border border-paper-200 dark:border-paper-800 px-4 py-2.5 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-stone-900 dark:text-stone-100">真题长难句语境测试</span>
          <span className="font-mono text-stone-600 dark:text-stone-300 bg-paper-100 dark:bg-paper-800 px-2 py-0.5 rounded border border-paper-200 dark:border-paper-700">
            {currentIndex + 1} / {items.length}
          </span>
        </div>
        <div className="font-mono text-[11px]">
          本轮正确率:{' '}
          {sessionAnswered > 0
            ? `${Math.round((sessionCorrect / sessionAnswered) * 100)}% (${sessionCorrect}/${sessionAnswered})`
            : '0%'}
        </div>
      </div>

      {/* Main Context Card */}
      <div 
        onClick={() => !isRevealed && setIsRevealed(true)}
        className={`bg-white dark:bg-paper-900 border border-paper-200 dark:border-paper-800 rounded-xl shadow-xs p-4 sm:p-7 space-y-4 transition-colors ${
          !isRevealed ? 'cursor-pointer hover:border-stone-400 dark:hover:border-stone-600' : ''
        }`}
      >
        {/* Context Prompt */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] text-stone-400 dark:text-stone-500">
            <span>根据考研真题语境回忆目标词含义：</span>
            <span className="font-mono text-stone-500 dark:text-stone-400 text-[10px] truncate max-w-[180px] sm:max-w-none">{current.example.source}</span>
          </div>

          <div className="p-3.5 sm:p-5 bg-paper-50 dark:bg-paper-850 border border-paper-200 dark:border-paper-800 rounded-lg text-sm sm:text-base leading-relaxed font-serif text-stone-900 dark:text-stone-100">
            {highlightTargetWord(current.example.sentence, current.word.word)}
          </div>
        </div>

        {/* Revealed Section */}
        {isRevealed ? (
          <div className="space-y-3 pt-3 border-t border-paper-200 dark:border-paper-800">
            {/* Translation */}
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">
                权威参考译文:
              </span>
              <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed bg-paper-50 dark:bg-paper-850 p-2.5 sm:p-3 rounded border border-paper-200 dark:border-paper-800">
                {current.example.translation}
              </p>
            </div>

            {/* Target Word in Context */}
            <div className="space-y-1.5 bg-paper-100/70 dark:bg-paper-800/60 p-3 sm:p-4 rounded border border-paper-200 dark:border-paper-700/60">
              <div className="flex items-baseline gap-2">
                <span className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 font-serif">
                  {current.word.word}
                </span>
                <span className="text-xs text-stone-500 dark:text-stone-400 font-mono">
                  {current.word.phonetic}
                </span>
                <button
                  onClick={() => playWordPronunciation(current.word.word)}
                  className="p-0.5 text-stone-400 hover:text-stone-800 dark:hover:text-stone-200"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="text-xs flex items-baseline gap-1.5">
                <span className="italic font-serif text-stone-600 dark:text-stone-400 font-semibold">{current.sense.pos}</span>
                <span className="font-medium text-stone-900 dark:text-stone-100">{current.sense.definition}</span>
              </div>
            </div>

            {/* Self-Rating Prompt in Context */}
            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                onClick={() => handleEvaluate(false)}
                className="flex-1 py-3 px-3 rounded-lg border border-paper-300 dark:border-paper-700 bg-white dark:bg-paper-850 hover:bg-paper-100 dark:hover:bg-paper-800 text-stone-800 dark:text-stone-200 flex items-center justify-center gap-1.5 text-xs font-bold transition-colors"
              >
                <X className="w-4 h-4 text-red-500" />
                <span>没回忆出该义项 [1]</span>
              </button>
              <button
                onClick={() => handleEvaluate(true)}
                className="flex-1 py-3 px-3 rounded-lg bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900 flex items-center justify-center gap-1.5 text-xs font-bold transition-colors shadow-xs"
              >
                <Check className="w-4 h-4 text-emerald-400" />
                <span>准确理解真题语境 [2]</span>
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsRevealed(true)}
            className="w-full py-3 bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900 rounded-lg text-xs sm:text-sm font-semibold transition-colors shadow-xs"
          >
            揭晓译文与考点释义 [Space]
          </button>
        )}
      </div>
    </div>
  );
};
