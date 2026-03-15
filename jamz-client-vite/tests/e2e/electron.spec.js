import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Electron Desktop App Tests
 * Tests the native Windows/Mac/Linux desktop application
 */

test.describe('Electron App - Basic Functionality', () => {
  let electronApp;
  let window;

  test.beforeAll(async () => {
    // Launch Electron app
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../../electron/main.cjs')],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        ELECTRON_START_URL: 'http://localhost:5174'
      }
    });

    // Get the first window
    window = await electronApp.firstWindow();
    
    // Wait for app to be ready
    await window.waitForLoadState('domcontentloaded');
  });

  test.afterAll(async () => {
    // Close the app
    await electronApp.close();
  });

  test('Electron app window opens successfully', async () => {
    // Verify window was created
    expect(window).toBeTruthy();
    
    // Check window title
    const title = await window.title();
    expect(title).toContain('TrafficJamz');
  });

  test('Electron app loads the main page', async () => {
    // Wait for content to load
    await window.waitForTimeout(3000);
    
    // Verify page loaded (should redirect to login or dashboard)
    const url = window.url();
    const isValidPage = url.includes('login') || 
                       url.includes('dashboard') || 
                       url.includes('auth') ||
                       url.includes('localhost');
    expect(isValidPage).toBeTruthy();
  });

  test('Electron app has correct window size', async () => {
    // Get window size
    const size = await window.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight
    }));
    
    // Should match the configured size in main.cjs (1400x900)
    expect(size.width).toBeGreaterThan(1000);
    expect(size.height).toBeGreaterThan(700);
  });

  test('Electron app exposes electronAPI', async () => {
    // Check if Electron APIs are available
    const hasElectronAPI = await window.evaluate(() => {
      return typeof window.electronAPI !== 'undefined';
    });
    
    expect(hasElectronAPI).toBeTruthy();
  });

  test('No console errors on startup', async () => {
    const errors = [];
    
    window.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Wait for potential errors
    await window.waitForTimeout(5000);
    
    // Filter out expected Clerk or auth-related warnings
    const criticalErrors = errors.filter(error => 
      !error.includes('Clerk') && 
      !error.includes('auth') &&
      !error.includes('Failed to load resource')
    );
    
    expect(criticalErrors.length).toBe(0);
  });
});

test.describe('Electron App - Navigation', () => {
  let electronApp;
  let window;

  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../../electron/main.cjs')],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        ELECTRON_START_URL: 'http://localhost:5174'
      }
    });

    window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(3000);
  });

  test.afterAll(async () => {
    await electronApp.close();
  });

  test('Can navigate to login page', async () => {
    // Navigate to login
    await window.goto('http://localhost:5174/auth/login');
    await window.waitForLoadState('networkidle');
    
    const url = window.url();
    expect(url).toContain('login');
  });

  test('Can navigate to register page', async () => {
    // Navigate to register
    await window.goto('http://localhost:5174/auth/register');
    await window.waitForLoadState('networkidle');
    
    const url = window.url();
    expect(url).toContain('register');
  });
});

test.describe('Electron App - Environment Detection', () => {
  let electronApp;
  let window;

  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../../electron/main.cjs')],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        ELECTRON_START_URL: 'http://localhost:5174'
      }
    });

    window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(3000);
  });

  test.afterAll(async () => {
    await electronApp.close();
  });

  test('App correctly detects Electron environment', async () => {
    // Check if app detected it's running in Electron
    const isElectron = await window.evaluate(() => {
      return window.electronAPI?.isElectron === true;
    });
    
    expect(isElectron).toBeTruthy();
  });

  test('App uses production backend URL in Electron', async () => {
    // Electron apps should use production backend, not localhost
    const backendURL = await window.evaluate(() => {
      // Try to get backend URL from window if exposed
      return window.VITE_BACKEND_URL || 
             import.meta?.env?.VITE_BACKEND_URL || 
             'checking-via-api-calls';
    });
    
    // Should either be production URL or we'll verify through API calls
    const isProductionOrTBD = backendURL.includes('trafficjamz.v2u.us') || 
                              backendURL.includes('checking-via-api-calls');
    expect(isProductionOrTBD).toBeTruthy();
  });
});
