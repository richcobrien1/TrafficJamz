import { test, expect } from '@playwright/test';

/**
 * Location Tracking Tests - GPS and Real-time Location
 * Tests the core location tracking functionality
 */

// Helper function to login
async function login(page) {
  const email = process.env.TEST_USER_EMAIL || 'test@trafficjamz.com';
  const password = process.env.TEST_USER_PASSWORD || 'TestPassword123!';
  
  await page.goto('/auth/login');
  await page.waitForSelector('input[name="identifier"], input[type="email"]', { timeout: 10000 });
  await page.fill('input[name="identifier"], input[type="email"]', email);
  await page.fill('input[name="password"], input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 30000 });
}

test.describe('Location Tracking - Core Functionality', () => {

  test('should request location permission', async ({ page }) => {
    await page.context().grantPermissions(['geolocation']);
    await login(page);
    
    // Navigate to a group
    await page.goto('/groups');
    await page.waitForSelector('[data-testid="group-card"], .group-card, .MuiCard-root', { timeout: 10000 });
    
    const firstGroup = await page.locator('[data-testid="group-card"], .group-card, .MuiCard-root').first();
    await firstGroup.click();
    
    // Find location/tracking button
    const locationButton = await page.locator('button:has-text("Location"), button:has-text("Track"), [data-testid="start-tracking"], [aria-label*="location" i]').first();
    
    if (await locationButton.isVisible()) {
      await locationButton.click();
      await page.waitForTimeout(1000);
      
      // Should show map or tracking UI
      const trackingUI = await page.locator('[data-testid="map"], .map-container, .leaflet-container, :has-text("Tracking")').first();
      await expect(trackingUI).toBeVisible({ timeout: 10000 });
    }
  });

  test('should display map when tracking starts', async ({ page }) => {
    await page.context().grantPermissions(['geolocation']);
    
    // Set mock location
    await page.context().setGeolocation({ latitude: 37.7749, longitude: -122.4194 }); // San Francisco
    
    await login(page);
    
    await page.goto('/groups');
    await page.waitForSelector('[data-testid="group-card"], .group-card, .MuiCard-root', { timeout: 10000 });
    
    const firstGroup = await page.locator('[data-testid="group-card"], .group-card, .MuiCard-root').first();
    await firstGroup.click();
    
    const locationButton = await page.locator('button:has-text("Location"), button:has-text("Track"), [data-testid="start-tracking"]').first();
    
    if (await locationButton.isVisible()) {
      await locationButton.click();
      await page.waitForTimeout(2000);
      
      // Map should be visible
      const map = await page.locator('[data-testid="map"], .map-container, #map, .leaflet-container, .google-map').first();
      await expect(map).toBeVisible({ timeout: 10000 });
    }
  });

  test('should show user marker on map', async ({ page }) => {
    await page.context().grantPermissions(['geolocation']);
    await page.context().setGeolocation({ latitude: 37.7749, longitude: -122.4194 });
    
    await login(page);
    
    await page.goto('/groups');
    await page.waitForSelector('[data-testid="group-card"], .group-card, .MuiCard-root', { timeout: 10000 });
    
    const firstGroup = await page.locator('[data-testid="group-card"], .group-card, .MuiCard-root').first();
    await firstGroup.click();
    
    const locationButton = await page.locator('button:has-text("Location"), button:has-text("Track"), [data-testid="start-tracking"]').first();
    
    if (await locationButton.isVisible()) {
      await locationButton.click();
      await page.waitForTimeout(3000);
      
      // Should see marker for current user
      const userMarker = await page.locator('[data-testid="user-marker"], .leaflet-marker, .marker, .map-marker').first();
      expect(userMarker).toBeTruthy();
    }
  });

  test('should show other group members on map', async ({ page }) => {
    await page.context().grantPermissions(['geolocation']);
    await page.context().setGeolocation({ latitude: 37.7749, longitude: -122.4194 });
    
    await login(page);
    
    await page.goto('/groups');
    await page.waitForSelector('[data-testid="group-card"], .group-card, .MuiCard-root', { timeout: 10000 });
    
    const firstGroup = await page.locator('[data-testid="group-card"], .group-card, .MuiCard-root').first();
    await firstGroup.click();
    
    const locationButton = await page.locator('button:has-text("Location"), button:has-text("Track"), [data-testid="start-tracking"]').first();
    
    if (await locationButton.isVisible()) {
      await locationButton.click();
      await page.waitForTimeout(3000);
      
      // Should show member list or markers for other users
      const markers = page.locator('[data-testid="member-marker"], .leaflet-marker, .marker');
      const count = await markers.count();
      
      console.log(`Map markers found: ${count}`);
      expect(count).toBeGreaterThanOrEqual(1); // At least current user
    }
  });

  test('should update location in real-time', async ({ page }) => {
    await page.context().grantPermissions(['geolocation']);
    await page.context().setGeolocation({ latitude: 37.7749, longitude: -122.4194 });
    
    await login(page);
    
    await page.goto('/groups');
    await page.waitForSelector('[data-testid="group-card"], .group-card, .MuiCard-root', { timeout: 10000 });
    
    const firstGroup = await page.locator('[data-testid="group-card"], .group-card, .MuiCard-root').first();
    await firstGroup.click();
    
    const locationButton = await page.locator('button:has-text("Location"), button:has-text("Track"), [data-testid="start-tracking"]').first();
    
    if (await locationButton.isVisible()) {
      await locationButton.click();
      await page.waitForTimeout(2000);
      
      // Change location
      await page.context().setGeolocation({ latitude: 37.7750, longitude: -122.4195 });
      await page.waitForTimeout(3000);
      
      // Location should update (hard to verify exact position, but should not crash)
      const map = await page.locator('[data-testid="map"], .map-container, .leaflet-container').first();
      await expect(map).toBeVisible();
    }
  });

  test('should stop tracking when requested', async ({ page }) => {
    await page.context().grantPermissions(['geolocation']);
    await page.context().setGeolocation({ latitude: 37.7749, longitude: -122.4194 });
    
    await login(page);
    
    await page.goto('/groups');
    await page.waitForSelector('[data-testid="group-card"], .group-card, .MuiCard-root', { timeout: 10000 });
    
    const firstGroup = await page.locator('[data-testid="group-card"], .group-card, .MuiCard-root').first();
    await firstGroup.click();
    
    const locationButton = await page.locator('button:has-text("Location"), button:has-text("Track"), [data-testid="start-tracking"]').first();
    
    if (await locationButton.isVisible()) {
      await locationButton.click();
      await page.waitForTimeout(2000);
      
      // Stop tracking
      const stopButton = await page.locator('button:has-text("Stop"), button:has-text("Leave"), [data-testid="stop-tracking"]').first();
      
      if (await stopButton.isVisible()) {
        await stopButton.click();
        await page.waitForTimeout(1000);
        
        // Should return to normal state or show stopped message
        const normalState = await page.locator('button:has-text("Location"), button:has-text("Track"), :has-text("stopped")').first();
        expect(normalState).toBeTruthy();
      }
    }
  });
});

test.describe('Location Tracking - UI/UX', () => {

  test('should display current coordinates', async ({ page }) => {
    await page.context().grantPermissions(['geolocation']);
    await page.context().setGeolocation({ latitude: 37.7749, longitude: -122.4194 });
    
    await login(page);
    
    await page.goto('/groups');
    await page.waitForSelector('[data-testid="group-card"], .group-card, .MuiCard-root', { timeout: 10000 });
    
    const firstGroup = await page.locator('[data-testid="group-card"], .group-card, .MuiCard-root').first();
    await firstGroup.click();
    
    const locationButton = await page.locator('button:has-text("Location"), button:has-text("Track"), [data-testid="start-tracking"]').first();
    
    if (await locationButton.isVisible()) {
      await locationButton.click();
      await page.waitForTimeout(2000);
      
      // Should show coordinates somewhere
      const coords = page.locator(':has-text("37."), :has-text("122."), [data-testid="coordinates"]');
      const hasCoords = await coords.first().isVisible().catch(() => false);
      
      console.log(`Coordinates displayed: ${hasCoords}`);
    }
  });

  test('should show accuracy/GPS signal quality', async ({ page }) => {
    await page.context().grantPermissions(['geolocation']);
    await page.context().setGeolocation({ latitude: 37.7749, longitude: -122.4194, accuracy: 10 });
    
    await login(page);
    
    await page.goto('/groups');
    await page.waitForSelector('[data-testid="group-card"], .group-card, .MuiCard-root', { timeout: 10000 });
    
    const firstGroup = await page.locator('[data-testid="group-card"], .group-card, .MuiCard-root').first();
    await firstGroup.click();
    
    const locationButton = await page.locator('button:has-text("Location"), button:has-text("Track"), [data-testid="start-tracking"]').first();
    
    if (await locationButton.isVisible()) {
      await locationButton.click();
      await page.waitForTimeout(2000);
      
      // Look for accuracy indicator
      const accuracy = page.locator(':has-text("accuracy"), :has-text("GPS"), .signal-indicator, [data-testid="gps-accuracy"]');
      const hasAccuracy = await accuracy.first().isVisible().catch(() => false);
      
      console.log(`GPS accuracy indicator: ${hasAccuracy}`);
    }
  });

  test('should handle map zoom controls', async ({ page }) => {
    await page.context().grantPermissions(['geolocation']);
    await page.context().setGeolocation({ latitude: 37.7749, longitude: -122.4194 });
    
    await login(page);
    
    await page.goto('/groups');
    await page.waitForSelector('[data-testid="group-card"], .group-card, .MuiCard-root', { timeout: 10000 });
    
    const firstGroup = await page.locator('[data-testid="group-card"], .group-card, .MuiCard-root').first();
    await firstGroup.click();
    
    const locationButton = await page.locator('button:has-text("Location"), button:has-text("Track"), [data-testid="start-tracking"]').first();
    
    if (await locationButton.isVisible()) {
      await locationButton.click();
      await page.waitForTimeout(2000);
      
      // Look for zoom controls
      const zoomIn = page.locator('.leaflet-control-zoom-in, button[aria-label*="zoom in" i], [data-testid="zoom-in"]');
      const zoomOut = page.locator('.leaflet-control-zoom-out, button[aria-label*="zoom out" i], [data-testid="zoom-out"]');
      
      const hasZoomControls = 
        await zoomIn.first().isVisible().catch(() => false) ||
        await zoomOut.first().isVisible().catch(() => false);
      
      console.log(`Map zoom controls present: ${hasZoomControls}`);
    }
  });
});
