const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const packagePath = path.join(__dirname, '../package.json');
const backupPath = path.join(__dirname, '../package.json.backup');

try {
  // Read original package.json
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  // Backup the original
  fs.writeFileSync(backupPath, JSON.stringify(packageJson, null, 2));
  console.log('✓ Backed up package.json');
  
  // Create minimal package.json without dependencies (except electron)
  const minimalPackage = {
    ...packageJson,
    dependencies: {},
    devDependencies: {
      electron: packageJson.devDependencies?.electron || packageJson.dependencies?.electron || '39.2.3'
    }
  };
  
  fs.writeFileSync(packagePath, JSON.stringify(minimalPackage, null, 2));
  console.log('✓ Created minimal package.json for Electron build');
  
  // Run electron-builder
  console.log('✓ Running electron-builder...');
  execSync('npx electron-builder --win', { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  
  console.log('✓ Build completed successfully!');
  
} catch (error) {
  console.error('✗ Build failed:', error.message);
  process.exitCode = 1;
} finally {
  // Always restore the original package.json
  if (fs.existsSync(backupPath)) {
    fs.copyFileSync(backupPath, packagePath);
    fs.unlinkSync(backupPath);
    console.log('✓ Restored original package.json');
  }
}
