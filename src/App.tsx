import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  WordEntry, 
  WordStudyRecord, 
  UserSettings, 
  CategoryFilterKey, 
  StudyMode, 
  RecallRating,
  CustomDeckConfig 
} from './types';
import { Header } from './components/Header';
import { CategoryNav } from './components/CategoryNav';
import { StudyDeck } from './components/StudyDeck';
import { ContextRecallDeck } from './components/ContextRecallDeck';
import { WordListModal } from './components/WordListModal';
import { StatsDashboard } from './components/StatsDashboard';
import { CustomDeckModal } from './components/CustomDeckModal';
import { DataManagementModal } from './components/DataManagementModal';
import { SettingsModal } from './components/SettingsModal';
import { AlgorithmModal } from './components/AlgorithmModal';
import { VisitDock, VisitRecord } from './components/VisitDock';
import { WordDetailModal } from './components/WordDetailModal';

import { 
  getAllStudyRecords, 
  saveStudyRecord, 
  getStoredUserSettings, 
  saveStoredUserSettings,
  DEFAULT_USER_SETTINGS 
} from './storage/db';
import { 
  processRecall, 
  revokeAndCorrect, 
  createDefaultStudyRecord 
} from './engine/spacedRepetition';
import { calculateCategoryStats } from './engine/categoryEngine';
import { buildStudyQueue, extractAvailableExamYears } from './engine/queueScheduler';
import { 
  getStoredActiveSession, 
  saveActiveSession, 
  getStoredTab, 
  saveStoredTab,
  SessionStats 
} from './storage/sessionStore';

const VISITS_STORAGE_KEY = 'kaoyan:visit-dock:v1';

