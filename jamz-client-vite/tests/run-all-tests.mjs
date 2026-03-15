#!/usr/bin/env node

/**
 * TrafficJamz Automated QA Test Runner
 * Runs all tests and updates QA_TESTING_STATUS.md dashboard
 */

import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configurations
const TEST_CONFIGS = [
  { name: 'chromium-desktop', displayName: 'Chrome (Desktop)' },
  { name: 'firefox-desktop', displayName: 'Firefox (Desktop)' },
  { name: 'webkit-desktop', displayName: 'Safari (Desktop)' },
  { name: 'mobile-safari', displayName: 'Safari (iOS)' },
  { name: 'mobile-chrome-ios', displayName: 'Chrome (iOS)' },
  { name: 'mobile-chrome-android', displayName: 'Chrome (Android)' },
  { name: 'electron', displayName: 'Electron (Desktop App)' },
];

const DASHBOARD_PATH = path.join(__dirname, '../../QA_TESTING_STATUS.md');

// Run tests for a specific project
async function runTests(project) {
  return new Promise((resolve) => {
    console.log(`\n🧪 Running tests for ${project.displayName}...`);
    
    const cmd = `npx playwright test --project=${project.name} --reporter=json`;
    const execOptions = {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, TEST_URL: process.env.TEST_URL || 'https://jamz.v2u.us' }
    };
    
    exec(cmd, execOptions, (error, stdout, stderr) => {
      const results = {
        project: project.name,
        displayName: project.displayName,
        passed: 0,
        failed: 0,
        skipped: 0,
        total: 0,
        duration: 0,
        errors: [],
      };

      // Parse output for results
      try {
        if (stdout) {
          // Look for test results in output
          const passMatch = stdout.match(/(\d+) passed/);
          const failMatch = stdout.match(/(\d+) failed/);
          const skipMatch = stdout.match(/(\d+) skipped/);
          
          if (passMatch) results.passed = parseInt(passMatch[1]);
          if (failMatch) results.failed = parseInt(failMatch[1]);
          if (skipMatch) results.skipped = parseInt(skipMatch[1]);
          
          results.total = results.passed + results.failed + results.skipped;
        }
        
        if (error && stderr) {
          results.errors.push(stderr);
        }
      } catch (e) {
        console.error('Error parsing test results:', e);
      }

      resolve(results);
    });
  });
}

// Update QA dashboard with results
async function updateDashboard(allResults) {
  console.log('\n📊 Updating QA dashboard...');
  
  try {
    let dashboard = await fs.readFile(DASHBOARD_PATH, 'utf-8');
    
    const timestamp = new Date().toLocaleString('en-US', { 
      timeZone: 'America/Chicago',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Update timestamp
    dashboard = dashboard.replace(
      /\*\*Last Updated:\*\* .+/,
      `**Last Updated:** ${timestamp}`
    );
    
    // Update status
    const totalPassed = allResults.reduce((sum, r) => sum + r.passed, 0);
    const totalFailed = allResults.reduce((sum, r) => sum + r.failed, 0);
    const totalTests = allResults.reduce((sum, r) => sum + r.total, 0);
    
    const statusEmoji = totalFailed === 0 ? '✅' : totalFailed < totalPassed ? '⚠️' : '❌';
    dashboard = dashboard.replace(
      /\*\*Status:\*\* .+/,
      `**Status:** ${statusEmoji} ${totalPassed}/${totalTests} tests passing`
    );
    
    // Update test results by browser
    for (const result of allResults) {
      const status = result.failed === 0 ? '✅ Passing' : 
                     result.passed > result.failed ? `⚠️ ${result.failed} failures` :
                     `❌ ${result.failed} failures`;
      
      // This is a simplified update - would need more complex regex for full table update
      console.log(`${result.displayName}: ${status} (${result.passed}/${result.total})`);
    }
    
    // Add test run log
    const logEntry = `\n### Run #${Date.now().toString().slice(-6)} - Automated Test Suite
**Date:** ${timestamp}
**Status:** ${statusEmoji} ${totalPassed}/${totalTests} passing
**Tests Executed:** ${totalTests}
**Tests Passed:** ${totalPassed}
**Tests Failed:** ${totalFailed}
**Duration:** ${allResults.reduce((sum, r) => sum + r.duration, 0).toFixed(2)}s

**Results by Browser:**
${allResults.map(r => `- ${r.displayName}: ${r.passed}/${r.total} passed`).join('\n')}

---\n`;
    
    // Insert before "Next Update" line
    dashboard = dashboard.replace(
      /\*\*Next Update:\*\*/,
      logEntry + '\n**Next Update:**'
    );
    
    await fs.writeFile(DASHBOARD_PATH, dashboard);
    console.log('✅ Dashboard updated successfully');
    
  } catch (error) {
    console.error('❌ Error updating dashboard:', error);
  }
}

// Main execution
async function main() {
  console.log('🚀 TrafficJamz Automated QA Test Suite');
  console.log('=====================================\n');
  
  const allResults = [];
  
  for (const config of TEST_CONFIGS) {
    const results = await runTests(config);
    allResults.push(results);
  }
  
  // Update dashboard with all results
  await updateDashboard(allResults);
  
  console.log('\n✅ All tests completed!');
  console.log('📊 Check QA_TESTING_STATUS.md for full results');
}

main().catch(console.error);
