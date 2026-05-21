import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

const excelPath = path.resolve('..', 'Rider Operations Detail.xlsx');
console.log('Reading Excel file from:', excelPath);

if (!fs.existsSync(excelPath)) {
  console.error('File does not exist at:', excelPath);
  process.exit(1);
}

const workbook = XLSX.readFile(excelPath);
console.log('Sheet Names:', workbook.SheetNames);

workbook.SheetNames.forEach((sheetName) => {
  console.log('\n--- Sheet:', sheetName, '---');
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  console.log('Total Rows:', jsonData.length);
  console.log('Sample rows (first 10):');
  jsonData.slice(0, 10).forEach((row, index) => {
    console.log(`Row ${index}:`, row);
  });
});
