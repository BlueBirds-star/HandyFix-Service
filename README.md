# HandyFix (Next.js)

## Run it on your computer
1. Install Node.js 18 or newer.
2. In this folder, run `npm install`.
3. Copy `.env.example` to `.env.local` and fill in the server values.
4. Run `npm run dev` and open http://localhost:3000.

## Put it on Vercel
1. Push this folder to the GitHub repo (replace the old HTML files, or use a new branch).
2. In Vercel, import the repo. Framework preset: **Next.js**. Root directory: empty.
3. Add these environment variables for **Production**:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (secret key), `PAYSTACK_SECRET_KEY` (secret key)
   - `NEXT_PUBLIC_SHEET_URL`, `NEXT_PUBLIC_SHEET_KEY` (optional, for the Google Sheet copy)
4. Deploy. Then set the Paystack webhook to `https://<your-domain>/api/paystack/webhook`.

## Pages
- `/` landing page, `/request`, `/track`, `/pay`
- `/staff-login` sign-in; admin goes to `/admin`, technicians to `/technician`
- `/api/staff/create`, `/api/paystack/initialize`, `/api/paystack/webhook`, `/api/paystack/release`

## Before going live
- Run `supabase/schema.sql` and `supabase/roles.sql` in Supabase.
- Rotate the Supabase secret key and the Paystack secret key (both were shared in chat).
- Test a full job: request, quote, payment, assign, accept, complete, sign-off.
