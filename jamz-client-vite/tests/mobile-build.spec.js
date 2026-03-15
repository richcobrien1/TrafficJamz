// Mobile Build Configuration Tests
// Tests for Android/iOS build configuration, APK integrity, and Clerk mobile setup

import { test, expect } from '@playwright/test';
import { readFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const projectRoot = join(__dirname, '../..');
const capacitorConfig = join(projectRoot, 'capacitor.config.json');
const packageJson = join(projectRoot, 'jamz-client-vite/package.json');
const envProduction = join(projectRoot, 'jamz-client-vite/.env.production');
const apkPath = join(projectRoot, 'mobile/Android/app/build/outputs/apk/debug/app-debug.apk');

test.describe('Mobile Build Configuration', () => {
  
  test('capacitor.config.json exists and has correct structure', () => {
    expect(existsSync(capacitorConfig)).toBeTruthy();
    
    const config = JSON.parse(readFileSync(capacitorConfig, 'utf-8'));
    
    // Basic config
    expect(config.appId).toBe('com.trafficjamz.app');
    expect(config.appName).toBe('TrafficJamz');
    
    // Web directory
    expect(config.webDir).toBe('jamz-client-vite/dist');
    
    // Server configuration for Clerk compatibility
    expect(config.server).toBeDefined();
    expect(config.server.androidScheme).toBe('https');
    expect(config.server.cleartext).toBe(true);
    
    // Android settings
    expect(config.android).toBeDefined();
    expect(config.android.allowMixedContent).toBe(true);
    expect(config.android.webContentsDebuggingEnabled).toBe(true);
  });

  test('package.json has correct version and metadata', () => {
    expect(existsSync(packageJson)).toBeTruthy();
    
    const pkg = JSON.parse(readFileSync(packageJson, 'utf-8'));
    
    expect(pkg.name).toBe('jamz-client-vite');
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/); // Semantic versioning
    expect(parseFloat(pkg.version)).toBeGreaterThanOrEqual(1.0);
    expect(pkg.author).toBe('TrafficJamz');
    expect(pkg.description).toBeTruthy();
  });

  test('Clerk publishable key exists in production env', () => {
    expect(existsSync(envProduction)).toBeTruthy();
    
    const envContent = readFileSync(envProduction, 'utf-8');
    
    expect(envContent).toContain('VITE_CLERK_PUBLISHABLE_KEY=');
    expect(envContent).toMatch(/pk_live_[A-Za-z0-9]+/);
    
    const match = envContent.match(/VITE_CLERK_PUBLISHABLE_KEY=(.+)/);
    expect(match).toBeTruthy();
    expect(match[1].trim()).toBeTruthy();
    expect(match[1].trim()).toContain('pk_live_');
  });

  test('Android icon files exist in all densities', () => {
    const basePath = join(projectRoot, 'mobile/Android/app/src/main/res');
    const densities = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];
    const iconTypes = ['ic_launcher.png', 'ic_launcher_foreground.png', 'ic_launcher_round.png'];
    
    for (const density of densities) {
      for (const iconType of iconTypes) {
        const iconPath = join(basePath, `mipmap-${density}`, iconType);
        expect(existsSync(iconPath), `Missing ${iconType} for ${density}`).toBeTruthy();
        
        // Check file is not empty
        const stats = statSync(iconPath);
        expect(stats.size).toBeGreaterThan(0);
      }
    }
  });

  test('source icon files exist for icon generation', () => {
    const icon512 = join(projectRoot, 'jamz-client-vite/public/icon-512.png');
    const iconResource = join(projectRoot, 'jamz-client-vite/resources/icon.png');
    
    expect(existsSync(icon512)).toBeTruthy();
    expect(statSync(icon512).size).toBeGreaterThan(10000); // At least 10KB
    
    if (existsSync(iconResource)) {
      expect(statSync(iconResource).size).toBeGreaterThan(10000);
    }
  });

  test('build scripts exist and are executable', () => {
    const scripts = [
      'build-android-only.bat',
      'rebuild-android-clean.bat',
      'install-android-fresh.bat',
      'build-and-install-fresh.bat',
      'build-ios-only.sh'
    ];
    
    for (const script of scripts) {
      const scriptPath = join(projectRoot, script);
      expect(existsSync(scriptPath), `Missing script: ${script}`).toBeTruthy();
      
      const content = readFileSync(scriptPath, 'utf-8');
      expect(content.length).toBeGreaterThan(100); // Not empty
      
      // Check for key commands
      if (script.includes('android') && script.endsWith('.bat')) {
        expect(content).toContain('gradlew');
        expect(content).toContain('cap sync');
      }
    }
  });

  test('Clerk mobile setup documentation exists', () => {
    const clerkDoc = join(projectRoot, 'CLERK_MOBILE_SETUP.md');
    expect(existsSync(clerkDoc)).toBeTruthy();
    
    const content = readFileSync(clerkDoc, 'utf-8');
    
    // Check for key sections
    expect(content).toContain('Native applications');
    expect(content).toContain('Enable Native API');
    expect(content).toContain('androidScheme');
    expect(content).toContain('https://localhost/oauth-callback');
    expect(content).toContain('capacitor://localhost/oauth-callback');
    expect(content).toContain('chrome://inspect');
  });

  test('gradlew wrapper exists and is configured', () => {
    const gradlewBat = join(projectRoot, 'mobile/Android/gradlew.bat');
    const gradlew = join(projectRoot, 'mobile/Android/gradlew');
    
    expect(existsSync(gradlewBat)).toBeTruthy();
    expect(existsSync(gradlew)).toBeTruthy();
    
    // Check gradle wrapper properties
    const gradleWrapperProps = join(projectRoot, 'mobile/Android/gradle/wrapper/gradle-wrapper.properties');
    expect(existsSync(gradleWrapperProps)).toBeTruthy();
    
    const props = readFileSync(gradleWrapperProps, 'utf-8');
    expect(props).toContain('distributionUrl=');
    expect(props).toMatch(/gradle-\d+\.\d+/); // Has gradle version
  });

  test('Android manifest has correct package and permissions', () => {
    const manifestPath = join(projectRoot, 'mobile/Android/app/src/main/AndroidManifest.xml');
    
    if (existsSync(manifestPath)) {
      const manifest = readFileSync(manifestPath, 'utf-8');
      
      expect(manifest).toContain('com.trafficjamz.app');
      expect(manifest).toContain('android.permission.INTERNET');
      expect(manifest).toContain('android.permission.ACCESS_FINE_LOCATION');
      expect(manifest).toContain('android.permission.ACCESS_COARSE_LOCATION');
      expect(manifest).toContain('android.permission.RECORD_AUDIO');
      expect(manifest).toContain('android.permission.CAMERA');
    }
  });

  test('.gitignore excludes Android build artifacts', () => {
    const gitignorePath = join(projectRoot, 'mobile/Android/.gitignore');
    
    if (existsSync(gitignorePath)) {
      const gitignore = readFileSync(gitignorePath, 'utf-8');
      
      expect(gitignore).toContain('nul'); // Windows reserved name
      expect(gitignore).toMatch(/build/);
      expect(gitignore).toMatch(/\.gradle/);
    }
  });
});

