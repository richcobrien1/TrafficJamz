const fs = require('fs');
const path = require('path');

// Read the original package.json
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8')
);

// Create a minimal package.json for electron build
const minimalPackage = {
  name: packageJson.name,
  version: packageJson.version,
  description: packageJson.description,
  main: packageJson.main,
  author: packageJson.author,
  license: packageJson.license,
  // Only include electron as a dependency since everything else is bundled
  dependencies: {},
  // Keep the build configuration
  build: packageJson.build
};

// Write the minimal package.json to dist directory
fs.mkdirSync(path.join(__dirname, '../dist'), { recursive: true });
fs.writeFileSync(
  path.join(__dirname, '../package-electron.json'),
  JSON.stringify(minimalPackage, null, 2)
);

console.log('Created minimal package-electron.json for Electron build');
