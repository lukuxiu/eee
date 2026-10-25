import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  BarChart2, 
  Sliders, 
  Settings, 
  HelpCircle, 
  Database, 
  Search,
  Sparkles,
  Menu,
  X,
  Sun,
  Moon,
  Download
} from 'lucide-react';
import { UserSettings } from '../types';

interface HeaderProps {
  currentTab: 'study' | 'context' | 'words' | 'stats';
  onSelectTab: (tab: 'study' | 'context' | 'words' | 'stats') => void;
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
  onOpenCustomDeck: () => void;
  onOpenDataManagement: () => void;
  onOpenSettings: () => void;
  onOpenAlgorithm: () => void;
  totalWordsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  settings,
  onUpdateSettings,
  onOpenCustomDeck,
  onOpenDataManagement,
  onOpenSettings,
  onOpenAlgorithm,
  totalWordsCount,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      onUpdateSettings({ theme: 'dark' });
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      onUpdateSettings({ theme: 'light' });
    }
  };

  return (
    <>
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-paper-50/95 dark:bg-paper-950/95 backdrop-blur-sm border-b border-paper-200 dark:border-paper-850">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 h-13 sm:h-15 flex items-center justify-between gap-2 sm:gap-4">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded flex items-center justify-center font-bold text-xs sm:text-sm shadow-xs">
              研
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-stone-900 dark:text-stone-100 leading-none">
                考研英语大观
              </h1>
              <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5 hidden sm:block">
                纯净真题主动回忆 · {totalWordsCount} 词
              </p>
            </div>
          </div>

          {/* Exam Source Switcher (Segmented Control) */}
          <div className="inline-flex items-center bg-paper-100 dark:bg-paper-900 p-0.5 rounded border border-paper-200 dark:border-paper-800 text-[11px] font-medium">
            <button
              onClick={() => onUpdateSettings({ examFilter: 'e1' })}
              className={`px-2 py-1 rounded transition-colors ${
                settings.examFilter === 'e1'
                  ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              英一
            </button>
            <button
              onClick={() => onUpdateSettings({ examFilter: 'e2' })}
              className={`px-2 py-1 rounded transition-colors ${
                settings.examFilter === 'e2'
                  ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              英二
            </button>
            <button
              onClick={() => onUpdateSettings({ examFilter: 'all' })}
              className={`px-2 py-1 rounded transition-colors ${
                settings.examFilter === 'all'
                  ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              全部
            </button>
          </div>

          {/* Desktop Nav Tabs */}
          <nav className="hidden md:flex items-center gap-1 text-xs sm:text-sm font-medium">
            <button
              onClick={() => onSelectTab('study')}
              className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors ${
                currentTab === 'study'
                  ? 'bg-paper-200/80 dark:bg-paper-850 text-stone-900 dark:text-stone-100 font-semibold'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              卡片复习
            </button>

            <button
              onClick={() => onSelectTab('context')}
              className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors ${
                currentTab === 'context'
                  ? 'bg-paper-200/80 dark:bg-paper-850 text-stone-900 dark:text-stone-100 font-semibold'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              真题语境
            </button>

            <button
              onClick={() => onSelectTab('words')}
              className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors ${
                currentTab === 'words'
                  ? 'bg-paper-200/80 dark:bg-paper-850 text-stone-900 dark:text-stone-100 font-semibold'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              词库大纲
            </button>

            <button
              onClick={() => onSelectTab('stats')}
              className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors ${
                currentTab === 'stats'
                  ? 'bg-paper-200/80 dark:bg-paper-850 text-stone-900 dark:text-stone-100 font-semibold'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              学习统计
            </button>
          </nav>

          {/* Desktop Action Buttons */}
          <div className="hidden md:flex items-center gap-1">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              title={isDarkMode ? '切换至护眼米纸明亮模式' : '切换至柔和暗黑模式'}
              className="p-1.5 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-paper-200/70 dark:hover:bg-paper-850 rounded transition-colors"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={onOpenCustomDeck}
              title="自定义组卷"
              className="p-1.5 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-paper-200/70 dark:hover:bg-paper-850 rounded"
            >
              <Sliders className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenAlgorithm}
              title="复习算法说明"
              className="p-1.5 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-paper-200/70 dark:hover:bg-paper-850 rounded"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenDataManagement}
              title="数据备份与导入报告"
              className="p-1.5 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-paper-200/70 dark:hover:bg-paper-850 rounded"
            >
              <Database className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenSettings}
              title="个性化设置"
              className="p-1.5 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-paper-200/70 dark:hover:bg-paper-850 rounded"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Right Controls: Dark Mode Toggle & Tools Menu Button */}
          <div className="flex md:hidden items-center gap-1">
            <button
              onClick={toggleTheme}
              title="切换主题"
              className="p-1.5 text-stone-600 dark:text-stone-300 hover:bg-paper-200 dark:hover:bg-paper-800 rounded"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 text-stone-700 dark:text-stone-300 hover:bg-paper-200 dark:hover:bg-paper-800 rounded"
              title="更多工具与设置"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer for Secondary Tools & Settings */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-paper-50 dark:bg-paper-900 w-full max-w-sm rounded-t-xl sm:rounded-lg p-5 space-y-4 border border-paper-200 dark:border-paper-800 shadow-xl">
            <div className="flex items-center justify-between border-b border-paper-200 dark:border-paper-800 pb-3">
              <span className="font-bold text-sm text-stone-900 dark:text-stone-100">功能与管理工具</span>
              <button onClick={() => setMobileMenuOpen(false)} className="text-stone-400 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1 text-xs">
              <button
                onClick={() => {
                  toggleTheme();
                }}
                className="w-full text-left py-2.5 px-3 rounded hover:bg-paper-100 dark:hover:bg-paper-800 flex items-center justify-between text-stone-800 dark:text-stone-200"
              >
                <div className="flex items-center gap-2.5">
                  {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-stone-500" />}
                  <span>界面主题风格</span>
                </div>
                <span className="text-[11px] font-mono text-stone-400">
                  {isDarkMode ? '深色夜读' : '暖米纸感'}
                </span>
              </button>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenCustomDeck();
                }}
                className="w-full text-left py-2.5 px-3 rounded hover:bg-paper-100 dark:hover:bg-paper-800 flex items-center gap-2.5 text-stone-800 dark:text-stone-200"
              >
                <Sliders className="w-4 h-4 text-stone-500" />
                <span>自定义组卷 (考频/分类/题量)</span>
              </button>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAlgorithm();
                }}
                className="w-full text-left py-2.5 px-3 rounded hover:bg-paper-100 dark:hover:bg-paper-800 flex items-center gap-2.5 text-stone-800 dark:text-stone-200"
              >
                <HelpCircle className="w-4 h-4 text-stone-500" />
                <span>复习调度与纠错算法说明</span>
              </button>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenDataManagement();
                }}
                className="w-full text-left py-2.5 px-3 rounded hover:bg-paper-100 dark:hover:bg-paper-800 flex items-center gap-2.5 text-stone-800 dark:text-stone-200"
              >
                <Database className="w-4 h-4 text-stone-500" />
                <span>数据备份、恢复与真题审计</span>
              </button>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenSettings();
                }}
                className="w-full text-left py-2.5 px-3 rounded hover:bg-paper-100 dark:hover:bg-paper-800 flex items-center gap-2.5 text-stone-800 dark:text-stone-200"
              >
                <Settings className="w-4 h-4 text-stone-500" />
                <span>每日上限与个性化设置</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Fixed Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-paper-50/95 dark:bg-paper-950/95 backdrop-blur-md border-t border-paper-200 dark:border-paper-850 py-1 flex items-center justify-around shadow-sm">
        <button
          onClick={() => onSelectTab('study')}
          className={`flex flex-col items-center py-1 px-3 ${
            currentTab === 'study' ? 'text-stone-900 dark:text-stone-100 font-bold' : 'text-stone-400'
          }`}
        >
          <BookOpen className="w-4 h-4 mb-0.5" />
          <span className="text-[10px]">卡片复习</span>
        </button>

        <button
          onClick={() => onSelectTab('context')}
          className={`flex flex-col items-center py-1 px-3 ${
            currentTab === 'context' ? 'text-stone-900 dark:text-stone-100 font-bold' : 'text-stone-400'
          }`}
        >
          <Sparkles className="w-4 h-4 mb-0.5" />
          <span className="text-[10px]">真题语境</span>
        </button>

        <button
          onClick={() => onSelectTab('words')}
          className={`flex flex-col items-center py-1 px-3 ${
            currentTab === 'words' ? 'text-stone-900 dark:text-stone-100 font-bold' : 'text-stone-400'
          }`}
        >
          <Search className="w-4 h-4 mb-0.5" />
          <span className="text-[10px]">词库大纲</span>
        </button>

        <button
          onClick={() => onSelectTab('stats')}
          className={`flex flex-col items-center py-1 px-3 ${
            currentTab === 'stats' ? 'text-stone-900 dark:text-stone-100 font-bold' : 'text-stone-400'
          }`}
        >
          <BarChart2 className="w-4 h-4 mb-0.5" />
          <span className="text-[10px]">学习统计</span>
        </button>
      </div>
    </>
  );
};
