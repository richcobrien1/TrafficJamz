#!/usr/bin/env node

/**
 * Debug Test Runner - Shows actual errors from playwright
 */

import { exec } from 'child_process';

console.log('🔍 Running single test to debug...\n');

const cmd = `npx playwright test smoke.spec.js --project=chromium-desktop --reporter=list --max-failures=1`;

exec(cmd, { cwd: process.cwd(), maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
  console.log('=== STDOUT ===');
  console.log(stdout || '(empty)');
  
  console.log('\n=== STDERR ===');
  console.log(stderr || '(empty)');
  
  console.log('\n=== ERROR ===');
  if (error) {
    console.log('Exit code:', error.code);
    console.log('Message:', error.message);
  } else {
    console.log('(no error object)');
  }
});
