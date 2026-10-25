import sys
import os
import json
import re
import random
import time
import fitz  # PyMuPDF
import eng_to_ipa as ipa

# Ensure stdout is utf-8
sys.stdout.reconfigure(encoding='utf-8')

WATERMARK_STRS = [
    '南萧时刻自信冷静', '南萧极简考研', '南萧', '时刻自信冷静',
    '全网最高效率单词速刷表', '考研英语一', '考研英语二'
]

# Single characters that are part of watermark
WATERMARK_CHARS = set('南萧时刻自信冷静极简考研')

def is_watermark_span(span):
    size = span.get('size', 0)
    color = span.get('color', 0)
    text = span.get('text', '').strip()
    if size > 20 or color == 15001578:
        return True
    if any(wm in text for wm in WATERMARK_STRS):
        return True
    return False

def clean_cell_text(page, rect):
    if not rect:
        return []
    d = page.get_text('dict', clip=rect)
    lines_out = []
    for b in d.get('blocks', []):
        for line in b.get('lines', []):
            spans = []
            for s in line.get('spans', []):
                if is_watermark_span(s):
                    continue
                t = s.get('text', '')
                if t:
                    spans.append(t)
            line_text = ''.join(spans).strip()
            # If line is solely watermark characters, drop it
            if line_text and all(c in WATERMARK_CHARS for c in line_text):
                continue
            if line_text:
                lines_out.append(line_text)
    return lines_out

def parse_col4_example(lines):
    if not lines:
        return None
    source = ''
    content_lines = []
    for line in lines:
        # Check if line matches exam source pattern
        if re.search(r'\b(19\d\d|20\d\d)\s*·\s*英语', line) or re.search(r'·\s*(阅读理解|完形填空|翻译|新题型|写作)', line) or re.search(r'\b\d{4}\s*·\s*英语', line):
            source = line if not source else source + ' · ' + line
        else:
            content_lines.append(line)
            
    if not content_lines and not source:
        return None

    en_parts = []
    zh_parts = []
    for line in content_lines:
        zh_count = len(re.findall(r'[\u4e00-\u9fa5]', line))
        en_count = len(re.findall(r'[a-zA-Z]', line))
        if zh_count > en_count and zh_count >= 1:
            zh_parts.append(line)
        else:
            en_parts.append(line)

    en_sentence = ' '.join(en_parts).strip()
    zh_sentence = ''.join(zh_parts).strip()

    # Parse details from source
    year = None
    exam_type = None
    section = None
    question_num = None

    if source:
        m_year = re.search(r'\b(19\d\d|20\d\d)\b', source)
        if m_year:
            year = int(m_year.group(1))
        if '英语一' in source:
            exam_type = '英语一'
        elif '英语二' in source:
            exam_type = '英语二'
        parts = [p.strip() for p in source.split('·')]
        for p in parts:
            if any(k in p for k in ['阅读', '完形', '翻译', '写作', '新题型']):
                section = p
            elif '题' in p:
                question_num = p

    return {
        'sentence': en_sentence if en_sentence else '暂无英文例句',
        'translation': zh_sentence if zh_sentence else '暂无译文',
        'source': source if source else '考研英语真题',
        'year': year,
        'examType': exam_type,
        'section': section,
        'questionNum': question_num,
        'isAuthentic': True
    }

def parse_col3_sense(lines):
    if not lines:
        return None
    full_text = ' '.join(lines).strip()
    if not full_text:
        return None

    # Number prefix, e.g. "1. " or "12. "
    m_num = re.match(r'^(\d+)[\.、\s]+', full_text)
    num = int(m_num.group(1)) if m_num else 1
    rest = full_text[m_num.end():] if m_num else full_text

    # Frequency at end: （123） or (123)
    m_freq = re.search(r'[（(](\d+)[）)]\s*$', rest)
    freq = int(m_freq.group(1)) if m_freq else None
    if m_freq:
        rest = rest[:m_freq.start()].strip()

    # POS prefix: e.g. "modal.", "adj.", "n.", "v.", "adv.", "prep.", "conj.", "phrase."
    m_pos = re.match(r'^([a-zA-Z]+(?:\.[a-zA-Z]+)?\.)\s*', rest)
    pos = m_pos.group(1) if m_pos else ''
    definition = rest[m_pos.end():].strip() if m_pos else rest

    return {
        'num': num,
        'pos': pos,
        'definition': definition if definition else '暂无释义',
        'freq': freq
    }

