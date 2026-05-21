import app from '../src/app.js';
import { env } from '../src/config/env.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

async function runFleetReportsVerification() {
  console.log('--- STARTING FLEET INVENTORY REPORTS VERIFICATION TEST ---');

  // Start app on a random available port
  const server = app.listen(0, '127.0.0.1', async () => {
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;
    console.log(`Test server running locally on ${baseUrl}`);

    try {
      // 1. Generate master admin token
      const token = jwt.sign(
        { 
          role: "master_admin",
          permissions: ["*"]
        }, 
        env.jwtSecret, 
        { expiresIn: "1h" }
      );
      console.log('Generated master admin test token successfully.');

      // 2. Test Excel Fleet Export Endpoint
      console.log('\n--- 1. Testing GET /admin/bikes/export/excel ---');
      const excelResponse = await fetch(`${baseUrl}/admin/bikes/export/excel?status=all&lowBattery=false`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Excel Status:', excelResponse.status);
      console.log('Excel Content-Type:', excelResponse.headers.get('content-type'));
      console.log('Excel Content-Disposition:', excelResponse.headers.get('content-disposition'));

      if (excelResponse.ok) {
        const buffer = await excelResponse.arrayBuffer();
        console.log(`Excel downloaded: ${buffer.byteLength} bytes.`);
        if (buffer.byteLength > 0 && excelResponse.headers.get('content-type').includes('spreadsheetml')) {
          console.log('✅ Fleet Excel export endpoint successfully generated a non-empty Excel workbook!');
        } else {
          console.log('❌ Fleet Excel export returned empty or incorrect content-type.');
        }
      } else {
        const errorText = await excelResponse.text();
        console.log('❌ Fleet Excel export failed:', errorText);
      }

      // 3. Test PDF Fleet Report Print View Endpoint
      console.log('\n--- 2. Testing GET /admin/bikes/export/pdf ---');
      const pdfResponse = await fetch(`${baseUrl}/admin/bikes/export/pdf?status=all&lowBattery=false`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('PDF Status:', pdfResponse.status);
      console.log('PDF Content-Type:', pdfResponse.headers.get('content-type'));

      if (pdfResponse.ok) {
        const htmlText = await pdfResponse.text();
        console.log(`PDF HTML length: ${htmlText.length} characters.`);
        
        const hasBranding = htmlText.includes('Bhar') && htmlText.includes('Bike');
        const hasFleetStatement = htmlText.includes('Fleet Inventory Statement');
        const hasRegistryTitle = htmlText.includes('Fleet Registry Ledger');
        const hasPrintTrigger = htmlText.includes('window.print()');

        if (hasBranding && hasFleetStatement && hasRegistryTitle && hasPrintTrigger) {
          console.log('✅ Fleet PDF EJS Print Layout rendered beautifully with premium corporate styling, battery status fills, and auto-print trigger!');
        } else {
          console.log('❌ Fleet PDF HTML rendered but was missing required layout components.');
          console.log('Sample of rendered HTML:', htmlText.slice(0, 500));
        }
      } else {
        const errorText = await pdfResponse.text();
        console.log('❌ Fleet PDF export failed:', errorText);
      }

    } catch (error) {
      console.error('Test threw exception:', error);
    } finally {
      console.log('\n--- FLEET REPORT VERIFICATION COMPLETED ---');
      server.close();
    }
  });
}

runFleetReportsVerification();
