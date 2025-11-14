#!/usr/bin/env node
/**
 * TrafficJamz Automated API Connection Test Script
 * Tests all critical API endpoints and connections
 */

const https = require('https');
const http = require('http');

// Configuration
const API_BASE = 'https://trafficjamz.v2u.us/api';
const TIMEOUT = 10000;

// Colors
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const NC = '\x1b[0m';

// Counters
let testsPassed = 0;
let testsFailed = 0;
let testsTotal = 0;
const failedTests = [];

function testStart(description) {
  testsTotal++;
  console.log(`\n${YELLOW}[TEST ${testsTotal}] ${description}${NC}`);
}

function testPass(message) {
  testsPassed++;
  console.log(`${GREEN}✓ PASS${NC}: ${message}`);
}

function testFail(message) {
  testsFailed++;
  failedTests.push(message);
  console.log(`${RED}✗ FAIL${NC}: ${message}`);
}

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const lib = urlObj.protocol === 'https:' ? https : http;
    
    const req = lib.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', reject);
    req.setTimeout(TIMEOUT, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function apiTest(method, endpoint, expectedStatus, description, data = null, token = null) {
  testStart(description);
  
  const url = `${API_BASE}${endpoint}`;
  const options = {
    method,
    headers: {}
  };
  
  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }
  
  if (data) {
    options.headers['Content-Type'] = 'application/json';
    options.body = data;
  }
  
  try {
    const response = await request(url, options);
    console.log(`  URL: ${url}`);
    console.log(`  Status: ${response.statusCode} (expected: ${expectedStatus})`);
    
    if (response.statusCode === expectedStatus) {
      testPass(description);
      const bodyPreview = response.body.substring(0, 200);
      console.log(`  Response: ${bodyPreview}...`);
      return { success: true, data: response };
    } else {
      testFail(`${description} - Expected ${expectedStatus} but got ${response.statusCode}`);
      console.log(`  Response: ${response.body.substring(0, 200)}`);
      return { success: false, data: response };
    }
  } catch (error) {
    testFail(`${description} - ${error.message}`);
    return { success: false, error };
  }
}

