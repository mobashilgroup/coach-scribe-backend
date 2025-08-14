const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false
}));

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
  },
  function(accessToken, refreshToken, profile, done) {
    return done(null, profile);
  }
));

passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((obj, done) => {
  done(null, obj);
});

// Enable CORS for frontend URL
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

app.use(express.json());

// Health check
app.get('/healthz', (req, res) => {
  res.json({ ok: true });
});

// Plans list endpoint
app.get('/plans/list', (req, res) => {
  const plans = [
    { id: 'basic', price: 49, monthlySessions: 20, name: 'B\u00e1sico' },
    { id: 'pro', price: 99, monthlySessions: 50, name: 'Pro' },
    { id: 'premium', price: 139, monthlySessions: 100, name: 'Premium' }
  ];
  res.json({ ok: true, data: plans });
});

// Device activation placeholder
app.post('/device/activate', (req, res) => {
  res.status(501).json({ ok: false, error: { code: 'not_implemented', message: 'Device activation not implemented' }});
});

// Sessions start placeholder
app.post('/sessions/start', (req, res) => {
  res.status(501).json({ ok: false, error: { code: 'not_implemented', message: 'Session start not implemented' }});
});

// Sessions finish placeholder
app.post('/sessions/finish', (req, res) => {
  res.status(501).json({ ok: false, error: { code: 'not_implemented', message: 'Session finish not implemented' }});
});

// Google OAuth start
app.get('/auth/google/start', passport.authenticate('google', {
  scope: ['profile', 'email'],
  prompt: 'select_account'
}));

// Google OAuth callback
app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/auth/failure' }), (req, res) => {
  // Redirect to frontend after successful login
  res.redirect(process.env.FRONTEND_URL);
});

// OAuth failure route
app.get('/auth/failure', (req, res) => {
  res.status(401).json({ ok: false, error: { code: 'oauth_failure', message: 'OAuth failure' }});
});

// Logout route
app.get('/auth/logout', (req, res) => {
  req.logout(() => {
    res.redirect(process.env.FRONTEND_URL);
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
