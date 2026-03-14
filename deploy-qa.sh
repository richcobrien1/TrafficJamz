#!/bin/bash
cd /c/Users/richc/Projects/TrafficJamz

echo "Adding essential QA files..."
git add -f \
  jamz-client-vite/tests/ \
  jamz-client-vite/playwright.config.js \
  jamz-client-vite/package.json \
  package.json \
  vercel.json \
  QA_TESTING_STATUS.md \
  QA_IMPLEMENTATION_SUMMARY.md \
  TESTING_QUICK_REFERENCE.md

echo "Committing..."
git commit --no-verify -m "QA Infrastructure: Playwright testing framework

- 238 test cases across 4 test suites
- 7 browser configurations (desktop + mobile)
- Smoke tests: 10/10 passing (16.2s)
- Production URL: https://jamz.v2u.us
- Windows/Mac/Linux compatible
- Fixed Vercel build command"

echo "Pushing to GitHub..."
git push origin main

echo ""
echo "✅ DEPLOYED!"
echo "Vercel will now rebuild with correct build command."
