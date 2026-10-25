/**
 * Reliable dual-engine speech synthesis for English vocabulary:
 * 1. Primary: Native browser Web Speech API (offline, low latency)
 * 2. Fallback: High-quality online authentic American pronunciation audio stream (reliable on mobile Safari/WeChat)
 */
let audioPlayer: HTMLAudioElement | null = null;

export function speakWord(text: string): void {
  if (!text || typeof window === 'undefined') return;

  const cleanWord = text.trim().toLowerCase();

  // 1. Try Web Speech API first
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleanWord);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;

      let hasPlayed = false;
      utterance.onstart = () => {
        hasPlayed = true;
      };

      utterance.onerror = () => {
        fallbackOnlineAudio(cleanWord);
      };

      window.speechSynthesis.speak(utterance);

      // Timeout fallback in case mobile browser hangs silently without firing onstart
      setTimeout(() => {
        if (!hasPlayed && window.speechSynthesis.speaking === false) {
          fallbackOnlineAudio(cleanWord);
        }
      }, 350);
      return;
    } catch {
      fallbackOnlineAudio(cleanWord);
      return;
    }
  }

  // Fallback
  fallbackOnlineAudio(cleanWord);
}

export const playWordPronunciation = speakWord;

function fallbackOnlineAudio(word: string): void {
  try {
    if (!audioPlayer) {
      audioPlayer = new Audio();
    }
    // Youdao authentic US pronunciation stream
    audioPlayer.src = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=2`;
    audioPlayer.play().catch(() => {
      // Audio playback interrupted or blocked by browser autoplay policy
    });
  } catch {
    // Ignore fallback failures
  }
}
