import re
import json
from bs4 import BeautifulSoup

with open('lazynote_page.html', encoding='utf-8', errors='ignore') as f:
    html = f.read()

soup = BeautifulSoup(html, 'html.parser')
title = soup.title.string if soup.title else 'No title'
print('Title:', title)

# Look for script tags with JSON
script_tags = soup.find_all('script')
print(f'Total script tags: {len(script_tags)}')
for idx, s in enumerate(script_tags):
    if s.string:
        if '1199' in s.string or 'words' in s.string or 'frequency' in s.string:
            print(f'Script {idx} length: {len(s.string)}, preview: {s.string[:150]!r}')

# Look for links, tables, list items
tables = soup.find_all('table')
print(f'Tables found: {len(tables)}')
if tables:
    for t in tables[:2]:
        rows = t.find_all('tr')
        print(f'Table rows: {len(rows)}')
        for r in rows[:3]:
            print('  Row text:', [td.get_text(strip=True) for td in r.find_all(['th', 'td'])])

# Check for cards, list items or links to words
links = soup.find_all('a')
print(f'Total links: {len(links)}')
word_links = [a for a in links if '/kaoyan/words/' in a.get('href', '')]
print(f'Word links count: {len(word_links)}')
for a in word_links[:10]:
    print('  Word link:', a.get('href'), a.get_text(strip=True))
