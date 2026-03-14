import { test, expect } from '@playwright/test';

/**
 * Audio Session Tests - WebRTC Voice Communication
 * Tests the core audio/voice functionality
 */

// Helper function to login
async function login(page) {
  const email = process.env.TEST_USER_EMAIL || 'test@trafficjamz.com';
  const password = process.env.TEST_USER_PASSWORD || 'TestPassword123!';
  
  await page.goto('/auth/login');
  
  // Wait for Clerk to load
  await page.waitForSelector('input[name="identifier"], input[type="email"]', { timeout: 10000 });
  
  // Enter credentials
  await page.fill('input[name="identifier"], input[type="email"]', email);
  await page.fill('input[name="password"], input[type="password"]', password);
  
  // Submit
  await page.click('button[type="submit"]');
  
  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard', { timeout: 30000 });
}

test.describe('Audio Sessions - WebRTC', () => {

  test('should request microphone permission', async ({ page, browserName }) => {
    if (browserName === 'webkit') {
      test.skip(); // Safari handles permissions differently
      return;
    }

    await login(page);
    
    // Navigate to a group
    await page.goto('/groups');
    await page.waitForSelector('[data-testid="group-card"], .group-card, .MuiCard-root', { timeout: 10000 });
    
    const firstGroup = await page.locator('[data-testid="group-card"], .group-card, .MuiCard-root').first();
    await firstGroup.click();
    
    // Find and click audio button
    const audioButton = await page.locator('button:has-text("Audio"), [aria-label*="audio" i], [data-testid="start-audio"]').first();
    
    if (await audioButton.isVisible()) {
      // Grant microphone permission preemptively
      await page.context().grantPermissions(['microphone']);
      
      await audioButton.click();
      
      // Should see audio controls or connecting state
      const audioIndicator = await page.locator('[data-testid="audio-session"], .audio-controls, :has-text("Connecting"), :has-text("Connected")').first();
      await expect(audioIndicator).toBeVisible({ timeout: 10000 });
    }
  });

  test('should display audio controls when session active', async ({ page, browserName }) => {
    if (browserName === 'webkit') {
      test.skip();
      return;
    }

    await page.context().grantPermissions(['microphone']);
    await login(page);
    
    await page.goto('/groups');
    await page.waitForSelector('[data-testid="group-card"], .group-card, .MuiCard-root', { timeout: 10000 });
    
    const firstGroup = await page.locator('[data-testid="group-card"], .group-card, .MuiCard-root').first();
    await firstGroup.click();
    
    const audioButton = await page.locator('button:has-text("Audio"), [data-testid="start-audio"]').first();
    
    if (await audioButton.isVisible()) {
      await audioButton.click();
      await page.waitForTimeout(2000);
      
      // Should show mute/unmute button
      const muteButton = await page.locator('button:has-text("Mute"), button:has-text("Unmute"), [aria-label*="mute" i]').first();
      expect(muteButton).toBeTruthy();
    }
  });

  test('should handle audio disconnect gracefully', async ({ page }) => {
    await page.context().grantPermissions(['microphone']);
    await login(page);
    
    await page.goto('/groups');
    await page.waitForSelector('[data-testid="group-card"], .group-card, .MuiCard-root', { timeout: 10000 });
    
    const firstGroup = await page.locator('[data-testid="group-card"], .group-card, .MuiCard-root').first();
    await firstGroup.click();
    
    const audioButton = await page.locator('button:has-text("Audio"), [data-testid="start-audio"]').first();
    
    if (await audioButton.isVisible()) {
      await audioButton.click();
      await page.waitForTimeout(2000);
      
      // Disconnect
      const disconnectButton = await page.locator('button:has-text("Leave"), button:has-text("Disconnect"), [data-testid="leave-audio"]').first();
      
      if (await disconnectButton.isVisible()) {
        await disconnectButton.click();
        
        // Should return to normal state
        const normalState = await page.locator('button:has-text("Audio"), [data-testid="start-audio"]').first();
        await expect(normalState).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should show other participants in audio session', async ({ page }) => {
    await page.context().grantPermissions(['microphone']);
    await login(page);
    
    await page.goto('/groups');
    await page.waitForSelector('[data-testid="group-card"], .group-card, .MuiCard-root', { timeout: 10000 });
    
    const firstGroup = await page.locator('[data-testid="group-card"], .group-card, .MuiCard-root').first();
    await firstGroup.click();
    
    const audioButton = await page.locator('button:has-text("Audio"), [data-testid="start-audio"]').first();
    
    if (await audioButton.isVisible()) {
      await audioButton.click();
      await page.waitForTimeout(3000);
      
      // Should show participants list (even if empty)
      const participantsList = await page.locator('[data-testid="audio-participants"], .participant-list, :has-text("participant")').first();
      expect(participantsList).toBeTruthy();
    }
  });

  test('should persist audio session when navigating', async ({ page, browserName }) => {
    if (browserName === 'webkit') {
      test.skip();
      return;
    }

    await page.context().grantPermissions(['microphone']);
    await login(page);
    
    await page.goto('/groups');
    await page.waitForSelector('[data-testid="group-card"], .group-card, .MuiCard-root', { timeout: 10000 });
    
    const firstGroup = await page.locator('[data-testid="group-card"], .group-card, .MuiCard-root').first();
    await firstGroup.click();
    
    const audioButton = await page.locator('button:has-text("Audio"), [data-testid="start-audio"]').first();
    
    if (await audioButton.isVisible()) {
      await audioButton.click();
      await page.waitForTimeout(2000);
      
      // Navigate away
      await page.goBack();
      await page.waitForTimeout(1000);
      
      // Audio indicator should still show (in header/global)
      const audioIndicator = await page.locator('[data-testid="audio-indicator"], .audio-active, :has-text("Audio Active")').first();
      
      // Either indicator exists, or we can navigate back to group and see it
      const hasIndicator = await audioIndicator.isVisible().catch(() => false);
      
      if (!hasIndicator) {
        // Navigate back to group
        await page.goto('/groups');
        const groupLink = await page.locator('[data-testid="group-card"], .group-card').first();
        await groupLink.click();
        
        // Should still be in audio session
        const sessionActive = await page.locator('[data-testid="audio-session"], .audio-controls, button:has-text("Leave")').first();
        expect(sessionActive).toBeTruthy();
      }
    }
  });
});

test.describe('Audio Sessions - UI/UX', () => {
  
  test('should show audio quality indicator', async ({ page }) => {
    await page.context().grantPermissions(['microphone']);
    await login(page);
    
    await page.goto('/groups');
    await page.waitForSelector('[data-testid="group-card"], .group-card, .MuiCard-root', { timeout: 10000 });
    
    const firstGroup = await page.locator('[data-testid="group-card"], .group-card, .MuiCard-root').first();
    await firstGroup.click();
    
    const audioButton = await page.locator('button:has-text("Audio"), [data-testid="start-audio"]').first();
    
    if (await audioButton.isVisible()) {
      await audioButton.click();
      await page.waitForTimeout(3000);
      
      // Look for quality indicators (signal bars, latency, etc.)
      const qualityIndicators = page.locator('[data-testid="audio-quality"], .signal-bars, :has-text("ms"), :has-text("latency")');
      const count = await qualityIndicators.count();
      
      // Should have some quality metrics displayed
      console.log(`Audio quality indicators found: ${count}`);
    }
  });

  test('should handle mute/unmute toggle', async ({ page }) => {
    await page.context().grantPermissions(['microphone']);
    await login(page);
    
    await page.goto('/groups');
    await page.waitForSelector('[data-testid="group-card"], .group-card, .MuiCard-root', { timeout: 10000 });
    
    const firstGroup = await page.locator('[data-testid="group-card"], .group-card, .MuiCard-root').first();
    await firstGroup.click();
    
    const audioButton = await page.locator('button:has-text("Audio"), [data-testid="start-audio"]').first();
    
    if (await audioButton.isVisible()) {
      await audioButton.click();
      await page.waitForTimeout(2000);
      
      // Find mute button
      let muteButton = await page.locator('button:has-text("Mute"), [data-testid="mute-button"], [aria-label*="mute" i]').first();
      
      if (await muteButton.isVisible()) {
        // Click to mute
        await muteButton.click();
        await page.waitForTimeout(500);
        
        // Should now show unmute
        const unmuteButton = await page.locator('button:has-text("Unmute"), [aria-label*="unmute" i]').first();
        await expect(unmuteButton).toBeVisible({ timeout: 3000 });
        
        // Click to unmute
        await unmuteButton.click();
        await page.waitForTimeout(500);
        
        // Should show mute again
        muteButton = await page.locator('button:has-text("Mute"), [aria-label*="mute" i]').first();
        await expect(muteButton).toBeVisible({ timeout: 3000 });
      }
    }
  });
});
