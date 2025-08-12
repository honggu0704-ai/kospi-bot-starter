// src/routes/news.js
import express from 'express';
import { getNaverNews } from '../services/naverNews.js';

const router = express.Router();

// 예: GET /news?query=삼성전자&limit=10&sort=date
router.get('/', async (req, res) => {
  try {
    const { query, limit, start, sort } = req.query;
    if (!query || String(query).trim().length === 0) {
      return res.status(400).json({ error: 'query is required' });
    }
    const items = await getNaverNews({
      query: String(query),
      limit: limit ? Number(limit) : 30,
      start: start ? Number(start) : 1,
      sort: sort === 'sim' ? 'sim' : 'date'
    });
    return res.json({ items });
  } catch (err) {
    console.error('GET /news error:', err.message);
    if (String(err.message).startsWith('NAVER_API_ERROR 429')) {
      return res.status(429).json({ error: 'naver rate limit' });
    }
    return res.status(500).json({ error: 'internal_error' });
  }
});

export default router;
