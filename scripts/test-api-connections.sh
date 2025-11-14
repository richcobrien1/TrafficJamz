#!/bin/bash
# TrafficJamz Automated API Connection Test Script
# Tests all critical API endpoints and connections

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_BASE="${API_BASE:-https://trafficjamz.v2u.us/api}"
TEST_USER="${TEST_USER:-richcobrien@v2u.us}"
TEST_PASS="${TEST_PASS:-}"
TIMEOUT=10

# Counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Test tracking
declare -a FAILED_TESTS

# Helper functions
test_start() {
    ((TESTS_TOTAL++))
    echo -e "\n${YELLOW}[TEST $TESTS_TOTAL] $1${NC}"
}

test_pass() {
    ((TESTS_PASSED++))
    echo -e "${GREEN}✓ PASS${NC}: $1"
}

test_fail() {
    ((TESTS_FAILED++))
    FAILED_TESTS+=("$1")
    echo -e "${RED}✗ FAIL${NC}: $1"
}

# API test helper
api_test() {
    local method=$1
    local endpoint=$2
    local expected_status=$3
    local description=$4
    local data=$5
    local token=$6
    
    test_start "$description"
    
    local url="${API_BASE}${endpoint}"
    local headers=""
    
    if [ -n "$token" ]; then
        headers="-H \"Authorization: Bearer $token\""
    fi
    
    if [ "$method" = "GET" ]; then
        response=$(eval curl -s -w "\n%{http_code}" -X GET "$url" $headers --max-time $TIMEOUT)
    elif [ "$method" = "POST" ]; then
        response=$(eval curl -s -w "\n%{http_code}" -X POST "$url" $headers -H "Content-Type: application/json" -d "'$data'" --max-time $TIMEOUT)
    elif [ "$method" = "PUT" ]; then
        response=$(eval curl -s -w "\n%{http_code}" -X PUT "$url" $headers -H "Content-Type: application/json" -d "'$data'" --max-time $TIMEOUT)
    fi
    
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    echo "  URL: $url"
    echo "  Status: $status_code (expected: $expected_status)"
    
    if [ "$status_code" = "$expected_status" ]; then
        test_pass "$description"
        echo "  Response: ${body:0:200}..."
        return 0
    else
        test_fail "$description - Expected $expected_status but got $status_code"
        echo "  Response: $body"
        return 1
    fi
}

echo "========================================"
echo "TrafficJamz API Connection Test Suite"
echo "========================================"
echo "API Base: $API_BASE"
echo "Timeout: ${TIMEOUT}s"
echo "========================================"

# Test 1: Health Check
api_test "GET" "/health" "200" "Backend Health Check"

# Test 2: CORS Headers
test_start "CORS Headers Present"
cors_response=$(curl -s -I -X OPTIONS "$API_BASE/health" --max-time $TIMEOUT)
if echo "$cors_response" | grep -q "Access-Control-Allow-Origin"; then
    test_pass "CORS headers configured"
    echo "  Found: $(echo "$cors_response" | grep "Access-Control-Allow-Origin")"
else
    test_fail "CORS headers missing"
fi

# Test 3: DNS Resolution
test_start "DNS Resolution for trafficjamz.v2u.us"
if host trafficjamz.v2u.us > /dev/null 2>&1; then
    ip=$(host trafficjamz.v2u.us | grep "has address" | awk '{print $4}')
    test_pass "DNS resolves to $ip"
else
    test_fail "DNS resolution failed"
fi

