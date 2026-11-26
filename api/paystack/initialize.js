// POST /api/paystack/initialize
// Body: { token: "HF-1040", email: "customer@example.com", callback_url: "https://..." }
// Returns: { authorization_url, reference } for the Paystack checkout page.
//
// Runs on the server, so the Paystack and Supabase secret keys never reach the browser.
// Required environment variables (set in Vercel > Project > Settings > Environment Variables):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PAYSTACK_SECRET_KEY

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PS_KEY = process.env.PAYSTACK_SECRET_KEY;

const sbHeaders = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  'Content-Type': 'application/json',
};

// Same maths as the app: subtotal plus 7.5% VAT, rounded to whole naira.
export function quoteTotalNaira(quote) {
  const subtotal = quote.items.reduce((sum, i) => sum + i.q * i.p, 0);
  return subtotal + Math.round(subtotal * 0.075);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, email, callback_url } = req.body || {};
  if (!token || !email) {
    return res.status(400).json({ error: 'token and email are required' });
  }
  const code = String(token).trim().toUpperCase();

  // 1. Load the job and make sure it is waiting for payment.
  const jobRes = await fetch(
    `${SB_URL}/rest/v1/jobs?token=eq.${encodeURIComponent(code)}&select=token,status,quote`,
    { headers: sbHeaders }
  );
  const [job] = await jobRes.json();
  if (!job) return res.status(404).json({ error: 'Job not found' });
  if (job.status !== 'quoted' || !job.quote) {
    return res.status(409).json({ error: 'This job is not awaiting payment' });
  }

  // 2. Charge the amount on the quote, in kobo (1 naira = 100 kobo).
  const amountKobo = quoteTotalNaira(job.quote) * 100;
  const reference = `HF-${job.token}-${Date.now()}`;

  // 3. Create the Paystack transaction.
  const psRes = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PS_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      amount: amountKobo,
      currency: 'NGN',
      reference,
      callback_url,
      metadata: { token: job.token },
      channels: ['card', 'bank', 'bank_transfer'],
    }),
  });
  const psData = await psRes.json();
  if (!psData.status) {
    return res.status(502).json({ error: psData.message || 'Paystack could not start the payment' });
  }

  return res.status(200).json({
    authorization_url: psData.data.authorization_url,
    reference,
  });
}
