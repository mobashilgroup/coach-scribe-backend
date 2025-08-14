/*
 * Extended backend for The Coach Scribe.
 *
 * This implementation builds upon the original Express server by adding
 * realistic logic for device activation, session management and logout.
 * It uses simple in-memory stores to keep track of activated devices and
 * running sessions. In a production environment you would replace these
 * with calls to a database or other persistent storage.
 */

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// Basic in-memory stores for demo purposes
const validTokens = new Map([
  // token -> planId
  ['TOKEN123', 'basic'],
  ['TOKEN456', 'pro'],
  ['TOKEN789', 'premium'],
]);
// Activated devices keyed by session ID; stores plan and remaining sessions
const activatedDevices = {};
// Running sessions keyed by a generated sessionId
const runningSessions = {};

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: false,
  }),
);

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    function (accessToken, refreshToken, profile, done) {
      return done(null, profile);
    },
  ),
);

passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((obj, done) => {
  done(null, obj);
});

// Enable CORS for frontend URL
app.use(
  cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
  }),
);

app.use(express.json());

// Health check
app.get('/healthz', (req, res) => {
  res.json({ ok: true });
});

// Plans list endpoint
app.get('/plans/list', (req, res) => {
  const plans = [
    { id: 'basic', price: 49, monthlySessions: 20, name: 'Básico' },
    { id: 'pro', price: 99, monthlySessions: 50, name: 'Pro' },
    { id: 'premium', price: 139, monthlySessions: 100, name: 'Premium' },
  ];
  res.json({ ok: true, data: plans });
});

// Device activation endpoint
app.post('/device/activate', (req, res) => {
  const { code } = req.body || {};
  if (!code) {
    return res.status(400).json({ ok: false, error: { code: 'missing_code', message: 'No activation code supplied' } });
  }
  const planId = validTokens.get(code.toUpperCase());
  if (!planId) {
    return res.status(400).json({ ok: false, error: { code: 'invalid_token', message: 'Invalid activation code' } });
  }
  // Derive number of monthly sessions from plan
  const planMap = { basic: 20, pro: 50, premium: 100 };
  const remainingSessions = planMap[planId] || 0;
  // Use session ID to persist activation per user
  const sid = req.sessionID;
  activatedDevices[sid] = { plan: planId, sessionsRemaining: remainingSessions };
  return res.json({ ok: true, data: activatedDevices[sid] });
});

// Session start endpoint
app.post('/sessions/start', (req, res) => {
  const sid = req.sessionID;
  const device = activatedDevices[sid];
  if (!device) {
    return res.status(401).json({ ok: false, error: { code: 'not_activated', message: 'Device not activated' } });
  }
  if (device.sessionsRemaining <= 0) {
    return res.status(403).json({ ok: false, error: { code: 'no_sessions', message: 'No sessions remaining' } });
  }
  // Create a simple session record
  const sessionId = `sess_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  runningSessions[sessionId] = { start: new Date(), finished: false };
  // Decrease remaining sessions immediately
  device.sessionsRemaining -= 1;
  return res.json({ ok: true, data: { sessionId, sessionsRemaining: device.sessionsRemaining } });
});

// Session finish endpoint
app.post('/sessions/finish', (req, res) => {
  const { sessionId, summary } = req.body || {};
  if (!sessionId || !runningSessions[sessionId]) {
    return res.status(400).json({ ok: false, error: { code: 'invalid_session', message: 'Unknown session' } });
  }
  runningSessions[sessionId].finished = true;
  runningSessions[sessionId].summary = summary || 'Sesión finalizada';
  return res.json({ ok: true, data: { summary: runningSessions[sessionId].summary } });
});

// Google OAuth start
app.get(
  '/auth/google/start',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account',
  }),
);

// Google OAuth callback
app.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/failure' }),
  (req, res) => {
    // Redirect to frontend after successful login
    res.redirect(process.env.FRONTEND_URL);
  },
);

// OAuth failure route
app.get('/auth/failure', (req, res) => {
  res.status(401).json({ ok: false, error: { code: 'oauth_failure', message: 'OAuth failure' } });
});

// Logout route
app.get('/auth/logout', (req, res) => {
  req.logout(() => {
    // Clear local activation and running sessions for this session ID
    delete activatedDevices[req.sessionID];
    res.redirect(process.env.FRONTEND_URL);
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
