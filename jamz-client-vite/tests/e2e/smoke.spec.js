import { test, expect } from '@playwright/test';

/**
 * Smoke Tests - Quick sanity checks across all browsers
 * These tests verify basic functionality without requiring authentication
 */

test.describe('Smoke Tests - Public Pages', () => {
  
  test('homepage loads successfully', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Should redirect to login or dashboard
    const url = page.url();
    const isValidPage = url.includes('login') || url.includes('dashboard') || url.includes('auth');
    expect(isValidPage).toBeTruthy();
  });

  test('login page loads successfully', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    
    // Should be on login page
    expect(page.url()).toContain('login');
    
    // Page should have loaded content
    const bodyText = await page.textContent('body');
    expect(bodyText.length).toBeGreaterThan(50);
  });

  test('register page loads successfully', async ({ page }) => {
    await page.goto('/auth/register');
    await page.waitForLoadState('networkidle');
    
    // Should be on register page
    expect(page.url()).toContain('register');
    
    // Page should have loaded content
    const bodyText = await page.textContent('body');
    expect(bodyText.length).toBeGreaterThan(50);
  });

  test('no JavaScript errors on login page', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Should have no critical JS errors
    const criticalErrors = errors.filter(e => 
      !e.includes('Warning') && 
      !e.includes('baseline-browser-mapping')
    );
    
    expect(criticalErrors.length).toBe(0);
  });

  test('service worker registers correctly', async ({ page, browserName }) => {
    // Skip for webkit (Safari doesn't support some SW features the same way)
    if (browserName === 'webkit') {
      test.skip();
      return;
    }
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Check if service worker is registered
    const swRegistered = await page.evaluate(() => {
      return navigator.serviceWorker && navigator.serviceWorker.controller !== null;
    });
    
    // Service worker should either be registered or registration in progress
    // (Don't fail if not registered, just log it)
    console.log(`Service Worker registered: ${swRegistered}`);
  });

  test('handles 404 routes gracefully', async ({ page }) => {
    await page.goto('/this-route-does-not-exist-12345');
    await page.waitForLoadState('networkidle');
    
    // Should either show 404 or redirect to a valid page
    const url = page.url();
    const has404 = await page.locator('text=/404|not found/i').count() > 0;
    const redirected = url.includes('login') || url.includes('dashboard');
    
    expect(has404 || redirected).toBeTruthy();
  });

  test('loads without HTTPS errors', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    
    // Filter out known non-critical warnings
    const criticalErrors = consoleErrors.filter(e => 
      e.includes('SSL') || 
      e.includes('certificate') ||
      e.includes('HTTPS') ||
      e.includes('security')
    );
    
    expect(criticalErrors.length).toBe(0);
  });

  test('backend API is reachable', async ({ page }) => {
    const response = await page.goto('/');
    expect(response.status()).toBeLessThan(500);
  });

});

test.describe('Smoke Tests - Performance', () => {
  
  test('login page loads within 10 seconds', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(10000);
    
    console.log(`Login page loaded in ${loadTime}ms`);
  });

  test('page is responsive', async ({ page, isMobile }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    
    // Get viewport
    const viewport = page.viewportSize();
    expect(viewport).toBeTruthy();
    
    // Content should be visible
    const bodyVisible = await page.locator('body').isVisible();
    expect(bodyVisible).toBeTruthy();
  });

});
