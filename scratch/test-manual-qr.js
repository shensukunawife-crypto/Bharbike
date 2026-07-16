import dotenv from 'dotenv';
dotenv.config();

import supabase from '../src/utils/supabaseClient.js';
import { createUserNotification } from '../src/services/notificationService.js';
import * as paymentController from '../src/controllers/paymentController.js';
import * as adminController from '../src/admin/controllers/adminController.js';
import { getWalletBalance } from '../src/services/walletService.js';

async function runTest() {
  console.log('--- Starting Custom UPI QR Code Payment Gateway E2E Test ---');

  try {
    // 1. Setup Payment Config in DB for manual_qr
    console.log('\nStep 1: Setting up payment_configs in database...');
    
    // Deactivate all configs first
    const { error: deactivateError } = await supabase
      .from('payment_configs')
      .update({ is_active: false })
      .neq('id', '00000000-0000-0000-0000-000000000000');
      
    if (deactivateError) console.warn('Warning: Deactivation error:', deactivateError.message);

    // Find existing config or insert a new one
    const { data: existingConfigs } = await supabase
      .from('payment_configs')
      .select('*')
      .ilike('key_id', 'MANUAL_QR::%')
      .limit(1);

    let configRows;
    if (existingConfigs && existingConfigs.length > 0) {
      const { data, error } = await supabase
        .from('payment_configs')
        .update({
          is_active: true,
          key_secret: 'ENVIROLUX BIODIESEL PRIVATE L',
          mode: 'live'
        })
        .eq('id', existingConfigs[0].id)
        .select();
      if (error) {
        console.error('❌ Failed to update active config:', error.message);
        process.exit(1);
      }
      configRows = data;
    } else {
      const { data, error } = await supabase
        .from('payment_configs')
        .insert([{
          key_id: 'MANUAL_QR::enviroluxbiodiesel@sbi',
          key_secret: 'ENVIROLUX BIODIESEL PRIVATE L',
          mode: 'live',
          is_active: true
        }])
        .select();
      if (error) {
        console.error('❌ Failed to insert active config:', error.message);
        process.exit(1);
      }
      configRows = data;
    }

    console.log('✅ Active Payment Config:', configRows[0]);

    // 2. Fetch a test user
    console.log('\nStep 2: Fetching a test user from database...');
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, full_name, phone')
      .limit(1);

    if (userError || !users || users.length === 0) {
      console.error('❌ Failed to retrieve a test user.');
      process.exit(1);
    }
    const testUser = users[0];
    const userId = testUser.id;
    console.log(`✅ Using User: ${testUser.full_name || 'Unnamed'} (ID: ${userId})`);

    // Record initial wallet balance
    const initialWallet = await getWalletBalance(userId);
    console.log(`💵 Initial Wallet Balance: ₹${initialWallet.balance}`);

    // 3. Test createOrder simulation
    console.log('\nStep 3: Simulating createOrder for Wallet top-up (₹500)...');
    let mockResponseData = {};
    const mockReq = {
      body: {
        amount: 500,
        currency: 'INR',
        user_id: userId,
        plan_name: 'Wallet Recharge'
      }
    };
    const mockRes = {
      status: (code) => {
        console.log(`   Response Status: ${code}`);
        return mockRes;
      },
      json: (data) => {
        mockResponseData = data;
        console.log('   Response Data:', JSON.stringify(data, null, 2));
        return mockRes;
      }
    };

    await paymentController.createOrder(mockReq, mockRes);

    if (!mockResponseData.success || mockResponseData.payment_method !== 'manual_qr') {
      console.error('❌ createOrder assertion failed.');
      process.exit(1);
    }
    console.log('✅ createOrder simulation passed!');

    const appOrderId = mockResponseData.app_order_id;
    const mockOrderId = mockResponseData.order_id;
    const merchantUpi = mockResponseData.key_id;
    const merchantName = mockResponseData.key_secret;

    // 4. Test verifyPayment simulation (User submits UTR)
    console.log('\nStep 4: Simulating verifyPayment (User submits UTR)...');
    const testUtr = `UTR${Date.now().toString().slice(-9)}`;
    let verifyResponseData = {};
    
    const verifyReq = {
      body: {
        razorpay_order_id: mockOrderId,
        razorpay_payment_id: testUtr,
        razorpay_signature: 'manual_qr_signature',
        app_order_id: appOrderId,
        user_id: userId,
        payment_method: 'manual_qr',
        amount: 500
      }
    };
    const verifyRes = {
      status: (code) => {
        console.log(`   Response Status: ${code}`);
        return verifyRes;
      },
      json: (data) => {
        verifyResponseData = data;
        console.log('   Response Data:', JSON.stringify(data, null, 2));
        return verifyRes;
      }
    };

    await paymentController.verifyPayment(verifyReq, verifyRes);

    if (!verifyResponseData.success || verifyResponseData.status !== 'pending') {
      console.error('❌ verifyPayment assertion failed.');
      process.exit(1);
    }
    console.log('✅ verifyPayment simulation passed! Payment is recorded in PENDING state.');

    // Fetch the pending payment row from DB
    const { data: paymentRecord, error: payRecordError } = await supabase
      .from('payments')
      .select('*')
      .eq('razorpay_payment_id', testUtr)
      .maybeSingle();

    if (payRecordError || !paymentRecord) {
      console.error('❌ Failed to retrieve the pending payment from database.');
      process.exit(1);
    }
    console.log(`✅ Database payment record verified: ID: ${paymentRecord.id}, Status: ${paymentRecord.status}, Method: ${paymentRecord.payment_method}`);

    // 5. Test editPayment simulation (Admin approves transaction)
    console.log('\nStep 5: Simulating admin approving the transaction...');
    const editReq = {
      params: { paymentId: paymentRecord.id },
      body: { status: 'success' }
    };
    let editResponseData = {};
    const editRes = {
      status: (code) => {
        console.log(`   Response Status: ${code}`);
        return editRes;
      },
      json: (data) => {
        editResponseData = data;
        console.log('   Response Data:', JSON.stringify(data, null, 2));
        return editRes;
      }
    };

    await adminController.editPayment(editReq, editRes);

    if (!editResponseData.success) {
      console.error('❌ editPayment approval simulation failed.');
      process.exit(1);
    }

    // Verify wallet has been credited
    const finalWallet = await getWalletBalance(userId);
    console.log(`💵 Final Wallet Balance: ₹${finalWallet.balance}`);
    
    if (finalWallet.balance !== initialWallet.balance + 500) {
      console.error('❌ Wallet balance mismatch. Money was not credited!');
      process.exit(1);
    }
    console.log('✅ Wallet credited successfully! Admin approval E2E hook passed!');

    console.log('\n--- Custom UPI QR Code Payment Gateway E2E Test SUCCESSFUL 🎉 ---');

  } catch (err) {
    console.error('❌ Test failed with error:', err.message);
  }
}

runTest();
