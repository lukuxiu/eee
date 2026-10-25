import React, { useState } from 'react';
import { CategoryMeta } from '../engine/categoryEngine';
import { CategoryFilterKey, StudyMode } from '../types';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  RotateCcw, 
  HelpCircle, 
  Star, 
  Flame, 
  Sparkles, 
  BookMarked, 
  Layers, 
  ChevronDown, 
  X, 
  Filter 
} from 'lucide-react';

interface CategoryNavProps {
  categories: CategoryMeta[];
  activeCategory: CategoryFilterKey;
  onSelectCategory: (catKey: CategoryFilterKey) => void;
  currentMode: StudyMode;
  onSelectMode: (mode: StudyMode) => void;
  onStartCategorySession: (catKey: CategoryFilterKey) => void;
}

export const CategoryNav: React.FC<CategoryNavProps> = ({
  categories,
  activeCategory,
  onSelectCategory,
  currentMode,
  onSelectMode,
  onStartCategorySession,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getModeLabel = (mode: StudyMode) => {
    switch (mode) {
      case 'mixed': return '综合推荐复习';
      case 'due': return '到期与逾期复习';
      case 'error': return '错词集中强化';
      case 'new': return '真题新词速刷';
      case 'custom': return '自定义词单';
      case 'context': return '真题长难句语境';
      default: return '卡片复习';
    }
  };

  const activeCategoryMeta = categories.find((c) => c.key === activeCategory);

  const getIconForCategory = (key: string) => {
    switch (key) {
      case 'all': return <Layers className="w-3.5 h-3.5" />;
      case 'today_new': return <Sparkles className="w-3.5 h-3.5" />;
      case 'today_due': return <Clock className="w-3.5 h-3.5" />;
      case 'overdue': return <AlertCircle className="w-3.5 h-3.5 text-stone-800 dark:text-stone-200" />;
      case 'recently_mistaken': return <RotateCcw className="w-3.5 h-3.5 text-stone-900 dark:text-stone-100" />;
      case 'frequent_mistakes': return <Flame className="w-3.5 h-3.5 text-stone-900 dark:text-stone-100" />;
      case 'dont_know': return <HelpCircle className="w-3.5 h-3.5" />;
      case 'unfamiliar': return <HelpCircle className="w-3.5 h-3.5" />;
      case 'mastered': return <CheckCircle className="w-3.5 h-3.5" />;
      case 'favorite': return <Star className="w-3.5 h-3.5" />;
      default: return <BookMarked className="w-3.5 h-3.5" />;
    }
  };

  return (
    <>
      {/* Ultra-Clean Deck Controller Bar (Takes only ~38px height) */}
      <div className="w-full flex items-center justify-between bg-white dark:bg-paper-900 border border-paper-200 dark:border-paper-800 px-3 py-1.5 rounded-lg shadow-xs transition-colors">
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 text-xs font-medium text-stone-800 dark:text-stone-200 hover:text-stone-900 dark:hover:text-stone-100 group"
        >
          <span className="w-2 h-2 rounded-full bg-stone-900 dark:bg-stone-100" />
          <span className="font-bold">{getModeLabel(currentMode)}</span>
          <span className="text-stone-300 dark:text-stone-600">|</span>
          <span className="text-stone-500 dark:text-stone-400 flex items-center gap-1">
            {activeCategoryMeta?.label || '全部'}
            <span className="font-mono text-[11px] bg-paper-100 dark:bg-paper-800 px-1.5 py-0.2 rounded text-stone-600 dark:text-stone-300">
              {activeCategoryMeta?.count ?? 0}
            </span>
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-700 dark:group-hover:text-stone-200 transition-transform" />
        </button>

        <button
          onClick={() => setIsModalOpen(true)}
          className="text-[11px] text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 flex items-center gap-1 font-medium bg-paper-100 dark:bg-paper-800 hover:bg-paper-200 px-2 py-1 rounded border border-paper-200 dark:border-paper-700 transition-colors"
        >
          <Filter className="w-3 h-3" />
          <span>切换词单/模式</span>
        </button>
      </div>

      {/* Slide-Up Drawer / Modal for Mode & Category Selection */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white dark:bg-paper-900 w-full max-w-lg rounded-t-2xl sm:rounded-xl p-5 space-y-4 border border-paper-200 dark:border-paper-800 shadow-xl max-h-[85vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-paper-100 dark:border-paper-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100">选择复习模式与动态分类</h3>
                <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-0.5">自适应艾宾浩斯智能调度</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Study Modes */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">
                复习模式
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => {
                    onSelectMode('mixed');
                    setIsModalOpen(false);
                  }}
                  className={`p-2.5 rounded border text-left transition-all ${
                    currentMode === 'mixed'
                      ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 border-stone-900 dark:border-stone-100 shadow-xs'
                      : 'bg-paper-50 dark:bg-paper-850 hover:bg-paper-100 text-stone-800 dark:text-stone-200 border-paper-200 dark:border-paper-700'
                  }`}
                >
                  <div className="font-bold">综合推荐复习</div>
                  <div className="text-[10px] opacity-70 mt-0.5">逾期 &gt; 记错 &gt; 到期 &gt; 新词</div>
                </button>

                <button
                  onClick={() => {
                    onSelectMode('due');
                    setIsModalOpen(false);
                  }}
                  className={`p-2.5 rounded border text-left transition-all ${
                    currentMode === 'due'
                      ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 border-stone-900 dark:border-stone-100 shadow-xs'
                      : 'bg-paper-50 dark:bg-paper-850 hover:bg-paper-100 text-stone-800 dark:text-stone-200 border-paper-200 dark:border-paper-700'
                  }`}
                >
                  <div className="font-bold">到期与逾期复习</div>
                  <div className="text-[10px] opacity-70 mt-0.5">严格遵循艾宾浩斯记忆曲线</div>
                </button>

                <button
                  onClick={() => {
                    onSelectMode('error');
                    setIsModalOpen(false);
                  }}
                  className={`p-2.5 rounded border text-left transition-all ${
                    currentMode === 'error'
                      ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 border-stone-900 dark:border-stone-100 shadow-xs'
                      : 'bg-paper-50 dark:bg-paper-850 hover:bg-paper-100 text-stone-800 dark:text-stone-200 border-paper-200 dark:border-paper-700'
                  }`}
                >
                  <div className="font-bold">错词强化特训</div>
                  <div className="text-[10px] opacity-70 mt-0.5">近期记错 + 反复出错重点复核</div>
                </button>

                <button
                  onClick={() => {
                    onSelectMode('new');
                    setIsModalOpen(false);
                  }}
                  className={`p-2.5 rounded border text-left transition-all ${
                    currentMode === 'new'
                      ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 border-stone-900 dark:border-stone-100 shadow-xs'
                      : 'bg-paper-50 dark:bg-paper-850 hover:bg-paper-100 text-stone-800 dark:text-stone-200 border-paper-200 dark:border-paper-700'
                  }`}
                >
                  <div className="font-bold">真题新词速刷</div>
                  <div className="text-[10px] opacity-70 mt-0.5">高频词优先，每日定量学习</div>
                </button>
              </div>
            </div>

            {/* Dynamic Categories */}
            <div className="space-y-2 pt-2 border-t border-paper-100 dark:border-paper-800">
              <span className="text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">
                动态分类词单
              </span>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((cat) => {
                  const isActive = activeCategory === cat.key;
                  return (
                    <button
                      key={cat.key}
                      onClick={() => {
                        onSelectCategory(cat.key);
                        setIsModalOpen(false);
                      }}
                      className={`px-2.5 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 border transition-all ${
                        isActive
                          ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 border-stone-900 dark:border-stone-100 shadow-xs'
                          : 'bg-paper-50 dark:bg-paper-850 hover:bg-paper-100 text-stone-700 dark:text-stone-300 border-paper-200 dark:border-paper-700'
                      }`}
                    >
                      {getIconForCategory(cat.key)}
                      <span>{cat.label}</span>
                      <span
                        className={`text-[10px] font-mono px-1 py-0.2 rounded ${
                          isActive
                            ? 'bg-white/20 text-white dark:bg-black/20 dark:text-stone-900'
                            : 'bg-paper-200/80 dark:bg-paper-800 text-stone-600 dark:text-stone-400'
                        }`}
                      >
                        {cat.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-2 border-t border-paper-100 dark:border-paper-800 flex justify-end">
              <button
                onClick={() => {
                  onStartCategorySession(activeCategory);
                  setIsModalOpen(false);
                }}
                className="w-full py-2.5 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg text-xs font-bold hover:bg-stone-800 transition-colors shadow-xs"
              >
                开始学习此分类
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
