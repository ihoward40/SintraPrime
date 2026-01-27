# Airlock Server Deployment Guide (Render)

This guide walks through deploying the SintraPrime Airlock server to Render.com as a production-ready HMAC-verified gateway.

## Overview

The Airlock server is a secure gateway that:
- Verifies HMAC signatures from portal automation scripts
- Validates payload structure and file integrity (SHA-256 hashes)
- Stores files temporarily for Make.com to download
- Sanitizes receipts (strips base64 data) before forwarding to Make
- Provides health check endpoint for monitoring

## Prerequisites

1. **Render.com account** - Sign up at https://render.com
2. **GitHub access** - Airlock code in the SintraPrime repository
3. **Make.com webhook URL** - Get this from your Make scenario (see MAKE_SCENARIO_SETUP.md)
4. **Shared secrets** - Two randomly generated secrets (32+ characters each)

## Step 1: Generate Secrets

Generate two strong secrets (32+ characters, high entropy):

```bash
# On macOS/Linux:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or use OpenSSL:
openssl rand -hex 32
openssl rand -hex 32
```

Save these as:
- **MANUS_SHARED_SECRET** - Shared between sender scripts and Airlock
- **AIRLOCK_SHARED_SECRET** - Shared between Airlock and Make.com

## Step 2: Create Render Web Service

1. Go to https://dashboard.render.com
2. Click **New +** → **Web Service**
3. Connect your GitHub repository: `ihoward40/SintraPrime`
4. Configure the service:

### Basic Configuration

| Field | Value |
|-------|-------|
| **Name** | `sintraprime-airlock` (or your choice) |
| **Region** | Choose closest to your users |
| **Branch** | `main` (or your deployment branch) |
| **Root Directory** | `airlock_server` |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |

### Advanced Settings

| Field | Value |
|-------|-------|
| **Node Version** | `18` or `20` |
| **Health Check Path** | `/health` |

## Step 3: Configure Environment Variables

In the Render dashboard, add these environment variables:

### Required Variables

| Variable | Value | Example |
|----------|-------|---------|
| `MANUS_SHARED_SECRET` | Your first generated secret | `a1b2c3d4...` (64 hex chars) |
| `MAKE_WEBHOOK_URL` | Your Make.com webhook URL | `https://hook.us1.make.com/abc123...` |
| `AIRLOCK_SHARED_SECRET` | Your second generated secret | `e5f6g7h8...` (64 hex chars) |

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port (Render sets this automatically) |
| `ACCEPT_ORIGIN` | `*` | CORS origin filter |
| `MAX_BODY_BYTES` | `10485760` | Max payload size (10MB) |
| `ALLOW_DEV_ROUTES` | `false` | Enable `/dev/*` routes for debugging |

## Step 4: Deploy

1. Click **Create Web Service**
2. Render will:
   - Clone the repository
   - Run `npm install` in `airlock_server/`
   - Start the server with `npm start`
   - Monitor the `/health` endpoint

3. Wait for deployment to complete (usually 2-3 minutes)
4. Note your service URL: `https://sintraprime-airlock.onrender.com`

## Step 5: Verify Deployment

### Test Health Check

```bash
curl https://sintraprime-airlock.onrender.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "sintraprime-airlock",
  "version": "1.1.0",
  "timestamp": "2026-01-27T12:00:00.000Z"
}
```

### Check Logs

In Render dashboard:
1. Go to your service
2. Click **Logs** tab
3. Look for: `🔒 Airlock server running on port 3000`

## Step 6: Test with Real Payload

Use the test script from the repository:

```bash
cd /path/to/SintraPrime

# Set environment variables
export AIRLOCK_URL=https://sintraprime-airlock.onrender.com
export MANUS_SHARED_SECRET=your-manus-shared-secret

# Run test (assumes you have test PDFs in ./test-pdfs)
node scripts/send_to_airlock.mjs ./test-pdfs
```

