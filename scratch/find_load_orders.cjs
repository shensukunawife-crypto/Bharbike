const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'admin', 'controllers', 'adminController.js');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

lines.forEach((line, index) => {
  if (line.includes('loadAdminOrdersData')) {
    console.log(`Line ${index + 1}: ${line}`);
    // Print 50 lines after
    const start = index;
    const end = Math.min(lines.length - 1, index + 60);
    console.log('--- CONTEXT ---');
    for (let i = start; i <= end; i++) {
      console.log(`${i + 1}: ${lines[i]}`);
    }
    console.log('----------------\n');
  }
});
