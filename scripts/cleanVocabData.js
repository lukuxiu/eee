import fs from 'fs';

const CJK_CLASS = '[\\u4e00-\\u9fa5，。；：、！？《》【】（）“”‘’]';
const CJK_SPACE_RE = new RegExp(`(${CJK_CLASS})\\s+(${CJK_CLASS})`, 'g');

function cleanText(str) {
  if (!str || typeof str !== 'string') return str;
  let s = str.trim();
  for (let i = 0; i < 4; i++) {
    const next = s.replace(CJK_SPACE_RE, '$1$2');
    if (next === s) break;
    s = next;
  }
  s = s.replace(/（\s+/g, '（').replace(/\s+）/g, '）');
  s = s.replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');
  s = s.replace(/Secretar\s+y/g, 'Secretary');
  s = s.replace(/\s{2,}/g, ' ');
  return s.trim();
}

function cleanFile(filePath) {
  const words = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let fixedFreqCount = 0;
  let cleanedDefCount = 0;
  let mergedExactDupCount = 0;

  for (const w of words) {
    if (w.morphology && w.morphology !== '暂无数据') {
      w.morphology = cleanText(w.morphology);
    }

    const processedSenses = [];
    const seenMap = new Map();

    for (const s of w.senses) {
      const origDef = s.definition || '';
      let def = cleanText(origDef);
      let freq = s.freq;

      // Extract embedded trailing frequency like "商业；商务（33）" when freq is missing
      const m = def.match(/[（(](\d+)[）)]\s*$/);
      if (m && (freq === null || freq === undefined)) {
        freq = Number(m[1]);
        def = def.replace(/[（(]\d+[）)]\s*$/, '').trim();
        fixedFreqCount++;
      }

      if (def !== origDef) {
        cleanedDefCount++;
      }

      // Clean translations in examples too
      const examples = (s.examples || []).map((ex) => ({
        ...ex,
        translation: cleanText(ex.translation || ''),
      }));

      const pos = (s.pos || '').trim();
      const dedupKey = `${pos.toLowerCase()}|${def.replace(/\s+/g, '')}`;

      if (seenMap.has(dedupKey)) {
        const existing = seenMap.get(dedupKey);
        existing.freq = (existing.freq || 0) + (freq || 0) || undefined;
        const existingExSet = new Set((existing.examples || []).map((e) => e.sentence));
        for (const ex of examples) {
          if (!existingExSet.has(ex.sentence)) {
            existing.examples.push(ex);
            existingExSet.add(ex.sentence);
          }
        }
        mergedExactDupCount++;
      } else {
        const cleanedSense = {
          ...s,
          pos,
          definition: def,
          examples,
        };
        if (freq !== null && freq !== undefined) {
          cleanedSense.freq = freq;
        } else {
          delete cleanedSense.freq;
        }
        seenMap.set(dedupKey, cleanedSense);
        processedSenses.push(cleanedSense);
      }
    }

    // Sort senses by freq descending (keeping original order for ties)
    processedSenses.sort((a, b) => (b.freq || 0) - (a.freq || 0));
    processedSenses.forEach((s, idx) => {
      s.num = idx + 1;
    });
    w.senses = processedSenses;
  }

  fs.writeFileSync(filePath, JSON.stringify(words, null, 2), 'utf8');
  console.log(`${filePath}:`, {
    totalWords: words.length,
    fixedFreqCount,
    cleanedDefCount,
    mergedExactDupCount,
  });
}

cleanFile('public/data/english1.json');
cleanFile('public/data/english2.json');
