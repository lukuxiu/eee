import React, { useState, useEffect } from 'react';
import { WordEntry, WordStudyRecord, UserSettings } from '../types';
import { exportAllDataAsJSON, importDataFromJSON, exportWordsAsCSV } from '../storage/db';
import { X, Download, Upload, FileText, CheckCircle, Database } from 'lucide-react';

interface DataManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  words: WordEntry[];
  records: Record<string, WordStudyRecord>;
  settings: UserSettings;
  onRefreshData: () => void;
}

export const DataManagementModal: React.FC<DataManagementModalProps> = ({
  isOpen,
  onClose,
  words,
  records,
  settings,
  onRefreshData,
}) => {
  const [report, setReport] = useState<any>(null);
  const [lnReport, setLnReport] = useState<any>(null);
  const [importStatus, setImportStatus] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      const base = import.meta.env.BASE_URL || './';
      fetch(`${base}data/import_report.json`)
        .then((res) => res.json())
        .then((data) => setReport(data))
        .catch((err) => console.warn('Failed to load report:', err));

      fetch(`${base}data/lazynote_1199_report.json`)
        .then((res) => res.json())
        .then((data) => setLnReport(data))
        .catch((err) => console.warn('Failed to load ln report:', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExportJSON = async () => {
    const jsonStr = await exportAllDataAsJSON(records, settings);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `考研英语学习记录备份_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const csvStr = exportWordsAsCSV(words, records);
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `考研英语真题单词表_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const res = await importDataFromJSON(content);
      if (res.success) {
        setImportStatus(`成功导入并恢复 ${res.count} 条学习记录！`);
        onRefreshData();
      } else {
        setImportStatus(`导入失败: ${res.error}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-paper-900 rounded-xl border border-paper-200 dark:border-paper-800 max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[85vh] overflow-y-auto transition-colors">
        <div className="flex items-center justify-between border-b border-paper-100 dark:border-paper-800 pb-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-stone-800 dark:text-stone-200" />
            <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100">数据管理与原始资料核验</h3>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* PDF Import Audit Report */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
            《纯净版单词大观》PDF 真实解析审计报告
          </h4>

          {report ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="bg-paper-50 dark:bg-paper-850 border border-paper-200 dark:border-paper-800 p-3 rounded-lg space-y-1">
                  <div className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5 font-sans">
                    <CheckCircle className="w-3.5 h-3.5 text-stone-800 dark:text-stone-200" />
                    英语一词库
                  </div>
                  <div className="text-stone-600 dark:text-stone-300">处理总页数: {report.english1?.totalPages} 页</div>
                  <div className="text-stone-600 dark:text-stone-300">收录单词: {report.english1?.totalWords} 词</div>
                  <div className="text-stone-600 dark:text-stone-300">收录释义: {report.english1?.totalSenses} 项</div>
                  <div className="text-stone-600 dark:text-stone-300">真题例句: {report.english1?.totalExamples} 句</div>
                  <div className="text-stone-800 dark:text-stone-200 font-semibold">识别异常行: {report.english1?.failedRows} 行</div>
                </div>

                <div className="bg-paper-50 dark:bg-paper-850 border border-paper-200 dark:border-paper-800 p-3 rounded-lg space-y-1">
                  <div className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5 font-sans">
                    <CheckCircle className="w-3.5 h-3.5 text-stone-800 dark:text-stone-200" />
                    英语二词库
                  </div>
                  <div className="text-stone-600 dark:text-stone-300">处理总页数: {report.english2?.totalPages} 页</div>
                  <div className="text-stone-600 dark:text-stone-300">收录单词: {report.english2?.totalWords} 词</div>
                  <div className="text-stone-600 dark:text-stone-300">收录释义: {report.english2?.totalSenses} 项</div>
                  <div className="text-stone-600 dark:text-stone-300">真题例句: {report.english2?.totalExamples} 句</div>
                  <div className="text-stone-800 dark:text-stone-200 font-semibold">识别异常行: {report.english2?.failedRows} 行</div>
                </div>
              </div>

              {/* Sample verification */}
              {report.sampleVerification?.english1 && report.sampleVerification.english1.length > 0 && (
                <div className="bg-paper-50 dark:bg-paper-850 border border-paper-200 dark:border-paper-800 p-3 rounded-lg text-xs space-y-2">
                  <span className="font-semibold text-stone-700 dark:text-stone-300">随机抽样数据抽检 (英语一样例):</span>
                  <div className="space-y-1 font-mono text-[11px] text-stone-600 dark:text-stone-300">
                    {report.sampleVerification.english1.slice(0, 2).map((item: any) => (
                      <div key={item.id} className="border-t border-paper-200 dark:border-paper-700 pt-1 first:border-0 first:pt-0">
                        <span className="font-bold text-stone-900 dark:text-stone-100 font-serif mr-2">{item.word}</span>
                        <span>{item.phonetic} | 考频 {item.totalFreq}次 | 构词: {item.morphology}</span>
                        <div className="text-[10px] text-stone-500 dark:text-stone-400 font-sans mt-0.5">
                          {item.senses[0]?.pos} {item.senses[0]?.definition} — &ldquo;{item.senses[0]?.examples[0]?.sentence}&rdquo; ({item.senses[0]?.examples[0]?.source})
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* LazyNote 1199 High Frequency Supplement Audit */}
              {lnReport && (
                <div className="bg-paper-50 dark:bg-paper-850 border border-paper-200 dark:border-paper-800 p-3 rounded-lg text-xs space-y-2">
                  <div className="font-bold text-stone-900 dark:text-stone-100 flex items-center justify-between">
                    <span>🔥 LazyNote 高频 1199 增补与英一英二归类审计</span>
                    <span className="font-mono text-[10px] bg-paper-200 dark:bg-paper-700 text-stone-700 dark:text-stone-300 px-1.5 py-0.2 rounded">100% 对齐</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono py-1">
                    <div className="bg-white dark:bg-paper-900 p-2 rounded border border-paper-200 dark:border-paper-800">
                      <div className="font-bold text-stone-900 dark:text-stone-100">{lnReport.total1199}</div>
                      <div className="text-[10px] text-stone-400 font-sans">高频全榜</div>
                    </div>
                    <div className="bg-white dark:bg-paper-900 p-2 rounded border border-paper-200 dark:border-paper-800">
                      <div className="font-bold text-stone-900 dark:text-stone-100">+{lnReport.missingAddedTotal}</div>
                      <div className="text-[10px] text-stone-400 font-sans">填补缺失</div>
                    </div>
                    <div className="bg-white dark:bg-paper-900 p-2 rounded border border-paper-200 dark:border-paper-800">
                      <div className="font-bold text-stone-900 dark:text-stone-100">{lnReport.e1Total1199}</div>
                      <div className="text-[10px] text-stone-400 font-sans">英一覆盖</div>
                    </div>
                    <div className="bg-white dark:bg-paper-900 p-2 rounded border border-paper-200 dark:border-paper-800">
                      <div className="font-bold text-stone-900 dark:text-stone-100">{lnReport.e2Total1199}</div>
                      <div className="text-[10px] text-stone-400 font-sans">英二覆盖</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-stone-400">正在加载解析审计报告...</div>
          )}
        </div>

        {/* Local Storage Backup & Export */}
        <div className="space-y-3 pt-3 border-t border-paper-100 dark:border-paper-800">
          <h4 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
            数据备份、导出与跨端恢复
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              onClick={handleExportJSON}
              className="p-3 bg-paper-50 dark:bg-paper-850 hover:bg-paper-100 dark:hover:bg-paper-800 border border-paper-200 dark:border-paper-700 rounded-lg flex flex-col items-center justify-center gap-1.5 text-stone-800 dark:text-stone-200 transition-colors"
            >
              <Download className="w-4 h-4 text-stone-600 dark:text-stone-400" />
              <span className="text-xs font-bold">导出学习进度 JSON</span>
              <span className="text-[10px] text-stone-400">完整艾宾浩斯记忆参数</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="p-3 bg-paper-50 dark:bg-paper-850 hover:bg-paper-100 dark:hover:bg-paper-800 border border-paper-200 dark:border-paper-700 rounded-lg flex flex-col items-center justify-center gap-1.5 text-stone-800 dark:text-stone-200 transition-colors"
            >
              <FileText className="w-4 h-4 text-stone-600 dark:text-stone-400" />
              <span className="text-xs font-bold">导出真题词表 CSV</span>
              <span className="text-[10px] text-stone-400">支持 Excel / Anki 导入</span>
            </button>

            <label className="p-3 bg-paper-50 dark:bg-paper-850 hover:bg-paper-100 dark:hover:bg-paper-800 border border-dashed border-paper-300 dark:border-paper-700 rounded-lg flex flex-col items-center justify-center gap-1.5 text-stone-800 dark:text-stone-200 transition-colors cursor-pointer">
              <Upload className="w-4 h-4 text-stone-600 dark:text-stone-400" />
              <span className="text-xs font-bold">导入学习进度 JSON</span>
              <span className="text-[10px] text-stone-400">选择备份文件恢复</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportFile}
                className="hidden"
              />
            </label>
          </div>

          {importStatus && (
            <div className="p-3 bg-paper-100 dark:bg-paper-800 border border-paper-200 dark:border-paper-700 rounded-lg text-xs text-stone-800 dark:text-stone-200">
              {importStatus}
            </div>
          )}
        </div>

        <div className="pt-2 flex justify-end border-t border-paper-100 dark:border-paper-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg text-xs font-medium shadow-xs"
          >
            完成并关闭
          </button>
        </div>
      </div>
    </div>
  );
};
