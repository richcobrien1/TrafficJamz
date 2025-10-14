#!/usr/bin/env node
/**
 * scripts/seed_places.js
 *
 * Script to add some test places to the database for testing
 */

const fetch = global.fetch || require('node-fetch');
const API_BASE = process.env.API_BASE || 'http://localhost:5000';

async function doFetch(url, opts) {
  const res = await fetch(url, opts);
  const text = await res.text();
  let body = null;
  try { body = JSON.parse(text); } catch (e) { body = text; }
  return { ok: res.ok, status: res.status, body };
}

async function loginUser(email, password) {
  const payload = { email, password };
  const url = `${API_BASE}/api/auth/login`;
  const r = await doFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  console.log(`login ->`, r.status, r.body);
  return r;
}

async function createPlace(token, groupId, name, latitude, longitude, description = '') {
  const payload = { name, latitude, longitude, description };
  const url = `${API_BASE}/api/groups/${groupId}/places`;
  const r = await doFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
  console.log(`create place ${name} ->`, r.status, r.body);
  return r;
}

async function main() {
  console.log('Adding test places to database...');

  // Login as smoke user
  const loginRes = await loginUser('smoke@example.com', 'Sm0kePass!');
  if (!loginRes.ok) {
    console.error('Failed to login:', loginRes.body);
    return;
  }

  const token = loginRes.body.access_token || loginRes.body.token;
  if (!token) {
    console.error('No token received');
    return;
  }

  // Get user info to find group
  const user = loginRes.body.user;
  if (!user || !user.groups || user.groups.length === 0) {
    console.error('No groups found for user');
    return;
  }

  const groupId = user.groups[0]; // Use first group
  console.log('Using group ID:', groupId);

  // Create some test places around Denver area
  const testPlaces = [
    { name: 'Home Base', latitude: 39.7392, longitude: -104.9903, description: 'Starting point' },
    { name: 'Coffee Shop', latitude: 39.7400, longitude: -104.9910, description: 'Morning coffee spot' },
    { name: 'Park', latitude: 39.7380, longitude: -104.9890, description: 'Relaxation area' },
    { name: 'Office', latitude: 39.7410, longitude: -104.9920, description: 'Work location' }
  ];

  for (const place of testPlaces) {
    await createPlace(token, groupId, place.name, place.latitude, place.longitude, place.description);
  }

  console.log('Test places added successfully!');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});