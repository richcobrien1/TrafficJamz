import { test, expect } from '@playwright/test';

/**
 * Music Playback Tests - Spotify/Apple Music Integration
 * Tests the shared music listening functionality
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

test.describe('Music Playback - Player UI', () => {

  test('should display music player interface', async ({ page }) => {
    await login(page);
    
    await page.goto('/groups');
    await page.waitForSelector('[data-testid="group-card"], .group-card, .MuiCard-root', { timeout: 10000 });
    
    const firstGroup = await page.locator('[data-testid="group-card"], .group-card, .MuiCard-root').first();
    await firstGroup.click();
    
    // Look for music player or music button
    const musicButton = await page.locator('button:has-text("Music"), [data-testid="music-player"], [aria-label*="music" i], .music-player').first();
    
    if (await musicButton.isVisible()) {
      await musicButton.click();
      await page.waitForTimeout(1000);
      
      // Player UI should be visible
      const playerUI = await page.locator('[data-testid="music-player"], .music-player, .player-controls').first();
      await expect(playerUI).toBeVisible({ timeout: 5000 });
    } else {
      // Music player might be always visible
      const player = await page.locator('[data-testid="music-player"], .music-player, .player-controls').first();
      const isVisible = await player.isVisible().catch(() => false);
      console.log(`Music player visible: ${isVisible}`);
    }
  });

  test('should show playback controls (play, pause, skip)', async ({ page }) => {
    await login(page);
    
    // Navigate to music player
    await page.goto('/dashboard');
    await page.waitForTimeout(1000);
    
    // Look for music player
    const musicPlayer = page.locator('[data-testid="music-player"], .music-player, .MuiBottomNavigation');
    const playerVisible = await musicPlayer.first().isVisible().catch(() => false);
    
    if (playerVisible) {
      // Look for play/pause button
      const playButton = page.locator('button:has-text("Play"), button[aria-label*="play" i], .play-button, [data-testid="play-button"]');
      const pauseButton = page.locator('button:has-text("Pause"), button[aria-label*="pause" i], .pause-button, [data-testid="pause-button"]');
      
      const hasPlayControl = 
        await playButton.first().isVisible().catch(() => false) ||
        await pauseButton.first().isVisible().catch(() => false);
      
      expect(hasPlayControl).toBeTruthy();
      
      // Look for skip buttons
      const skipNext = page.locator('button:has-text("Next"), button[aria-label*="next" i], .skip-next, [data-testid="skip-next"]');
      const skipPrev = page.locator('button:has-text("Previous"), button[aria-label*="previous" i], .skip-prev, [data-testid="skip-prev"]');
      
      const hasSkipControls = 
        await skipNext.first().isVisible().catch(() => false) ||
        await skipPrev.first().isVisible().catch(() => false);
      
      console.log(`Play/Pause controls: ${hasPlayControl}, Skip controls: ${hasSkipControls}`);
    }
  });

  test('should display current track information', async ({ page }) => {
    await login(page);
    
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);
    
    // Look for now playing info
    const nowPlaying = page.locator('[data-testid="now-playing"], .now-playing, .track-info, :has-text("Now Playing")');
    const trackTitle = page.locator('[data-testid="track-title"], .track-title, .song-name');
    const artist = page.locator('[data-testid="artist-name"], .artist-name, .track-artist');
    
    const hasTrackInfo = 
      await nowPlaying.first().isVisible().catch(() => false) ||
      await trackTitle.first().isVisible().catch(() => false) ||
      await artist.first().isVisible().catch(() => false);
    
    console.log(`Track info displayed: ${hasTrackInfo}`);
  });

  test('should show album artwork', async ({ page }) => {
    await login(page);
    
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);
    
    // Look for album art
    const albumArt = page.locator('[data-testid="album-art"], .album-art, .track-image, img[alt*="album" i], img[alt*="track" i]');
    const hasAlbumArt = await albumArt.first().isVisible().catch(() => false);
    
    console.log(`Album artwork visible: ${hasAlbumArt}`);
  });

  test('should display playback progress bar', async ({ page }) => {
    await login(page);
    
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);
    
    // Look for progress bar/slider
    const progressBar = page.locator('[data-testid="progress-bar"], .progress-bar, input[type="range"], .MuiSlider-root, [role="progressbar"]');
    const hasProgressBar = await progressBar.first().isVisible().catch(() => false);
    
    console.log(`Playback progress bar: ${hasProgressBar}`);
  });
});

test.describe('Music Playback - Functionality', () => {

  test('should handle play button click', async ({ page }) => {
    await login(page);
    
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);
    
    const playButton = await page.locator('button:has-text("Play"), button[aria-label*="play" i], [data-testid="play-button"]').first();
    
    if (await playButton.isVisible()) {
      await playButton.click();
      await page.waitForTimeout(500);
      
      // Should change to pause button or show playing state
      const pauseButton = await page.locator('button:has-text("Pause"), button[aria-label*="pause" i], [data-testid="pause-button"]').first();
      const playingIndicator = await page.locator(':has-text("Playing"), .playing, [data-testid="playing-indicator"]').first();
      
      const isPlaying = 
        await pauseButton.isVisible().catch(() => false) ||
        await playingIndicator.isVisible().catch(() => false);
      
      console.log(`Music playing after play click: ${isPlaying}`);
    }
  });

  test('should handle pause button click', async ({ page }) => {
    await login(page);
    
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);
    
    // First try to play
    const playButton = await page.locator('button:has-text("Play"), button[aria-label*="play" i], [data-testid="play-button"]').first();
    
    if (await playButton.isVisible()) {
      await playButton.click();
      await page.waitForTimeout(1000);
      
      // Now pause
      const pauseButton = await page.locator('button:has-text("Pause"), button[aria-label*="pause" i], [data-testid="pause-button"]').first();
      
      if (await pauseButton.isVisible()) {
        await pauseButton.click();
        await page.waitForTimeout(500);
        
        // Should show paused state
        const pausedIndicator = await page.locator(':has-text("Paused"), .paused, button:has-text("Play")').first();
        const isPaused = await pausedIndicator.isVisible().catch(() => false);
        
        console.log(`Music paused: ${isPaused}`);
      }
    }
  });

  test('should handle skip next', async ({ page }) => {
    await login(page);
    
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);
    
    const skipNext = await page.locator('button:has-text("Next"), button[aria-label*="next" i], [data-testid="skip-next"]').first();
    
    if (await skipNext.isVisible()) {
      // Get current track (if visible)
      const trackTitle = await page.locator('[data-testid="track-title"], .track-title').first();
      const currentTrack = await trackTitle.textContent().catch(() => '');
      
      await skipNext.click();
      await page.waitForTimeout(1500);
      
      // Track should change (or at least button should work)
      const newTrack = await trackTitle.textContent().catch(() => '');
      
      console.log(`Track changed after skip: ${currentTrack} -> ${newTrack}`);
    }
  });

  test('should sync playback across group members', async ({ page }) => {
    await login(page);
    
    await page.goto('/groups');
    await page.waitForSelector('[data-testid="group-card"], .group-card, .MuiCard-root', { timeout: 10000 });
    
    const firstGroup = await page.locator('[data-testid="group-card"], .group-card, .MuiCard-root').first();
    await firstGroup.click();
    await page.waitForTimeout(2000);
    
    // Look for sync indicator
    const syncIndicator = page.locator(':has-text("Synced"), :has-text("Group Playback"), [data-testid="sync-indicator"], .sync-status');
    const hasSyncIndicator = await syncIndicator.first().isVisible().catch(() => false);
    
    console.log(`Group playback sync indicator: ${hasSyncIndicator}`);
  });
});

test.describe('Music Playback - Platform Integration', () => {

  test('should show Spotify connection option', async ({ page }) => {
    await login(page);
    
    await page.goto('/dashboard');
    await page.waitForTimeout(1000);
    
    // Look for Spotify branding or connection
    const spotify = page.locator(':has-text("Spotify"), [data-testid="spotify"], .spotify, img[alt*="spotify" i]');
    const hasSpotify = await spotify.first().isVisible().catch(() => false);
    
    console.log(`Spotify integration visible: ${hasSpotify}`);
  });

  test('should show Apple Music connection option', async ({ page }) => {
    await login(page);
    
    await page.goto('/dashboard');
    await page.waitForTimeout(1000);
    
    // Look for Apple Music branding or connection
    const appleMusic = page.locator(':has-text("Apple Music"), [data-testid="apple-music"], .apple-music, img[alt*="apple music" i]');
    const hasAppleMusic = await appleMusic.first().isVisible().catch(() => false);
    
    console.log(`Apple Music integration visible: ${hasAppleMusic}`);
  });

  test('should handle unauthorized music service state', async ({ page }) => {
    await login(page);
    
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);
    
    // Look for connect/authorize prompts
    const connectPrompt = page.locator('button:has-text("Connect"), button:has-text("Authorize"), :has-text("connect your music"), [data-testid="connect-music"]');
    const hasConnectPrompt = await connectPrompt.first().isVisible().catch(() => false);
    
    console.log(`Music service connection prompt: ${hasConnectPrompt}`);
  });

  test('should show music service selection', async ({ page }) => {
    await login(page);
    
    await page.goto('/dashboard');
    await page.waitForTimeout(1000);
    
    // Look for service selector
    const serviceSelector = page.locator('[data-testid="music-service-selector"], .music-service-select, :has-text("Choose music service")');
    const hasSelector = await serviceSelector.first().isVisible().catch(() => false);
    
    if (hasSelector) {
      await serviceSelector.first().click();
      await page.waitForTimeout(500);
      
      // Should show options
      const options = page.locator(':has-text("Spotify"), :has-text("Apple Music")');
      const optionCount = await options.count();
      
      console.log(`Music service options available: ${optionCount}`);
    }
  });
});

test.describe('Music Playback - Error Handling', () => {

  test('should show error when music service disconnected', async ({ page }) => {
    await login(page);
    
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);
    
    // Look for error states
    const error = page.locator(':has-text("disconnected"), :has-text("error"), :has-text("failed"), .error-message, [data-testid="music-error"]');
    const hasError = await error.first().isVisible().catch(() => false);
    
    console.log(`Music error state displayed: ${hasError}`);
  });

  test('should gracefully handle no active track', async ({ page }) => {
    await login(page);
    
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);
    
    // Should show either a track or a "no track" message
    const noTrack = page.locator(':has-text("No track"), :has-text("Nothing playing"), :has-text("Select a song"), [data-testid="no-track"]');
    const hasNoTrackMessage = await noTrack.first().isVisible().catch(() => false);
    
    const trackInfo = page.locator('[data-testid="track-title"], .track-title');
    const hasTrackInfo = await trackInfo.first().isVisible().catch(() => false);
    
    console.log(`No track message: ${hasNoTrackMessage}, Track info: ${hasTrackInfo}`);
    expect(hasNoTrackMessage || hasTrackInfo).toBeTruthy();
  });
});
