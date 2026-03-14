# TrafficJamz QA Testing - Quick Reference

## Test Commands

### Quick Tests (Recommended for daily use)
```bash
cd jamz-client-vite
npm run test:quick              # 4-browser smoke test (~2 min)
```

### Full Test Suite
```bash
npm test                        # All tests, all browsers (~15-20 min)
```

### Specific Test Suites
```bash
npm run test:auth              # Authentication flows
npm run test:navigation        # Page navigation
npm run test:groups            # Group management
```

### Browser-Specific Tests
```bash
npm run test:chrome            # Chrome only
npm run test:safari            # Safari only
npm run test:firefox           # Firefox only
npm run test:mobile            # All mobile browsers
```

### View Results
```bash
npm run test:report            # HTML report (opens in browser)
npm run test:ui                # Interactive test UI
cat ../test-results-summary.md # Markdown summary
cat ../QA_TESTING_STATUS.md    # Full dashboard
```

## Test File Locations

- **Smoke Tests**: `tests/e2e/smoke.spec.js`
- **Auth Tests**: `tests/e2e/auth.spec.js`
- **Navigation Tests**: `tests/e2e/navigation.spec.js`
- **Group Tests**: `tests/e2e/groups.spec.js`
- **Config**: `playwright.config.js`
- **Quick Runner**: `tests/quick-test.mjs`

## Browser Coverage

✅ Chrome Desktop  
✅ Firefox Desktop  
✅ Safari Desktop  
✅ Safari iOS (iPhone 14 Pro)  
✅ Chrome iOS (iPhone 14 Pro)  
✅ Chrome Android (Pixel 7)  
✅ Safari iPad (iPad Pro)

## Test Statistics

- **Total Test Cases**: 238
- **Test Suites**: 4
- **Browser Configs**: 7
- **Execution Commands**: 11

## Debugging Failed Tests

1. Run with headed mode to watch:
   ```bash
   npx playwright test --headed
   ```

2. Run single test file:
   ```bash
   npx playwright test smoke.spec.js
   ```

3. Run specific test by name:
   ```bash
   npx playwright test -g "login page"
   ```

4. Debug mode (pauses on failure):
   ```bash
   npx playwright test --debug
   ```

5. View last run report:
   ```bash
   npm run test:report
   ```

## Environment Variables

Set in `.env.test`:
```bash
TEST_URL=https://trafficjamz.com          # Production
TEST_USER_EMAIL=test@trafficjamz.com      #  Test account
TEST_USER_PASSWORD=YourPassword123!       # Test password
```

## Common Issues & Solutions

### "Project not found" error
→ Make sure you're in `jamz-client-vite/` directory

### Tests timing out
→ Increase timeout in `playwright.config.js` or use `--timeout=60000`

### Browser not installed
→ Run `npx playwright install`

### Tests failing inconsistently
→ Run with `--workers=1` for serial execution

## CI/CD Integration (Coming Soon)

Will be configured to run on:
- Every pull request
- Every merge to main
- Daily at 2 AM
- Manual trigger from GitHub Actions

## Documentation

- **Full Dashboard**: `QA_TESTING_STATUS.md`
- **Implementation Summary**: `QA_IMPLEMENTATION_SUMMARY.md`
- **Project Log**: `project.log.md`
- **Test Reports**: `test-results-summary.md` (auto-generated)

## Support

For issues or questions:
1. Check `QA_TESTING_STATUS.md` for known issues
2. Review test output in terminal
3. Check HTML report: `npm run test:report`
4. View videos/screenshots in `test-results/` folder

---

**Last Updated**: March 14, 2026  
**Status**: ✅ Fully Operational
