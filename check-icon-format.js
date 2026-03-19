const fs = require('fs');
const path = require('path');

const iconPath = path.join(__dirname, 'jamz-client-vite', 'build', 'icon.ico');

console.log('Reading icon file:', iconPath);

const buffer = fs.readFileSync(iconPath);

console.log('\nIcon file info:');
console.log('- Size:', buffer.length, 'bytes');
console.log('- First 6 bytes (header):', buffer.slice(0, 6).toString('hex'));

// ICO format: reserved (2 bytes) = 0x0000, type (2 bytes) = 0x0001, count (2 bytes)
const reserved = buffer.readUInt16LE(0);
const type = buffer.readUInt16LE(2);
const count = buffer.readUInt16LE(4);

console.log('\nICO Header:');
console.log('- Reserved:', reserved.toString(16), '(should be 0)');
console.log('- Type:', type.toString(16), '(should be 1 for .ico)');
console.log('- Image count:', count);

if (type !== 1) {
    console.log('\n❌ ERROR: This is not a valid ICO file!');
    console.log('Type field should be 1, but is:', type);
} else {
    console.log('\n✓ File is valid ICO format');
}

// Read each image entry
console.log('\nImage entries:');
for (let i = 0; i < count; i++) {
    const offset = 6 + (i * 16);
    const width = buffer[offset];
    const height = buffer[offset + 1];
    const colors = buffer[offset + 2];
    const bitsPerPixel = buffer.readUInt16LE(offset + 6);
    const size = buffer.readUInt32LE(offset + 8);
    
    console.log(`  [${i}] ${width || 256}x${height || 256}, ${bitsPerPixel} bpp, ${size} bytes`);
}
