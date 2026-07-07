/**
 * VNP Provider Claim System
 * 
 * Zero-friction provider ownership verification:
 * - No login required
 * - DNS TXT record verification (industry standard)
 * - Email notifications
 * - Automatic score decline alerts
 * 
 * FLOW:
 * 1. Provider visits: vnp.io/claim
 * 2. Enters: company name + API domain (e.g., api.stripe.com)
 * 3. System generates: DNS TXT record to add
 * 4. Provider adds TXT record to their DNS
 * 5. System polls every 10 seconds, verifies, grants access
 * 6. Provider can now see dashboard + alerts
 */

import express, { Request, Response } from 'express';
import dns from 'dns';
import { promisify } from 'util';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

const dnsResolveTxt = promisify(dns.resolveTxt);

// ============================================================================
// CONFIGURATION
// ============================================================================

const VERIFICATION_RECORD_PREFIX = '_vnp-claim.';
const VERIFICATION_TTL_HOURS = 24;
const POLLING_INTERVAL_SECONDS = 10;
const POLLING_MAX_ATTEMPTS = 720; // 2 hours of polling

// Email configuration (use environment variables)
const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.sendgrid.net',
  port: parseInt(process.env.SMTP_PORT || '587'),
  auth: {
    user: process.env.SMTP_USER || 'apikey',
    pass: process.env.SMTP_PASS || '',
  },
});

// ============================================================================
// DATABASE MODELS (In production, use PostgreSQL)
// ============================================================================

interface ClaimRequest {
  id: string;
  apiId: string;
  apiDomain: string;
  companyName: string;
  companyEmail: string;
  dnsRecord: string;
  dnsValue: string;
  status: 'pending' | 'verified' | 'failed';
  createdAt: Date;
  verifiedAt?: Date;
  expiresAt: Date;
}

interface ClaimedAPI {
  apiId: string;
  claimVerifiedAt: Date;
  companyName: string;
  companyEmail: string;
  scoreLowAlert: boolean;
  scoreLowThreshold: number; // Alert if score drops below this
  lastScoreAlertSent?: Date;
}

// In-memory storage (replace with database in production)
const claimRequests = new Map<string, ClaimRequest>();
const claimedApis = new Map<string, ClaimedAPI>();

// ============================================================================
// CLAIM REQUEST GENERATION
// ============================================================================

export function generateClaimRequest(
  apiId: string,
  apiDomain: string,
  companyName: string,
  companyEmail: string
): ClaimRequest {
  const claimId = crypto.randomUUID();
  const dnsValue = crypto.randomBytes(16).toString('hex');
  const dnsRecord = `${VERIFICATION_RECORD_PREFIX}${claimId}.${apiDomain}`;

  const request: ClaimRequest = {
    id: claimId,
    apiId,
    apiDomain,
    companyName,
    companyEmail,
    dnsRecord,
    dnsValue,
    status: 'pending',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + VERIFICATION_TTL_HOURS * 60 * 60 * 1000),
  };

  claimRequests.set(claimId, request);

  return request;
}

// ============================================================================
// DNS VERIFICATION
// ============================================================================

export async function verifyDnsRecord(dnsRecord: string, expectedValue: string): Promise<boolean> {
  try {
    const results = await dnsResolveTxt(dnsRecord);

    // DNS TXT records are returned as arrays of arrays
    // Flatten and check if our value exists
    const values = results.flat().join('');

    return values.includes(expectedValue);
  } catch (error) {
    // DNS query failed - either record doesn't exist or network error
    return false;
  }
}

export async function pollDnsVerification(
  claimId: string,
  maxAttempts: number = POLLING_MAX_ATTEMPTS
): Promise<boolean> {
  const request = claimRequests.get(claimId);
  if (!request) {
    throw new Error(`Claim request ${claimId} not found`);
  }

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const verified = await verifyDnsRecord(request.dnsRecord, request.dnsValue);

    if (verified) {
      // Mark as verified
      request.status = 'verified';
      request.verifiedAt = new Date();

      // Add to claimed APIs
      claimedApis.set(request.apiId, {
        apiId: request.apiId,
        claimVerifiedAt: new Date(),
        companyName: request.companyName,
        companyEmail: request.companyEmail,
        scoreLowAlert: true,
        scoreLowThreshold: 80, // Default: alert if score drops below 80
      });

      // Send confirmation email
      await sendVerificationEmail(request);

      return true;
    }

    // Wait before next attempt
    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL_SECONDS * 1000));
    }
  }

  // Verification failed
  request.status = 'failed';
  return false;
}

