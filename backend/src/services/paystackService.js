const https = require('https');
const crypto = require('crypto');

const BASE_HOST = 'api.paystack.co';

function paystackRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: BASE_HOST,
      port: 443,
      path,
      method,
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    };

    const req = https.request(options, (res) => {
      let chunks = '';
      res.on('data', (c) => { chunks += c; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(chunks);
          resolve({ status: res.statusCode, body: parsed });
        } catch (err) {
          reject(new Error(`Paystack: failed to parse response: ${err.message}`));
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// Initialize a transaction. Returns { authorization_url, access_code, reference }
// amount is in KES (we convert to kobo-equivalent: Paystack expects the lowest currency unit,
// for KES that's cents — multiply by 100)
async function initializeTransaction({ email, amountKES, reference, metadata, callbackUrl }) {
  if (!process.env.PAYSTACK_SECRET_KEY) {
    throw new Error('PAYSTACK_SECRET_KEY is not configured');
  }

  const payload = {
    email,
    amount: Math.round(Number(amountKES) * 100),
    currency: 'KES',
    reference,
    metadata: metadata || {},
    callback_url: callbackUrl || process.env.PAYSTACK_CALLBACK_URL
  };

  const { status, body } = await paystackRequest('POST', '/transaction/initialize', payload);
  if (status >= 400 || !body?.status) {
    throw new Error(body?.message || `Paystack init failed (HTTP ${status})`);
  }
  return body.data; // { authorization_url, access_code, reference }
}

// Verify a transaction by reference. Returns full transaction object.
async function verifyTransaction(reference) {
  if (!process.env.PAYSTACK_SECRET_KEY) {
    throw new Error('PAYSTACK_SECRET_KEY is not configured');
  }
  const { status, body } = await paystackRequest('GET', `/transaction/verify/${encodeURIComponent(reference)}`, null);
  if (status >= 400 || !body?.status) {
    throw new Error(body?.message || `Paystack verify failed (HTTP ${status})`);
  }
  return body.data;
}

// Validate a webhook signature against Paystack's signing key.
// Per Paystack docs: HMAC SHA512 of raw request body with secret key.
function verifyWebhookSignature(rawBody, signatureHeader) {
  if (!process.env.PAYSTACK_SECRET_KEY) return false;
  const computed = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest('hex');
  return computed === signatureHeader;
}

module.exports = {
  initializeTransaction,
  verifyTransaction,
  verifyWebhookSignature
};
