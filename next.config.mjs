const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdn.botpress.cloud https://files.bpcontent.cloud",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: https:",
  "connect-src 'self' https://npcezxyyhgbycdekioix.supabase.co wss://npcezxyyhgbycdekioix.supabase.co https://api.paystack.co https://script.google.com https://script.googleusercontent.com https://*.botpress.cloud https://*.bpcontent.cloud wss://*.botpress.cloud",
  "frame-src https://*.botpress.cloud https://*.bpcontent.cloud",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Content-Security-Policy', value: csp },
];

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      { source: '/(.*)', headers: securityHeaders },
      { source: '/(.*)\\.(jpg|jpeg|png|webp|svg|ico)', headers: [{ key: 'Cache-Control', value: 'public, max-age=604800' }] },
    ];
  },
};

export default nextConfig;
