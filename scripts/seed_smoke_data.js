#!/usr/bin/env node
/**
 * scripts/seed_smoke_data.js
 *
 * Lightweight seeding script used by smoke tests to ensure some
 * data-dependent GET endpoints return data. It will:
 *  - register a user (if not exists)
 *  - login and obtain JWT
 *  - create a group
 *  - add the user to the group
 *  - post a location update
 *  - create a proximity alert
 *
 * Usage:
 *   API_BASE=http://localhost node scripts/seed_smoke_data.js
 *   or set EMAIL / PASS env vars to override defaults
 */

const fetch = global.fetch || require('node-fetch');
// Allow caller to provide API_BASE. Try common fallbacks if the provided base does not work.
const INPUT_BASE = process.env.API_BASE || 'http://localhost';
const API_BASE = INPUT_BASE.replace(/\/$/, '');
// Try common ports used in development and compose (5000, 5050) and the raw host
const tentative = [API_BASE, API_BASE + ':5000', API_BASE + ':5050', API_BASE.replace(/:\d+$/, '')];
// Deduplicate while preserving order
const FALLBACK_BASES = Array.from(new Set(tentative));
const EMAIL = process.env.EMAIL || process.env.SMOKE_USER || 'smoke@example.com';
const PASS = process.env.PASS || process.env.SMOKE_PASS || 'Sm0kePass!';
const USERNAME = process.env.USERNAME || 'smoke_user';

async function doFetch(url, opts) {
  const res = await fetch(url, opts);
  const text = await res.text();
  let body = null;
  try { body = JSON.parse(text); } catch (e) { body = text; }
  return { ok: res.ok, status: res.status, body };
}

async function register() {
  const payload = { username: USERNAME, email: EMAIL, password: PASS };
  const candidates = [
    `${global.currentBase}/api/auth/register`,
    `${global.currentBase}/auth/register`
  ];
  for (const url of candidates) {
    try {
      const r = await doFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      console.log('register ->', url, r.status);
      if (r && (r.status === 200 || r.status === 201 || r.status === 204 || r.status === 400)) return r; // 400 means exists/validation but endpoint worked
    } catch (e) {
      console.warn('register candidate error', url, e.message || e);
    }
  }
  // If none succeeded, return last failed shape
  return { ok: false, status: 404, body: { success: false, message: 'Route not found' } };
}

async function login() {
  const payload = { email: EMAIL, password: PASS };
  const candidates = [
    `${global.currentBase}/api/auth/login`,
    `${global.currentBase}/auth/login`
  ];
  for (const url of candidates) {
    try {
      const r = await doFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      console.log('login ->', url, r.status);
      if (r && (r.status === 200 || r.status === 201 || r.status === 204)) return r;
    } catch (e) {
      console.warn('login candidate error', url, e.message || e);
    }
  }
  return { ok: false, status: 404, body: { success: false, message: 'Route not found' } };
}

async function createGroup(token) {
  const url = `${global.currentBase}/api/groups`;
  const payload = { group_name: 'Smoke Test Group', group_description: 'Auto-created for smoke tests' };
  const r = await doFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload) });
  console.log('createGroup ->', r.status);
  return r;
}

async function addMember(token, groupId, userId) {
  const url = `${global.currentBase}/api/groups/${groupId}/members`;
  const payload = { user_id: userId, role: 'member' };
  const r = await doFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload) });
  console.log('addMember ->', r.status);
  return r;
}

async function postLocation(token) {
  const url = `${global.currentBase}/api/location/update`;
  const payload = { coordinates: { latitude: 37.7749, longitude: -122.4194 } };
  const r = await doFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload) });
  console.log('postLocation ->', r.status);
  return r;
}

async function createProximityAlert(token, groupId, targetUserId) {
  const url = `${global.currentBase}/api/location/proximity-alerts`;
  const payload = { group_id: groupId, target_user_id: targetUserId, distance_threshold: 100 };
  const r = await doFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload) });
  console.log('createProximityAlert ->', r.status);
  return r;
}

async function main() {
  console.log('Seeding smoke test data to', API_BASE);
  // Try bases until we find one that responds to /api/auth/login
  let loginRes = null;
  let current = null;
  for (const base of FALLBACK_BASES) {
    current = base.replace(/\/$/, '');
    // set global currentBase used by other helpers
    global.currentBase = current;
    console.log('Attempting base:', current);
    try {
      // attempt register (may 201/204 or 400 if exists) to warm the endpoint
      try { await register(); } catch (e) { /* ignore*/ }
      loginRes = await login();
      if (loginRes && (loginRes.status === 200 || loginRes.status === 204)) {
        break;
      }
    } catch (e) {
      console.warn('Error contacting base', current, e.message || e);
    }
  }

  if (!loginRes || !loginRes.ok) {
    console.error('Login failed. Aborting seed. Response:', loginRes && loginRes.status, loginRes && loginRes.body);
    process.exit(2);
  }

  const token = loginRes.body && (loginRes.body.access_token || loginRes.body.token || loginRes.body.accessToken || loginRes.body.jwt);
  const user = loginRes.body && loginRes.body.user;
  const userId = user && (user.id || user._id || user.user_id) || null;

  if (!token) {
    console.error('No token returned from login; aborting seed. Body:', loginRes.body);
    process.exit(2);
  }

  // Create group
  const groupRes = await createGroup(token);
  let groupId = null;
  if (groupRes.ok) {
    groupId = groupRes.body && (groupRes.body.group && (groupRes.body.group.id || groupRes.body.group._id)) || null;
  }

  if (!groupId) {
    console.warn('Group creation did not return id; continuing — some endpoints may remain empty');
  }

  // Add member (if we have groupId and userId)
  if (groupId && userId) {
    await addMember(token, groupId, userId);
  }

  // Post a location
  await postLocation(token);

  // Create proximity alert if possible
  if (groupId && userId) {
    await createProximityAlert(token, groupId, userId);
  }

  console.log('Seeding complete. Re-run smoke tests now.');
  process.exit(0);
}

main().catch(err => { console.error('Seed error:', err); process.exit(1); });
