import React, { useState } from 'react';
import { CustomDeckConfig } from '../types';
import { X, Sliders } from 'lucide-react';

interface CustomDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyConfig: (config: CustomDeckConfig) => void;
  examFilter: 'e1' | 'e2' | 'all';
}

export const CustomDeckModal: React.FC<CustomDeckModalProps> = ({
  isOpen,
  onClose,
  onApplyConfig,
  examFilter,
}) => {
  const [minFreq, setMinFreq] = useState<number>(10);
  const [maxFreq, setMaxFreq] = useState<number>(300);
  const [limit, setLimit] = useState<number>(30);
  const [selectedCats, setSelectedCats] = useState<string[]>(['all']);

  if (!isOpen) return null;

  const handleToggleCat = (catKey: string) => {
    if (catKey === 'all') {
      setSelectedCats(['all']);
      return;
    }
    const filtered = selectedCats.filter((c) => c !== 'all');
    if (filtered.includes(catKey)) {
      const next = filtered.filter((c) => c !== catKey);
      setSelectedCats(next.length > 0 ? next : ['all']);
    } else {
      setSelectedCats([...filtered, catKey]);
    }
  };

  const handleConfirm = () => {
    onApplyConfig({
      name: '自定义专属卷',
      minFreq,
      maxFreq,
      selectedCategories: selectedCats,
      limit,
      mixOldWordsRatio: 0.3,
      examSource: examFilter,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-paper-900 rounded-xl border border-paper-200 dark:border-paper-800 max-w-lg w-full p-6 space-y-5 shadow-2xl transition-colors">
        <div className="flex items-center justify-between border-b border-paper-100 dark:border-paper-800 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-stone-800 dark:text-stone-200" />
            <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100">自定义组卷学习</h3>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          {/* Frequency range */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-stone-800 dark:text-stone-200">真题考频区间</span>
              <span className="font-mono text-stone-500 dark:text-stone-400 text-[11px]">
                {minFreq} 次 ～ {maxFreq} 次
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={1}
                max={50}
                value={minFreq}
                onChange={(e) => setMinFreq(Number(e.target.value))}
                className="w-full accent-stone-900 dark:accent-stone-100"
              />
              <span className="text-stone-400 font-mono text-[10px] w-12 text-right">
                最低 {minFreq}
              </span>
            </div>
          </div>

          {/* Cards count */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-stone-800 dark:text-stone-200">单组组卷单词数</span>
              <span className="font-mono text-stone-500 dark:text-stone-400 text-[11px]">{limit} 词</span>
            </div>
            <div className="flex gap-2">
              {[15, 30, 50, 80].map((val) => (
                <button
                  key={val}
                  onClick={() => setLimit(val)}
                  className={`flex-1 py-1.5 rounded border text-center font-mono transition-colors ${
                    limit === val
                      ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 border-stone-900 dark:border-stone-100'
                      : 'bg-paper-50 dark:bg-paper-850 hover:bg-paper-100 text-stone-800 dark:text-stone-200 border-paper-300 dark:border-paper-700'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          {/* Categories picker */}
          <div className="space-y-2">
            <span className="font-semibold text-stone-800 dark:text-stone-200">指定抽词状态范围</span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: 'all', label: '不限 (全部单词)' },
                { key: 'dont_know', label: '不认识' },
                { key: 'unfamiliar', label: '不熟悉' },
                { key: 'recently_mistaken', label: '近期记错' },
                { key: 'frequent_mistakes', label: '反复出错' },
                { key: 'overdue', label: '已超期' },
                { key: 'favorite', label: '已收藏' },
              ].map((item) => {
                const isChecked = selectedCats.includes(item.key);
                return (
                  <button
                    key={item.key}
                    onClick={() => handleToggleCat(item.key)}
                    className={`px-2.5 py-1 rounded text-xs border transition-colors ${
                      isChecked
                        ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 border-stone-900 dark:border-stone-100'
                        : 'bg-paper-50 dark:bg-paper-850 hover:bg-paper-100 text-stone-700 dark:text-stone-300 border-paper-200 dark:border-paper-700'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end gap-2 border-t border-paper-100 dark:border-paper-800">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-paper-300 dark:border-paper-700 text-stone-700 dark:text-stone-300 rounded-lg text-xs"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg text-xs font-semibold shadow-xs"
          >
            生成并开始练习
          </button>
        </div>
      </div>
    </div>
  );
};