export const App: React.FC = () => {
  // Global Data
  const [words, setWords] = useState<WordEntry[]>([]);
  const [records, setRecords] = useState<Record<string, WordStudyRecord>>({});
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);
  const [loading, setLoading] = useState(true);

  // Visit Footprints (LazyNote visit-dock offline state)
  const [visits, setVisits] = useState<VisitRecord[]>(() => {
    try {
      const raw = localStorage.getItem(VISITS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Selected word detail inspection modal
  const [inspectingWord, setInspectingWord] = useState<WordEntry | null>(null);

  // Navigation State with tab persistence
  const [currentTab, setCurrentTabState] = useState<'study' | 'context' | 'words' | 'stats'>(() => getStoredTab());
  const setCurrentTab = (tab: 'study' | 'context' | 'words' | 'stats') => {
    setCurrentTabState(tab);
    saveStoredTab(tab);
  };

  const [studyMode, setStudyMode] = useState<StudyMode>('mixed');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [activeCategory, setActiveCategory] = useState<CategoryFilterKey>('all');
  const [customConfig, setCustomConfig] = useState<CustomDeckConfig | undefined>();
  
  // Persisted Session Queue State
  const [sessionQueue, setSessionQueue] = useState<WordEntry[]>([]);
  const [sessionIndex, setSessionIndex] = useState<number>(0);
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    know: 0,
    unfamiliar: 0,
    dont_know: 0,
    corrected: 0,
    mistakenWordIds: [],
  });
  const [sessionCompleted, setSessionCompleted] = useState<boolean>(false);

  // Modals
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAlgorithmModalOpen, setIsAlgorithmModalOpen] = useState(false);

  // Helper to record visit footprint
  const recordVisitFootprint = useCallback((word: WordEntry, rating: RecallRating | 'corrected' | 'viewed') => {
    setVisits((prev) => {
      const primaryDef = word.senses.map((s) => `${s.pos} ${s.definition}`).join('; ');
      const newRecord: VisitRecord = {
        id: `${word.id}-${Date.now()}`,
        wordId: word.id,
        word: word.word,
        phonetic: word.phonetic,
        rating,
        timestamp: Date.now(),
        examSource: word.examSource,
        kaoyanRank: word.kaoyanRank,
        primaryDef,
      };
      const filtered = prev.filter((v) => v.wordId !== word.id);
      const updated = [newRecord, ...filtered].slice(0, 60);
      try {
        localStorage.setItem(VISITS_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  // 1. Load initial datasets & restore active session if available
  useEffect(() => {
    async function initData() {
      try {
        setLoading(true);
        const [res1, res2] = await Promise.all([
          fetch('/data/english1.json').then((r) => r.json()),
          fetch('/data/english2.json').then((r) => r.json()),
        ]);
        const combinedWords: WordEntry[] = [...res1, ...res2];
        setWords(combinedWords);

        const [storedRecords, storedSettings] = await Promise.all([
          getAllStudyRecords(),
          getStoredUserSettings(),
        ]);
        setRecords(storedRecords);
        setSettings(storedSettings);

        // Check if there is an active session in localStorage to restore!
        const savedSession = getStoredActiveSession();
        if (savedSession && savedSession.queueWordIds && savedSession.queueWordIds.length > 0) {
          const wordsMap = new Map(combinedWords.map((w) => [w.id, w]));
          const restoredQueue = savedSession.queueWordIds
            .map((id) => wordsMap.get(id))
            .filter((w): w is WordEntry => Boolean(w));

          if (restoredQueue.length > 0) {
            setStudyMode(savedSession.mode || 'mixed');
            if (savedSession.selectedYear) {
              setSelectedYear(savedSession.selectedYear);
            }
            setActiveCategory(savedSession.category || 'all');
            setCustomConfig(savedSession.customConfig);
            setSessionQueue(restoredQueue);
            setSessionIndex(Math.min(savedSession.currentIndex || 0, restoredQueue.length));
            setSessionStats(savedSession.stats || {
              know: 0,
              unfamiliar: 0,
              dont_know: 0,
              corrected: 0,
              mistakenWordIds: [],
            });
            setSessionCompleted(Boolean(savedSession.isCompleted));
            return;
          }
        }

        // If no saved session, initialize recommended mixed queue
        const initialQueue = buildStudyQueue({
          mode: 'mixed',
          words: combinedWords,
          records: storedRecords,
          dailyNewLimit: storedSettings.dailyNewLimit,
          dailyReviewLimit: storedSettings.dailyReviewLimit,
          examFilter: storedSettings.examFilter,
          now: Date.now(),
        });
        setSessionQueue(initialQueue);
        setSessionIndex(0);
        setSessionCompleted(false);
        const freshStats: SessionStats = {
          know: 0,
          unfamiliar: 0,
          dont_know: 0,
          corrected: 0,
          mistakenWordIds: [],
        };
        setSessionStats(freshStats);

        saveActiveSession({
          mode: 'mixed',
          category: 'all',
          queueWordIds: initialQueue.map((w) => w.id),
          currentIndex: 0,
          stats: freshStats,
          isCompleted: false,
          timestamp: Date.now(),
        });
      } catch (err) {
        console.error('Failed to initialize application data:', err);
      } finally {
        setLoading(false);
      }
    }
    initData();
  }, []);

  // 2. Compute dynamic categories (updates reactively with records)
  const categories = useMemo(() => {
    const pool = words.filter((w) => {
      if (settings.examFilter === 'all') return true;
      return w.examSource === settings.examFilter;
    });
    return calculateCategoryStats(pool, records);
  }, [words, records, settings.examFilter]);

  // Extract available authentic exam years and word counts
  const availableYears = useMemo(() => extractAvailableExamYears(words), [words]);

  // 3. Helper to generate a new session queue
  const generateNewSessionQueue = useCallback(
    (
      modeToUse: StudyMode, 
      configToUse?: CustomDeckConfig, 
      customWords?: WordEntry[], 
      catToUse?: CategoryFilterKey,
      yearToUse?: number
    ) => {
      const activeCat = catToUse || activeCategory;
      const yr = yearToUse !== undefined ? yearToUse : selectedYear;
      if (customWords) {
        setSessionQueue(customWords);
        setSessionIndex(0);
        setSessionCompleted(false);
        const freshStats: SessionStats = {
          know: 0,
          unfamiliar: 0,
          dont_know: 0,
          corrected: 0,
          mistakenWordIds: [],
        };
        setSessionStats(freshStats);
        saveActiveSession({
          mode: modeToUse,
          category: activeCat,
          customConfig: configToUse,
          selectedYear: yr,
          queueWordIds: customWords.map((w) => w.id),
          currentIndex: 0,
          stats: freshStats,
          isCompleted: false,
          timestamp: Date.now(),
        });
        return;
      }
      if (words.length === 0) return;
      const q = buildStudyQueue({
        mode: modeToUse,
        words,
        records,
        dailyNewLimit: settings.dailyNewLimit,
        dailyReviewLimit: settings.dailyReviewLimit,
        examFilter: settings.examFilter,
        customConfig: configToUse,
        selectedYear: yr,
        now: Date.now(),
      });
      setSessionQueue(q);
      setSessionIndex(0);
      setSessionCompleted(false);
      const freshStats: SessionStats = {
        know: 0,
        unfamiliar: 0,
        dont_know: 0,
        corrected: 0,
        mistakenWordIds: [],
      };
      setSessionStats(freshStats);
      saveActiveSession({
        mode: modeToUse,
        category: activeCat,
        customConfig: configToUse,
        selectedYear: yr,
        queueWordIds: q.map((w) => w.id),
        currentIndex: 0,
        stats: freshStats,
        isCompleted: false,
        timestamp: Date.now(),
      });
    },
    [words, records, settings, activeCategory, selectedYear]
  );

  // Sync session progress from StudyDeck to localStorage
  const handleProgressUpdate = useCallback(
    (index: number, stats: SessionStats, isCompleted: boolean) => {
      setSessionIndex(index);
      setSessionStats(stats);
      setSessionCompleted(isCompleted);

      saveActiveSession({
        mode: studyMode,
        category: activeCategory,
        customConfig,
        selectedYear,
        queueWordIds: sessionQueue.map((w) => w.id),
        currentIndex: index,
        stats,
        isCompleted,
        timestamp: Date.now(),
      });
    },
    [studyMode, activeCategory, customConfig, sessionQueue, selectedYear]
  );

  // Re-generate session queue when mode changes
  const handleSelectMode = (newMode: StudyMode, year?: number) => {
    const yr = year !== undefined ? year : selectedYear;
    if (year !== undefined) {
      setSelectedYear(year);
    }
    setStudyMode(newMode);
    setCustomConfig(undefined);
    generateNewSessionQueue(newMode, undefined, undefined, undefined, yr);
  };

  // Handle single word recall evaluation
  const handleRecordRecall = useCallback(
    async (wordId: string, rating: RecallRating) => {
      const targetWord = words.find((w) => w.id === wordId);
      if (!targetWord) return;

      const currentRecord = records[wordId] || createDefaultStudyRecord(wordId, targetWord.word, targetWord.examSource);
      const updated = processRecall(currentRecord, {
        rating,
        mode: studyMode,
        now: Date.now(),
      });

      // Update state without wiping out sessionQueue
      setRecords((prev) => ({
        ...prev,
        [wordId]: updated,
      }));

      // Record footprint in visit-dock
      recordVisitFootprint(targetWord, rating);

      // Persist to IndexedDB
      await saveStudyRecord(updated);
    },
    [words, records, studyMode, recordVisitFootprint]
  );

  // Handle "记错了" rollback
  const handleRevokeAndCorrect = useCallback(
    async (wordId: string) => {
      const currentRecord = records[wordId];
      if (!currentRecord) return;

      const { updatedRecord, success } = revokeAndCorrect(currentRecord, Date.now());
      if (!success) return;

      setRecords((prev) => ({
        ...prev,
        [wordId]: updatedRecord,
      }));

      // Update in visit-dock
      setVisits((prev) => {
        const updated = prev.map((v) => {
          if (v.wordId === wordId) {
            return { ...v, rating: 'corrected' as const, timestamp: Date.now() };
          }
          return v;
        });
        try {
          localStorage.setItem(VISITS_STORAGE_KEY, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      await saveStudyRecord(updatedRecord);
    },
    [records]
  );

  // Handle authentic sentence context recall
  const handleRecordContextRecall = useCallback(
    async (wordId: string, senseId: string, isCorrect: boolean) => {
      const targetWord = words.find((w) => w.id === wordId);
      if (!targetWord) return;

      const currentRecord = records[wordId] || createDefaultStudyRecord(wordId, targetWord.word, targetWord.examSource);
      const rating: RecallRating = isCorrect ? 'know' : 'dont_know';
      const updated = processRecall(currentRecord, {
        rating,
        mode: 'context',
        senseId,
        isContextTest: true,
        now: Date.now(),
      });

      setRecords((prev) => ({
        ...prev,
        [wordId]: updated,
      }));

      recordVisitFootprint(targetWord, rating);

      await saveStudyRecord(updated);
    },
    [words, records, recordVisitFootprint]
  );

  // Handle toggle favorite
  const handleToggleFavorite = useCallback(
    async (wordId: string) => {
      const targetWord = words.find((w) => w.id === wordId);
      if (!targetWord) return;

      const currentRecord = records[wordId] || createDefaultStudyRecord(wordId, targetWord.word, targetWord.examSource);
      const updated: WordStudyRecord = {
        ...currentRecord,
        isFavorite: !currentRecord.isFavorite,
      };

      setRecords((prev) => ({
        ...prev,
        [wordId]: updated,
      }));

      await saveStudyRecord(updated);
    },
    [words, records]
  );

  // Clear visits
  const handleClearVisits = useCallback(() => {
    setVisits([]);
    try {
      localStorage.removeItem(VISITS_STORAGE_KEY);
    } catch {}
  }, []);

  // Settings update
  const handleUpdateSettings = useCallback(async (newSettings: Partial<UserSettings>) => {
    setSettings((prev) => {
      const merged = { ...prev, ...newSettings };
      saveStoredUserSettings(merged);
      if (newSettings.examFilter && newSettings.examFilter !== prev.examFilter) {
        const filterVal = newSettings.examFilter;
        setTimeout(() => {
          const pool = words.filter((w) => {
            if (filterVal === 'all') return true;
            return w.examSource === filterVal;
          });
          const q = buildStudyQueue({
            mode: studyMode,
            words: pool,
            records,
            dailyNewLimit: merged.dailyNewLimit,
            dailyReviewLimit: merged.dailyReviewLimit,
            examFilter: filterVal,
            selectedYear,
            now: Date.now(),
          });
          setSessionQueue(q);
          setSessionIndex(0);
          setSessionCompleted(false);
          const freshStats: SessionStats = {
            know: 0,
            unfamiliar: 0,
            dont_know: 0,
            corrected: 0,
            mistakenWordIds: [],
          };
          setSessionStats(freshStats);
          saveActiveSession({
            mode: studyMode,
            category: activeCategory,
            selectedYear,
            queueWordIds: q.map((w) => w.id),
            currentIndex: 0,
            stats: freshStats,
            isCompleted: false,
            timestamp: Date.now(),
          });
        }, 0);
      }
      return merged;
    });
  }, [words, records, studyMode, activeCategory, selectedYear]);

  // Category select
  const handleSelectCategory = (catKey: CategoryFilterKey) => {
    setActiveCategory(catKey);
    const cfg: CustomDeckConfig = {
      name: `分类词单: ${catKey}`,
      minFreq: 1,
      maxFreq: 999,
      selectedCategories: [catKey],
      limit: 30,
      mixOldWordsRatio: 0.5,
      examSource: settings.examFilter,
    };
    setCustomConfig(cfg);
    setStudyMode('custom');
    generateNewSessionQueue('custom', cfg, undefined, catKey);
    setCurrentTab('study');
  };

  // Retry mistaken words
  const handleRetryMistakes = (mistakenWordIds: string[]) => {
    const subset = words.filter((w) => mistakenWordIds.includes(w.id));
    if (subset.length > 0) {
      setSessionQueue(subset);
      setSessionIndex(0);
      setSessionCompleted(false);
      setStudyMode('error');
      const freshStats: SessionStats = {
        know: 0,
        unfamiliar: 0,
        dont_know: 0,
        corrected: 0,
        mistakenWordIds: [],
      };
      setSessionStats(freshStats);
      saveActiveSession({
        mode: 'error',
        category: 'dont_know',
        selectedYear,
        queueWordIds: subset.map((w) => w.id),
        currentIndex: 0,
        stats: freshStats,
        isCompleted: false,
        timestamp: Date.now(),
      });
    }
  };

  const handleStartStudyWithWord = (word: WordEntry) => {
    const wordIndex = words.findIndex((w) => w.id === word.id);
    const slice = wordIndex >= 0 ? words.slice(wordIndex, wordIndex + 30) : [word];
    setSessionQueue(slice);
    setSessionIndex(0);
    setSessionCompleted(false);
    setStudyMode('custom');
    const freshStats: SessionStats = {
      know: 0,
      unfamiliar: 0,
      dont_know: 0,
      corrected: 0,
      mistakenWordIds: [],
    };
    setSessionStats(freshStats);
    saveActiveSession({
      mode: 'custom',
      category: 'all',
      selectedYear,
      queueWordIds: slice.map((w) => w.id),
      currentIndex: 0,
      stats: freshStats,
      isCompleted: false,
      timestamp: Date.now(),
    });
    setCurrentTab('study');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-paper-50 dark:bg-paper-950 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-2 border-stone-900 dark:border-stone-100 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-xs font-mono text-stone-500 dark:text-stone-400">
          正在加载考研英语一 &amp; 英语二真题单词大观库...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper-50 dark:bg-paper-950 text-stone-900 dark:text-stone-100 flex flex-col font-sans transition-colors duration-150">
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onOpenCustomDeck={() => setIsCustomModalOpen(true)}
        onOpenDataManagement={() => setIsDataModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenAlgorithm={() => setIsAlgorithmModalOpen(true)}
        totalWordsCount={words.length}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-4 py-3 sm:py-6 space-y-3 sm:space-y-6 pb-24 md:pb-12">
        {currentTab === 'study' && (
          <div className="space-y-3 sm:space-y-5">
            <CategoryNav
              categories={categories}
              activeCategory={activeCategory}
              onSelectCategory={handleSelectCategory}
              currentMode={studyMode}
              onSelectMode={handleSelectMode}
              onStartCategorySession={handleSelectCategory}
              availableYears={availableYears}
              selectedYear={selectedYear}
              onSelectYear={(yr) => {
                setSelectedYear(yr);
                handleSelectMode('year', yr);
              }}
            />

            <StudyDeck
              queue={sessionQueue}
              records={records}
              settings={settings}
              mode={studyMode}
              selectedYear={selectedYear}
              initialIndex={sessionIndex}
              initialStats={sessionStats}
              initialCompleted={sessionCompleted}
              onProgressUpdate={handleProgressUpdate}
              onRecordRecall={handleRecordRecall}
              onRevokeAndCorrect={handleRevokeAndCorrect}
              onToggleFavorite={handleToggleFavorite}
              onRestartSession={() => generateNewSessionQueue(studyMode, customConfig, undefined, undefined, selectedYear)}
              onRetryMistakes={handleRetryMistakes}
            />
          </div>
        )}

        {currentTab === 'context' && (
          <ContextRecallDeck
            words={words}
            records={records}
            settings={settings}
            onRecordContextRecall={handleRecordContextRecall}
            onExit={() => setCurrentTab('study')}
          />
        )}

        {currentTab === 'words' && (
          <WordListModal
            words={words}
            records={records}
            settings={settings}
            activeCategory={activeCategory}
            onSelectCategory={setActiveCategory}
            onToggleFavorite={handleToggleFavorite}
            onStartStudyWithWord={handleStartStudyWithWord}
            onRevokeAndCorrect={handleRevokeAndCorrect}
          />
        )}

        {currentTab === 'stats' && (
          <StatsDashboard
            words={words}
            records={records}
            settings={settings}
          />
        )}
      </main>

      {/* Floating Visit-Dock (Footprints & Quick Review / Rollback) */}
      <VisitDock
        visits={visits}
        records={records}
        words={words}
        onRevokeAndCorrect={handleRevokeAndCorrect}
        onClearVisits={handleClearVisits}
        onToggleFavorite={handleToggleFavorite}
        onSelectWordDetail={(w) => setInspectingWord(w)}
        onStartStudyWithWord={handleStartStudyWithWord}
      />

      {/* Footer */}
      <footer className="border-t border-paper-200 dark:border-paper-850 bg-white dark:bg-paper-900 py-4 text-center text-[11px] text-stone-400 font-mono transition-colors">
        考研英语单词主动回忆与智能复习系统 · 基于纯净版考研单词大观 · SM-2 动态间隔重复
      </footer>

      {/* Modals */}
      <WordDetailModal
        word={inspectingWord}
        record={inspectingWord ? records[inspectingWord.id] : undefined}
        isOpen={Boolean(inspectingWord)}
        onClose={() => setInspectingWord(null)}
        onToggleFavorite={handleToggleFavorite}
        onRevokeAndCorrect={handleRevokeAndCorrect}
        onStartStudyWithWord={handleStartStudyWithWord}
      />

      <CustomDeckModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        onApplyConfig={(cfg) => {
          setCustomConfig(cfg);
          setStudyMode('custom');
          generateNewSessionQueue('custom', cfg);
          setCurrentTab('study');
        }}
        examFilter={settings.examFilter}
      />

      <DataManagementModal
        isOpen={isDataModalOpen}
        onClose={() => setIsDataModalOpen(false)}
        words={words}
        records={records}
        settings={settings}
        onRefreshData={async () => {
          const recs = await getAllStudyRecords();
          setRecords(recs);
          generateNewSessionQueue(studyMode, customConfig);
        }}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />

      <AlgorithmModal
        isOpen={isAlgorithmModalOpen}
        onClose={() => setIsAlgorithmModalOpen(false)}
      />
    </div>
  );
};