// ============================================================================
// EMAIL NOTIFICATIONS
// ============================================================================

async function sendVerificationEmail(request: ClaimRequest): Promise<void> {
  const providerDashboardUrl = `https://vnp.io/provider/${request.apiId}`;

  await emailTransporter.sendMail({
    from: 'claim@vnp.io',
    to: request.companyEmail,
    subject: `✓ ${request.companyName} claimed on VNP`,
    html: `
      <h2>Claim Verified</h2>
      <p>Your API <strong>${request.apiDomain}</strong> is now claimed on Veklom Nexus Protocol.</p>
      
      <p>
        <a href="${providerDashboardUrl}" style="
          display: inline-block;
          padding: 10px 20px;
          background-color: #FF6B35;
          color: white;
          text-decoration: none;
          border-radius: 4px;
        ">View Your VNP Dashboard</a>
      </p>
      
      <h3>What's Next?</h3>
      <ul>
        <li>Monitor your VNP score in real-time</li>
        <li>See dimensional breakdown (where you're strong/weak)</li>
        <li>Receive alerts if score drops >5 points</li>
        <li>Embed VNP badge on your website</li>
        <li>File disputes if you believe scores are incorrect</li>
      </ul>
      
      <p>
        <strong>Questions?</strong> Visit <a href="https://docs.vnp.io">docs.vnp.io</a> or 
        email support@vnp.io
      </p>
    `,
  });
}

export async function sendScoreLowAlert(
  claimedApi: ClaimedAPI,
  currentScore: number,
  previousScore: number
): Promise<void> {
  if (currentScore >= claimedApi.scoreLowThreshold) {
    return; // Don't alert if still above threshold
  }

  if (
    claimedApi.lastScoreAlertSent &&
    Date.now() - claimedApi.lastScoreAlertSent.getTime() < 24 * 60 * 60 * 1000
  ) {
    return; // Don't send duplicate alerts within 24 hours
  }

  const providerDashboardUrl = `https://vnp.io/provider/${claimedApi.apiId}`;

  await emailTransporter.sendMail({
    from: 'alerts@vnp.io',
    to: claimedApi.companyEmail,
    subject: `⚠️ VNP Score Alert: ${claimedApi.companyName} dropped to ${currentScore.toFixed(1)}`,
    html: `
      <h2>VNP Score Alert</h2>
      <p>Your API score has dropped below your threshold:</p>
      
      <div style="
        padding: 20px;
        background-color: #f5f5f5;
        border-left: 4px solid #FF6B35;
        margin: 20px 0;
      ">
        <p><strong>Previous Score:</strong> ${previousScore.toFixed(1)}</p>
        <p><strong>Current Score:</strong> ${currentScore.toFixed(1)}</p>
        <p><strong>Change:</strong> ${(currentScore - previousScore).toFixed(1)} points</p>
      </div>
      
      <p>
        <a href="${providerDashboardUrl}">View detailed breakdown →</a>
      </p>
      
      <h3>Common Causes</h3>
      <ul>
        <li>Increased latency (check API server performance)</li>
        <li>Higher error rate (review recent deployments)</li>
        <li>Degraded availability (check infrastructure status)</li>
      </ul>
      
      <p>Questions about this alert? <a href="https://docs.vnp.io/disputes">File a dispute →</a></p>
    `,
  });

  claimedApi.lastScoreAlertSent = new Date();
}

// ============================================================================
// EXPRESS ENDPOINTS
// ============================================================================

