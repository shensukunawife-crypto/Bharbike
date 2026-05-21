import app from '../src/app.js';
import dotenv from 'dotenv';
dotenv.config();

async function runLocalVerificationTest() {
  console.log('--- STARTING LOCAL DIDIT ENDPOINTS TEST ---');

  // Start app on a random available port
  const server = app.listen(0, '127.0.0.1', async () => {
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;
    console.log(`Test server running locally on ${baseUrl}`);

    try {
      // 1. Test POST /api/kyc/initiate-session
      console.log('\n--- 1. Testing /api/kyc/initiate-session ---');
      const sessionResponse = await fetch(`${baseUrl}/api/kyc/initiate-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'demo-919325296264' }) // Using a demo user ID
      });

      console.log('Session Status:', sessionResponse.status);
      const sessionData = await sessionResponse.json();
      console.log('Session Response Body:', JSON.stringify(sessionData, null, 2));

      if (sessionResponse.status === 201 && sessionData.success) {
        console.log('✅ Session creation endpoint working and connected to Didit!');
      } else {
        console.log('❌ Session creation endpoint failed.');
      }

      // 2. Test GET /api/kyc/initiate-session (flexibility fallback)
      console.log('\n--- 2. Testing GET /api/kyc/initiate-session ---');
      const sessionResponseGet = await fetch(`${baseUrl}/api/kyc/initiate-session?userId=demo-919325296264`);
      console.log('GET Session Status:', sessionResponseGet.status);
      const sessionDataGet = await sessionResponseGet.json();
      console.log('GET Session Response Body:', JSON.stringify(sessionDataGet, null, 2));

      if (sessionResponseGet.status === 201 && sessionDataGet.success) {
        console.log('✅ GET Session creation endpoint working!');
      } else {
        console.log('❌ GET Session creation endpoint failed.');
      }

      // 3. Test Webhook POST /api/kyc/webhook with APPROVED status
      console.log('\n--- 3. Testing Webhook with APPROVED status ---');
      const webhookPayload = {
        status: 'APPROVED',
        vendor_data: 'demo-919325296264',
        decision: {
          status: 'APPROVED',
          session_id: 'mock-session-uuid',
          vendor_data: 'demo-919325296264',
          id_verifications: [
            {
              document_type: 'pan',
              document_number: 'ABCDE1234F',
              first_name: 'John',
              last_name: 'Doe',
              image_url: 'https://kyc.bharbike.local/test_pan_image.jpg'
            }
          ]
        }
      };

      const webhookResponse = await fetch(`${baseUrl}/api/kyc/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload)
      });

      console.log('Webhook Status:', webhookResponse.status);
      const webhookData = await webhookResponse.json();
      console.log('Webhook Response Body:', JSON.stringify(webhookData, null, 2));

      if (webhookResponse.ok && webhookData.success) {
        console.log('✅ Webhook endpoint successfully parsed approval!');
      } else {
        console.log('❌ Webhook endpoint failed.');
      }

      // 4. Test Webhook POST /api/kyc/webhook with DECLINED status
      console.log('\n--- 4. Testing Webhook with DECLINED status ---');
      const webhookPayloadDeclined = {
        status: 'DECLINED',
        vendor_data: 'demo-919325296264',
        reason: 'Image blurry or unclear'
      };

      const webhookResponseDeclined = await fetch(`${baseUrl}/api/kyc/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayloadDeclined)
      });

      console.log('Webhook Declined Status:', webhookResponseDeclined.status);
      const webhookDataDeclined = await webhookResponseDeclined.json();
      console.log('Webhook Declined Response Body:', JSON.stringify(webhookDataDeclined, null, 2));

      if (webhookResponseDeclined.ok && webhookDataDeclined.success) {
        console.log('✅ Webhook endpoint successfully handled decline!');
      } else {
        console.log('❌ Webhook endpoint failed to handle decline.');
      }

    } catch (error) {
      console.error('Test threw exception:', error);
    } finally {
      console.log('\n--- TESTS COMPLETED ---');
      server.close();
    }
  });
}

runLocalVerificationTest();
