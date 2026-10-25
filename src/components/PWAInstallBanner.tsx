import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Check } from 'lucide-react';

export const PWAInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already running as standalone PWA
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Check if iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }
    if (!deferredPrompt) {
      alert('请在浏览器右上角菜单中点击“安装应用”或“添加到主屏幕”');
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  if (isInstalled || isDismissed) {
    return null;
  }

  // Only display if installable or iOS
  if (!isInstallable && !isIOS) {
    return null;
  }

  return (
    <>
      <div className="bg-paper-100 dark:bg-paper-900 border-b border-paper-200 dark:border-paper-800 px-3 py-1.5 text-xs flex items-center justify-between text-stone-700 dark:text-stone-300">
        <div className="flex items-center gap-2">
          <Smartphone className="w-3.5 h-3.5 text-amber-600 dark:text-amber-500" />
          <span>
            支持作为独立桌面/手机 App 离线运行，免开浏览器且秒开
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleInstallClick}
            className="px-2.5 py-0.5 rounded text-[11px] font-medium bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 hover:bg-stone-800 transition-colors inline-flex items-center gap-1 shadow-2xs"
          >
            <Download className="w-3 h-3" />
            安装到桌面
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-0.5"
            title="稍后再说"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* iOS Safari Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-paper-900 p-5 rounded-xl max-w-sm w-full space-y-4 border border-paper-200 dark:border-paper-800 shadow-xl">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                添加到 iPhone / iPad 主屏幕
              </h4>
              <button onClick={() => setShowIOSGuide(false)} className="text-stone-400 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs text-stone-600 dark:text-stone-300">
              <p>1. 在 Safari 底部工具栏点击 <strong>「分享」</strong> 按钮（方框带向上箭头）。</p>
              <p>2. 在弹出菜单中向下滑动，选择 <strong>「添加到主屏幕」</strong>。</p>
              <p>3. 点击右上角 <strong>「添加」</strong> 即可像原生 App 一样全屏无干扰背单词。</p>
            </div>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2 bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 rounded font-medium text-xs"
            >
              我知道了
            </button>
          </div>
        </div>
      )}
    </>
  );
};
