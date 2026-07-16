const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'admin', 'controllers', 'adminController.js');
try {
  const content = fs.readFileSync(filePath, 'utf8');
  // Simple check: parse with a basic method or just test running it in an ES module environment,
  // or compile it. Node's `node -c` can check JS syntax without executing.
  console.log('File read successfully. Length:', content.length);
} catch (err) {
  console.error(err);
}