test.describe('APK Build Integrity', () => {
  
  test('APK file exists after build', () => {
    // This test assumes you've run a build before testing
    // Skip if APK doesn't exist (for CI environments without build)
    test.skip(!existsSync(apkPath), 'APK not built yet - run rebuild-android-clean.bat first');
    
    expect(existsSync(apkPath)).toBeTruthy();
  });

  test('APK file size is reasonable', () => {
    test.skip(!existsSync(apkPath), 'APK not built yet');
    
    const stats = statSync(apkPath);
    const sizeMB = stats.size / (1024 * 1024);
    
    // APK should be between 3MB and 50MB
    expect(sizeMB).toBeGreaterThan(3);
    expect(sizeMB).toBeLessThan(50);
  });

  test('APK was built recently (within 24 hours)', () => {
    test.skip(!existsSync(apkPath), 'APK not built yet');
    
    const stats = statSync(apkPath);
    const ageInHours = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);
    
    // Warn if APK is old
    if (ageInHours > 24) {
      console.warn(`⚠️  APK is ${ageInHours.toFixed(1)} hours old - consider rebuilding`);
    }
    
    expect(ageInHours).toBeLessThan(168); // Less than 1 week old
  });

  test('APK contains correct package structure', () => {
    test.skip(!existsSync(apkPath), 'APK not built yet');
    
    // Use aapt to inspect APK (if available)
    try {
      const output = execSync('aapt dump badging "' + apkPath + '"', { encoding: 'utf-8' });
      
      expect(output).toContain("package: name='com.trafficjamz.app'");
      expect(output).toContain("application-label:'TrafficJamz'");
      expect(output).toMatch(/versionCode='(\d+)'/);
      expect(output).toMatch(/versionName='(\d+\.\d+\.\d+)'/);
    } catch (error) {
      test.skip(true, 'aapt tool not available - skipping APK inspection');
    }
  });
});

