// POST /api/paystack/release
// Body: { token: "HF-1040" }
// Releases the escrowed payment for a job after the customer has signed off.
//
// Paystack has no built-in escrow, so the money is collected into the business
// Paystack account and this endpoint records the release in the database.
// Only a job that is signed off ('closed') and still held can be released.
//
// Required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const sbHeaders = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  'Content-Type': 'application/json',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.body || {};
  if (!token) return res.status(400).json({ error: 'token is required' });
  const code = String(token).trim().toUpperCase();

  // Load the job and check it can be released.
  const jobRes = await fetch(
    `${SB_URL}/rest/v1/jobs?token=eq.${encodeURIComponent(code)}&select=token,status,escrow_status`,
    { headers: sbHeaders }
  );
  const [job] = await jobRes.json();
  if (!job) return res.status(404).json({ error: 'Job not found' });
  if (job.status !== 'closed') {
    return res.status(409).json({ error: 'The customer has not signed off this job yet' });
  }
  if (job.escrow_status !== 'held') {
    return res.status(409).json({ error: 'No held payment to release' });
  }

  // Release. The escrow_status=eq.held filter stops a double release.
  const upd = await fetch(
    `${SB_URL}/rest/v1/jobs?token=eq.${encodeURIComponent(code)}&escrow_status=eq.held`,
    {
      method: 'PATCH',
      headers: { ...sbHeaders, Prefer: 'return=representation' },
      body: JSON.stringify({
        escrow_status: 'released',
        escrow_released_at: new Date().toISOString(),
      }),
    }
  );
  const updated = await upd.json();
  if (!updated.length) {
    return res.status(409).json({ error: 'The payment was already released' });
  }

  return res.status(200).json({ token: code, escrow_status: 'released' });
}
