export interface ExamSentence {
  id: string;
  sentence: string;        // 考研真题英文原句
  translation: string;     // 考研真题中文译文
  source: string;          // 原始出处字符串，例如 "2018 · 英语一 · 阅读理解 A Text 1 · 第 21 题"
  year?: number;           // 2018
  examType?: string;       // "英语一" | "英语二"
  section?: string;        // "阅读理解 A Text 1"
  questionNum?: string;    // "第 21 题"
  isAuthentic: boolean;    // 是否考研真题，缺失时为补充例句但明确标记
}

export interface WordSense {
  id: string;              // 释义唯一标识，例如 "e1-will-s1"
  num: number;             // 释义序号：1, 2, 3...
  pos: string;             // 词性：modal., n., adj., v., adv., prep.
  definition: string;      // 完整中文释义，保留熟词僻义、搭配说明
  freq?: number;           // 该释义在考研真题中的考频
  examples: ExamSentence[]; // 该释义对应的真题例句列表
}

export interface WordEntry {
  id: string;              // 词条唯一标识，例如 "e1-will" 或 "e2-will"
  word: string;            // 英文拼写，如 "will"
  phonetic: string;        // 国际音标，如 "/wɪl/"
  totalFreq: number;       // 考研大纲/真题总考频
  morphology: string;      // 构词分析（词根、词缀、原始说明，无则为"暂无数据"）
  senses: WordSense[];     // 所有收录的词性与释义
  examSource: 'e1' | 'e2'; // 英语一 或 英语二
  page: number;            // 原始资料页码
  kaoyanRank?: number;     // 考研高频 1199 官方排名 (1-1199)
  cefr?: string;           // CEFR 难度等级 (A1, A2, B1, B2, C1, C2)
  isHighFreq1199?: boolean;// 是否属于高频 1199 词汇
}

export type RecallRating = 'know' | 'unfamiliar' | 'dont_know';

export interface RecallLogEvent {
  id: string;
  timestamp: number;
  wordId: string;
  rating: RecallRating;
  wasCorrected: boolean;       // 是否为点击“记错了”修正后的记录
  originalRating?: RecallRating; // 修正前的原始评级（例如 'know'）
  correctedAt?: number;        // 修正时间戳
  mode: StudyMode;
  senseId?: string;            // 具体测试的释义ID
  isContextTest?: boolean;     // 是否为真题语境主动回忆模式
}

export interface SenseMastery {
  senseId: string;
  consecutiveCorrect: number;  // 连续正确次数
  reviewCount: number;         // 累计复习次数
  errorCount: number;          // 累计错误次数
  masteryLevel: number;        // 0-5
  lastReviewTime?: number;     // 上次复习时间戳
  nextReviewTime?: number;     // 下次复习时间戳
  intervalDays: number;        // 当前复习间隔（天）
  easeFactor: number;          // SM-2 难度因子（默认 2.5）
}

export interface WordStudyRecord {
  wordId: string;
  word: string;
  examSource: 'e1' | 'e2';
  firstStudyTime: number;      // 首次学习时间戳
  lastReviewTime: number;      // 最近复习时间戳
  nextReviewTime: number;      // 下次计划复习时间戳
  consecutiveCorrect: number;  // 连续正确次数
  reviewCount: number;         // 累计复习次数
  errorCount: number;          // 累计错误次数
  masteryLevel: number;        // 0(未学), 1(生词), 2(初识), 3(熟悉), 4(稳固), 5(精通)
  intervalDays: number;        // 当前复习间隔（天，0.1表示短时复习）
  easeFactor: number;          // 难度系数 (1.3 - 3.0, 初始 2.5)
  isFavorite: boolean;         // 收藏标记
  customTags: string[];        // 用户自定义分类标签
  senseMasteries: Record<string, SenseMastery>; // 每个释义的独立掌握度
  history: RecallLogEvent[];   // 完整回忆操作历史（含纠错记录）
  lastMistakeTime?: number;    // 最近一次出错时间
  lastCorrectionTime?: number; // 最近一次点击“记错了”时间
  contextCorrectCount: number; // 真题语境测试正确次数
  contextErrorCount: number;   // 真题语境测试错误次数
}

export type StudyMode = 
  | 'new'      // 新词速刷
  | 'due'      // 到期复习
  | 'error'    // 错词强化
  | 'mixed'    // 混合测试 (逾期 > 记错 > 到期 > 新词 > 抽查)
  | 'year'     // 分年份真题背诵 (按考研真题年份逐年强化)
  | 'custom'   // 自定义组卷
  | 'context'; // 真题例句语境主动回忆

export type CategoryFilterKey =
  | 'all'                 // 全部单词
  | 'today_new'           // 今日新词
  | 'today_due'           // 今日待复习
  | 'overdue'             // 已超期
  | 'unfamiliar'          // 不熟悉
  | 'dont_know'           // 不认识
  | 'recently_mistaken'   // 近期记错 (点击“记错了”)
  | 'frequent_mistakes'   // 多次错误/反复出错
  | 'partially_mastered'  // 部分掌握 (多义词不同释义表现不均)
  | 'mastered'            // 已掌握
  | 'context_weak'        // 真题语境薄弱
  | 'high_freq_weak'      // 高频词薄弱
  | 'favorite'            // 收藏单词
  | string;               // 自定义分类 "custom:分类名" 或 "year:年份"

export interface UserSettings {
  examFilter: 'e1' | 'e2' | 'all'; // 题库开关：英语一 / 英语二 / 合并
  dailyNewLimit: number;           // 每日新词上限 (默认 25)
  dailyReviewLimit: number;        // 每日复习上限 (默认 100)
  autoPronounce: boolean;          // 揭晓后自动发音
  showPhonetic: boolean;           // 正面显示音标
  showFreqOnFront: boolean;        // 正面显示词频
  autoAdvance: boolean;            // 评级后自动跳转下一词
  theme: 'light' | 'dark';
}

export interface CustomDeckConfig {
  name: string;
  minFreq: number;
  maxFreq: number;
  selectedCategories: string[];
  selectedYear?: number;    // 指定考研年份
  limit: number;
  mixOldWordsRatio: number; // 0.0 - 1.0 (混入已学词比例)
  examSource: 'e1' | 'e2' | 'all';
}