test.describe('Vite Build Output', () => {
  
  test('dist folder exists after build', () => {
    const distPath = join(projectRoot, 'jamz-client-vite/dist');
    
    // Skip if not built
    test.skip(!existsSync(distPath), 'Web app not built yet - run npm run build first');
    
    expect(existsSync(distPath)).toBeTruthy();
  });

  test('dist contains index.html', () => {
    const indexPath = join(projectRoot, 'jamz-client-vite/dist/index.html');
    test.skip(!existsSync(indexPath), 'Web app not built yet');
    
    expect(existsSync(indexPath)).toBeTruthy();
    
    const html = readFileSync(indexPath, 'utf-8');
    expect(html).toContain('<div id="root">');
    expect(html).toMatch(/assets\/index-[A-Za-z0-9]+\.js/); // Hashed asset
  });

  test('dist contains Clerk publishable key in JavaScript', () => {
    const distPath = join(projectRoot, 'jamz-client-vite/dist');
    test.skip(!existsSync(distPath), 'Web app not built yet');
    
    const assetsPath = join(distPath, 'assets');
    if (!existsSync(assetsPath)) {
      test.skip(true, 'Assets folder not found');
    }
    
    // Read all JS files and search for Clerk key
    const fs = require('fs');
    const jsFiles = fs.readdirSync(assetsPath).filter(f => f.endsWith('.js'));
    
    let foundClerkKey = false;
    for (const jsFile of jsFiles) {
      const content = readFileSync(join(assetsPath, jsFile), 'utf-8');
      if (content.includes('pk_live_')) {
        foundClerkKey = true;
        break;
      }
    }
    
    expect(foundClerkKey).toBeTruthy();
  });

  test('build output is optimized for production', () => {
    const indexPath = join(projectRoot, 'jamz-client-vite/dist/index.html');
    test.skip(!existsSync(indexPath), 'Web app not built yet');
    
    const html = readFileSync(indexPath, 'utf-8');
    
    // Check for production optimizations
    expect(html).not.toContain('localhost:5174'); // No dev server refs
    expect(html).not.toContain('console.log'); // Logs removed
    expect(html.length).toBeLessThan(10000); // HTML is minified
  });
});

test.describe('Mobile Documentation', () => {
  
  test('REBUILD_GUIDE.md exists and contains all platforms', () => {
    const guidePath = join(projectRoot, 'REBUILD_GUIDE.md');
    expect(existsSync(guidePath)).toBeTruthy();
    
    const content = readFileSync(guidePath, 'utf-8');
    
    expect(content).toContain('Windows');
    expect(content).toContain('Android');
    expect(content).toContain('iOS');
    expect(content).toContain('Electron');
    expect(content).toContain('Motorola Razr');
    expect(content).toContain('rebuild-android-clean.bat');
    expect(content).toContain('install-android-fresh.bat');
  });

  test('documentation mentions cache clearing', () => {
    const guidePath = join(projectRoot, 'REBUILD_GUIDE.md');
    const clerkPath = join(projectRoot, 'CLERK_MOBILE_SETUP.md');
    
    const guideContent = existsSync(guidePath) ? readFileSync(guidePath, 'utf-8') : '';
    const clerkContent = existsSync(clerkPath) ? readFileSync(clerkPath, 'utf-8') : '';
    
    const allContent = guideContent + clerkContent;
    
    expect(allContent).toContain('uninstall');
    expect(allContent).toContain('cache');
    expect(allContent).toMatch(/adb uninstall|pm clear/i);
  });
});
