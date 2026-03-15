import { defineConfig, devices } from '@playwright/test';

/**
 * TrafficJamz Automated Testing Configuration
 * Tests all critical user flows across browsers and devices
 */
export default defineConfig({
  testDir: './tests/e2e',
  
  // Maximum time one test can run
  timeout: 60 * 1000,
  
  // Test configuration
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'test-reports/html' }],
    ['json', { outputFile: 'test-reports/results.json' }],
    ['list']
  ],
  
  // Shared settings for all tests
  use: {
    // Base URL for tests
    baseURL: process.env.TEST_URL || 'http://localhost:5174',
    
    // Collect trace on failure
    trace: 'on-first-retry',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video on failure
    video: 'retain-on-failure',
  },

  // Test projects for different browsers
  projects: [
    // Desktop Browsers
    {
      name: 'chromium-desktop',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      },
    },
    {
      name: 'firefox-desktop',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 }
      },
    },
    {
      name: 'webkit-desktop',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 }
      },
    },

    // Mobile Browsers (iPhone)
    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 14 Pro'],
      },
    },
    {
      name: 'mobile-chrome-ios',
      use: { 
        ...devices['iPhone 14 Pro'],
        // Chrome iOS uses WebKit engine
        browserName: 'webkit'
      },
    },

    // Mobile Browsers (Android)
    {
      name: 'mobile-chrome-android',
      use: { 
        ...devices['Pixel 7'],
      },
    },

    // Tablet
    {
      name: 'tablet-ipad',
      use: { 
        ...devices['iPad Pro'],
      },
    },

    // Electron Desktop App
    {
      name: 'electron',
      use: {
        viewport: { width: 1400, height: 900 },
        // Electron tests will use the _electron fixture
      },
      testMatch: /.*electron.*\.spec\.js/,
    },
  ],

  // Web server configuration (only for local testing)
  // Don't start dev server if testing against external URL
  webServer: (process.env.CI || process.env.TEST_URL) ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:5174',
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
});
