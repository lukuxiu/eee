import { WordStudyRecord, UserSettings, WordEntry } from '../types';

const DB_NAME = 'KaoyanVocabDB';
const DB_VERSION = 1;

export const DEFAULT_USER_SETTINGS: UserSettings = {
  examFilter: 'all', // 'e1' | 'e2' | 'all'
  dailyNewLimit: 25,
  dailyReviewLimit: 100,
  autoPronounce: false,
  showPhonetic: true,
  showFreqOnFront: true,
  autoAdvance: false,
  theme: 'light',
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('studyRecords')) {
        db.createObjectStore('studyRecords', { keyPath: 'wordId' });
      }
      if (!db.objectStoreNames.contains('userSettings')) {
        db.createObjectStore('userSettings', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllStudyRecords(): Promise<Record<string, WordStudyRecord>> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('studyRecords', 'readonly');
      const store = tx.objectStore('studyRecords');
      const request = store.getAll();

      request.onsuccess = () => {
        const records: Record<string, WordStudyRecord> = {};
        for (const item of request.result) {
          records[item.wordId] = item;
        }
        resolve(records);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to load study records from IndexedDB:', err);
    // Fallback to localStorage
    const local = localStorage.getItem('kaoyan_study_records');
    return local ? JSON.parse(local) : {};
  }
}

export async function saveStudyRecord(record: WordStudyRecord): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('studyRecords', 'readwrite');
      const store = tx.objectStore('studyRecords');
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to save study record to IndexedDB, using fallback:', err);
    const local = localStorage.getItem('kaoyan_study_records');
    const records = local ? JSON.parse(local) : {};
    records[record.wordId] = record;
    localStorage.setItem('kaoyan_study_records', JSON.stringify(records));
  }
}

export async function bulkSaveStudyRecords(recordsList: WordStudyRecord[]): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('studyRecords', 'readwrite');
      const store = tx.objectStore('studyRecords');
      for (const rec of recordsList) {
        store.put(rec);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Bulk save failed:', err);
  }
}

export async function getStoredUserSettings(): Promise<UserSettings> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction('userSettings', 'readonly');
      const store = tx.objectStore('userSettings');
      const req = store.get('main');
      req.onsuccess = () => {
        if (req.result && req.result.value) {
          resolve({ ...DEFAULT_USER_SETTINGS, ...req.result.value });
        } else {
          // Check localStorage fallback
          const local = localStorage.getItem('kaoyan_user_settings');
          resolve(local ? { ...DEFAULT_USER_SETTINGS, ...JSON.parse(local) } : DEFAULT_USER_SETTINGS);
        }
      };
      req.onerror = () => resolve(DEFAULT_USER_SETTINGS);
    });
  } catch {
    const local = localStorage.getItem('kaoyan_user_settings');
    return local ? { ...DEFAULT_USER_SETTINGS, ...JSON.parse(local) } : DEFAULT_USER_SETTINGS;
  }
}

export async function saveStoredUserSettings(settings: UserSettings): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction('userSettings', 'readwrite');
    const store = tx.objectStore('userSettings');
    store.put({ key: 'main', value: settings });
  } catch (err) {
    console.warn('Failed to save settings to IDB, saving to localStorage:', err);
  }
  localStorage.setItem('kaoyan_user_settings', JSON.stringify(settings));
}

/**
 * 完整备份数据导出为 JSON
 */
export async function exportAllDataAsJSON(records: Record<string, WordStudyRecord>, settings: UserSettings): Promise<string> {
  const exportPayload = {
    version: '1.0.0',
    exportTime: new Date().toISOString(),
    totalRecords: Object.keys(records).length,
    settings,
    records,
  };
  return JSON.stringify(exportPayload, null, 2);
}

/**
 * 从 JSON 导入并恢复数据
 */
export async function importDataFromJSON(jsonStr: string): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const parsed = JSON.parse(jsonStr);
    if (!parsed || !parsed.records || typeof parsed.records !== 'object') {
      return { success: false, count: 0, error: '无效的备份文件格式' };
    }
    const recordsList = Object.values(parsed.records) as WordStudyRecord[];
    await bulkSaveStudyRecords(recordsList);
    if (parsed.settings) {
      await saveStoredUserSettings(parsed.settings);
    }
    return { success: true, count: recordsList.length };
  } catch (err) {
    return { success: false, count: 0, error: (err as Error).message };
  }
}

/**
 * 导出当前单词表与学习状态为 CSV
 */
export function exportWordsAsCSV(words: WordEntry[], records: Record<string, WordStudyRecord>): string {
  const header = ['单词', '题库', '真题词频', '掌握等级', '复习次数', '错误次数', '连续正确', '下次复习时间', '释义汇总', '真题例句'];
  const rows: string[] = [header.join(',')];

  for (const w of words) {
    const rec = records[w.id];
    const examName = w.examSource === 'e1' ? '英语一' : '英语二';
    const mastery = rec ? `${rec.masteryLevel}星` : '未学习';
    const reviewCount = rec ? rec.reviewCount : 0;
    const errorCount = rec ? rec.errorCount : 0;
    const consecutive = rec ? rec.consecutiveCorrect : 0;
    const nextReview = rec && rec.nextReviewTime ? new Date(rec.nextReviewTime).toLocaleDateString() : '未安排';
    
    const defs = w.senses.map(s => `${s.pos} ${s.definition}`).join('; ').replace(/"/g, '""');
    const firstExample = w.senses[0]?.examples[0]?.sentence || '';
    const cleanExample = firstExample.replace(/"/g, '""');

    rows.push(`"${w.word}","${examName}",${w.totalFreq},"${mastery}",${reviewCount},${errorCount},${consecutive},"${nextReview}","${defs}","${cleanExample}"`);
  }

  return '\uFEFF' + rows.join('\n'); // Add BOM for Excel UTF-8 compatibility
}