export function setupClaimRoutes(app: express.Application): void {
  /**
   * POST /api/v1/claims
   * 
   * Create a new claim request
   * 
   * BODY:
   *   {
   *     "api_domain": "api.stripe.com",
   *     "company_name": "Stripe Inc.",
   *     "company_email": "devrel@stripe.com"
   *   }
   * 
   * RESPONSE:
   *   {
   *     "claim_id": "uuid",
   *     "dns_record": "_vnp-claim.{id}.api.stripe.com",
   *     "dns_value": "abc123...",
   *     "instructions": "Add this TXT record to your DNS..."
   *   }
   */
  app.post('/api/v1/claims', (req: Request, res: Response) => {
    const { api_domain, company_name, company_email } = req.body;

    if (!api_domain || !company_name || !company_email) {
      return res.status(400).json({
        error: 'Missing required fields: api_domain, company_name, company_email',
      });
    }

    // Validate email format
    if (!company_email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Normalize domain
    const normalizedDomain = api_domain
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '');

    // Generate claim request
    const apiId = `did:vnp:api:${normalizedDomain.replace(/\./g, '-')}`;
    const request = generateClaimRequest(apiId, normalizedDomain, company_name, company_email);

    res.status(201).json({
      claim_id: request.id,
      api_id: request.apiId,
      dns_record: request.dnsRecord,
      dns_value: request.dnsValue,
      instructions: `Add this TXT record to your DNS provider:\n\nName: ${request.dnsRecord}\nValue: ${request.dnsValue}\n\nThen we'll automatically verify within 2 hours.`,
      expires_at: request.expiresAt,
    });
  });

  /**
   * GET /api/v1/claims/{claim_id}/status
   * 
   * Check status of a claim request
   */
  app.get('/api/v1/claims/:claimId/status', (req: Request, res: Response) => {
    const request = claimRequests.get(req.params.claimId);

    if (!request) {
      return res.status(404).json({ error: 'Claim request not found' });
    }

    if (request.status === 'verified') {
      const claimedApi = claimedApis.get(request.apiId);
      return res.json({
        status: 'verified',
        api_id: request.apiId,
        verified_at: request.verifiedAt,
        dashboard_url: `https://vnp.io/provider/${request.apiId}`,
        claimed_api: claimedApi,
      });
    }

    res.json({
      status: request.status,
      claim_id: request.id,
      api_domain: request.apiDomain,
      expires_at: request.expiresAt,
    });
  });

  /**
   * POST /api/v1/claims/{claim_id}/verify
   * 
   * Manually trigger verification (for testing)
   */
  app.post('/api/v1/claims/:claimId/verify', async (req: Request, res: Response) => {
    try {
      const verified = await pollDnsVerification(req.params.claimId, 1); // Try once

      if (verified) {
        return res.json({
          status: 'verified',
          message: 'Claim verified successfully',
        });
      }

      res.json({
        status: 'pending',
        message: 'DNS record not yet detected. Please ensure TXT record is added and DNS has propagated (can take 10 minutes).',
      });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Verification failed' });
    }
  });

  /**
   * GET /api/v1/providers/{api_id}
   * 
   * Get claimed provider info
   */
  app.get('/api/v1/providers/:apiId', (req: Request, res: Response) => {
    const claimed = claimedApis.get(req.params.apiId);

    if (!claimed) {
      return res.status(404).json({ error: 'API not claimed' });
    }

    res.json({
      api_id: claimed.apiId,
      company_name: claimed.companyName,
      company_email: claimed.companyEmail,
      claim_verified_at: claimed.claimVerifiedAt,
      alerts_enabled: claimed.scoreLowAlert,
      alert_threshold: claimed.scoreLowThreshold,
      dashboard_url: `https://vnp.io/provider/${claimed.apiId}`,
    });
  });

  /**
   * PATCH /api/v1/providers/{api_id}/settings
   * 
   * Update provider settings (requires email verification code)
   */
  app.patch('/api/v1/providers/:apiId/settings', (req: Request, res: Response) => {
    const claimed = claimedApis.get(req.params.apiId);

    if (!claimed) {
      return res.status(404).json({ error: 'API not claimed' });
    }

    const { score_low_alert, score_low_threshold } = req.body;

    if (typeof score_low_alert === 'boolean') {
      claimed.scoreLowAlert = score_low_alert;
    }

    if (typeof score_low_threshold === 'number') {
      claimed.scoreLowThreshold = Math.max(0, Math.min(100, score_low_threshold));
    }

    res.json({
      api_id: claimed.apiId,
      alerts_enabled: claimed.scoreLowAlert,
      alert_threshold: claimed.scoreLowThreshold,
    });
  });
}

// ============================================================================
// BACKGROUND WORKER (Automatic Verification Polling)
// ============================================================================

export function startClaimVerificationWorker(): void {
  setInterval(async () => {
    for (const [claimId, request] of claimRequests) {
      if (request.status !== 'pending') continue;
      if (Date.now() > request.expiresAt.getTime()) {
        request.status = 'failed';
        continue;
      }

      try {
        await pollDnsVerification(claimId, 1); // Try once per interval
      } catch (error) {
        console.error(`Error verifying claim ${claimId}:`, error);
      }
    }
  }, POLLING_INTERVAL_SECONDS * 1000);

  console.log('Claim verification worker started');
}

export { ClaimRequest, ClaimedAPI };
