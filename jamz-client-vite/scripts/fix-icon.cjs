const path = require('path');
const { execSync } = require('child_process');

const exePath = path.join(__dirname, '..', 'dist-electron', 'win-unpacked', 'TrafficJamz.exe');
const iconPath = path.join(__dirname, '..', 'build', 'icon.ico');

console.log('🎨 Forcefully embedding icon into exe...');
console.log('📄 EXE:', exePath);
console.log('🖼️  Icon:', iconPath);

try {
  const rceditPath = path.join(__dirname, '..', 'node_modules', 'rcedit', 'bin', 'rcedit.exe');
  execSync(`"${rceditPath}" "${exePath}" --set-icon "${iconPath}" --set-version-string "CompanyName" "TrafficJamz" --set-version-string "FileDescription" "TrafficJamz - Group Communication" --set-version-string "ProductName" "TrafficJamz" --set-version-string "InternalName" "TrafficJamz" --set-version-string "OriginalFilename" "TrafficJamz.exe"`, {
    stdio: 'inherit'
  });
  console.log('✅ Icon embedded successfully!');
} catch (err) {
  console.error('❌ Failed to embed icon:', err);
  process.exit(1);
}
