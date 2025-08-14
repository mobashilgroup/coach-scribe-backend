const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

app.get('/healthz', (req, res) => {
  res.json({ ok: true });
});

app.get('/plans/list', (req, res) => {
  const plans = [
    { id: 'basic', price: 49, monthlySessions: 20, name: 'B\u00e1sico' },
    { id: 'pro', price: 99, monthlySessions: 50, name: 'Pro' },
    { id: 'premium', price: 139, monthlySessions: 100, name: 'Premium' },
  ];
  res.json({ ok: true, data: plans });
});

app.post('/device/activate', (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ ok: false, error: { code: 'invalid_code', message: 'Invalid code' }});
  }
  res.json({ ok: true, data: { activated: true } });
});

app.post('/sessions/start', (req, res) => {
  res.json({ ok: true, data: { started: true } });
});

app.post('/sessions/finish', (req, res) => {
  const { text } = req.body;
  const summary = text ? text.slice(0, 100) : '';
  res.json({ ok: true, data: { summary, topics: [], emotions: [], obstacles: [], strengths: [], recommendations: [], reflection_questions: [], markers: [] } });
});

app.get('/auth/google/start', (req, res) => {
  res.status(501).json({ ok: false, error: { code: 'not_implemented', message: 'OAuth not implemented' } });
});

app.get('/auth/google/callback', (req, res) => {
  res.status(501).json({ ok: false, error: { code: 'not_implemented', message: 'OAuth not implemented' } });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
