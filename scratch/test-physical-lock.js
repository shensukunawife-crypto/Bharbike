import dotenv from 'dotenv';
dotenv.config();
import * as iot from '../src/services/iotService.js';

async function main() {
  const bikeId = 40; // Bike TNA022
  console.log('Sending live lock command to LocoNav for TNA022 (UUID should be 8635463c-ea91-4fad-8d8c-fd7035d2d6a4)...');
  const res = await iot.lockBike(bikeId);
  console.log('Lock Result:', res);
}

main();