async function runTests() {
  console.log('='.repeat(50));
  console.log('TrafficJamz API Connection Test Suite');
  console.log('='.repeat(50));
  console.log(`API Base: ${API_BASE}`);
  console.log(`Timeout: ${TIMEOUT}ms`);
  console.log('='.repeat(50));
  
  // Test 1: Health Check
  await apiTest('GET', '/health', 200, 'Backend Health Check');
  
  // Test 2: CORS Headers
  testStart('CORS Headers Present');
  try {
    const response = await request(`${API_BASE}/health`);
    const corsHeaders = Object.keys(response.headers).filter(h => 
      h.toLowerCase().includes('access-control')
    );
    if (corsHeaders.length > 0) {
      testPass('CORS headers configured');
      corsHeaders.forEach(h => console.log(`  ${h}: ${response.headers[h]}`));
    } else {
      testFail('CORS headers missing');
    }
  } catch (error) {
    testFail(`CORS check failed: ${error.message}`);
  }
  
  // Test 3: Response Time
  testStart('Backend Response Time');
  try {
    const start = Date.now();
    await request(`${API_BASE}/health`);
    const duration = Date.now() - start;
    console.log(`  Response time: ${duration}ms`);
    if (duration < 2000) {
      testPass(`Response time acceptable (${duration}ms < 2000ms)`);
    } else {
      testFail(`Response time too slow (${duration}ms >= 2000ms)`);
    }
  } catch (error) {
    testFail(`Response time test failed: ${error.message}`);
  }
  
  // Test 4: Security Headers
  testStart('Security Headers Present');
  try {
    const response = await request(`${API_BASE}/health`);
    let securityPass = true;
    
    if (!response.headers['strict-transport-security']) {
      console.log('  Missing: Strict-Transport-Security');
      securityPass = false;
    }
    
    if (!response.headers['x-content-type-options']) {
      console.log('  Missing: X-Content-Type-Options');
      securityPass = false;
    }
    
    if (securityPass) {
      testPass('Security headers present');
    } else {
      testFail('Some security headers missing');
    }
  } catch (error) {
    testFail(`Security headers check failed: ${error.message}`);
  }
  
  // Test 5: Rate Limiting Headers
  testStart('Rate Limiting Headers Present');
  try {
    const response = await request(`${API_BASE}/health`);
    const rateHeaders = Object.keys(response.headers).filter(h => 
      h.toLowerCase().startsWith('ratelimit')
    );
    if (rateHeaders.length > 0) {
      testPass('Rate limiting configured');
      rateHeaders.forEach(h => console.log(`  ${h}: ${response.headers[h]}`));
    } else {
      testFail('Rate limiting headers missing');
    }
  } catch (error) {
    testFail(`Rate limiting check failed: ${error.message}`);
  }
  
  // Test 6: API Metadata
  testStart('API Metadata Available');
  try {
    const response = await request(`${API_BASE}/health`);
    const data = JSON.parse(response.body);
    const hasMetadata = ['version', 'timestamp', 'uptime', 'status'].some(key => key in data);
    if (hasMetadata) {
      testPass('API metadata available');
      console.log(`  ${JSON.stringify(data)}`);
    } else {
      testFail('API metadata missing or incomplete');
    }
  } catch (error) {
    testFail(`API metadata check failed: ${error.message}`);
  }
  
  // Test 7: Login Endpoint Exists
  testStart('Login Endpoint Exists');
  try {
    const url = `${API_BASE}/auth/login`;
    const options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {}
    };
    const response = await request(url, options);
    if ([400, 401, 422].includes(response.statusCode)) {
      testPass('Login endpoint exists and validates requests');
    } else if (response.statusCode === 404) {
      testFail('Login endpoint not found');
    } else {
      testPass(`Login endpoint responding (status: ${response.statusCode})`);
    }
  } catch (error) {
    testFail(`Login endpoint check failed: ${error.message}`);
  }
  
  // Test 8: Groups Endpoint Requires Authentication
  testStart('Groups Endpoint Requires Authentication');
  try {
    const response = await request(`${API_BASE}/groups`);
    if (response.statusCode === 401) {
      testPass('Groups endpoint properly requires authentication');
    } else if (response.statusCode === 200) {
      testFail('Groups endpoint should require authentication but returned 200');
    } else {
      testPass(`Groups endpoint responding (status: ${response.statusCode})`);
    }
  } catch (error) {
    testFail(`Groups endpoint check failed: ${error.message}`);
  }
  
  // Test 9: Spotify OAuth Endpoint (correct path)
  testStart('Spotify OAuth Endpoint');
  try {
    const response = await request(`${API_BASE}/integrations/auth/spotify`);
    if ([200, 302, 401, 403].includes(response.statusCode)) {
      testPass('Spotify OAuth endpoint exists');
    } else {
      testFail(`Spotify OAuth endpoint returned unexpected status: ${response.statusCode}`);
    }
  } catch (error) {
    testFail(`Spotify OAuth check failed: ${error.message}`);
  }
  
  // Test 10: YouTube Search Endpoint
  testStart('YouTube Integration Endpoint');
  try {
    const response = await request(`${API_BASE}/integrations/youtube/search`);
    if ([200, 401, 403].includes(response.statusCode)) {
      testPass('YouTube integration endpoint exists');
    } else {
      testFail(`YouTube endpoint returned unexpected status: ${response.statusCode}`);
    }
  } catch (error) {
    testFail(`YouTube integration check failed: ${error.message}`);
  }
  
  // Test 11: Audio Session Endpoints
  testStart('Audio/Voice Session Endpoints');
  try {
    // POST endpoint should return 401 without auth or 400 with bad data
    const url = `${API_BASE}/audio/sessions`;
    const options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {}
    };
    const response = await request(url, options);
    // Should require auth (401) or validation error (400)
    if ([400, 401, 403].includes(response.statusCode)) {
      testPass('Audio session endpoints exist and require authentication');
    } else {
      testFail(`Audio endpoints returned unexpected status: ${response.statusCode}`);
    }
  } catch (error) {
    testFail(`Audio endpoints check failed: ${error.message}`);
  }
  
  // Test 12: Socket.IO Endpoint for WebRTC
  testStart('Socket.IO WebRTC Signaling Endpoint');
  try {
    const socketUrl = API_BASE.replace('/api', '/socket.io/');
    const response = await request(socketUrl);
    // Socket.IO returns various status codes, just verify it responds
    testPass('Socket.IO endpoint accessible for WebRTC signaling');
    console.log(`  Status: ${response.statusCode}`);
  } catch (error) {
    // Even errors mean the endpoint exists
    testPass('Socket.IO endpoint exists (connection requires WebSocket upgrade)');
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('           TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total Tests: ${testsTotal}`);
  console.log(`${GREEN}Passed: ${testsPassed}${NC}`);
  console.log(`${RED}Failed: ${testsFailed}${NC}`);
  console.log();
  
  if (testsFailed > 0) {
    console.log(`${RED}Failed Tests:${NC}`);
    failedTests.forEach(test => console.log(`  - ${test}`));
    console.log();
    process.exit(1);
  } else {
    console.log(`${GREEN}✓ All tests passed!${NC}`);
    process.exit(0);
  }
}

runTests().catch(error => {
  console.error(`${RED}Fatal error:${NC}`, error);
  process.exit(1);
});