def clean_word_name(w):
    if not w:
        return ''
    w = re.sub(r'[（(]续[）)]', '', w)
    w = re.sub(r'[\u4e00-\u9fa5]', '', w) # remove any residual Chinese watermark
    w = w.strip().lower()
    return w

def clean_morphology(lines):
    if not lines:
        return '暂无数据'
    cleaned = []
    for l in lines:
        l_clean = re.sub(r'[南萧时刻自信冷静极简考研]', '', l).strip()
        if l_clean:
            cleaned.append(l_clean)
    res = ' '.join(cleaned).strip()
    return res if res else '暂无数据'

def get_phonetic(word):
    try:
        clean = re.sub(r'[^a-zA-Z\-]', '', word)
        if not clean:
            return ''
        res = ipa.convert(clean)
        if '*' in res:
            res = res.replace('*', '')
        return f'/{res}/' if res else ''
    except Exception:
        return ''

def parse_pdf(pdf_path, exam_code):
    print(f'=== Starting parsing for {exam_code}: {pdf_path} ===')
    t0 = time.time()
    doc = fitz.open(pdf_path)
    total_pages = len(doc)
    print(f'Total pages in document: {total_pages}')

    words_list = []
    word_map = {} # word -> WordEntry
    current_word_entry = None
    pending_checks = []
    failed_rows = 0
    total_rows = 0

    # Start from page 1 (skip cover/preface on page 0)
    for p_idx in range(1, total_pages):
        page = doc[p_idx]
        tab_finder = page.find_tables()
        if not tab_finder.tables:
            continue
        
        table = tab_finder.tables[0]
        # Check header
        rows = table.rows
        if not rows:
            continue
            
        for r_idx, r in enumerate(rows):
            # Check if this row is the header
            if r_idx == 0:
                # verify header
                first_cell_lines = clean_cell_text(page, r.cells[0])
                first_text = ''.join(first_cell_lines)
                if '单词' in first_text or 'Word' in first_text:
                    continue # skip header

            total_rows += 1
            w_lines = clean_cell_text(page, r.cells[0]) if len(r.cells) > 0 else []
            f_lines = clean_cell_text(page, r.cells[1]) if len(r.cells) > 1 else []
            m_lines = clean_cell_text(page, r.cells[2]) if len(r.cells) > 2 else []
            s_lines = clean_cell_text(page, r.cells[3]) if len(r.cells) > 3 else []
            e_lines = clean_cell_text(page, r.cells[4]) if len(r.cells) > 4 else []

            raw_word = ' '.join(w_lines).strip()
            word_str = clean_word_name(raw_word)

            raw_freq = ' '.join(f_lines).strip()
            freq_num = None
            if raw_freq:
                m = re.search(r'\d+', raw_freq)
                if m:
                    freq_num = int(m.group(0))

            morph_str = clean_morphology(m_lines)
            sense_data = parse_col3_sense(s_lines)
            example_data = parse_col4_example(e_lines)

            # Check if this is a new word or continuation
            is_new_word = bool(word_str and (current_word_entry is None or word_str != current_word_entry['word']))

            if is_new_word:
                # Create new word entry
                entry_id = f'{exam_code}-{word_str}'
                phonetic = get_phonetic(word_str)
                current_word_entry = {
                    'id': entry_id,
                    'word': word_str,
                    'phonetic': phonetic,
                    'totalFreq': freq_num if freq_num is not None else 0,
                    'morphology': morph_str,
                    'senses': [],
                    'examSource': exam_code,
                    'page': p_idx + 1
                }
                words_list.append(current_word_entry)
                word_map[word_str] = current_word_entry
            elif current_word_entry is not None:
                # Continuing current word
                if morph_str != '暂无数据' and current_word_entry['morphology'] == '暂无数据':
                    current_word_entry['morphology'] = morph_str
                if freq_num is not None and current_word_entry['totalFreq'] == 0:
                    current_word_entry['totalFreq'] = freq_num

            # Add sense and example to current word
            if current_word_entry is not None and sense_data is not None:
                sense_id = f"{current_word_entry['id']}-s{len(current_word_entry['senses']) + 1}"
                examples = []
                if example_data:
                    example_data['id'] = f"{sense_id}-ex1"
                    examples.append(example_data)

                current_word_entry['senses'].append({
                    'id': sense_id,
                    'num': sense_data['num'],
                    'pos': sense_data['pos'],
                    'definition': sense_data['definition'],
                    'freq': sense_data['freq'],
                    'examples': examples
                })
            elif current_word_entry is not None and example_data is not None and current_word_entry['senses']:
                # Example for existing sense
                last_sense = current_word_entry['senses'][-1]
                example_data['id'] = f"{last_sense['id']}-ex{len(last_sense['examples']) + 1}"
                last_sense['examples'].append(example_data)
            else:
                if not is_new_word and not word_str and not s_lines and not e_lines:
                    # Empty row
                    pass
                else:
                    failed_rows += 1
                    pending_checks.append({
                        'page': p_idx + 1,
                        'word': word_str or (current_word_entry['word'] if current_word_entry else 'UNKNOWN'),
                        'raw_word': raw_word,
                        's_lines': s_lines,
                        'e_lines': e_lines
                    })

        if (p_idx + 1) % 100 == 0 or p_idx + 1 == total_pages:
            print(f'Processed {p_idx+1}/{total_pages} pages ({len(words_list)} words extracted)...')

    total_senses = sum(len(w['senses']) for w in words_list)
    total_examples = sum(sum(len(s['examples']) for s in w['senses']) for w in words_list)
    elapsed = time.time() - t0

    print(f'=== Completed {exam_code} in {elapsed:.2f}s ===')
    print(f'Total words: {len(words_list)}')
    print(f'Total senses: {total_senses}')
    print(f'Total authentic examples: {total_examples}')
    print(f'Total rows processed: {total_rows}, Failed/anomalous rows: {failed_rows}')

    return {
        'words': words_list,
        'stats': {
            'examCode': exam_code,
            'totalPages': total_pages,
            'totalWords': len(words_list),
            'totalSenses': total_senses,
            'totalExamples': total_examples,
            'totalRows': total_rows,
            'failedRows': failed_rows,
            'elapsedSeconds': round(elapsed, 2)
        },
        'pendingChecks': pending_checks[:30] # sample of any anomalies
    }

