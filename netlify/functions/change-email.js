// Dogma Rising, 2026-11-16: the homepage's "Change Your E-mail" form (index.html, #change-email).
// Sends the game server's "changemail" action (account name, current password, new address) to its web API, the same API the
// launcher logs in with (dogmarising.org port 52099). The server checks the password the way the launcher login does, refuses
// an address another account uses, and mails a short notice to the old address. The homepage is HTTPS on another host, so the
// visitor's browser can't call that plain-HTTP API itself; this function calls it from Netlify's side.
// Needs the server program with "changemail" (for-dogma-rising\email-change). An older program answers with nothing, which
// this function reports as "not available yet".
const http = require('http');

// Netlify can override it under Site configuration > Environment variables.
const ACCOUNT_API = process.env.DDON_ACCOUNT_API || 'http://dogmarising.org:52099/api/account';
const MAIL_FORMAT = /^[^@\s]+@[^@\s]+\.[^@\s]+$/; // the server's own sign-up check
const MAX_FAILS = 5;
const WINDOW_MS = 15 * 60 * 1000;   // 5 wrong passwords per account name per 15 minutes (per warm instance, best effort)
const fails = new Map();

function reply(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(body)
  };
}

function postJson(url, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const req = http.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 9000 // Netlify stops a function after 10 seconds
    }, (res) => {
      let text = '';
      res.on('data', chunk => text += chunk);
      res.on('end', () => resolve({ status: res.statusCode, text }));
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
    req.end(body);
  });
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return reply(405, { ok: false, error: 'Use the form on the homepage.' });
  }

  let input = {};
  try {
    input = JSON.parse(event.body || '{}');
  } catch (e) { /* not JSON: treated as empty */ }
  const account = String(input.account || '').trim();
  const password = String(input.password || '');
  const email = String(input.email || '').trim();
  if (!account || account.length > 64 || /\s/.test(account)) {
    return reply(400, { ok: false, error: 'Please enter your account name.' });
  }
  if (!password || password.length > 128) {
    return reply(400, { ok: false, error: 'Please enter your password.' });
  }
  if (!email || email.length > 254 || !MAIL_FORMAT.test(email)) {
    return reply(400, { ok: false, error: 'Please enter a valid e-mail address.' });
  }

  const key = account.toLowerCase();
  const now = Date.now();
  const recentFails = (fails.get(key) || []).filter(t => now - t < WINDOW_MS);
  if (recentFails.length >= MAX_FAILS) {
    return reply(429, { ok: false, error: 'Too many wrong tries for this account. Please wait 15 minutes.' });
  }

  let result;
  try {
    result = await postJson(ACCOUNT_API, { Action: 'changemail', Account: account, Password: password, Email: email });
  } catch (e) {
    return reply(502, { ok: false, error: 'The game server could not be reached. Try again later.' });
  }

  let data = {};
  try {
    data = JSON.parse(result.text || '{}');
  } catch (e) { /* not JSON: handled below */ }
  const message = typeof data.Message === 'string' ? data.Message : '';
  const error = typeof data.Error === 'string' ? data.Error : '';

  if (message.startsWith('E-mail changed')) {
    fails.delete(key);
    return reply(200, { ok: true, message: `Done. The e-mail address of your account is now ${email}.` });
  }
  if (error === 'Account or password wrong') {
    recentFails.push(now);
    fails.set(key, recentFails);
    return reply(401, { ok: false, error: 'Account name or password is wrong.' });
  }
  if (error === 'E-mail already in use') {
    return reply(409, { ok: false, error: 'That e-mail address already belongs to another account.' });
  }
  if (error === 'That already is the e-mail of this account') {
    return reply(400, { ok: false, error: 'That already is the e-mail address of your account.' });
  }
  if (error) {
    return reply(400, { ok: false, error }); // the server's own checks, e.g. "Invalid e-mail format"
  }
  if (result.status === 200) {
    // An empty answer: the server program does not know "changemail" yet.
    return reply(503, { ok: false, error: 'Changing the e-mail is not available yet. Try again after the next server update.' });
  }
  return reply(502, { ok: false, error: 'Something went wrong. Try again later or ask on Discord.' });
};
