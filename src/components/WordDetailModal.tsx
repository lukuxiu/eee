import React from 'react';
import { WordEntry, WordStudyRecord } from '../types';
import { X, Volume2, Star, History, RotateCcw } from 'lucide-react';
import { playWordPronunciation } from '../utils/sound';

interface WordDetailModalProps {
  word: WordEntry | null;
  record?: WordStudyRecord;
  isOpen: boolean;
  onClose: () => void;
  onToggleFavorite: (wordId: string) => void;
  onRevokeAndCorrect: (wordId: string) => void;
  onStartStudyWithWord: (word: WordEntry) => void;
}

export const WordDetailModal: React.FC<WordDetailModalProps> = ({
  word,
  record,
  isOpen,
  onClose,
  onToggleFavorite,
  onRevokeAndCorrect,
  onStartStudyWithWord,
}) => {
  if (!isOpen || !word) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-paper-900 border border-paper-200 dark:border-paper-800 rounded-xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden transition-colors">
        {/* Header */}
        <div className="p-4 border-b border-paper-200 dark:border-paper-800 flex items-start justify-between bg-paper-50 dark:bg-paper-850">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-2xl font-bold font-serif text-stone-900 dark:text-stone-100">
                {word.word}
              </h3>
              {word.phonetic && (
                <span className="font-mono text-stone-500 text-sm">
                  {word.phonetic}
                </span>
              )}
              <button
                onClick={() => playWordPronunciation(word.word)}
                className="p-1 text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 rounded"
                title="播放发音"
              >
                <Volume2 className="w-4 h-4" />
              </button>
              {word.kaoyanRank && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300">
                  🔥高频 #{word.kaoyanRank}
                </span>
              )}
              <button
                onClick={() => onToggleFavorite(word.id)}
                className={`p-1 rounded ${
                  record?.isFavorite ? 'text-amber-500' : 'text-stone-300 hover:text-stone-500'
                }`}
                title={record?.isFavorite ? '取消收藏' : '加入收藏'}
              >
                <Star className="w-4 h-4" fill={record?.isFavorite ? 'currentColor' : 'none'} />
              </button>
            </div>
            <div className="text-[11px] text-stone-400 mt-1">
              来源: {word.examSource === 'e1' ? '英语一纯净大观' : '英语二纯净大观'} · 考频: {word.totalFreq}次 · 原书第 {word.page} 页
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Morphology */}
          {word.morphology !== '暂无数据' && (
            <div className="p-2.5 bg-paper-100/70 dark:bg-paper-800/60 rounded border border-paper-200 dark:border-paper-700/60 text-xs font-mono text-stone-700 dark:text-stone-300">
              <span className="font-bold text-stone-500 dark:text-stone-400 mr-2 font-sans">构词与解析:</span>
              {word.morphology}
            </div>
          )}

          {/* Senses and Examples */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">
              全部考研已考词义与真题原句 ({word.senses.length})
            </div>

            <div className="space-y-3">
              {word.senses.map((sense, idx) => (
                <div key={sense.id || idx} className="p-3 bg-paper-50 dark:bg-paper-850 rounded border border-paper-200 dark:border-paper-800 space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-xs font-bold text-stone-400">
                      {idx + 1}.
                    </span>
                    <span className="text-xs font-serif italic font-semibold text-stone-600 dark:text-stone-400 bg-paper-100 dark:bg-paper-800 px-1.5 py-0.5 rounded">
                      {sense.pos}
                    </span>
                    <span className="text-sm font-medium text-stone-900 dark:text-stone-100">
                      {sense.definition}
                    </span>
                    {sense.freq && (
                      <span className="text-[11px] font-mono text-stone-400 ml-auto">
                        考频 {sense.freq}次
                      </span>
                    )}
                  </div>

                  {sense.examples && sense.examples.length > 0 && (
                    <div className="space-y-2 pl-3 border-l-2 border-paper-200 dark:border-paper-700 text-xs mt-2">
                      {sense.examples.map((ex, exI) => (
                        <div key={ex.id || exI} className="space-y-1">
                          <p className="text-stone-800 dark:text-stone-200 leading-relaxed font-serif text-xs">
                            {ex.sentence}
                          </p>
                          <p className="text-stone-500 dark:text-stone-400 leading-relaxed text-[11px]">
                            {ex.translation}
                          </p>
                          <p className="text-[10px] text-stone-400 dark:text-stone-500 font-mono">
                            {ex.source}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Record History */}
          {record && (
            <div className="pt-3 border-t border-paper-100 dark:border-paper-800 space-y-2 text-xs">
              <div className="font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" />
                学习记忆档案
              </div>
              <div className="grid grid-cols-2 gap-2 text-stone-600 dark:text-stone-300 bg-paper-100/60 dark:bg-paper-850 p-2.5 rounded border border-paper-200 dark:border-paper-700/60 font-mono text-[11px]">
                <div>连续正确: {record.consecutiveCorrect} 次</div>
                <div>累计复习: {record.reviewCount} 次</div>
                <div>累计错误: {record.errorCount} 次</div>
                <div>掌握等级: {record.masteryLevel}/5 星</div>
                <div className="col-span-2">
                  下次复习: {record.nextReviewTime ? new Date(record.nextReviewTime).toLocaleString() : '尚未安排'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-paper-200 dark:border-paper-800 bg-paper-50 dark:bg-paper-850 flex items-center justify-between">
          {record && (
            <button
              onClick={() => {
                onRevokeAndCorrect(word.id);
                onClose();
              }}
              className="px-2.5 py-1.5 text-xs text-stone-700 dark:text-stone-300 hover:text-red-600 dark:hover:text-red-400 border border-paper-300 dark:border-paper-700 rounded flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>修正为「记错了」</span>
            </button>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => {
                onStartStudyWithWord(word);
                onClose();
              }}
              className="px-3.5 py-1.5 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded text-xs font-semibold hover:bg-stone-800 transition-colors shadow-xs"
            >
              从此词开始复习
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
