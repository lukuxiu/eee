import { StudyMode, CategoryFilterKey, CustomDeckConfig, AppTab } from '../types';

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
  selectedYear?: number;
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
export function saveStoredTab(tab: AppTab): void {
  try {
    localStorage.setItem(CURRENT_TAB_KEY, tab);
  } catch {}
}

// Get active tab
export function getStoredTab(): AppTab {
  try {
    const tab = localStorage.getItem(CURRENT_TAB_KEY);
    if (tab === 'study' || tab === 'sprint' || tab === 'context' || tab === 'words' || tab === 'stats') {
      return tab;
    }
  } catch {}
  return 'study';
}

const EXAM_DATE_KEY = 'kaoyan:exam_target_date:v1';
const SPRINT_STATE_KEY = 'kaoyan:sprint_state:v1';

export interface StoredSprintState {
  packKey: string;
  pageIndex: number;
  clearedWordIds: string[];
  flaggedWordIds: string[];
  onlyUnmastered: boolean;
  hideDefinitions: boolean;
}

export function getStoredExamTargetDate(): string {
  try {
    const val = localStorage.getItem(EXAM_DATE_KEY);
    if (val && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  } catch {}
  return '2026-12-19';
}

export function saveExamTargetDate(dateStr: string): void {
  try {
    localStorage.setItem(EXAM_DATE_KEY, dateStr);
  } catch {}
}

export function getStoredSprintState(): StoredSprintState | null {
  try {
    const raw = localStorage.getItem(SPRINT_STATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSprintState(state: StoredSprintState): void {
  try {
    localStorage.setItem(SPRINT_STATE_KEY, JSON.stringify(state));
  } catch {}
}
