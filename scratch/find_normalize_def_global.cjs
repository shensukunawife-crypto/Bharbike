const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'admin', 'controllers', 'adminController.js');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

lines.forEach((line, index) => {
  if (line.includes('normalizeOrder') && !line.includes('map') && !line.includes('const order = normalizeOrder') && !line.includes('returnPage')) {
    console.log(`Line ${index + 1}: ${line}`);
    // Print 30 lines
    const start = index;
    const end = Math.min(lines.length - 1, index + 35);
    console.log('--- CONTEXT ---');
    for (let i = start; i <= end; i++) {
      console.log(`${i + 1}: ${lines[i]}`);
    }
    console.log('----------------\n');
  }
});
