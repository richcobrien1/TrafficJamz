// jamz-client-vite/replace-node-env.js

const fs = require('fs');
const path = require('path');

// 🔍 File types to scan
const FILE_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx'];

// ✅ Replacement target
const TARGET = 'process.env.NODE_ENV';
const REPLACEMENT = 'import.meta.env.MODE';

// 🔁 Recursively scan files
function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  entries.forEach(entry => {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if (FILE_EXTENSIONS.includes(path.extname(entry.name))) {
      processFile(fullPath);
    }
  });
}

// 🛠 Replace logic
function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (content.includes(TARGET)) {
    const updated = content.replaceAll(TARGET, REPLACEMENT);
    fs.writeFileSync(filePath, updated, 'utf8');
    console.log(`✅ Updated: ${filePath}`);
  }
}

// 🚀 Run it
console.log('🔍 Replacing NODE_ENV references...');
scanDir(path.resolve(__dirname, 'src'));
console.log('🎉 Done replacing NODE_ENV with import.meta.env.MODE');
