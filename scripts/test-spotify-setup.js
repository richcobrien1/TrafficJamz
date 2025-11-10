#!/usr/bin/env node

/**
 * Test Spotify OAuth Setup
 * 
 * This script helps verify your Spotify OAuth configuration by:
 * 1. Checking if CLIENT_ID is set in .env
 * 2. Testing the redirect URI configuration
 * 3. Validating PKCE code generation
 * 
 * Usage: node scripts/test-spotify-setup.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('🎵 Testing Spotify OAuth Setup...\n');

// 1. Check .env file
const envPath = path.join(__dirname, '../jamz-client-vite/.env.development');
let clientId = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const match = envContent.match(/VITE_SPOTIFY_CLIENT_ID=(.+)/);
  
  if (match && match[1] && match[1].trim() !== '') {
    clientId = match[1].trim();
    console.log('✅ CLIENT_ID found in .env.development');
    console.log(`   Client ID: ${clientId.substring(0, 8)}...${clientId.substring(clientId.length - 4)}`);
  } else {
    console.log('❌ VITE_SPOTIFY_CLIENT_ID not set in .env.development');
    console.log('   Action: Add VITE_SPOTIFY_CLIENT_ID=your_client_id to .env.development');
    console.log('   Get it from: https://developer.spotify.com/dashboard\n');
  }
} else {
  console.log('⚠️  .env.development not found');
  console.log('   Action: Copy .env.example to .env.development');
  console.log(`   Run: cd jamz-client-vite && cp .env.example .env.development\n`);
}

// 2. Test PKCE code generation
console.log('\n🔐 Testing PKCE Code Generation...');

function generateRandomString(length) {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.randomBytes(length);
  return Array.from(values).map(x => possible[x % possible.length]).join('');
}

function generateCodeChallenge(codeVerifier) {
  return crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

const testVerifier = generateRandomString(128);
const testChallenge = generateCodeChallenge(testVerifier);

console.log('✅ Code Verifier generated:', testVerifier.substring(0, 20) + '...');
console.log('✅ Code Challenge generated:', testChallenge.substring(0, 20) + '...');

// 3. Check redirect URI configuration
console.log('\n🔗 Redirect URI Configuration:');
console.log('   Development: http://localhost:5173/auth/spotify/callback');
console.log('   Production:  https://trafficjamz.vercel.app/auth/spotify/callback');
console.log('\n   ⚠️  Make sure these match EXACTLY in Spotify Developer Dashboard');
console.log('   Go to: https://developer.spotify.com/dashboard');
console.log('   → Select your app → Edit Settings → Redirect URIs\n');

// 4. Test OAuth URL generation
if (clientId) {
  console.log('\n🚀 Generated OAuth URL (for manual testing):');
  const testUrl = `https://accounts.spotify.com/authorize?` +
    `client_id=${clientId}&` +
    `response_type=code&` +
    `redirect_uri=${encodeURIComponent('http://localhost:5173/auth/spotify/callback')}&` +
    `scope=${encodeURIComponent('user-read-private user-read-email playlist-read-private')}&` +
    `code_challenge_method=S256&` +
    `code_challenge=${testChallenge}`;
  
  console.log('\n   ' + testUrl);
  console.log('\n   Copy this URL and paste in browser to test OAuth flow');
  console.log('   (Make sure dev server is running: npm run dev)\n');
}

// 5. Next steps
console.log('\n📋 Next Steps:');
console.log('   1. Create Spotify app at https://developer.spotify.com/dashboard');
console.log('   2. Copy Client ID to .env.development');
console.log('   3. Add redirect URIs to Spotify app settings');
console.log('   4. Start dev server: cd jamz-client-vite && npm run dev');
console.log('   5. Go to http://localhost:5173 and test OAuth flow');
console.log('   6. Check browser console for any errors\n');

console.log('✨ Setup validation complete!\n');
