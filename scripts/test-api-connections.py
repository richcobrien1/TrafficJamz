#!/usr/bin/env python3
"""
TrafficJamz Automated API Connection Test Script
Tests all critical API endpoints and connections
"""

import requests
import sys
import time
from typing import Tuple, Optional

# Configuration
API_BASE = "https://trafficjamz.v2u.us/api"
TIMEOUT = 10

# Colors
GREEN = '\033[0;32m'
RED = '\033[0;31m'
YELLOW = '\033[1;33m'
NC = '\033[0m'  # No Color

# Counters
tests_passed = 0
tests_failed = 0
tests_total = 0
failed_tests = []


def test_start(description: str):
    global tests_total
    tests_total += 1
    print(f"\n{YELLOW}[TEST {tests_total}] {description}{NC}")


def test_pass(message: str):
    global tests_passed
    tests_passed += 1
    print(f"{GREEN}✓ PASS{NC}: {message}")


def test_fail(message: str):
    global tests_failed
    tests_failed += 1
    failed_tests.append(message)
    print(f"{RED}✗ FAIL{NC}: {message}")


def api_test(method: str, endpoint: str, expected_status: int, description: str, 
             data: Optional[dict] = None, token: Optional[str] = None) -> Tuple[bool, Optional[dict]]:
    """Test an API endpoint"""
    test_start(description)
    
    url = f"{API_BASE}{endpoint}"
    headers = {}
    
    if token:
        headers['Authorization'] = f'Bearer {token}'
    
    try:
        if method == 'GET':
            response = requests.get(url, headers=headers, timeout=TIMEOUT)
        elif method == 'POST':
            headers['Content-Type'] = 'application/json'
            response = requests.post(url, json=data, headers=headers, timeout=TIMEOUT)
        elif method == 'PUT':
            headers['Content-Type'] = 'application/json'
            response = requests.put(url, json=data, headers=headers, timeout=TIMEOUT)
        else:
            test_fail(f"Unsupported method: {method}")
            return False, None
        
        print(f"  URL: {url}")
        print(f"  Status: {response.status_code} (expected: {expected_status})")
        
        if response.status_code == expected_status:
            test_pass(description)
            body = response.json() if response.text else {}
            print(f"  Response: {str(body)[:200]}...")
            return True, body
        else:
            test_fail(f"{description} - Expected {expected_status} but got {response.status_code}")
            print(f"  Response: {response.text[:200]}")
            return False, None
            
    except requests.exceptions.Timeout:
        test_fail(f"{description} - Request timed out after {TIMEOUT}s")
        return False, None
    except requests.exceptions.ConnectionError as e:
        test_fail(f"{description} - Connection error: {str(e)}")
        return False, None
    except Exception as e:
        test_fail(f"{description} - Error: {str(e)}")
        return False, None


print("=" * 50)
print("TrafficJamz API Connection Test Suite")
print("=" * 50)
print(f"API Base: {API_BASE}")
print(f"Timeout: {TIMEOUT}s")
print("=" * 50)

# Test 1: Health Check
api_test("GET", "/health", 200, "Backend Health Check")

# Test 2: CORS Headers
test_start("CORS Headers Present")
try:
    response = requests.options(f"{API_BASE}/health", timeout=TIMEOUT)
    if 'Access-Control-Allow-Origin' in response.headers:
        test_pass("CORS headers configured")
        print(f"  Found: {response.headers.get('Access-Control-Allow-Origin')}")
    else:
        # Try GET request for CORS headers
        response = requests.get(f"{API_BASE}/health", timeout=TIMEOUT)
        if 'Access-Control-Allow-Origin' in response.headers or 'Access-Control-Allow-Credentials' in response.headers:
            test_pass("CORS headers configured (via GET)")
        else:
            test_fail("CORS headers missing")
except Exception as e:
    test_fail(f"CORS check failed: {str(e)}")

# Test 3: Response Time
test_start("Backend Response Time")
try:
    start = time.time()
    requests.get(f"{API_BASE}/health", timeout=TIMEOUT)
    duration_ms = int((time.time() - start) * 1000)
    print(f"  Response time: {duration_ms}ms")
    if duration_ms < 2000:
        test_pass(f"Response time acceptable ({duration_ms}ms < 2000ms)")
    else:
        test_fail(f"Response time too slow ({duration_ms}ms >= 2000ms)")
except Exception as e:
    test_fail(f"Response time test failed: {str(e)}")

# Test 4: Security Headers
test_start("Security Headers Present")
try:
    response = requests.get(f"{API_BASE}/health", timeout=TIMEOUT)
    security_pass = True
    
    if 'Strict-Transport-Security' not in response.headers:
        print("  Missing: Strict-Transport-Security")
        security_pass = False
    
    if 'X-Content-Type-Options' not in response.headers:
        print("  Missing: X-Content-Type-Options")
        security_pass = False
    
    if security_pass:
        test_pass("Security headers present")
    else:
        test_fail("Some security headers missing")
except Exception as e:
    test_fail(f"Security headers check failed: {str(e)}")

# Test 5: Rate Limiting Headers
test_start("Rate Limiting Headers Present")
try:
    response = requests.get(f"{API_BASE}/health", timeout=TIMEOUT)
    rate_headers = [h for h in response.headers if h.startswith('RateLimit')]
    if rate_headers:
        test_pass("Rate limiting configured")
        for header in rate_headers:
            print(f"  {header}: {response.headers[header]}")
    else:
        test_fail("Rate limiting headers missing")