# Test 4: SSL Certificate
test_start "SSL Certificate Valid"
ssl_check=$(echo | openssl s_client -servername trafficjamz.v2u.us -connect trafficjamz.v2u.us:443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
if [ $? -eq 0 ]; then
    test_pass "SSL certificate valid"
    echo "  $ssl_check"
else
    test_fail "SSL certificate invalid or expired"
fi

# Test 5: Response Time
test_start "Backend Response Time"
start_time=$(date +%s%N)
curl -s "$API_BASE/health" > /dev/null
end_time=$(date +%s%N)
duration=$(( ($end_time - $start_time) / 1000000 ))  # Convert to milliseconds
echo "  Response time: ${duration}ms"
if [ $duration -lt 2000 ]; then
    test_pass "Response time acceptable (${duration}ms < 2000ms)"
else
    test_fail "Response time too slow (${duration}ms >= 2000ms)"
fi

# Authentication Tests (require credentials)
if [ -n "$TEST_PASS" ]; then
    echo -e "\n${YELLOW}=== Authentication Tests ===${NC}"
    
    # Test 6: Login
    login_data="{\"email\":\"$TEST_USER\",\"password\":\"$TEST_PASS\"}"
    test_start "User Login"
    login_response=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/auth/login" \
        -H "Content-Type: application/json" \
        -d "$login_data" \
        --max-time $TIMEOUT)
    
    status_code=$(echo "$login_response" | tail -n1)
    body=$(echo "$login_response" | sed '$d')
    
    if [ "$status_code" = "200" ]; then
        TOKEN=$(echo "$body" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
        test_pass "Login successful, token obtained"
        echo "  Token: ${TOKEN:0:50}..."
        
        # Test 7: Authenticated Request (Get Profile)
        api_test "GET" "/users/profile" "200" "Get User Profile" "" "$TOKEN"
        
        # Test 8: Get User Groups
        api_test "GET" "/groups" "200" "Get User Groups" "" "$TOKEN"
        
    else
        test_fail "Login failed - Status: $status_code"
        echo "  Response: $body"
    fi
else
    echo -e "\n${YELLOW}Skipping authentication tests (no TEST_PASS provided)${NC}"
fi

# Test 9: WebSocket Endpoint
test_start "WebSocket Endpoint Accessible"
ws_check=$(curl -s -I "$API_BASE/../socket.io/" --max-time $TIMEOUT | head -n1)
if echo "$ws_check" | grep -q "HTTP"; then
    test_pass "Socket.IO endpoint responding"
else
    test_fail "Socket.IO endpoint not accessible"
fi

# Test 10: Rate Limiting Headers
test_start "Rate Limiting Headers Present"
rate_response=$(curl -s -I "$API_BASE/health" --max-time $TIMEOUT)
if echo "$rate_response" | grep -q "RateLimit-"; then
    test_pass "Rate limiting configured"
    echo "$(echo "$rate_response" | grep "RateLimit-")"
else
    test_fail "Rate limiting headers missing"
fi

# Test 11: Security Headers
test_start "Security Headers Present"
security_headers=$(curl -s -I "$API_BASE/health" --max-time $TIMEOUT)
security_pass=true

if ! echo "$security_headers" | grep -q "Strict-Transport-Security"; then
    echo "  Missing: Strict-Transport-Security"
    security_pass=false
fi

if ! echo "$security_headers" | grep -q "X-Content-Type-Options"; then
    echo "  Missing: X-Content-Type-Options"
    security_pass=false
fi

if $security_pass; then
    test_pass "Security headers present"
else
    test_fail "Some security headers missing"
fi

# Test 12: API Version/Build Info
test_start "API Metadata Available"
api_meta=$(curl -s "$API_BASE/health" --max-time $TIMEOUT)
if echo "$api_meta" | grep -q "version\|timestamp\|uptime"; then
    test_pass "API metadata available"
    echo "  $api_meta"
else
    test_fail "API metadata missing or incomplete"
fi

# Test 13: Cloudflare R2 Connectivity
test_start "Cloudflare R2 Storage Accessible"
r2_url="https://music.c12d1726f92c6e6a2c1c020e39d2e9a9.r2.cloudflarestorage.com"
r2_response=$(curl -s -I "$r2_url" --max-time $TIMEOUT | head -n1)
if echo "$r2_response" | grep -q "HTTP"; then
    test_pass "R2 storage endpoint accessible"
else
    test_fail "R2 storage endpoint not accessible"
fi

# Test 14: Spotify OAuth Endpoint
test_start "Spotify OAuth Endpoint"
spotify_check=$(curl -s -I "$API_BASE/music/spotify/auth" --max-time $TIMEOUT | head -n1)
if echo "$spotify_check" | grep -q "HTTP"; then
    test_pass "Spotify OAuth endpoint exists"
else
    test_fail "Spotify OAuth endpoint not found"
fi

# Test 15: YouTube OAuth Endpoint
test_start "YouTube OAuth Endpoint"
youtube_check=$(curl -s -I "$API_BASE/music/youtube/auth" --max-time $TIMEOUT | head -n1)
if echo "$youtube_check" | grep -q "HTTP"; then
    test_pass "YouTube OAuth endpoint exists"
else
    test_fail "YouTube OAuth endpoint not found"
fi

# Summary
echo ""
echo "========================================"
echo "           TEST SUMMARY"
echo "========================================"
echo -e "Total Tests: ${TESTS_TOTAL}"
echo -e "${GREEN}Passed: ${TESTS_PASSED}${NC}"
echo -e "${RED}Failed: ${TESTS_FAILED}${NC}"
echo ""

if [ ${TESTS_FAILED} -gt 0 ]; then
    echo -e "${RED}Failed Tests:${NC}"
    for test in "${FAILED_TESTS[@]}"; do
        echo "  - $test"
    done
    echo ""
    exit 1
else
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
fi
