import dotenv from 'dotenv';
dotenv.config();

import jwt from 'jsonwebtoken';
import axios from 'axios';
import supabase from '../src/utils/supabaseClient.js';

async function run() {
  console.log('Fetching a test user from Supabase...');
  const { data: users, error } = await supabase.from('users').select('id, phone').limit(1);
  if (error || !users || users.length === 0) {
    console.error('Failed to get user:', error);
    return;
  }
  const testUser = users[0];
  console.log('Using user:', testUser);

  // Sign token
  const secret = process.env.JWT_SECRET || "BharBike_Secure_Session_2026_9e8d4f2a1b5c7d8e9f0a1b2c3d4e5f6g";
  const token = jwt.sign(
    { phone: testUser.phone },
    secret,
    { subject: testUser.id, expiresIn: '1d' }
  );

  console.log('JWT Token signed successfully.');

  const liveUrl = "https://bharbike-backend.onrender.com/api/create-order";
  console.log(`Sending POST to ${liveUrl}...`);

  try {
    const res = await axios.post(
      liveUrl,
      {
        amount: 100,
        currency: 'INR',
        user_id: testUser.id,
        plan_name: 'Wallet Recharge',
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    console.log('Response status:', res.status);
    console.log('Response data:', JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('Request failed!');
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Data:', err.response.data);
    } else {
      console.error('Message:', err.message);
    }
  }
}

run();
