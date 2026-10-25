import React, { useState, useMemo } from 'react';
import { WordEntry, WordStudyRecord, UserSettings, CategoryFilterKey } from '../types';
import { wordMatchesCategory } from '../engine/categoryEngine';
import { Search, Star, Volume2, History, ChevronRight } from 'lucide-react';
import { playWordPronunciation } from '../utils/sound';

interface WordListModalProps {
  words: WordEntry[];
  records: Record<string, WordStudyRecord>;
  settings: UserSettings;
  activeCategory: CategoryFilterKey;
  onSelectCategory: (cat: CategoryFilterKey) => void;
  onToggleFavorite: (wordId: string) => void;
  onStartStudyWithWord: (word: WordEntry) => void;
  onRevokeAndCorrect: (wordId: string) => void;
}

export const WordListModal: React.FC<WordListModalProps> = ({
  words,
  records,
  settings,
  activeCategory,
  onSelectCategory,
  onToggleFavorite,
  onStartStudyWithWord,
  onRevokeAndCorrect,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWord, setSelectedWord] = useState<WordEntry | null>(null);
  const [correctNotice, setCorrectNotice] = useState('');

  const filteredWords = useMemo(() => {
    return words.filter((w) => {
      // 1. Exam source filter
      if (settings.examFilter !== 'all' && w.examSource !== settings.examFilter) {
        return false;
      }

      // 2. Category filter
      const rec = records[w.id];
      if (!wordMatchesCategory(w, rec, activeCategory)) {
        return false;
      }

      // 3. Search query
      if (searchTerm.trim()) {
        const query = searchTerm.trim().toLowerCase();
        const matchSpelling = w.word.toLowerCase().includes(query);
        const matchSense = w.senses.some((s) => s.definition.includes(query) || s.pos.toLowerCase().includes(query));
        const matchMorph = w.morphology.toLowerCase().includes(query);
        return matchSpelling || matchSense || matchMorph;
      }

      return true;
    });
  }, [words, records, settings.examFilter, activeCategory, searchTerm]);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4">
      {/* Top Search & Filter Bar */}
      <div className="bg-white dark:bg-paper-900 border border-paper-200 dark:border-paper-800 rounded-lg p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between transition-colors">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="搜索考研单词、中文释义、词性或词根 (如 state, modal., 意志)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-paper-300 dark:border-paper-700 bg-paper-50/50 dark:bg-paper-850 text-stone-900 dark:text-stone-100 placeholder-stone-400 rounded-md text-xs focus:outline-none focus:border-stone-900 dark:focus:border-stone-100"
          />
        </div>

        <div className="text-xs text-stone-500 dark:text-stone-400 font-mono flex items-center justify-between sm:justify-end gap-2">
          <span>共找到 {filteredWords.length} 词</span>
          {activeCategory !== 'all' && (
            <button
              onClick={() => onSelectCategory('all')}
              className="text-[11px] text-stone-700 dark:text-stone-300 underline font-sans"
            >
              重置分类
            </button>
          )}
        </div>
      </div>

      {/* Main Content: Split List and Word Detail */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Left Column: Word List */}
        <div className="md:col-span-5 bg-white dark:bg-paper-900 border border-paper-200 dark:border-paper-800 rounded-lg p-2 max-h-[600px] overflow-y-auto divide-y divide-paper-100 dark:divide-paper-800 transition-colors">
          {filteredWords.length === 0 ? (
            <div className="p-8 text-center text-stone-400 text-xs">
              无匹配单词
            </div>
          ) : (
            filteredWords.map((w) => {
              const rec = records[w.id];
              const isSelected = selectedWord?.id === w.id;
              const primaryDef = w.senses[0]?.definition || '';
              const pos = w.senses[0]?.pos || '';

              return (
                <div
                  key={w.id}
                  onClick={() => setSelectedWord(w)}
                  className={`p-3 rounded-md cursor-pointer transition-colors flex items-center justify-between ${
                    isSelected
                      ? 'bg-paper-100 dark:bg-paper-850 text-stone-900 dark:text-stone-100'
                      : 'hover:bg-paper-50 dark:hover:bg-paper-800/60 text-stone-800 dark:text-stone-200'
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-serif font-bold text-sm tracking-tight text-stone-900 dark:text-stone-100">
                        {w.word}
                      </span>
                      {w.phonetic && (
                        <span className="text-[11px] font-mono text-stone-400">
                          {w.phonetic}
                        </span>
                      )}
                      {w.kaoyanRank && (
                        <span className="px-1 py-0.2 rounded text-[9px] font-mono bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300">
                          #{w.kaoyanRank}
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-stone-400">
                        {w.examSource === 'e1' ? '英一' : '英二'}
                      </span>
                    </div>

                    <div className="text-xs text-stone-500 dark:text-stone-400 truncate mt-0.5">
                      <span className="italic font-serif mr-1">{pos}</span>
                      {primaryDef}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {rec && rec.reviewCount > 0 && (
                      <span className="text-[10px] font-mono text-stone-400 bg-paper-100 dark:bg-paper-800 px-1.5 py-0.5 rounded">
                        {rec.masteryLevel}★
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(w.id);
                      }}
                      className={`p-1 rounded ${
                        rec?.isFavorite
                          ? 'text-amber-500'
                          : 'text-stone-300 dark:text-stone-600 hover:text-stone-500'
                      }`}
                    >
                      <Star className="w-3.5 h-3.5" fill={rec?.isFavorite ? 'currentColor' : 'none'} />
                    </button>
                    <ChevronRight className="w-4 h-4 text-stone-300 dark:text-stone-600" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Selected Word Detail */}
        <div className="md:col-span-7 bg-white dark:bg-paper-900 border border-paper-200 dark:border-paper-800 rounded-lg p-5 transition-colors">
          {selectedWord ? (
            <div className="space-y-4">
              {/* Detail Header */}
              <div className="flex items-start justify-between border-b border-paper-100 dark:border-paper-800 pb-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-2xl sm:text-3xl font-bold font-serif text-stone-900 dark:text-stone-100">
                      {selectedWord.word}
                    </h3>
                    {selectedWord.phonetic && (
                      <span className="font-mono text-stone-500 text-sm">
                        {selectedWord.phonetic}
                      </span>
                    )}
                    <button
                      onClick={() => playWordPronunciation(selectedWord.word)}
                      className="p-1 text-stone-400 hover:text-stone-800 dark:hover:text-stone-200"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    {selectedWord.kaoyanRank && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900">
                        🔥高频 #{selectedWord.kaoyanRank}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-stone-400 mt-1">
                    来源: {selectedWord.examSource === 'e1' ? '英语一纯净大观' : '英语二纯净大观'} · 考频: {selectedWord.totalFreq}次 · 原书第 {selectedWord.page} 页
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onStartStudyWithWord(selectedWord)}
                    className="px-3 py-1.5 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded text-xs font-semibold hover:bg-stone-800 transition-colors shadow-xs"
                  >
                    从此词开始复习
                  </button>
                </div>
              </div>

              {/* Morphology */}
              {selectedWord.morphology !== '暂无数据' && (
                <div className="p-2.5 bg-paper-100/70 dark:bg-paper-800/60 rounded border border-paper-200 dark:border-paper-700/60 text-xs font-mono text-stone-700 dark:text-stone-300">
                  <span className="font-bold text-stone-500 dark:text-stone-400 mr-2 font-sans">构词与解析:</span>
                  {selectedWord.morphology}
                </div>
              )}

              {/* Senses and Examples */}
              <div className="space-y-3">
                <div className="text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">
                  全部已考词义与真题原句 ({selectedWord.senses.length})
                </div>

                <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                  {selectedWord.senses.map((sense, idx) => (
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
                        <div className="space-y-2 pl-4 border-l-2 border-paper-200 dark:border-paper-700 text-xs mt-2">
                          {sense.examples.map((ex, exI) => (
                            <div key={ex.id || exI} className="space-y-1">
                              <p className="text-stone-800 dark:text-stone-200 leading-relaxed font-serif">
                                {ex.sentence}
                              </p>
                              <p className="text-stone-500 dark:text-stone-400 leading-relaxed">
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

              {/* Learning History */}
              {records[selectedWord.id] && (
                <div className="pt-4 border-t border-paper-100 dark:border-paper-800 space-y-2 text-xs">
                  <div className="font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5" />
                    个人学习档案
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-stone-600 dark:text-stone-300 bg-paper-100/60 dark:bg-paper-850 p-3 rounded border border-paper-200 dark:border-paper-700/60 font-mono text-[11px]">
                    <div>连续正确: {records[selectedWord.id].consecutiveCorrect} 次</div>
                    <div>累计复习: {records[selectedWord.id].reviewCount} 次</div>
                    <div>累计错误: {records[selectedWord.id].errorCount} 次</div>
                    <div>掌握等级: {records[selectedWord.id].masteryLevel}/5 星</div>
                    <div className="col-span-2">
                      下次复习: {records[selectedWord.id].nextReviewTime ? new Date(records[selectedWord.id].nextReviewTime).toLocaleString() : '尚未安排'}
                    </div>
                  </div>

                  {correctNotice && (
                    <div className="p-2 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 rounded text-[11px]">
                      {correctNotice}
                    </div>
                  )}

                  <div className="pt-1">
                    <button
                      onClick={() => {
                        onRevokeAndCorrect(selectedWord.id);
                        setCorrectNotice('已成功修正为「记错了」，并重新安排了近期复查任务。');
                        setTimeout(() => setCorrectNotice(''), 3000);
                      }}
                      className="px-2.5 py-1 text-[11px] text-stone-700 dark:text-stone-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 border border-paper-300 dark:border-paper-700 rounded flex items-center gap-1 transition-colors"
                      title="如果在过往学习中存在误判，可在此撤销并标记为错词"
                    >
                      <span>修正历史判断为「记错了」</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full min-h-[300px] flex items-center justify-center text-xs text-stone-400">
              点击左侧单词查看完整释义、词根构词与真题例句
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
