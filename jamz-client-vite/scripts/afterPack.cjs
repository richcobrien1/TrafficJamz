/**
 * electron-builder afterPack hook
 * This runs AFTER the app is packaged but BEFORE the installer is created
 * Perfect timing to embed the icon!
 */
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

exports.default = async function(context) {
  // Only run for Windows builds
  if (context.electronPlatformName !== 'win32') {
    console.log('⏭️  Skipping icon embedding (not Windows)');
    return;
  }
  
  const appOutDir = context.appOutDir;
  const exePath = path.join(appOutDir, `${context.packager.appInfo.productFilename}.exe`);
  const iconPath = path.join(context.packager.projectDir, 'build', 'icon.ico');
  
  // Try multiple possible rcedit locations
  const possibleRceditPaths = [
    path.join(context.packager.projectDir, 'node_modules', 'rcedit', 'bin', 'rcedit.exe'),
    path.join(context.packager.projectDir, 'node_modules', '.bin', 'rcedit.exe'),
    path.join(__dirname, '..', 'node_modules', 'rcedit', 'bin', 'rcedit.exe'),
  ];
  
  let rceditPath = null;
  for (const testPath of possibleRceditPaths) {
    if (fs.existsSync(testPath)) {
      rceditPath = testPath;
      break;
    }
  }
  
  if (!rceditPath) {
    console.error('');
    console.error('❌ ========================================');
    console.error('❌ ERROR: rcedit.exe not found!');
    console.error('❌ Searched paths:');
    possibleRceditPaths.forEach(p => console.error('❌   -', p));
    console.error('❌ ========================================');
    console.error('');
    throw new Error('rcedit.exe not found');
  }
  
  console.log('');
  console.log('🎨 ========================================');
  console.log('🎨 EMBEDDING ICON INTO EXE');
  console.log('🎨 ========================================');
  console.log('📄 EXE:', exePath);
  console.log('🖼️  Icon:', iconPath);
  console.log('🔧 rcedit:', rceditPath);
  console.log('');
  
  try {
    execFileSync(rceditPath, [
      exePath,
      '--set-icon', iconPath,
      '--set-version-string', 'CompanyName', 'TrafficJamz',
      '--set-version-string', 'FileDescription', 'TrafficJamz - Group Communication',
      '--set-version-string', 'ProductName', 'TrafficJamz',
      '--set-version-string', 'InternalName', 'TrafficJamz',
      '--set-version-string', 'OriginalFilename', 'TrafficJamz.exe',
    ], {
      stdio: 'inherit'
    });
    
    console.log('');
    console.log('✅ ========================================');
    console.log('✅ ICON EMBEDDED SUCCESSFULLY!');
    console.log('✅ ========================================');
    console.log('');
  } catch (error) {
    console.error('');
    console.error('❌ ========================================');
    console.error('❌ FAILED TO EMBED ICON');
    console.error('❌', error.message);
    console.error('❌ ========================================');
    console.error('');
    throw error;
  }
};
