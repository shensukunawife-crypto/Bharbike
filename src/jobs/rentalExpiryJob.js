import * as rentalService from "../services/rentalService.js";

export async function runRentalExpirySweep() {
  const results = await rentalService.expireRentalsPastEnd();
  if (results.length) {
    console.log(`[jobs] Auto-ended ${results.length} rental(s)`);
  }
  return results;
}
