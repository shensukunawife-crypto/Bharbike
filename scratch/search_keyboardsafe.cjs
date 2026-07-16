const fs = require('fs');
const path = require('path');

const dirPath = path.join(__dirname, '..', 'src', 'app');
const files = fs.readdirSync(dirPath);

files.forEach(file => {
  const filePath = path.join(dirPath, file);
  if (fs.statSync(filePath).isFile() && (file.endsWith('.tsx') || file.endsWith('.ts'))) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('KeyboardSafeContainer')) {
      console.log(`Uses KeyboardSafeContainer: ${file}`);
    } else if (content.includes('TextInput')) {
      console.log(`Uses TextInput but NOT KeyboardSafeContainer: ${file}`);
    }
  }
});
