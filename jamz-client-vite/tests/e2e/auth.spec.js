import { test, expect } from '@playwright/test';

/**
 * Authentication Flow Tests
 * Tests all authentication scenarios across different browsers
 */

// Test configuration
const CLERK_EMAIL = process.env.TEST_USER_EMAIL || 'test@trafficjamz.com';
const CLERK_PASSWORD = process.env.TEST_USER_PASSWORD || 'TestPassword123!';

test.describe('Authentication Flow', () => {
  
  test.beforeEach(async ({ page, context }) => {
    // Clear all cookies before each test
    await context.clearCookies();
    // Navigate to login page (which doesn't require auth)
    await page.goto('/auth/login');
    await page.waitForLoadState('domcontentloaded');
    // Now clear storage
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        // Ignore if storage not accessible
      }
    });
  });

  test('should load login page', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check if Clerk SignIn component loaded
    await expect(page.locator('[data-testid="sign-in-container"]').or(page.locator('form'))).toBeVisible({ timeout: 10000 });
    
    console.log('✅ Login page loaded successfully');
  });

  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should redirect to login
    await page.waitForURL('**/auth/login', { timeout: 10000 });
    
    // Verify we're on login page
    await expect(page).toHaveURL(/\/auth\/login/);
    
    console.log('✅ Unauthenticated redirect working');
  });

  test('should complete email + password login', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    
    // Fill in email
    const emailInput = page.locator('input[name="identifier"], input[type="email"]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await emailInput.fill(CLERK_EMAIL);
    
    // Click continue or submit
    await page.locator('button[type="submit"]').first().click();
    
    // Wait for password field (might be on same or next screen)
    const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
    await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
    await passwordInput.fill(CLERK_PASSWORD);
    
    // Submit
    await page.locator('button[type="submit"]').first().click();
    
    // After login, should redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 30000 });
    
    // Verify we're on dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Verify token exists
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();
    
    console.log('✅ Email + Password login successful');
  });

  test('should handle MFA verification', async ({ page, browserName }) => {
    // This test requires MFA to be enabled for test account
    test.skip(true, 'MFA test requires manual intervention for OTP code');
    
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    
    // Login flow...
    const emailInput = page.locator('input[name="identifier"], input[type="email"]').first();
    await emailInput.fill(CLERK_EMAIL);
    await page.locator('button[type="submit"]').first().click();
    
    const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
    await passwordInput.waitFor({ timeout: 10000 });
    await passwordInput.fill(CLERK_PASSWORD);
    await page.locator('button[type="submit"]').first().click();
    
    // MFA screen should appear
    const mfaInput = page.locator('input[name="code"], input[type="text"]').first();
    await mfaInput.waitFor({ timeout: 10000 });
    
    // Note: Cannot automate OTP code entry without access to authenticator
    // This would need manual intervention or API access to test OTP provider
    
    console.log('⏳ MFA screen detected (manual OTP entry required)');
  });

  test('should maintain session after reload', async ({ page }) => {
    // First, login
    await page.goto('/auth/login');
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
    
    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Should still be on dashboard (not redirected to login)
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    
    // Token should still exist
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();
    
    console.log('✅ Session persistence working');
  });

  test('should logout successfully', async ({ page }) => {
    // First, login
    await page.goto('/auth/login');
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
    
    // Find and click logout button (might be in menu)
    // First try to find a logout button directly
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), a:has-text("Logout")').first();
    
    if (await logoutButton.count() > 0) {
      await logoutButton.click();
    } else {
      // Try to open user menu first
      const userMenu = page.locator('[aria-label="Account"], [aria-label="User menu"], button[aria-haspopup="menu"]').first();
      if (await userMenu.count() > 0) {
        await userMenu.click();
        await page.locator('button:has-text("Logout"), button:has-text("Sign Out")').first().click();
      }
    }
    
    // Should redirect to login
    await page.waitForURL('**/auth/login', { timeout: 10000 });
    
    // Token should be cleared
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeFalsy();
    
    console.log('✅ Logout successful');
  });

  test('should handle invalid credentials', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    
    const emailInput = page.locator('input[name="identifier"], input[type="email"]').first();
    await emailInput.waitFor({ timeout: 10000 });
    await emailInput.fill('invalid@email.com');
    await page.locator('button[type="submit"]').first().click();
    
    const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
    await passwordInput.waitFor({ timeout: 10000 });
    await passwordInput.fill('WrongPassword123!');
    await page.locator('button[type="submit"]').first().click();
    
    // Should show error message
    const errorMessage = page.locator('[role="alert"], .error, text=/incorrect|invalid|failed/i').first();
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
    
    // Should NOT be on dashboard
    await expect(page).not.toHaveURL(/\/dashboard/);
    
    console.log('✅ Invalid credentials handled correctly');
  });

  test('should register new user', async ({ page }) => {
    // Generate unique email for test
    const testEmail = `test-${Date.now()}@trafficjamz.com`;
    
    await page.goto('/auth/register');
    await page.waitForLoadState('networkidle');
    
    // Fill registration form
    const emailInput = page.locator('input[name="emailAddress"], input[type="email"]').first();
    await emailInput.waitFor({ timeout: 10000 });
    await emailInput.fill(testEmail);
    
    const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
    await passwordInput.fill('TestPassword123!');
    
    // May have confirm password field
    const confirmPassword = page.locator('input[name="confirmPassword"]');
    if (await confirmPassword.count() > 0) {
      await confirmPassword.fill('TestPassword123!');
    }
    
    await page.locator('button[type="submit"]').first().click();
    
    // May require email verification
    // Check if we got to dashboard or verification screen
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    const currentUrl = page.url();
    const isVerification = currentUrl.includes('verify') || currentUrl.includes('verification');
    const isDashboard = currentUrl.includes('dashboard');
    
    expect(isVerification || isDashboard).toBeTruthy();
    
    console.log(`✅ Registration ${isVerification ? 'pending verification' : 'completed'}`);
  });

});
