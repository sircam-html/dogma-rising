// Dogma Rising, 2026-11-16: the homepage's "Forgot your password?" form (index.html, #forgot-password).
// The game server's web API (the launcher's "Download Server", dogmarising.org port 52099) already has the password reset:
// its "recover" action mails a link to reset_password.html on that server, where the player picks a new password.
// The homepage is HTTPS on another host, so the visitor's browser can't call that plain-HTTP API itself; this function
// calls it from Netlify's side. It only ever sends "recover" with one e-mail address.
const http = require('http');

// Netlify can override it under Site configuration > Environment variables.
const ACCOUNT_API = process.env.DDON_ACCOUNT_API || 'http://dogmarising.org:52099/api/account';
const MAIL_FORMAT = /^[^@\s]+@[^@\s]+\.[^@\s]+$/; // the server's own sign-up check
const WAIT_MS = 60000;      // one request per address per minute (per warm function instance, best effort)
const recent = new Map();

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

  let email = '';
  try {
    email = String(JSON.parse(event.body || '{}').email || '').trim();
  } catch (e) { /* not JSON: treated as empty */ }
  if (!email || email.length > 254 || !MAIL_FORMAT.test(email)) {
    return reply(400, { ok: false, error: 'Please enter a valid e-mail address.' });
  }

  const key = email.toLowerCase();
  const now = Date.now();
  for (const [address, time] of recent) {
    if (now - time > WAIT_MS) recent.delete(address);
  }
  if (recent.has(key)) {
    return reply(429, { ok: false, error: 'A reset link was just requested for this address. Please wait a minute.' });
  }
  recent.set(key, now);

  let result;
  try {
    result = await postJson(ACCOUNT_API, { Action: 'recover', Email: email });
  } catch (e) {
    recent.delete(key);
    return reply(502, { ok: false, error: 'The game server could not be reached. Try again later.' });
  }

  let data = {};
  try {
    data = JSON.parse(result.text || '{}');
  } catch (e) { /* not JSON: handled below */ }

  // "Account not found" gets the same answer as a sent mail, so the form does not tell strangers which addresses have accounts.
  if (data.Message === 'Password token generated' || data.Error === 'Account not found') {
    return reply(200, { ok: true, message: 'If an account uses this address, a reset link is on its way. Check your inbox and spam folder.' });
  }
  recent.delete(key);
  if (typeof data.Error === 'string' && data.Error.includes('could not be sent')) {
    return reply(502, { ok: false, error: 'The reset e-mail could not be sent right now. Try again later or ask on Discord.' });
  }
  return reply(502, { ok: false, error: 'Something went wrong. Try again later or ask on Discord.' });
};
