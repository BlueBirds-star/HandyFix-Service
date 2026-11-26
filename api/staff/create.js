// POST /api/staff/create
// Header: Authorization: Bearer <access token of the signed-in admin>
// Body: { name, email, password, trade }   trade = "Electrical" or "Plumbing"
// Creates a technician login (role "technician") and adds them to the workers table.
//
// Required environment variables (Vercel > Settings > Environment Variables):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

const SB_URL = process.env.SUPABASE_URL;
const SB_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SB_ANON = 'sb_publishable_C10VfCZFkbnRve05vRn1Vw_-YJ1CRi8';

export default async function handler(req, res) {
  if (!SB_URL || !SB_SERVICE) {
    return res.status(500).json({
      error: 'Server settings are missing. In Vercel, add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, then redeploy.',
    });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // 1. The caller must be signed in as an admin.
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Sign in as admin first' });

  const meRes = await fetch(`${SB_URL}/auth/v1/user`, {
    headers: { apikey: SB_ANON, Authorization: `Bearer ${token}` },
  });
  if (!meRes.ok) return res.status(401).json({ error: 'Your session has expired. Sign in again.' });
  const me = await meRes.json();
  if (!me.app_metadata || me.app_metadata.role !== 'admin') {
    return res.status(403).json({ error: 'Only the admin can add technicians' });
  }

  // 2. Check the new technician's details.
  const { name, email, password, trade } = req.body || {};
  if (!name || !email || !password || !['Electrical', 'Plumbing'].includes(trade)) {
    return res.status(400).json({ error: 'Name, email, password and trade (Electrical or Plumbing) are required' });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const svc = { apikey: SB_SERVICE, Authorization: `Bearer ${SB_SERVICE}`, 'Content-Type': 'application/json' };

  // 3. Create the technician's login with the technician role.
  const createRes = await fetch(`${SB_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: svc,
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: 'technician' },
      user_metadata: { name },
    }),
  });
  const created = await createRes.json();
  if (!createRes.ok) {
    return res.status(400).json({ error: created.msg || created.message || 'Could not create the account' });
  }

  // 4. Add the technician to the workers table.
  const workerId = 'w' + created.id.replace(/-/g, '').slice(0, 12);
  const wRes = await fetch(`${SB_URL}/rest/v1/workers`, {
    method: 'POST',
    headers: { ...svc, Prefer: 'return=minimal' },
    body: JSON.stringify({ id: workerId, name, trade }),
  });
  if (!wRes.ok) {
    return res.status(500).json({ error: 'The account was created, but the technician list could not be updated' });
  }

  return res.status(200).json({ id: workerId, name, trade, email });
}
