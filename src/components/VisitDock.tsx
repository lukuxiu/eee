import React, { useState } from 'react';
import { 
  History, 
  RotateCcw, 
  Volume2, 
  Trash2, 
  X, 
  Check, 
  AlertCircle, 
  HelpCircle,
  ExternalLink,
  Star
} from 'lucide-react';
import { WordEntry, WordStudyRecord, RecallRating } from '../types';
import { playWordPronunciation } from '../utils/sound';

export interface VisitRecord {
  id: string; // unique event id
  wordId: string;
  word: string;
  phonetic: string;
  rating: RecallRating | 'corrected' | 'viewed';
  timestamp: number;
  examSource: 'e1' | 'e2';
  kaoyanRank?: number;
  primaryDef: string;
}

interface VisitDockProps {
  visits: VisitRecord[];
  records: Record<string, WordStudyRecord>;
  words: WordEntry[];
  onRevokeAndCorrect: (wordId: string) => void;
  onClearVisits: () => void;
  onToggleFavorite: (wordId: string) => void;
  onSelectWordDetail: (word: WordEntry) => void;
  onStartStudyWithWord: (word: WordEntry) => void;
}

export const VisitDock: React.FC<VisitDockProps> = ({
  visits,
  records,
  words,
  onRevokeAndCorrect,
  onClearVisits,
  onToggleFavorite,
  onSelectWordDetail,
  onStartStudyWithWord,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'mistakes' | 'favorites'>('all');

  if (visits.length === 0) {
    return null;
  }

  const latest = visits[0];

  const filteredVisits = visits.filter((v) => {
    if (filter === 'mistakes') {
      return v.rating === 'dont_know' || v.rating === 'unfamiliar' || v.rating === 'corrected';
    }
    if (filter === 'favorites') {
      return records[v.wordId]?.isFavorite;
    }
    return true;
  });

  const formatTimeAgo = (ts: number) => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return '刚刚';
    if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
    return `${Math.floor(diff / 86400)} 天前`;
  };

  const getRatingBadge = (rating: VisitRecord['rating']) => {
    switch (rating) {
      case 'know':
        return (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded bg-emerald-100/70 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <Check className="w-2.5 h-2.5" /> 认识
          </span>
        );
      case 'unfamiliar':
        return (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded bg-amber-100/70 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <HelpCircle className="w-2.5 h-2.5" /> 不熟悉
          </span>
        );
      case 'dont_know':
        return (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded bg-rose-100/70 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
            <AlertCircle className="w-2.5 h-2.5" /> 不认识
          </span>
        );
      case 'corrected':
        return (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold rounded bg-red-600 text-white dark:bg-red-700">
            <RotateCcw className="w-2.5 h-2.5" /> 已纠错
          </span>
        );
      default:
        return (
          <span className="px-1.5 py-0.5 text-[10px] rounded bg-stone-100 text-stone-600 dark:bg-paper-800 dark:text-stone-300">
            浏览
          </span>
        );
    }
  };

  return (
    <>
      {/* Floating Visit-Dock Pill (LazyNote style bottom-right dock) */}
      <div className="fixed bottom-16 md:bottom-6 right-3 sm:right-6 z-40">
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2 bg-paper-50 dark:bg-paper-900 border border-paper-200 dark:border-paper-800 hover:border-stone-400 dark:hover:border-stone-600 shadow-md hover:shadow-lg rounded-full py-1.5 px-3 transition-all transform hover:-translate-y-0.5"
          title="点击查看今日浏览与背诵足迹"
        >
          <div className="flex items-center gap-1.5 text-stone-700 dark:text-stone-300">
            <History className="w-3.5 h-3.5 text-stone-500 group-hover:rotate-[-20deg] transition-transform" />
            <span className="text-xs font-semibold">足迹</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-stone-200 dark:bg-paper-800 text-stone-700 dark:text-stone-300">
              {visits.length}
            </span>
          </div>

          {latest && (
            <div className="hidden sm:flex items-center gap-1.5 border-l border-paper-200 dark:border-paper-800 pl-2 text-xs">
              <span className="font-serif font-bold text-stone-900 dark:text-stone-100 max-w-[90px] truncate">
                {latest.word}
              </span>
              {getRatingBadge(latest.rating)}
            </div>
          )}
        </button>
      </div>

      {/* Slide-over Drawer for Visit Footprints */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end">
          <div 
            className="w-full max-w-md bg-paper-50 dark:bg-paper-950 h-full shadow-2xl flex flex-col border-l border-paper-200 dark:border-paper-850 animate-in slide-in-from-right duration-200"
          >
            {/* Drawer Header */}
            <div className="p-4 border-b border-paper-200 dark:border-paper-850 flex items-center justify-between bg-white dark:bg-paper-900">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-stone-700 dark:text-stone-300" />
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  学习足迹与近期轨迹
                </h3>
                <span className="text-xs font-mono text-stone-400">
                  ({visits.length})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onClearVisits}
                  className="p-1.5 text-stone-400 hover:text-rose-600 rounded transition-colors"
                  title="清空足迹"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Sub-filter bar */}
            <div className="flex items-center gap-1.5 px-4 py-2 border-b border-paper-200 dark:border-paper-850 bg-paper-100/60 dark:bg-paper-900/60 text-xs">
              <button
                onClick={() => setFilter('all')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  filter === 'all'
                    ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 font-medium'
                    : 'text-stone-600 dark:text-stone-400 hover:bg-stone-200/60'
                }`}
              >
                全部 ({visits.length})
              </button>
              <button
                onClick={() => setFilter('mistakes')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  filter === 'mistakes'
                    ? 'bg-rose-700 text-white font-medium'
                    : 'text-stone-600 dark:text-stone-400 hover:bg-stone-200/60'
                }`}
              >
                待强化 / 错词
              </button>
              <button
                onClick={() => setFilter('favorites')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  filter === 'favorites'
                    ? 'bg-amber-600 text-white font-medium'
                    : 'text-stone-600 dark:text-stone-400 hover:bg-stone-200/60'
                }`}
              >
                已收藏
              </button>
            </div>

            {/* List of Visited Words */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {filteredVisits.length === 0 ? (
                <div className="text-center py-12 text-stone-400 text-xs">
                  暂无匹配足迹
                </div>
              ) : (
                filteredVisits.map((item) => {
                  const targetWord = words.find((w) => w.id === item.wordId);
                  const record = records[item.wordId];
                  const canRollback = item.rating === 'know';

                  return (
                    <div
                      key={item.id}
                      className="bg-white dark:bg-paper-900 border border-paper-200 dark:border-paper-800 rounded-lg p-3 hover:border-stone-400 dark:hover:border-stone-600 transition-colors shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-serif font-bold text-base text-stone-900 dark:text-stone-100">
                              {item.word}
                            </span>
                            {item.phonetic && (
                              <span className="text-xs font-mono text-stone-400 dark:text-stone-500">
                                {item.phonetic}
                              </span>
                            )}
                            {item.kaoyanRank && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300">
                                #{item.kaoyanRank}
                              </span>
                            )}
                            <button
                              onClick={() => playWordPronunciation(item.word)}
                              className="text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 p-0.5"
                              title="朗读发音"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onToggleFavorite(item.wordId)}
                              className={`p-0.5 transition-colors ${
                                record?.isFavorite ? 'text-amber-500' : 'text-stone-300 hover:text-stone-400'
                              }`}
                              title={record?.isFavorite ? '取消收藏' : '加入收藏'}
                            >
                              <Star className={`w-3.5 h-3.5 ${record?.isFavorite ? 'fill-amber-400' : ''}`} />
                            </button>
                          </div>

                          <p className="text-xs text-stone-600 dark:text-stone-300 mt-1 line-clamp-1">
                            {item.primaryDef || '暂无释义'}
                          </p>
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {getRatingBadge(item.rating)}
                          <span className="text-[10px] font-mono text-stone-400">
                            {formatTimeAgo(item.timestamp)}
                          </span>
                        </div>
                      </div>

                      {/* Quick Actions Footer */}
                      <div className="mt-2.5 pt-2 border-t border-paper-100 dark:border-paper-800 flex items-center justify-between text-xs">
                        {canRollback ? (
                          <button
                            onClick={() => onRevokeAndCorrect(item.wordId)}
                            className="inline-flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400 hover:underline font-medium"
                          >
                            <RotateCcw className="w-3 h-3" />
                            刚才记错了？立即纠错
                          </button>
                        ) : (
                          <span className="text-[10px] text-stone-400">
                            复习间隔: {record?.intervalDays ?? 0} 天
                          </span>
                        )}

                        <div className="flex items-center gap-2">
                          {targetWord && (
                            <button
                              onClick={() => {
                                onSelectWordDetail(targetWord);
                                setIsOpen(false);
                              }}
                              className="inline-flex items-center gap-0.5 text-stone-600 dark:text-stone-300 hover:text-stone-900 text-[11px]"
                            >
                              详情 <ExternalLink className="w-3 h-3" />
                            </button>
                          )}
                          {targetWord && (
                            <button
                              onClick={() => {
                                onStartStudyWithWord(targetWord);
                                setIsOpen(false);
                              }}
                              className="px-2 py-0.5 rounded bg-stone-100 dark:bg-paper-800 hover:bg-stone-200 dark:hover:bg-paper-700 text-stone-800 dark:text-stone-200 text-[11px]"
                            >
                              从此词学习
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Drawer Footer tip */}
            <div className="p-3 bg-white dark:bg-paper-900 border-t border-paper-200 dark:border-paper-850 text-center text-[10px] text-stone-400">
              足迹保留在本地 localStorage 中 · 随时可以纠正自评或回看释义
            </div>
          </div>
        </div>
      )}
    </>
  );
};
