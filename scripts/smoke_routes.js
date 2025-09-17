#!/usr/bin/env node
/**
 * scripts/smoke_routes.js
 *
 * Simple smoke test for server routes.
 * - Scans `jamz-server/src/routes` for `@route METHOD /path` comments
 * - Sends a safe request for each route:
 *     - GET routes -> GET
 *     - other methods -> OPTIONS (non-destructive)
 * - Prints a summary of successes/failures
 *
 * Usage:
 *   NODE_OPTIONS=... API_BASE=http://localhost:5000 node scripts/smoke_routes.js
 * or
 *   API_BASE=http://localhost:5000 npm run smoke:routes
 */

const fs = require('fs');
const path = require('path');

const ROUTES_DIR = path.join(__dirname, '..', 'jamz-server', 'src', 'routes');
const DEFAULT_BASE = process.env.API_BASE || process.env.SMOKE_BASE || 'http://localhost:5000';
const TIMEOUT_MS = parseInt(process.env.SMOKE_TIMEOUT_MS || '8000', 10);
const SMOKE_TOKEN = process.env.SMOKE_TOKEN || null;
const SMOKE_USER = process.env.SMOKE_USER || null; // email
const SMOKE_PASS = process.env.SMOKE_PASS || null; // password
const SMOKE_ALLOW_404 = (process.env.SMOKE_ALLOW_404 || 'true').toLowerCase() === 'true';

function readFilesRecursive(dir) {
  const results = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of list) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      results.push(...readFilesRecursive(full));
    } else if (ent.isFile() && /\.js$/.test(ent.name)) {
      results.push(full);
    }
  }
  return results;
}

function extractRoutesFromContent(content) {
  // Matches lines like: * @route POST /api/auth/login
  const regex = /@route\s+([A-Z]+)\s+([^\s\n\r\*]+)/g;
  const out = [];
  let m;
  while ((m = regex.exec(content)) !== null) {
    out.push({ method: m[1].toUpperCase(), path: m[2] });
  }
  return out;
}

async function doFetch(url, options = {}) {
  // Use global fetch if available (Node 18+). Otherwise try to require('node-fetch').
  if (typeof fetch === 'function') {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      return res;
    } catch (err) {
      clearTimeout(id);
      throw err;
    }
  }

  // fallback: attempt to require node-fetch dynamically
  try {
    const nodeFetch = require('node-fetch');
    const controller = new nodeFetch.AbortController();
    const id = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await nodeFetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    throw new Error('No fetch available. Run on Node 18+ or install node-fetch. Original error: ' + err.message);
  }
}

function normalizeBaseAndPath(base, routePath) {
  // Ensure base has no trailing slash
  let b = base.replace(/\/$/, '');
  // Ensure routePath begins with '/'
  let p = routePath.startsWith('/') ? routePath : '/' + routePath;
  // Replace any path parameters like :id with sensible sample values
  p = fillPathParams(p);

  // Join
  return b + p;
}

function fillPathParams(p) {
  // map of common param names to sample values
  const samples = {
    groupId: '1',
    group_id: '1',
    user_id: '1',
    id: '1',
    feature: 'default',
    type: 'all',
    planId: '1',
    plan_id: '1',
    alertId: '1',
    sessionId: '1',
    transportId: '1',
    consumerId: '1'
  };

  return p.replace(/:([A-Za-z0-9_]+)/g, (match, name) => {
    return samples.hasOwnProperty(name) ? samples[name] : '1';
  });
}