Expected output:
```
Found 2 PDF file(s) in ./test-pdfs
  - document1.pdf (12345 bytes)
  - document2.pdf (67890 bytes)

Sending to: https://sintraprime-airlock.onrender.com/manus/webhook
Task ID: LOCAL-1738067400123

=== RESPONSE ===
STATUS: 200
{"success":true,"task_id":"LOCAL-1738067400123","files_stored":2,"forwarded_to_make":true,"elapsed_ms":234}

✅ SUCCESS: Airlock accepted the payload
```

## Step 7: Configure Make.com Scenario

Now set up your Make.com scenario to receive webhooks from Airlock.

See: **MAKE_SCENARIO_SETUP.md**

## Troubleshooting

### Health Check Failing

**Problem**: Render shows "unhealthy" status

**Solutions**:
1. Check logs for startup errors
2. Verify environment variables are set correctly
3. Ensure `MAKE_WEBHOOK_URL` is a valid URL
4. Check that `/health` endpoint returns 200 OK

### HMAC Signature Verification Failed

**Problem**: `401 Invalid signature` error

**Solutions**:
1. Verify `MANUS_SHARED_SECRET` matches between sender and Airlock
2. Check timestamp is within 5-minute window (clock drift?)
3. Ensure payload isn't being modified in transit
4. Verify signature is computed as: `HMAC-SHA256(secret, "${timestamp}.${json_body}")`

### Make.com Webhook Failing

**Problem**: `502 Make.com webhook failed` error

**Solutions**:
1. Verify `MAKE_WEBHOOK_URL` is correct and active
2. Check Make.com scenario is running (not paused)
3. Review Make.com execution logs for errors
4. Test Make webhook directly with curl

### File Download 404

**Problem**: Make can't download files from `/files/:task_id/:filename`

**Solutions**:
1. Check file was stored successfully (look for "Stored:" in logs)
2. Verify URL encoding of filename
3. Check file hasn't expired/been cleaned up
4. Enable `ALLOW_DEV_ROUTES=true` and check `/dev/files` to see stored files

### Payload Too Large

**Problem**: `413 Payload Too Large` error

**Solutions**:
1. Increase `MAX_BODY_BYTES` environment variable
2. Compress files before sending
3. Split large batches into multiple requests
4. Consider if 10MB limit is appropriate for your use case

## Security Considerations

1. **Never commit secrets** to version control
2. **Rotate secrets** periodically (quarterly recommended)
3. **Monitor logs** for failed authentication attempts
4. **Set ACCEPT_ORIGIN** to specific domain in production (not `*`)
5. **Use HTTPS only** (Render provides this automatically)
6. **Validate file types** in Make.com scenario (defense in depth)
7. **Set up alerts** in Render for service downtime

## Maintenance

### Updating the Server

1. Push code changes to GitHub
2. Render auto-deploys from `main` branch (if configured)
3. Or manually trigger deploy in Render dashboard

### Monitoring

Key metrics to watch:
- Health check uptime
- Request rate and latency
- Error rate (4xx, 5xx)
- Memory and CPU usage
- Disk usage (temp file storage)

### Log Retention

Render keeps logs for 7 days on free tier, longer on paid plans.

Download important logs periodically for audit trail.

## Cost Estimates

Render free tier includes:
- 750 hours/month runtime (enough for 1 service 24/7)
- Automatic SSL certificates
- Auto-scaling (within plan limits)

Paid plans start at $7/month for:
- More compute resources
- Longer log retention
- Persistent disk storage
- Better support

## Next Steps

1. ✅ Deploy Airlock to Render
2. → Set up Make.com scenario (see MAKE_SCENARIO_SETUP.md)
3. → Configure portal automation scripts to use Airlock
4. → Set up monitoring and alerts
5. → Document operational runbooks

## Support

For issues:
1. Check Render logs first
2. Review this guide's troubleshooting section
3. Test with `send_to_airlock.mjs` script
4. Open GitHub issue with relevant logs

---

**Last Updated**: 2026-01-27  
**Version**: 1.1.0  
**Maintained By**: SintraPrime Team