def main():
    os.makedirs('public/data', exist_ok=True)

    pdf1_path = '英语一_纯净版单词大观（带真题例句和构词）_b站up主南萧时刻自信冷静.pdf'
    pdf2_path = '英语二_纯净版单词大观（带真题例句和构词）_b站up主南萧时刻自信冷静.pdf'

    res1 = parse_pdf(pdf1_path, 'e1')
    with open('public/data/english1.json', 'w', encoding='utf-8') as f:
        json.dump(res1['words'], f, ensure_ascii=False, indent=2)

    res2 = parse_pdf(pdf2_path, 'e2')
    with open('public/data/english2.json', 'w', encoding='utf-8') as f:
        json.dump(res2['words'], f, ensure_ascii=False, indent=2)

    # Random sampling for manual verification
    sample_e1 = random.sample(res1['words'], min(5, len(res1['words'])))
    sample_e2 = random.sample(res2['words'], min(5, len(res2['words'])))

    report = {
        'generatedAt': time.strftime('%Y-%m-%d %H:%M:%S'),
        'english1': res1['stats'],
        'english2': res2['stats'],
        'sampleVerification': {
            'english1': sample_e1,
            'english2': sample_e2
        },
        'pendingChecksE1': res1['pendingChecks'],
        'pendingChecksE2': res2['pendingChecks']
    }

    with open('public/data/import_report.json', 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print('\nSuccessfully exported public/data/english1.json, english2.json, import_report.json!')

if __name__ == '__main__':
    main()
