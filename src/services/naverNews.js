// src/services/naverNews.js
export async function getNaverNews({ query, limit = 30, start = 1, sort = 'date' }) {
  if (!process.env.NAVER_CLIENT_ID || !process.env.NAVER_CLIENT_SECRET) {
    throw new Error('NAVER_KEYS_MISSING');
  }

  const url = new URL('https://openapi.naver.com/v1/search/news.json');
  url.searchParams.set('query', query);
  url.searchParams.set('display', Math.min(limit, 100));    // 1~100
  url.searchParams.set('start', Math.min(start, 1000));     // 1~1000
  url.searchParams.set('sort', sort);                       // sim | date

  const res = await fetch(url, {
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
  const stripB = (s = '') => s.replace(/<\/?b>/g, '');

  return (data.items || []).map(it => ({
    type: 'NEWS',
    title: stripB(it.title),
    summary: stripB(it.description || ''),
    url: it.originallink || it.link,  // 원문 우선
    source_url: it.link,              // 네이버 중계 링크
    published_at: new Date(it.pubDate).toISOString()
  }));
}
