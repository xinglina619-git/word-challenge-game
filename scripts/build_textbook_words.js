const fs = require('fs');
const path = require('path');

const books = [
  { grade: 1, term: '上册', publisher: '广州出版社', url: 'https://yyld.51jiaoxi.com/yishang/gzb_danci.html' },
  { grade: 1, term: '下册', publisher: '广州出版社', url: 'https://yyld.51jiaoxi.com/yixia/gzb_danci.html' },
  { grade: 2, term: '上册', publisher: '广州出版社', url: 'https://yyld.51jiaoxi.com/ershang/gzb_danci.html' },
  { grade: 2, term: '下册', publisher: '广州出版社', url: 'https://yyld.51jiaoxi.com/erxia/gzb_danci.html' },
  { grade: 3, term: '上册', publisher: '教育科学出版社', url: 'https://yyld.51jiaoxi.com/sanshang/gzjkb_danci.html' },
  { grade: 3, term: '下册', publisher: '教育科学出版社', url: 'https://yyld.51jiaoxi.com/sanxia/gzjkb_danci.html' },
  { grade: 5, term: '上册', publisher: '教育科学出版社', url: 'https://yyld.51jiaoxi.com/wushang/gzjkb_danci.html' },
  { grade: 5, term: '下册', publisher: '教育科学出版社', url: 'https://yyld.51jiaoxi.com/wuxia/gzjkb_danci.html' }
];

function decode(raw) {
  try { return JSON.parse(`"${raw}"`); } catch { return raw.replaceAll('\\u002F', '/'); }
}

function decodeHtml(raw) {
  return raw
    .replace(/<[^>]+>/g, '')
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .trim();
}

function extract(html, source) {
  const words = [];
  const renderedPattern = /<p class="en"[^>]*>([\s\S]*?)<\/p>[\s\S]*?<p class="cn"[^>]*>翻译：([\s\S]*?)<\/p>/g;
  for (const match of html.matchAll(renderedPattern)) {
    const word = decodeHtml(match[1]);
    const zh = decodeHtml(match[2]);
    if (!word || !zh || word.length > 70 || zh.length > 80) continue;
    words.push({ word, zh, source });
  }
  if (words.length) return words;

  const statePattern = /word:"((?:\\.|[^"])*)",chinese:"((?:\\.|[^"])*)"/g;
  for (const match of html.matchAll(statePattern)) {
    const word = decode(match[1]).trim();
    const zh = decode(match[2]).trim();
    if (!word || !zh || word.length > 70 || zh.length > 80) continue;
    words.push({ word, zh, source });
  }
  return words;
}

async function main() {
  const grades = { 1: [], 2: [], 3: [], 5: [] };
  const sources = [];
  for (const book of books) {
    const response = await fetch(book.url);
    if (!response.ok) throw new Error(`${book.grade}年级${book.term}下载失败：${response.status}`);
    const html = await response.text();
    const extracted = extract(html, `${book.grade}年级${book.term}`);
    if (extracted.length < 10) throw new Error(`${book.grade}年级${book.term}解析结果异常：${extracted.length}`);
    grades[book.grade].push(...extracted);
    sources.push({ ...book, count: extracted.length });
  }

  for (const grade of Object.keys(grades)) {
    const seen = new Set();
    grades[grade] = grades[grade].filter(item => {
      const key = item.word.toLocaleLowerCase('en-US');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    note: '广州一二年级英语口语＋广州教科版三、五年级，上下册合并并按首次出现顺序去重。',
    sources,
    grades
  };
  const output = `// 由 scripts/build_textbook_words.js 生成；游戏运行时离线使用。\nwindow.TEXTBOOK_WORDS = ${JSON.stringify(payload, null, 2)};\n`;
  fs.writeFileSync(path.join(__dirname, '..', 'textbook-words.generated.js'), output, 'utf8');
  console.log(Object.fromEntries(Object.entries(grades).map(([grade, items]) => [grade, items.length])));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
