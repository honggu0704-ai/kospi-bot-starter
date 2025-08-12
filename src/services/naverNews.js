// src/services/naverNews.js  (CommonJS 버전)
const NAVER_NEWS_URL = 'https://openapi.naver.com/v1/search/news.json';

// Node 18+면 전역 fetch가 있습니다. (Node 16이면 node-fetch 설치 필요)
const fetchFn = global.fetch || (() => { throw new Error('fetch not available'); });

function stripB(s = '') {
  return s.replace(/<\/?b>/g, '');
}

async function getNaverNews({ query, limit = 30, start = 1, sort = 'date' }) {
  if (!process.env.NAVER_CLIENT_ID || !process.env.NAVER_CLIENT_SECRET) {
    throw new Error('NAVER_KEYS_MISSING');
  }

  const url = new URL(NAVER_NEWS_URL);
  url.searchParams.set('query', query);
  url.searchParams.set('display', Math.min(limit, 100)); // 1~100
  url.searchParams.set('start', Math.min(start, 1000));  // 1~1000
  url.searchParams.set('sort', sort);                    // sim | date

  const res = await fetchFn(url, {
    headers: {
      'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID,
      'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET,
      'Accept': 'application/json'
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`NAVER_API_ERROR ${res.status}: ${text}`);
  }

  const data = await res.json();

  return (data.items || []).map(it => ({
    type: 'NEWS',
    title: stripB(it.title),
    summary: stripB(it.description || ''),
    url: it.originallink || it.link,
    source_url: it.link,
    published_at: new Date(it.pubDate).toISOString()
  }));
}

module.exports = { getNaverNews };

