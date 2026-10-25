import sys
import os
import re
import json
import time
import urllib.request
import concurrent.futures
from bs4 import BeautifulSoup
import eng_to_ipa as ipa

sys.stdout.reconfigure(encoding='utf-8')

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

def fetch_word_detail(word_item):
    w = word_item['word']
    url = f'https://english-exam.lazynote.cn/kaoyan/words/{w}/'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            content = resp.read().decode('utf-8', errors='ignore')
            return w, content, None
    except Exception as e:
        return w, None, str(e)

def parse_detail_html(word_item, html):
    w = word_item['word']
    soup = BeautifulSoup(html, 'html.parser')

    # 1. CEFR Level
    cefr = None
    cefr_el = soup.find(class_=lambda c: c and 'cefr' in c)
    if cefr_el:
        m = re.search(r'CEFR\s*([A-C][1-2])', cefr_el.get_text(), re.I)
        if m:
            cefr = m.group(1).upper()

    # 2. Check exam distribution (FAQ or sentence badges)
    e1_count = 0
    e2_count = 0
    faq_script = soup.find('script', type='application/ld+json')
    if faq_script and faq_script.string:
        try:
            faq_json = json.loads(faq_script.string)
            if 'mainEntity' in faq_json:
                for q in faq_json['mainEntity']:
                    txt = q.get('acceptedAnswer', {}).get('text', '')
                    m1 = re.search(r'英语一\s*(\d+)\s*句', txt)
                    m2 = re.search(r'英语二\s*(\d+)\s*句', txt)
                    if m1: e1_count = int(m1.group(1))
                    if m2: e2_count = int(m2.group(1))
        except Exception:
            pass

    # 3. Parse authentic sentence cards
    cards = soup.find_all(class_=lambda c: c and 'sentence-card' in c)
    sentences_e1 = []
    sentences_e2 = []
    all_sentences = []

    for c in cards:
        year_el = c.find(class_=lambda x: x and 'year' in x)
        badge_el = c.find(class_=lambda x: x and 'badge' in x)
        mod_el = c.find(class_=lambda x: x and 'module' in x)
        pos_el = c.find(class_=lambda x: x and 'position' in x)

        year_str = year_el.get_text(strip=True) if year_el else ''
        year = int(year_str) if year_str.isdigit() else None
        badge_str = badge_el.get_text(strip=True) if badge_el else ''
        mod_str = mod_el.get_text(strip=True) if mod_el else ''
        pos_str = pos_el.get_text(strip=True) if pos_el else ''

        text_p = c.find('p', class_=lambda x: x and 'sentence-card__text' in x)
        zh_p = c.find('p', class_=lambda x: x and 'sentence-card__translation' in x)

        if not text_p or not zh_p:
            continue

        en_text = re.sub(r'\s+', ' ', text_p.get_text(' ', strip=True)).strip()
        zh_text = zh_p.get_text(strip=True)

        source_parts = [p for p in [year_str, badge_str, mod_str, pos_str] if p]
        source_str = ' · '.join(source_parts) if source_parts else '考研英语真题'

        item = {
            'sentence': en_text,
            'translation': zh_text,
            'source': source_str,
            'year': year,
            'examType': badge_str if badge_str in ['英语一', '英语二'] else None,
            'section': mod_str,
            'questionNum': pos_str,
            'isAuthentic': True
        }

        all_sentences.append(item)
        if '英语一' in badge_str:
            sentences_e1.append(item)
        elif '英语二' in badge_str:
            sentences_e2.append(item)

    # 4. Parse senses from definition text
    # defs example: "n. 作者；作家； 创始人；发起者 | v. 撰写；创作"
    defs_text = word_item.get('defs', '')
    raw_senses = [s.strip() for s in defs_text.split('|') if s.strip()]
    senses = []

    for s_idx, s in enumerate(raw_senses):
        m_pos = re.match(r'^([a-zA-Z]+(?:\.[a-zA-Z]+)?\.)\s*', s)
        pos = m_pos.group(1) if m_pos else ''
        definition = s[m_pos.end():].strip() if m_pos else s
        
        # Attach authentic examples to first sense, or distribute
        exs = all_sentences[:3] if s_idx == 0 else []

        senses.append({
            'id': f"{w}-s{s_idx + 1}",
            'num': s_idx + 1,
            'pos': pos,
            'definition': definition,
            'freq': word_item.get('freq'),
            'examples': exs
        })

    if not senses:
        senses.append({
            'id': f"{w}-s1",
            'num': 1,
            'pos': '',
            'definition': defs_text or '考研核心真题词汇',
            'freq': word_item.get('freq'),
            'examples': all_sentences[:3]
        })

    # Determine classification: e1, e2, or both
    belongs_e1 = (e1_count > 0) or len(sentences_e1) > 0
    belongs_e2 = (e2_count > 0) or len(sentences_e2) > 0
    if not belongs_e1 and not belongs_e2:
        # Default high frequency words appear in both
        belongs_e1 = True
        belongs_e2 = True

    return {
        'word': w,
        'phonetic': get_phonetic(w),
        'rank': word_item.get('rank'),
        'totalFreq': word_item.get('freq', 10),
        'cefr': cefr,
        'senses': senses,
        'belongs_e1': belongs_e1,
        'belongs_e2': belongs_e2,
        'sentences_e1': sentences_e1,
        'sentences_e2': sentences_e2,
        'all_sentences': all_sentences
    }

