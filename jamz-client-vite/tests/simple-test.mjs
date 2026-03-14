#!/usr/bin/env node

/**
 * Simple test runner for debugging
 */

import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_URL = process.env.TEST_URL || 'https://jamz.v2u.us';

console.log('🧪 Simple Test Runner\n');
console.log(`Testing: ${TEST_URL}`);
console.log(`Working directory: ${path.join(__dirname, '..')}\n`);

const cmd = `npx playwright test smoke.spec.js --project=chromium-desktop --reporter=list --timeout=30000`;

const execOptions = {
  cwd: path.join(__dirname, '..'),
  env: { ...process.env, TEST_URL: TEST_URL }
};

console.log(`Command: ${cmd}\n`);
console.log('Running tests...\n');

exec(cmd, execOptions, (error, stdout, stderr) => {
  if (stdout) {
    console.log(stdout);
  }
  
  if (stderr) {
    console.error('STDERR:', stderr);
  }
  
  if (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
  } else {
    console.log('\n✅ Tests completed successfully!');
  }
});
