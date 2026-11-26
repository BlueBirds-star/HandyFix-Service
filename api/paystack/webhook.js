// POST /api/paystack/webhook
// Paystack calls this after every payment. Set its URL in the Paystack dashboard:
//   Settings > API Keys & Webhooks > Webhook URL = https://<your-domain>/api/paystack/webhook
//
// It only marks a job paid when:
//   1. the request really comes from Paystack (HMAC-SHA512 signature check),
//   2. Paystack confirms the transaction as successful, and
//   3. the amount paid matches the quote on the job.

import crypto from 'crypto';
import { quoteTotalNaira } from './initialize.js';

// We need the raw body to check the signature, so Vercel must not parse it.
export const config = { api: { bodyParser: false } };

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PS_KEY = process.env.PAYSTACK_SECRET_KEY;

const sbHeaders = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  'Content-Type': 'application/json',
};

async function readRaw(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const raw = await readRaw(req);

  // 1. Signature check.
  const signature = req.headers['x-paystack-signature'];
  const expected = crypto.createHmac('sha512', PS_KEY).update(raw).digest('hex');
  if (!signature || signature !== expected) return res.status(401).end();

  const event = JSON.parse(raw.toString('utf8'));
  if (event.event !== 'charge.success') return res.status(200).end();

  // 2. Ask Paystack directly that this transaction succeeded.
  const verifyRes = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(event.data.reference)}`,
    { headers: { Authorization: `Bearer ${PS_KEY}` } }
  );
  const tx = (await verifyRes.json()).data;
  if (!tx || tx.status !== 'success') return res.status(200).end();

  const code = tx.metadata && tx.metadata.token;
  if (!code) return res.status(200).end();

  // 3. Check the amount against the quote before accepting the payment.
  const jobRes = await fetch(
    `${SB_URL}/rest/v1/jobs?token=eq.${encodeURIComponent(code)}&select=token,status,quote`,
    { headers: sbHeaders }
  );
  const [job] = await jobRes.json();
  if (!job || job.status !== 'quoted' || !job.quote) {
    // Already paid, or not awaiting payment. Acknowledge so Paystack stops retrying.
    return res.status(200).end();
  }
  if (tx.amount !== quoteTotalNaira(job.quote) * 100) {
    console.error(`Amount mismatch for ${code}: paid ${tx.amount}, quoted ${quoteTotalNaira(job.quote) * 100}`);
    return res.status(200).end();
  }

  // 4. Mark the job paid. The status=eq.quoted filter stops double updates.
  await fetch(
    `${SB_URL}/rest/v1/jobs?token=eq.${encodeURIComponent(code)}&status=eq.quoted`,
    {
      method: 'PATCH',
      headers: { ...sbHeaders, Prefer: 'return=minimal' },
      body: JSON.stringify({
        status: 'paid',
        pay_ref: tx.reference,
        paid_at: new Date().toISOString(),
        escrow_status: 'held',
      }),
    }
  );

  return res.status(200).end();
}
