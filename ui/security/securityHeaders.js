export function securityHeaders(_req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer-when-downgrade");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  // CSP: keep conservative; allow inline styles for existing Tailwind/Next patterns.
  // Tune via UI_CSP_CONNECT_SRC="http://localhost:3001 http://127.0.0.1:3001" etc.
  const connectSrc = String(process.env.UI_CSP_CONNECT_SRC || "'self'").trim() || "'self'";
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "img-src 'self' data:",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      `connect-src ${connectSrc}`,
      "base-uri 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  );

  next();
}
