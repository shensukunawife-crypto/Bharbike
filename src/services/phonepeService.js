import crypto from 'crypto';
import fetch from 'node-fetch';

/**
 * Creates a PhonePe payment link/order.
 * @param {Object} config - { key_id (merchantId), key_secret (saltKey:saltIndex), mode }
 * @param {Object} orderData - { amount, orderId, userId, mobileNumber, callbackUrl }
 */
export async function createPhonePeOrder(config, orderData) {
  const merchantId = config.key_id;
  const [saltKey, saltIndex = '1'] = config.key_secret.split(':');
  const envMode = config.mode === 'live' ? 'production' : 'test';

  const baseUrl = envMode === 'live' 
    ? 'https://api.phonepe.com/apis/hermes' 
    : 'https://api-preprod.phonepe.com/apis/pg-sandbox';

  const endpoint = '/pg/v1/pay';

  // PhonePe expects amount in paise (Rupees * 100)
  const amountInPaise = Math.round(Number(orderData.amount) * 100);

  const payload = {
    merchantId,
    merchantTransactionId: orderData.orderId,
    merchantUserId: orderData.userId || 'USER_DEFAULT',
    amount: amountInPaise,
    redirectUrl: orderData.callbackUrl,
    redirectMode: 'POST',
    callbackUrl: orderData.callbackUrl,
    mobileNumber: orderData.mobileNumber || '9999999999',
    paymentInstrument: {
      type: 'PAY_PAGE'
    }
  };

  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
  
  const checksumString = base64Payload + endpoint + saltKey;
  const sha256 = crypto.createHash('sha256').update(checksumString).digest('hex');
  const xVerify = `${sha256}###${saltIndex}`;

  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-VERIFY': xVerify
    },
    body: JSON.stringify({ request: base64Payload })
  });

  const responseData = await response.json();

  if (responseData.success && responseData.data?.instrumentResponse?.redirectInfo?.url) {
    return {
      success: true,
      url: responseData.data.instrumentResponse.redirectInfo.url,
      provider_order_id: responseData.data.merchantTransactionId
    };
  } else {
    console.error('[PhonePe Service] Order creation failed:', responseData);
    throw new Error(responseData.message || 'PhonePe order creation failed');
  }
}

/**
 * Verifies a PhonePe callback payload signature.
 * @param {Object} config - { key_secret (saltKey:saltIndex) }
 * @param {String} base64Payload - The 'response' field from PhonePe callback
 * @param {String} receivedChecksum - The 'x-verify' header from PhonePe callback
 */
export function verifyPhonePeSignature(config, base64Payload, receivedChecksum) {
  const [saltKey, saltIndex = '1'] = config.key_secret.split(':');
  
  const checksumString = base64Payload + saltKey;
  const sha256 = crypto.createHash('sha256').update(checksumString).digest('hex');
  const expectedChecksum = `${sha256}###${saltIndex}`;

  return expectedChecksum === receivedChecksum;
}
