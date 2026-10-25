import React from 'react';
import { UserSettings } from '../types';
import { X, Settings, Sun, Moon } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    onUpdateSettings({ theme: newTheme });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-paper-900 rounded-xl border border-paper-200 dark:border-paper-800 max-w-md w-full p-6 space-y-5 shadow-2xl transition-colors">
        <div className="flex items-center justify-between border-b border-paper-100 dark:border-paper-800 pb-3">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-stone-800 dark:text-stone-200" />
            <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100">个性化复习设置</h3>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          {/* Visual Theme Mode */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-stone-800 dark:text-stone-200">视觉主题风格</div>
              <div className="text-[11px] text-stone-400">类似护眼纸质阅读体验或夜读深色模式</div>
            </div>
            <div className="inline-flex items-center bg-paper-100 dark:bg-paper-800 p-0.5 rounded border border-paper-200 dark:border-paper-700">
              <button
                onClick={() => handleThemeChange('light')}
                className={`px-2.5 py-1 rounded text-xs flex items-center gap-1 font-medium transition-colors ${
                  settings.theme !== 'dark'
                    ? 'bg-white dark:bg-paper-700 text-stone-900 dark:text-stone-100 shadow-2xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <Sun className="w-3 h-3 text-amber-500" />
                <span>暖米纸感</span>
              </button>
              <button
                onClick={() => handleThemeChange('dark')}
                className={`px-2.5 py-1 rounded text-xs flex items-center gap-1 font-medium transition-colors ${
                  settings.theme === 'dark'
                    ? 'bg-stone-900 text-white shadow-2xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <Moon className="w-3 h-3 text-stone-300" />
                <span>暗黑护眼</span>
              </button>
            </div>
          </div>

          {/* Daily new words */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-stone-800 dark:text-stone-200">每日新词上限</div>
              <div className="text-[11px] text-stone-400">避免新词过多造成后期复习堆积</div>
            </div>
            <select
              value={settings.dailyNewLimit}
              onChange={(e) => onUpdateSettings({ dailyNewLimit: Number(e.target.value) })}
              className="border border-paper-300 dark:border-paper-700 bg-paper-50 dark:bg-paper-850 text-stone-900 dark:text-stone-100 rounded p-1.5 font-mono"
            >
              <option value={15}>15 词/天</option>
              <option value={25}>25 词/天 (推荐)</option>
              <option value={40}>40 词/天</option>
              <option value={60}>60 词/天</option>
              <option value={100}>100 词/天</option>
            </select>
          </div>

          {/* Daily review limit */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-stone-800 dark:text-stone-200">每日复习上限</div>
              <div className="text-[11px] text-stone-400">单日集中复习的最大负荷量</div>
            </div>
            <select
              value={settings.dailyReviewLimit}
              onChange={(e) => onUpdateSettings({ dailyReviewLimit: Number(e.target.value) })}
              className="border border-paper-300 dark:border-paper-700 bg-paper-50 dark:bg-paper-850 text-stone-900 dark:text-stone-100 rounded p-1.5 font-mono"
            >
              <option value={50}>50 词/天</option>
              <option value={100}>100 词/天 (推荐)</option>
              <option value={150}>150 词/天</option>
              <option value={250}>250 词/天</option>
            </select>
          </div>

          {/* Auto pronunciation */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-stone-800 dark:text-stone-200">揭晓后自动发音</div>
              <div className="text-[11px] text-stone-400">翻开卡片背面时自动美音朗读</div>
            </div>
            <input
              type="checkbox"
              checked={settings.autoPronounce}
              onChange={(e) => onUpdateSettings({ autoPronounce: e.target.checked })}
              className="w-4 h-4 rounded text-stone-900 border-paper-300 focus:ring-0"
            />
          </div>

          {/* Show phonetic on front */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-stone-800 dark:text-stone-200">正面显示音标</div>
              <div className="text-[11px] text-stone-400">辅助回忆拼读，不泄露中文释义</div>
            </div>
            <input
              type="checkbox"
              checked={settings.showPhonetic}
              onChange={(e) => onUpdateSettings({ showPhonetic: e.target.checked })}
              className="w-4 h-4 rounded text-stone-900 border-paper-300 focus:ring-0"
            />
          </div>

          {/* Show frequency on front */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-stone-800 dark:text-stone-200">正面显示真题考频</div>
              <div className="text-[11px] text-stone-400">直观判断考研真题核心词权重</div>
            </div>
            <input
              type="checkbox"
              checked={settings.showFreqOnFront}
              onChange={(e) => onUpdateSettings({ showFreqOnFront: e.target.checked })}
              className="w-4 h-4 rounded text-stone-900 border-paper-300 focus:ring-0"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end border-t border-paper-100 dark:border-paper-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg text-xs font-medium shadow-xs"
          >
            保存并关闭
          </button>
        </div>
      </div>
    </div>
  );
};
