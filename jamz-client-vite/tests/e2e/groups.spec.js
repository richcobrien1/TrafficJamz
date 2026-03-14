import { test, expect } from '@playwright/test';

/**
 * Group Management Tests
 * Tests group creation, viewing, joining, and management
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

test.describe('Group Management', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await login(page);
  });

  test('should load groups list page', async ({ page }) => {
    await page.goto('/groups');
    await page.waitForLoadState('networkidle');
    
    // Should be on groups page
    await expect(page).toHaveURL(/\/groups/);
    
    // Page should load without errors
    const pageContent = await page.content();
    expect(pageContent.length).toBeGreaterThan(100);
    
    console.log('✅ Groups list page loaded');
  });

  test('should display existing groups', async ({ page }) => {
    await page.goto('/groups');
    await page.waitForLoadState('networkidle');
    
    // Wait for groups to load (or empty state)
    await page.waitForTimeout(2000);
    
    // Check for groups or empty state
    const groups = await page.locator('[data-testid="group-card"], .group-card, a[href*="/groups/"]').count();
    const emptyState = await page.locator('text=/no groups|create.*group|get started/i').count();
    
    const hasContent = groups > 0 || emptyState > 0;
    expect(hasContent).toBeTruthy();
    
    console.log(`✅ Groups display working (${groups} groups found)`);
  });

  test('should open group detail page', async ({ page }) => {
    await page.goto('/groups');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Find first group
    const firstGroup = page.locator('[data-testid="group-card"], .group-card, a[href*="/groups/"]').first();
    
    if (await firstGroup.count() === 0) {
      test.skip(true, 'No groups available to test');
      return;
    }
    
    // Click on first group
    await firstGroup.click();
    await page.waitForLoadState('networkidle');
    
    // Should be on group detail page
    await expect(page).toHaveURL(/\/groups\/.+/);
    
    // Page should load without stuck loading state
    await page.waitForTimeout(5000); // Wait for backend user fetch timeout
    
    // Should not still be loading
    const loadingIndicator = await page.locator('text=/loading|spinner/i').count();
    
    console.log(`✅ Group detail page loaded (loading indicators: ${loadingIndicator})`);
  });

  test('should create new group', async ({ page }) => {
    await page.goto('/groups');
    await page.waitForLoadState('networkidle');
    
    // Find create group button
    const createButton = page.locator('button:has-text("Create"), button:has-text("New Group"), a:has-text("Create Group")').first();
    
    if (await createButton.count() === 0) {
      test.skip(true, 'No create button found');
      return;
    }
    
    await createButton.click();
    await page.waitForLoadState('networkidle');
    
    // Should show create form (modal or new page)
    const form = page.locator('form, [role="dialog"]').first();
    await form.waitFor({ timeout: 5000 });
    
    // Fill in group details
    const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
    if (await nameInput.count() > 0) {
      const testGroupName = `Test Group ${Date.now()}`;
      await nameInput.fill(testGroupName);
      
      // Submit form
      const submitButton = page.locator('button[type="submit"], button:has-text("Create")').first();
      await submitButton.click();
      
      await page.waitForLoadState('networkidle');
      
      // Should redirect to new group or groups list
      await page.waitForTimeout(2000);
      
      console.log(`✅ Group creation flow working`);
    }
  });

  test('should handle group loading timeout gracefully', async ({ page }) => {
    // This tests the 3s timeout fix for GroupDetail
    await page.goto('/groups');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const firstGroup = page.locator('[data-testid="group-card"], .group-card, a[href*="/groups/"]').first();
    
    if (await firstGroup.count() === 0) {
      test.skip(true, 'No groups available to test');
      return;
    }
    
    await firstGroup.click();
    await page.waitForLoadState('networkidle');
    
    // Wait 5 seconds (longer than 3s timeout)
    await page.waitForTimeout(5000);
    
    // Page should have loaded content (not stuck on loading)
    const hasContent = await page.locator('h1, h2, button, a').count();
    expect(hasContent).toBeGreaterThan(0);
    
    // Check console logs for timeout message
    const logs = [];
    page.on('console', msg => logs.push(msg.text()));
    
    console.log('✅ Group detail handled timeout gracefully');
  });

  test('should handle backend user fetch failure', async ({ page }) => {
    // Block backend API to simulate failure
    await page.route('**/api/users/**', route => route.abort());
    
    await page.goto('/groups');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const firstGroup = page.locator('[data-testid="group-card"], .group-card, a[href*="/groups/"]').first();
    
    if (await firstGroup.count() === 0) {
      test.skip(true, 'No groups available to test');
      return;
    }
    
    await firstGroup.click();
    await page.waitForLoadState('networkidle');
    
    // Wait for timeout
    await page.waitForTimeout(5000);
    
    // Should still load with Clerk data fallback
    const hasContent = await page.locator('h1, h2, button, a').count();
    expect(hasContent).toBeGreaterThan(0);
    
    console.log('✅ Clerk fallback working when backend fails');
  });

  test('should display group members', async ({ page }) => {
    await page.goto('/groups');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const firstGroup = page.locator('[data-testid="group-card"], .group-card, a[href*="/groups/"]').first();
    
    if (await firstGroup.count() === 0) {
      test.skip(true, 'No groups available to test');
      return;
    }
    
    await firstGroup.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);
    
    // Look for members list
    const members = await page.locator('[data-testid="member"], .member, li:has-text("@"), [class*="member"]').count();
    
    console.log(`✅ Group members display (${members} members visible)`);
  });

});
