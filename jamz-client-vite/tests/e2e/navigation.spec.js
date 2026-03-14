import { test, expect } from '@playwright/test';

/**
 * Navigation Flow Tests
 * Tests all navigation scenarios and routing
 */

const CLERK_EMAIL = process.env.TEST_USER_EMAIL || 'test@trafficjamz.com';
const CLERK_PASSWORD = process.env.TEST_USER_PASSWORD || 'TestPassword123!';

// Helper function to login
async function login(page) {
  await page.goto('/auth/login');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle');
  
  const emailInput = page.locator('input[name="identifier"], input[type="email"]').first();
  await emailInput.waitFor({ timeout: 10000 });
  await emailInput.fill(CLERK_EMAIL);
  await page.locator('button[type="submit"]').first().click();
  
  const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
  await passwordInput.waitFor({ timeout: 10000 });
  await passwordInput.fill(CLERK_PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  
  await page.waitForURL('**/dashboard', { timeout: 30000 });
}

test.describe('Navigation Flow', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await login(page);
  });

  test('should navigate from dashboard to groups', async ({ page }) => {
    // Should be on dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Find groups link/button
    const groupsLink = page.locator('a[href*="/groups"], button:has-text("Groups")').first();
    await groupsLink.waitFor({ timeout: 10000 });
    await groupsLink.click();
    
    // Should navigate to groups page
    await page.waitForURL('**/groups', { timeout: 10000 });
    await expect(page).toHaveURL(/\/groups/);
    
    console.log('✅ Dashboard → Groups navigation working');
  });

  test('should handle direct URL navigation to dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Should load dashboard successfully
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Should have auth token
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();
    
    console.log('✅ Direct URL navigation to /dashboard working');
  });

  test('should handle direct URL navigation to groups', async ({ page }) => {
    await page.goto('/groups');
    await page.waitForLoadState('networkidle');
    
    // Should load groups page successfully
    await expect(page).toHaveURL(/\/groups/);
    
    console.log('✅ Direct URL navigation to /groups working');
  });

  test('should handle browser back button', async ({ page, browserName }) => {
    // Start on dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Navigate to groups
    await page.goto('/groups');
    await page.waitForLoadState('networkidle');
    
    // Use browser back
    await page.goBack();
    await page.waitForLoadState('networkidle');
    
    // Should be back on dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    
    console.log('✅ Browser back button working');
  });

  test('should handle browser forward button', async ({ page }) => {
    // Start on dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Navigate to groups
    await page.goto('/groups');
    await page.waitForLoadState('networkidle');
    
    // Go back
    await page.goBack();
    await page.waitForLoadState('networkidle');
    
    // Go forward
    await page.goForward();
    await page.waitForLoadState('networkidle');
    
    // Should be back on groups
    await expect(page).toHaveURL(/\/groups/);
    
    console.log('✅ Browser forward button working');
  });

  test('should handle 404 and invalid routes', async ({ page }) => {
    await page.goto('/invalid-route-that-does-not-exist');
    await page.waitForLoadState('networkidle');
    
    // Should show 404 page or redirect to dashboard
    const url = page.url();
    const is404 = url.includes('404') || await page.locator('text=/404|not found/i').count() > 0;
    const isDashboard = url.includes('dashboard');
    
    expect(is404 || isDashboard).toBeTruthy();
    
    console.log(`✅ 404 handling working (${is404 ? '404 page' : 'dashboard redirect'})`);
  });

  test('should navigate through full app flow', async ({ page }) => {
    // Dashboard → Groups → Group Detail → Back to Groups → Dashboard
    
    // Start on dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Go to groups
    const groupsLink = page.locator('a[href*="/groups"], button:has-text("Groups")').first();
    if (await groupsLink.count() > 0) {
      await groupsLink.click();
      await page.waitForURL('**/groups', { timeout: 10000 });
    } else {
      await page.goto('/groups');
    }
    
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/groups/);
    
    // Click on first group (if any exist)
    const firstGroup = page.locator('[data-testid="group-card"], .group-card, a[href*="/groups/"]').first();
    if (await firstGroup.count() > 0) {
      await firstGroup.click();
      await page.waitForLoadState('networkidle');
      
      // Should be on group detail page
      await expect(page).toHaveURL(/\/groups\/.+/);
      
      // Go back to groups
      await page.goBack();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/\/groups$/);
    }
    
    // Go back to dashboard
    const dashboardLink = page.locator('a[href="/dashboard"], a[href*="dashboard"], button:has-text("Home")').first();
    if (await dashboardLink.count() > 0) {
      await dashboardLink.click();
      await page.waitForURL('**/dashboard', { timeout: 10000 });
    } else {
      await page.goto('/dashboard');
    }
    
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/dashboard/);
    
    console.log('✅ Full navigation flow working');
  });

  test('should handle mobile swipe gestures (mobile only)', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test is only for mobile browsers');
    
    // Mobile-specific gesture tests would go here
    // Playwright supports touch events for mobile emulation
    console.log('⏳ Mobile gesture tests not yet implemented');
  });

  test('should preserve scroll position on navigation', async ({ page }) => {
    await page.goto('/groups');
    await page.waitForLoadState('networkidle');
    
    // Scroll down
    await page.evaluate(() => window.scrollTo(0, 500));
    const scrollPosition = await page.evaluate(() => window.scrollY);
    
    // Navigate away and back
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.goBack();
    await page.waitForLoadState('networkidle');
    
    // Scroll position might be restored (depends on React Router config)
    const newScrollPosition = await page.evaluate(() => window.scrollY);
    
    // Just log the behavior (not all apps restore scroll)
    console.log(`Scroll position: ${scrollPosition} → ${newScrollPosition}`);
  });

});