def main():
    print('Loading datasets...')
    with open('public/data/english1.json', encoding='utf-8') as f:
        e1_list = json.load(f)
    with open('public/data/english2.json', encoding='utf-8') as f:
        e2_list = json.load(f)
    with open('lazynote_1199.json', encoding='utf-8') as f:
        ln_list = [x for x in json.load(f) if x['rank'] is not None]

    e1_words = {w['word']: w for w in e1_list}
    e2_words = {w['word']: w for w in e2_list}
    all_existing = set(list(e1_words.keys()) + list(e2_words.keys()))

    missing_items = [x for x in ln_list if x['word'] not in all_existing]
    print(f'Total LazyNote 1199 words: {len(ln_list)}')
    print(f'Already in database: {len(ln_list) - len(missing_items)}')
    print(f'Missing words to fetch & supplement: {len(missing_items)}')

    # 1. Fetch missing words in parallel
    print('Fetching detail pages for missing words...')
    t0 = time.time()
    fetched_data = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        future_map = {executor.submit(fetch_word_detail, item): item for item in missing_items}
        for future in concurrent.futures.as_completed(future_map):
            item = future_map[future]
            w, html, err = future.result()
            if html:
                fetched_data[w] = parse_detail_html(item, html)
            else:
                print(f'Failed to fetch {w}: {err}')
                # Fallback parsed from item directly
                fetched_data[w] = {
                    'word': w,
                    'phonetic': get_phonetic(w),
                    'rank': item.get('rank'),
                    'totalFreq': item.get('freq', 10),
                    'cefr': 'B2',
                    'senses': [{
                        'id': f'{w}-s1',
                        'num': 1,
                        'pos': '',
                        'definition': item.get('defs', '考研核心真题词汇'),
                        'freq': item.get('freq', 10),
                        'examples': []
                    }],
                    'belongs_e1': True,
                    'belongs_e2': True,
                    'sentences_e1': [],
                    'sentences_e2': [],
                    'all_sentences': []
                }

    print(f'Fetched {len(fetched_data)} words in {time.time()-t0:.2f}s.')

    # 2. Enrich existing words with 1199 rank & CEFR
    ln_map = {x['word']: x for x in ln_list}
    for w_entry in e1_list:
        if w_entry['word'] in ln_map:
            ln_info = ln_map[w_entry['word']]
            w_entry['kaoyanRank'] = ln_info['rank']
            w_entry['isHighFreq1199'] = True

    for w_entry in e2_list:
        if w_entry['word'] in ln_map:
            ln_info = ln_map[w_entry['word']]
            w_entry['kaoyanRank'] = ln_info['rank']
            w_entry['isHighFreq1199'] = True

    # 3. Add missing words to e1 and/or e2
    added_to_e1 = 0
    added_to_e2 = 0

    for w, parsed in fetched_data.items():
        if parsed['belongs_e1']:
            e1_senses = []
            for s in parsed['senses']:
                s_copy = dict(s)
                s_copy['id'] = f"e1-{w}-s{s['num']}"
                # Use e1 sentences if available
                if parsed['sentences_e1']:
                    s_copy['examples'] = parsed['sentences_e1'][:2]
                elif parsed['all_sentences']:
                    s_copy['examples'] = parsed['all_sentences'][:2]
                e1_senses.append(s_copy)

            e1_entry = {
                'id': f'e1-{w}',
                'word': w,
                'phonetic': parsed['phonetic'],
                'totalFreq': parsed['totalFreq'],
                'morphology': '暂无数据',
                'senses': e1_senses,
                'examSource': 'e1',
                'page': 1,
                'kaoyanRank': parsed['rank'],
                'cefr': parsed['cefr'],
                'isHighFreq1199': True
            }
            e1_list.append(e1_entry)
            added_to_e1 += 1

        if parsed['belongs_e2']:
            e2_senses = []
            for s in parsed['senses']:
                s_copy = dict(s)
                s_copy['id'] = f"e2-{w}-s{s['num']}"
                if parsed['sentences_e2']:
                    s_copy['examples'] = parsed['sentences_e2'][:2]
                elif parsed['all_sentences']:
                    s_copy['examples'] = parsed['all_sentences'][:2]
                e2_senses.append(s_copy)

            e2_entry = {
                'id': f'e2-{w}',
                'word': w,
                'phonetic': parsed['phonetic'],
                'totalFreq': parsed['totalFreq'],
                'morphology': '暂无数据',
                'senses': e2_senses,
                'examSource': 'e2',
                'page': 1,
                'kaoyanRank': parsed['rank'],
                'cefr': parsed['cefr'],
                'isHighFreq1199': True
            }
            e2_list.append(e2_entry)
            added_to_e2 += 1

    print(f'Added {added_to_e1} words to English 1.')
    print(f'Added {added_to_e2} words to English 2.')
    print(f'New English 1 total: {len(e1_list)} words.')
    print(f'New English 2 total: {len(e2_list)} words.')

    # 4. Save updated datasets
    with open('public/data/english1.json', 'w', encoding='utf-8') as f:
        json.dump(e1_list, f, ensure_ascii=False, indent=2)

    with open('public/data/english2.json', 'w', encoding='utf-8') as f:
        json.dump(e2_list, f, ensure_ascii=False, indent=2)

    report = {
        'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
        'total1199': len(ln_list),
        'missingAddedTotal': len(missing_items),
        'addedToE1': added_to_e1,
        'addedToE2': added_to_e2,
        'e1TotalWords': len(e1_list),
        'e2TotalWords': len(e2_list),
        'sampleSupplemented': list(fetched_data.values())[:5]
    }

    with open('public/data/lazynote_1199_report.json', 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print('Successfully saved english1.json, english2.json, and lazynote_1199_report.json!')

if __name__ == '__main__':
    main()
