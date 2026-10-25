import React, { useState, useEffect, useRef } from 'react';
import { WordEntry, WordStudyRecord, UserSettings, RecallRating, StudyMode } from '../types';
import { CardFront } from './CardFront';
import { CardBack } from './CardBack';
import { RotateCcw, Award, RefreshCw, AlertTriangle } from 'lucide-react';
import { playWordPronunciation } from '../utils/sound';

interface StudyDeckProps {
  queue: WordEntry[];
  records: Record<string, WordStudyRecord>;
  settings: UserSettings;
  mode: StudyMode;
  onRecordRecall: (wordId: string, rating: RecallRating) => void;
  onRevokeAndCorrect: (wordId: string) => void;
  onToggleFavorite: (wordId: string) => void;
  onRestartSession: () => void;
  onRetryMistakes: (mistakenWordIds: string[]) => void;
}

interface SessionStats {
  know: number;
  unfamiliar: number;
  dont_know: number;
  corrected: number;
  mistakenWordIds: string[];
}

interface PreviousWordInfo {
  word: WordEntry;
  rating: RecallRating;
  wasCorrected: boolean;
}

export const StudyDeck: React.FC<StudyDeckProps> = ({
  queue,
  records,
  settings,
  mode,
  onRecordRecall,
  onRevokeAndCorrect,
  onToggleFavorite,
  onRestartSession,
  onRetryMistakes,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [lastRating, setLastRating] = useState<RecallRating | null>(null);
  const [hasCorrected, setHasCorrected] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [previousWord, setPreviousWord] = useState<PreviousWordInfo | null>(null);
  const [retroNotice, setRetroNotice] = useState<string>('');

  const autoAdvanceTimerRef = useRef<number | null>(null);

  const [stats, setStats] = useState<SessionStats>({
    know: 0,
    unfamiliar: 0,
    dont_know: 0,
    corrected: 0,
    mistakenWordIds: [],
  });

  const lastQueueKeyRef = useRef<string>('');

  // Reset only when a different queue is loaded
  useEffect(() => {
    const queueKey = queue.map((w) => w.id).join(',');
    if (!queueKey || lastQueueKeyRef.current === queueKey) {
      return;
    }
    lastQueueKeyRef.current = queueKey;
    setCurrentIndex(0);
    setIsRevealed(false);
    setLastRating(null);
    setHasCorrected(false);
    setSessionCompleted(false);
    setPreviousWord(null);
    setRetroNotice('');
    setStats({
      know: 0,
      unfamiliar: 0,
      dont_know: 0,
      corrected: 0,
      mistakenWordIds: [],
    });
    if (autoAdvanceTimerRef.current) {
      window.clearTimeout(autoAdvanceTimerRef.current);
    }
  }, [queue]);

  const currentWord = queue[currentIndex];

  const handleReveal = () => {
    setIsRevealed(true);
    if (settings.autoPronounce && currentWord) {
      playWordPronunciation(currentWord.word);
    }
  };

  const handleRating = (rating: RecallRating) => {
    if (!currentWord) return;

    // 1. Record the recall
    onRecordRecall(currentWord.id, rating);

    // 2. Update session statistics
    setStats((prev) => {
      const nextStats = { ...prev };
      if (rating === 'know') nextStats.know += 1;
      else if (rating === 'unfamiliar') nextStats.unfamiliar += 1;
      else if (rating === 'dont_know') {
        nextStats.dont_know += 1;
        if (!nextStats.mistakenWordIds.includes(currentWord.id)) {
          nextStats.mistakenWordIds.push(currentWord.id);
        }
      }
      return nextStats;
    });

    // 3. Save info for retroactive undo
    setPreviousWord({
      word: currentWord,
      rating,
      wasCorrected: false,
    });

    // 4. Immediately advance to next card!
    if (currentIndex + 1 < queue.length) {
      setCurrentIndex((prev) => prev + 1);
      setIsRevealed(false);
      setLastRating(null);
      setHasCorrected(false);
    } else {
      setSessionCompleted(true);
    }
  };

  const handleRevokeAndCorrect = () => {
    if (!currentWord || hasCorrected) return;
    if (autoAdvanceTimerRef.current) window.clearTimeout(autoAdvanceTimerRef.current);

    onRevokeAndCorrect(currentWord.id);
    setHasCorrected(true);

    setStats((prev) => {
      const nextStats = { ...prev };
      nextStats.know = Math.max(0, nextStats.know - 1);
      nextStats.dont_know += 1;
      nextStats.corrected += 1;
      if (!nextStats.mistakenWordIds.includes(currentWord.id)) {
        nextStats.mistakenWordIds.push(currentWord.id);
      }
      return nextStats;
    });
  };

  const handleRetroRevokePrevious = () => {
    if (!previousWord || previousWord.wasCorrected) return;
    onRevokeAndCorrect(previousWord.word.id);
    setPreviousWord({ ...previousWord, wasCorrected: true });
    setRetroNotice(`已成功将上一词「${previousWord.word.word}」修正为记错！`);
    setTimeout(() => setRetroNotice(''), 4000);

    setStats((prev) => {
      const nextStats = { ...prev };
      nextStats.know = Math.max(0, nextStats.know - 1);
      nextStats.dont_know += 1;
      nextStats.corrected += 1;
      if (!nextStats.mistakenWordIds.includes(previousWord.word.id)) {
        nextStats.mistakenWordIds.push(previousWord.word.id);
      }
      return nextStats;
    });
  };

  const handleNextCard = () => {
    if (autoAdvanceTimerRef.current) window.clearTimeout(autoAdvanceTimerRef.current);

    if (currentWord && lastRating) {
      setPreviousWord({
        word: currentWord,
        rating: lastRating,
        wasCorrected: hasCorrected,
      });
    }

    if (currentIndex + 1 < queue.length) {
      setCurrentIndex((prev) => prev + 1);
      setIsRevealed(false);
      setLastRating(null);
      setHasCorrected(false);
    } else {
      setSessionCompleted(true);
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (!isRevealed) {
          handleReveal();
        } else if (lastRating) {
          handleNextCard();
        }
      } else if (e.key === '1') {
        if (isRevealed) handleRating('dont_know');
      } else if (e.key === '2') {
        if (isRevealed) handleRating('unfamiliar');
      } else if (e.key === '3') {
        if (isRevealed) handleRating('know');
      } else if (e.key.toLowerCase() === 'z') {
        if (isRevealed && lastRating === 'know') {
          handleRevokeAndCorrect();
        } else if (previousWord && !previousWord.wasCorrected && previousWord.rating === 'know') {
          handleRetroRevokePrevious();
        }
      } else if (e.key.toLowerCase() === 'f') {
        if (currentWord) onToggleFavorite(currentWord.id);
      } else if (e.key.toLowerCase() === 's') {
        if (currentWord) playWordPronunciation(currentWord.word);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRevealed, lastRating, currentWord, previousWord]);

  if (queue.length === 0) {
    return (
      <div className="w-full max-w-lg mx-auto my-12 bg-white dark:bg-paper-900 border border-paper-200 dark:border-paper-800 rounded-xl p-8 text-center space-y-4">
        <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">当前分类无待学单词</h3>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          太棒了！当前选定的复习队列已全部清空，或您可以尝试切换其他模式或分类。
        </p>
        <button
          onClick={onRestartSession}
          className="px-4 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-semibold rounded-lg hover:bg-stone-800 transition-colors shadow-xs"
        >
          重新拉取推荐复习队列
        </button>
      </div>
    );
  }

  // Session Completed Summary
  if (sessionCompleted) {
    const totalAnswered = stats.know + stats.unfamiliar + stats.dont_know;
    const trueAccuracy =
      totalAnswered > 0 ? Math.round((stats.know / totalAnswered) * 100) : 0;

    return (
      <div className="w-full max-w-lg mx-auto my-6 bg-white dark:bg-paper-900 border border-paper-200 dark:border-paper-800 rounded-xl p-5 sm:p-8 space-y-5 shadow-xs">
        <div className="text-center space-y-1.5">
          <div className="w-10 h-10 bg-paper-100 dark:bg-paper-800 border border-paper-200 dark:border-paper-700 rounded-full flex items-center justify-center mx-auto text-stone-900 dark:text-stone-100">
            <Award className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            本轮学习已完成！
          </h2>
          <p className="text-[11px] text-stone-500 dark:text-stone-400">
            高质量的主动回忆与纠错是掌握考研核心词的最快路径
          </p>
        </div>

        {/* Breakdown Stats */}
        <div className="grid grid-cols-4 gap-1 text-center py-3 border-y border-paper-200 dark:border-paper-800">
          <div>
            <div className="text-xl font-bold font-mono text-stone-900 dark:text-stone-100">{stats.know}</div>
            <div className="text-[10px] text-stone-500 dark:text-stone-400">真实认识</div>
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-stone-900 dark:text-stone-100">{stats.unfamiliar}</div>
            <div className="text-[10px] text-stone-500 dark:text-stone-400">不熟悉</div>
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-stone-900 dark:text-stone-100">{stats.dont_know}</div>
            <div className="text-[10px] text-stone-500 dark:text-stone-400">不认识</div>
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-stone-900 dark:text-stone-100">{stats.corrected}</div>
            <div className="text-[10px] text-stone-500 dark:text-stone-400">记错修正</div>
          </div>
        </div>

        <div className="bg-paper-100/70 dark:bg-paper-800/60 p-3 rounded-lg border border-paper-200 dark:border-paper-700/60 text-xs space-y-1 leading-relaxed text-stone-600 dark:text-stone-300">
          <div className="flex justify-between items-center text-stone-900 dark:text-stone-100 font-semibold">
            <span>真实回忆正确率:</span>
            <span className="font-mono text-sm">{trueAccuracy}%</span>
          </div>
          {stats.corrected > 0 && (
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              提示：本次有 {stats.corrected} 词在初评认识后点击了「记错了」，已如实纠正记忆参数并安排近期巩固。
            </p>
          )}
        </div>

        <div className="space-y-2 pt-1">
          {stats.mistakenWordIds.length > 0 && (
            <button
              onClick={() => onRetryMistakes(stats.mistakenWordIds)}
              className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>立即强化本轮错词 ({stats.mistakenWordIds.length} 词)</span>
            </button>
          )}

          <button
            onClick={onRestartSession}
            className="w-full py-2.5 bg-white dark:bg-paper-850 hover:bg-paper-100 text-stone-800 dark:text-stone-200 border border-paper-300 dark:border-paper-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>开始新一轮复习</span>
          </button>
        </div>
      </div>
    );
  }

  // Active Flashcard Render
  return (
    <div className="w-full space-y-3">
      {/* Visual Progress Bar */}
      <div className="w-full max-w-xl mx-auto h-1 bg-paper-200 dark:bg-paper-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-stone-900 dark:bg-stone-100 transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / queue.length) * 100}%` }}
        />
      </div>

      {/* Retroactive Correction Banner for Previous Card */}
      {previousWord && !previousWord.wasCorrected && previousWord.rating === 'know' && (
        <div className="w-full max-w-xl mx-auto bg-paper-100/90 dark:bg-paper-800 border border-paper-200 dark:border-paper-700 rounded-lg px-3 py-1.5 flex items-center justify-between text-[11px] text-stone-700 dark:text-stone-300 animate-fadeIn">
          <span>上一词「{previousWord.word.word}」刚才自评为认识</span>
          <button
            onClick={handleRetroRevokePrevious}
            className="text-stone-900 dark:text-stone-100 font-semibold hover:text-red-600 dark:hover:text-red-400 flex items-center gap-1 underline underline-offset-2"
          >
            <RotateCcw className="w-3 h-3" />
            <span>记错了？修正上一词 [Z]</span>
          </button>
        </div>
      )}

      {retroNotice && (
        <div className="w-full max-w-xl mx-auto bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 px-3 py-1.5 rounded-lg text-[11px] flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{retroNotice}</span>
        </div>
      )}

      {!isRevealed ? (
        <CardFront
          word={currentWord}
          record={records[currentWord.id]}
          settings={settings}
          currentIndex={currentIndex}
          totalCards={queue.length}
          onReveal={handleReveal}
          onToggleFavorite={() => onToggleFavorite(currentWord.id)}
        />
      ) : (
        <CardBack
          word={currentWord}
          record={records[currentWord.id]}
          settings={settings}
          currentIndex={currentIndex}
          totalCards={queue.length}
          lastRatingForThisCard={lastRating}
          hasCorrectedThisCard={hasCorrected}
          onSelectRating={handleRating}
          onRevokeAndCorrect={handleRevokeAndCorrect}
          onToggleFavorite={() => onToggleFavorite(currentWord.id)}
          onNextCard={handleNextCard}
        />
      )}
    </div>
  );
};
