/* eslint-disable no-console */
const express = require('express');
const { DateTime } = require('luxon');
const qs = require('qs');

const app = express();
const PORT = process.env.PORT || 3000;

const KST = 'Asia/Seoul';
const DART_LIST_URL = 'https://opendart.fss.or.kr/api/list.json';
const NAVER_NEWS_URL = 'https://openapi.naver.com/v1/search/news.json';

function kstWindow(sinceISO) {
  const nowKST = DateTime.now().setZone(KST);
  const start = sinceISO
    ? DateTime.fromISO(String(sinceISO), { setZone: true }).setZone(KST)
    : nowKST.minus({ hours: 48 });
  const end = nowKST.plus({ hours: 12 });
  return {
    startISO: start.toISO(),
    endISO: end.toISO(),
    bgn_de: start.toFormat('yyyyLLdd'),
    end_de: end.toFormat('yyyyLLdd'),
  };
}

async function fetchDartList({ bgn_de, end_de, page_count = 100 }) {
  const url = `${DART_LIST_URL}?${qs.stringify({
    crtfc_key: process.env.DART_API_KEY,
    bgn_de,
    end_de,
    corp_cls: 'Y',        // KOSPI only
    sort: 'date',
    sort_mth: 'desc',
    page_no: 1,
    page_count,
  })}`;

  const res = await fetch(url);
  const json = await res.json().catch(() => ({}));

  // Log a small diagnostic line
  console.log(JSON.stringify({
    at: 'dart.fetch',
    status: res.status,
    url,
    items: Array.isArray(json.list) ? json.list.length : 0,
    message: json.message || null,
    statusCode: json.status || null
  }));

  const list = Array.isArray(json.list) ? json.list : [];

  return list.map((it) => {
    const date = it.rcept_dt; // 'yyyyMMdd'
    // Use 09:00 KST as an approximate publish time for filings (date only in API)
    const publishedISO = DateTime.fromFormat(String(date) + ' 09:00', 'yyyyLLdd HH:mm', { zone: KST }).toISO();

    return {
      type: 'DART',
      symbol: it.stock_code || null,
      title: it.report_nm,
      url: `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${it.rcept_no}`,
      published_at: publishedISO,
      tags: [it.corp_name, it.corp_cls].filter(Boolean),
      score: 1
    };
  });
}

async function fetchNaverNewsByKeywords(keywords) {
  const id = process.env.NAVER_CLIENT_ID;
  const secret = process.env.NAVER_CLIENT_SECRET;
  if (!id || !secret) {
    // If not configured, skip news quietly
    console.log(JSON.stringify({ at: 'naver.skip', reason: 'no-credentials' }));
    return [];
  }
  const headers = {
    'X-Naver-Client-Id': id,
    'X-Naver-Client-Secret': secret,
  };
  const results = [];
  for (const kw of keywords) {
    const u = `${NAVER_NEWS_URL}?${qs.stringify({
      query: kw,
      display: 50,
      start: 1,
      sort: 'date'
    })}`;

    const res = await fetch(u, { headers });
    const json = await res.json().catch(() => ({}));
    const items = Array.isArray(json.items) ? json.items : [];

    console.log(JSON.stringify({
      at: 'naver.fetch',
      status: res.status,
      url: u,
      items: items.length
    }));

    for (const n of items) {
      // pubDate like "Sun, 11 Aug 2025 12:34:56 +0900"
      let publishedISO;
      try {
        publishedISO = DateTime.fromHTTP(n.pubDate, { zone: KST }).toISO();
      } catch {
        publishedISO = null;
      }
      results.push({
        type: 'NEWS',
        symbol: null,
        title: (n.title || '').replace(/<[^>]+>/g, ''),
        url: n.link || n.originallink,
        published_at: publishedISO,
        tags: [],
        score: 0.5
      });
    }
  }
  return results;
}

// Health
app.get('/healthz', (req, res) => {
  res.json({ ok: true, tz: process.env.TZ || 'UTC' });
});

// Updates
app.get('/updates', async (req, res) => {
  try {
    // Auth
    const incomingKey = req.get('X-API-Key');
    const expected = process.env.BOT_API_KEY || process.env.API_KEY;
    if (!incomingKey || incomingKey !== expected) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const since = req.query.since;
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 200);
    const symbolsQ = (req.query.symbols || '').toString().trim();
    const market = (req.query.market || 'KOSPI').toString();

    const range = kstWindow(since);

    // DART
    const dartItems = await fetchDartList({ bgn_de: range.bgn_de, end_de: range.end_de, page_count: 100 });

    // NEWS (basic keywords if no symbols provided)
    const keywords = symbolsQ
      ? symbolsQ.split(',').map(s => s.trim()).filter(Boolean).slice(0, 5)
      : ['코스피', '유가증권', '공시'];
    const newsItems = await fetchNaverNewsByKeywords(keywords);

    // Merge & sort
    const all = [...dartItems, ...newsItems].filter(Boolean);
    all.sort((a, b) => {
      const av = a.published_at || '';
      const bv = b.published_at || '';
      return bv.localeCompare(av);
    });

    const items = all.slice(0, limit);

    // If zero, don't claim "none" — hint possible provider delay
    if (items.length === 0) {
      console.log(JSON.stringify({ at: 'updates.zero', hint: 'provider-delay-or-empty-window', range }));
    }

    res.json({ items });
  } catch (err) {
    console.error('GET /updates error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
