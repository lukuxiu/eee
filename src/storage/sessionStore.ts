import { StudyMode, CategoryFilterKey, CustomDeckConfig, WordEntry, RecallRating } from '../types';

export interface SessionStats {
  know: number;
  unfamiliar: number;
  dont_know: number;
  corrected: number;
  mistakenWordIds: string[];
}

export interface ActiveSessionData {
  mode: StudyMode;
  category: CategoryFilterKey;
  customConfig?: CustomDeckConfig;
  queueWordIds: string[];
  currentIndex: number;
  stats: SessionStats;
  isCompleted: boolean;
  timestamp: number;
}

const SESSION_STORAGE_KEY = 'kaoyan:active_session:v1';
const CURRENT_TAB_KEY = 'kaoyan:current_tab:v1';

// Save active session to localStorage
export function saveActiveSession(session: ActiveSessionData): void {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch (err) {
    console.warn('Failed to save active session to localStorage:', err);
  }
}

// Get active session from localStorage (valid for up to 7 days)
export function getStoredActiveSession(): ActiveSessionData | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const session: ActiveSessionData = JSON.parse(raw);
    const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
    if (Date.now() - session.timestamp > MAX_AGE_MS) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return session;
  } catch (err) {
    console.warn('Failed to parse active session from localStorage:', err);
    return null;
  }
}

// Clear active session
export function clearActiveSession(): void {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {}
}

// Save active tab
export function saveStoredTab(tab: 'study' | 'context' | 'words' | 'stats'): void {
  try {
    localStorage.setItem(CURRENT_TAB_KEY, tab);
  } catch {}
}

// Get active tab
export function getStoredTab(): 'study' | 'context' | 'words' | 'stats' {
  try {
    const tab = localStorage.getItem(CURRENT_TAB_KEY);
    if (tab === 'study' || tab === 'context' || tab === 'words' || tab === 'stats') {
      return tab;
    }
  } catch {}
  return 'study';
}