async function testRoute(base, method, routePath) {
  const fullUrl = normalizeBaseAndPath(base, routePath);

  // Decide safe method
  let testMethod = 'OPTIONS';
  if (method === 'GET' || method === 'HEAD') testMethod = 'GET';

  const headers = { 'User-Agent': 'smoke-routes/1.0' };
  if (globalThis.__SMOKE_TOKEN) headers['Authorization'] = `Bearer ${globalThis.__SMOKE_TOKEN}`;
  const options = { method: testMethod, headers };

  try {
    const res = await doFetch(fullUrl, options);
    const ok = res && (res.status >= 200 && res.status < 400);
    return { ok, status: res ? res.status : null, statusText: res ? res.statusText : null };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
}

(async function main() {
  console.log('Smoke test for routes');
  console.log('Routes dir:', ROUTES_DIR);
  console.log('Base URL:', DEFAULT_BASE);
  console.log('Timeout (ms):', TIMEOUT_MS);

  // Authentication: prefer SMOKE_TOKEN, otherwise attempt login with SMOKE_USER/SMOKE_PASS
  let token = SMOKE_TOKEN;
  if (!token && SMOKE_USER && SMOKE_PASS) {
    // Try to find a login route among discovered routes after we parse files below
    console.log('SMOKE_USER provided; will attempt login after discovering routes.');
  } else if (token) {
    console.log('Using provided SMOKE_TOKEN for authenticated requests');
    globalThis.__SMOKE_TOKEN = token;
  }

  if (!fs.existsSync(ROUTES_DIR)) {
    console.error('Routes directory not found:', ROUTES_DIR);
    process.exit(1);
  }

  const files = readFilesRecursive(ROUTES_DIR);
  const routes = [];

  for (const f of files) {
    const content = fs.readFileSync(f, 'utf8');
    const r = extractRoutesFromContent(content);
    for (const item of r) routes.push({ ...item, file: path.relative(process.cwd(), f) });
  }

  // Deduplicate by method+path
  const uniq = new Map();
  for (const r of routes) {
    const key = r.method + ' ' + r.path;
    if (!uniq.has(key)) uniq.set(key, r);
  }

  const toTest = Array.from(uniq.values());
  console.log(`Discovered ${toTest.length} unique route(s)`);

  // If we have credentials and no token, attempt login using discovered login route
  if (!globalThis.__SMOKE_TOKEN && SMOKE_USER && SMOKE_PASS) {
    const loginRoute = toTest.find(rt => rt.method === 'POST' && /auth\/?login$/i.test(rt.path));
    if (loginRoute) {
      const loginUrl = normalizeBaseAndPath(DEFAULT_BASE, loginRoute.path);
      console.log('Attempting login using route:', loginRoute.path);
      try {
        const res = await doFetch(loginUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'User-Agent': 'smoke-routes/1.0' },
          body: JSON.stringify({ email: SMOKE_USER, password: SMOKE_PASS })
        });
        if (res && res.ok) {
          const body = await res.json().catch(() => ({}));
          token = body.access_token || body.token || body.accessToken || body.jwt || null;
          if (token) {
            globalThis.__SMOKE_TOKEN = token;
            console.log('Login successful, token obtained');
          } else {
            console.warn('Login response did not contain a token. Proceeding unauthenticated.');
          }
        } else {
          console.warn('Login attempt failed:', res && res.status, res && res.statusText);
        }
      } catch (err) {
        console.warn('Login attempt error:', err.message || err);
      }
    } else {
      console.warn('No login route found; cannot authenticate automatically');
    }
  }

  const results = [];
  for (const route of toTest) {
    process.stdout.write(`Testing ${route.method} ${route.path} ... `);
    // small delay to avoid flooding
    await new Promise((res) => setTimeout(res, 50));
    const r = await testRoute(DEFAULT_BASE, route.method, route.path);

    // Print concise result
    if (r.ok) {
      console.log(`OK (${r.status})`);
    } else if (r.status === 401 && !globalThis.__SMOKE_TOKEN) {
      // Expected protected endpoint when unauthenticated
      console.log(`AUTH_REQUIRED (${r.status})`);
    } else if (r.status === 404 && route.method === 'GET' && SMOKE_ALLOW_404) {
      // Data-dependent GET returned no resource; treat as informational
      console.log(`NO_DATA (${r.status})`);
    } else if (r.status) {
      console.log(`FAIL (${r.status} ${r.statusText})`);
    } else {
      console.log(`ERROR (${r.error})`);
    }

    results.push({ route, result: r });
  }

  // Categorize results
  const passed = results.filter(x => x.result.ok);
  const authRequired = results.filter(x => x.result.status === 401 && !globalThis.__SMOKE_TOKEN);
  const badRequests = results.filter(x => x.result.status === 400);
  // Treat GET 404 responses as non-fatal when SMOKE_ALLOW_404 is true
  const otherFailures = results.filter(x => {
    if (x.result.ok) return false;
    if (x.result.status === 401) return false;
    if (x.result.status === 400) return false;
    if (SMOKE_ALLOW_404 && x.result.status === 404 && x.route.method === 'GET') return false;
    return true;
  });

  const noData = results.filter(x => x.result.status === 404 && x.route.method === 'GET');

  console.log('\nSummary:');
  console.log(`  Total routes tested: ${results.length}`);
  console.log(`  Passed: ${passed.length}`);
  console.log(`  Auth-required (expected when unauthenticated): ${authRequired.length}`);
  console.log(`  Bad Request (400): ${badRequests.length}`);
  console.log(`  Other Failures: ${otherFailures.length}`);
  console.log(`  No-data (GET 404): ${noData.length}`);

  if (otherFailures.length > 0) {
    console.log('\nUnexpected Failures:');
    otherFailures.forEach(f => {
      console.log(`- ${f.route.method} ${f.route.path} -> ${f.result.status || 'ERR'} ${f.result.statusText || ''} ${f.result.error || ''} (${f.route.file})`);
    });
    process.exit(2);
  }

  // If we have a token but some routes were previously auth-required, retry them with token
  if (globalThis.__SMOKE_TOKEN && authRequired.length > 0) {
    console.log('\nRetrying auth-required routes with provided token...');
    const retryResults = [];
    for (const item of authRequired) {
      process.stdout.write(`Retrying ${item.route.method} ${item.route.path} ... `);
      await new Promise((res) => setTimeout(res, 50));
      const r = await testRoute(DEFAULT_BASE, item.route.method, item.route.path);
      if (r.ok) {
        console.log(`OK (${r.status})`);
      } else if (r.status) {
        console.log(`FAIL (${r.status} ${r.statusText})`);
      } else {
        console.log(`ERROR (${r.error})`);
      }
      retryResults.push({ route: item.route, result: r });
    }

    const stillFailed = retryResults.filter(x => !x.result.ok);
    if (stillFailed.length > 0) {
      console.log('\nSome auth-required routes still failed even with token:');
      stillFailed.forEach(f => {
        console.log(`- ${f.route.method} ${f.route.path} -> ${f.result.status || 'ERR'} ${f.result.statusText || ''} ${f.result.error || ''}`);
      });
      process.exit(2);
    }
  }

  console.log('\nSmoke checks completed.');
  process.exit(0);
})();
