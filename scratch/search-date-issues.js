import fs from 'fs';
import path from 'path';

const dir = 'src/admin/views';
const files = fs.readdirSync(dir);

console.log('Searching EJS files for raw date display strings...');

files.forEach(f => {
  const fp = path.join(dir, f);
  if (fs.statSync(fp).isFile() && f.endsWith('.ejs')) {
    const c = fs.readFileSync(fp, 'utf8');
    const matches = [];
    c.split('\n').forEach((l, i) => {
      const trimmed = l.trim();
      // Look for typical raw formatting or slice/replace patterns
      if (trimmed.includes("replace('T'") || 
          trimmed.includes('replace("T"') || 
          trimmed.includes('slice(0,19)') || 
          trimmed.includes('slice(0, 19)') || 
          trimmed.includes('slice(0,16)') || 
          trimmed.includes('slice(0, 16)')) {
        matches.push(`${i + 1}: ${trimmed}`);
      }
    });
    if (matches.length > 0) {
      console.log(`\n--- ${f} ---`);
      matches.forEach(m => console.log(m));
    }
  }
});
