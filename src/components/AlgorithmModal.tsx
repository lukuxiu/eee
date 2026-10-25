import React from 'react';
import { X, HelpCircle, RotateCcw, Target, ShieldCheck } from 'lucide-react';

interface AlgorithmModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AlgorithmModal: React.FC<AlgorithmModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-paper-900 rounded-xl border border-paper-200 dark:border-paper-800 max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[85vh] overflow-y-auto transition-colors">
        <div className="flex items-center justify-between border-b border-paper-100 dark:border-paper-800 pb-3">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-stone-800 dark:text-stone-200" />
            <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100">艾宾浩斯与 SM-2 智能复习调度算法</h3>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs leading-relaxed text-stone-700 dark:text-stone-300">
          {/* Section 1 */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-stone-800 dark:text-stone-200" />
              1. 拒绝机械循环：SM-2 动态难度与可解释间隔
            </h4>
            <p className="text-stone-600 dark:text-stone-400">
              本系统杜绝固定的 1, 2, 4, 7 天机械循环，采用基于 SuperMemo SM-2 的改进型记忆算法。系统为每个单词及具体释义保存「难度系数 (Ease Factor)」、「连续正确次数」与「遗忘惩罚历史」。
            </p>
            <div className="bg-paper-50 dark:bg-paper-850 p-3 rounded-lg border border-paper-200 dark:border-paper-800 font-mono text-[11px] space-y-1">
              <div>· 首次学习并选择「认识」：安排约 1 天后初测。</div>
              <div>· 连续正确多次：按 3 天 &rarr; 7 天 &rarr; 15 天 &rarr; 30 天逐步拉长，乘以难度系数。</div>
              <div>· 选择「不熟悉」：难度系数降低 0.15，安排约 8 小时后（当天晚些或次日）重新巩固。</div>
              <div>· 选择「不认识」：连续正确清零，错误次数 +1，安排 15 分钟短时强化复查。</div>
            </div>
          </div>

          {/* Section 2 */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5 text-stone-800 dark:text-stone-200" />
              2. 「记错了」核心撤销与防虚假掌握
            </h4>
            <p className="text-stone-600 dark:text-stone-400">
              考研英语单词最忌讳“貌合神离”——凭猜测或常见义误以为自己完全认识。当你在正面点击「认识」后，卡片背面始终保留显眼的「记错了」纠错通道。
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-stone-600 dark:text-stone-400 pl-2">
              <li>立即撤销本次「认识」带来的掌握度增长与间隔拉长。</li>
              <li>将本次回忆标记为「记错了 (自我评价偏差)」，错误次数 +1。</li>
              <li>立即将该单词归入近期错词队列，并在 15 分钟后安排紧急强化复测。</li>
              <li>内置防抖与原子性保证，杜绝重复点击造成重复扣减。</li>
            </ul>
          </div>

          {/* Section 3 */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-stone-800 dark:text-stone-200" />
              3. 动态队列调度权重
            </h4>
            <p className="text-stone-600 dark:text-stone-400">
              每轮学习队列严格按照考研复习认知规律排序：
            </p>
            <div className="p-2.5 bg-paper-50 dark:bg-paper-850 rounded-lg border border-paper-200 dark:border-paper-800 font-mono text-[11px] text-stone-800 dark:text-stone-200">
              逾期严重词 (&gt;24h) &gt; 最近记错词 &gt; 今日到期词 &gt; 真题语境薄弱词 &gt; 今日新词 &gt; 已掌握抽查词
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end border-t border-paper-100 dark:border-paper-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg text-xs font-medium shadow-xs"
          >
            我知道了
          </button>
        </div>
      </div>
    </div>
  );
};