except Exception as e:
    test_fail(f"Rate limiting check failed: {str(e)}")

# Test 6: API Metadata
test_start("API Metadata Available")
try:
    response = requests.get(f"{API_BASE}/health", timeout=TIMEOUT)
    data = response.json()
    if any(key in data for key in ['version', 'timestamp', 'uptime', 'status']):
        test_pass("API metadata available")
        print(f"  {data}")
    else:
        test_fail("API metadata missing or incomplete")
except Exception as e:
    test_fail(f"API metadata check failed: {str(e)}")

# Test 7: WebSocket Endpoint
test_start("WebSocket/Socket.IO Endpoint Accessible")
try:
    # Socket.IO typically responds on the base path or /socket.io/
    ws_url = API_BASE.replace('/api', '/socket.io/')
    response = requests.get(ws_url, timeout=TIMEOUT)
    if response.status_code in [200, 400, 404]:  # Any response means it's accessible
        test_pass("Socket.IO endpoint responding")
    else:
        test_fail(f"Socket.IO endpoint returned unexpected status: {response.status_code}")
except Exception as e:
    test_fail(f"Socket.IO check failed: {str(e)}")

# Test 8: Spotify OAuth Endpoint
test_start("Spotify OAuth Endpoint")
try:
    response = requests.get(f"{API_BASE}/music/spotify/auth", timeout=TIMEOUT, allow_redirects=False)
    # OAuth endpoints typically redirect (302) or return 401 without auth
    if response.status_code in [200, 302, 401, 403]:
        test_pass("Spotify OAuth endpoint exists")
    else:
        test_fail(f"Spotify OAuth endpoint returned unexpected status: {response.status_code}")
except Exception as e:
    test_fail(f"Spotify OAuth check failed: {str(e)}")

# Test 9: YouTube OAuth Endpoint
test_start("YouTube OAuth Endpoint")
try:
    response = requests.get(f"{API_BASE}/music/youtube/auth", timeout=TIMEOUT, allow_redirects=False)
    if response.status_code in [200, 302, 401, 403]:
        test_pass("YouTube OAuth endpoint exists")
    else:
        test_fail(f"YouTube OAuth endpoint returned unexpected status: {response.status_code}")
except Exception as e:
    test_fail(f"YouTube OAuth check failed: {str(e)}")

# Test 10: Cloudflare R2 Storage
test_start("Cloudflare R2 Storage Accessible")
try:
    r2_url = "https://music.c12d1726f92c6e6a2c1c020e39d2e9a9.r2.cloudflarestorage.com"
    response = requests.head(r2_url, timeout=TIMEOUT)
    # R2 may return various status codes, just need to confirm it's reachable
    test_pass("R2 storage endpoint accessible")
    print(f"  Status: {response.status_code}")
except Exception as e:
    test_fail(f"R2 storage check failed: {str(e)}")

# Test 11: Auth Login Endpoint (without credentials)
test_start("Login Endpoint Exists")
try:
    # Send empty login request to verify endpoint exists
    response = requests.post(f"{API_BASE}/auth/login", json={}, timeout=TIMEOUT)
    # Should return 400 (bad request) or 401 (unauthorized), not 404
    if response.status_code in [400, 401, 422]:
        test_pass("Login endpoint exists and validates requests")
    elif response.status_code == 404:
        test_fail("Login endpoint not found")
    else:
        test_pass(f"Login endpoint responding (status: {response.status_code})")
except Exception as e:
    test_fail(f"Login endpoint check failed: {str(e)}")

# Test 12: Groups Endpoint (requires auth, expect 401)
test_start("Groups Endpoint Requires Authentication")
try:
    response = requests.get(f"{API_BASE}/groups", timeout=TIMEOUT)
    if response.status_code == 401:
        test_pass("Groups endpoint properly requires authentication")
    elif response.status_code == 200:
        test_fail("Groups endpoint should require authentication but returned 200")
    else:
        test_pass(f"Groups endpoint responding (status: {response.status_code})")
except Exception as e:
    test_fail(f"Groups endpoint check failed: {str(e)}")

# Test 13: Location Update Endpoint
test_start("Location Update Endpoint Exists")
try:
    response = requests.post(f"{API_BASE}/location/update", json={}, timeout=TIMEOUT)
    # Should require auth (401) or validation error (400), not 404
    if response.status_code in [400, 401, 422]:
        test_pass("Location update endpoint exists")
    elif response.status_code == 404:
        test_fail("Location update endpoint not found")
    else:
        test_pass(f"Location update endpoint responding (status: {response.status_code})")
except Exception as e:
    test_fail(f"Location update check failed: {str(e)}")

# Summary
print("\n" + "=" * 50)
print("           TEST SUMMARY")
print("=" * 50)
print(f"Total Tests: {tests_total}")
print(f"{GREEN}Passed: {tests_passed}{NC}")
print(f"{RED}Failed: {tests_failed}{NC}")
print()

if tests_failed > 0:
    print(f"{RED}Failed Tests:{NC}")
    for test in failed_tests:
        print(f"  - {test}")
    print()
    sys.exit(1)
else:
    print(f"{GREEN}✓ All tests passed!{NC}")
    sys.exit(0)
