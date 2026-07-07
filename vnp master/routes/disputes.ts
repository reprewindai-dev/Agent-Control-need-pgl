import express, { Request, Response } from 'express';
import crypto from 'crypto';

const router = express.Router();

// ============================================================================
// DATA STORE (In-memory, replace with ClickHouse/PostgreSQL in production)
// ============================================================================

interface Dispute {
  id: string;
  score_id: string;
  api_id: string;
  dispute_filed_at: string;
  tier: 'tier1' | 'tier2' | 'tier3';
  status: 'open' | 'under_review' | 'resolved' | 'dismissed';
  provider_name: string;
  provider_contact: string;
  reason_category: 'measurement_error' | 'methodology_unclear' | 'regional_anomaly' | 'node_failure' | 'other';
  description: string;
  evidence_urls: string[];
  
  // Tier 1 re-measurement
  tier1_remeasurement_executed: boolean;
  tier1_old_score?: number;
  tier1_new_score?: number;
  tier1_variance_pct?: number;
  tier1_decision?: 'accepted' | 'rejected';

  // Tier 2 panel
  tier2_panel_members?: string[];
  tier2_meeting_date?: string;
  tier2_decision?: 'upheld_original' | 'adjusted' | 'overturned';
  tier2_notes?: string;

  // Tier 3 community
  tier3_challenge_bond_amount?: number;
  tier3_votes_for?: number;
  tier3_votes_against?: number;
  tier3_decision?: string;

  resolved_at?: string;
  resolution_notes?: string;
  final_score_after_resolution?: number;
}

const disputesStore = new Map<string, Dispute>();

// Seed a demo dispute
const demoDisputeId = 'disp-001';
disputesStore.set(demoDisputeId, {
  id: demoDisputeId,
  score_id: 'score-99a2',
  api_id: 'did:vnp:api:stripe-payments',
  dispute_filed_at: '2026-06-25T14:00:00Z',
  tier: 'tier1',
  status: 'under_review',
  provider_name: 'Stripe, Inc.',
  provider_contact: 'devrel@stripe.com',
  reason_category: 'regional_anomaly',
  description: 'A transient fiber-cut on APAC underseas cables caused a spike in p99 measurements from the ap-southeast cluster on 2026-06-24 between 04:00 and 06:00 UTC. This does not represent normal API conditions.',
  evidence_urls: [
    'https://status.stripe.com/incidents/apac-cable-cut-2026-06-24',
    'https://vnp-evidence.stripe.com/p99-ping-trace-internal.log'
  ],
  tier1_remeasurement_executed: true,
  tier1_old_score: 84.2,
  tier1_new_score: 89.1,
  tier1_variance_pct: 5.81,
  tier1_decision: 'accepted',
  resolved_at: '2026-06-26T18:30:00Z',
  resolution_notes: 'APAC regional anomaly was confirmed via traceroute evidence and network logs. Outlier measurements from ap-southeast during cable repair window were excluded from rolling window scoring calculations. Score successfully recalculated and restored.',
  final_score_after_resolution: 89.1
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /
 * 
 * File a new score dispute
 */
router.post('/', (req: Request, res: Response) => {
  const { score_id, api_id, provider_name, provider_contact, reason_category, description, evidence_urls } = req.body;

  if (!score_id || !api_id || !provider_name || !provider_contact || !reason_category || !description) {
    return res.status(400).json({
      error: 'Missing required fields: score_id, api_id, provider_name, provider_contact, reason_category, description'
    });
  }

  const validCategories = ['measurement_error', 'methodology_unclear', 'regional_anomaly', 'node_failure', 'other'];
  if (!validCategories.includes(reason_category)) {
    return res.status(400).json({
      error: `Invalid reason_category. Must be one of: ${validCategories.join(', ')}`
    });
  }

  const disputeId = `disp-${crypto.randomBytes(4).toString('hex')}`;
  const newDispute: Dispute = {
    id: disputeId,
    score_id,
    api_id,
    dispute_filed_at: new Date().toISOString(),
    tier: 'tier1',
    status: 'open',
    provider_name,
    provider_contact,
    reason_category: reason_category as any,
    description,
    evidence_urls: Array.isArray(evidence_urls) ? evidence_urls : [],
    tier1_remeasurement_executed: false
  };

  disputesStore.set(disputeId, newDispute);

  // Trigger automated Tier 1 preliminary review asynchronously
  setTimeout(() => {
    newDispute.status = 'under_review';
    newDispute.tier1_remeasurement_executed = true;
    newDispute.tier1_old_score = 75.0; // Simulate old score
    newDispute.tier1_new_score = 76.5; // Simulate re-measured
    newDispute.tier1_variance_pct = 2.0;
    newDispute.tier1_decision = 'rejected'; // Variance < 5% trigger threshold
    newDispute.status = 'under_review'; // Escalate or wait for provider to challenge (Tier 2)
  }, 10000);

  res.status(201).json({
    message: 'Dispute filed and Tier 1 automated re-measurement initialized',
    dispute_id: disputeId,
    dispute: newDispute,
    timeline: {
      tier1_resolution_eta: 'Less than 10 minutes (Automated)',
      tier2_escalation_available: 'If Tier 1 result is contested, you can request manual panel escalation.'
    }
  });
});

/**
 * GET /:disputeId
 * 
 * Get details of a single dispute
 */
router.get('/:disputeId', (req: Request, res: Response) => {
  const dispute = disputesStore.get(req.params.disputeId);

  if (!dispute) {
    return res.status(404).json({ error: 'Dispute case not found' });
  }

  res.json(dispute);
});

/**
 * GET /:disputeId/status
 * 
 * Check current status of a dispute case
 */
router.get('/:disputeId/status', (req: Request, res: Response) => {
  const dispute = disputesStore.get(req.params.disputeId);

  if (!dispute) {
    return res.status(404).json({ error: 'Dispute case not found' });
  }

  res.json({
    dispute_id: dispute.id,
    status: dispute.status,
    tier: dispute.tier,
    dispute_filed_at: dispute.dispute_filed_at,
    tier1_completed: dispute.tier1_remeasurement_executed,
    tier1_decision: dispute.tier1_decision || 'pending',
    resolved_at: dispute.resolved_at || null,
    notes: dispute.resolution_notes || 'Case is currently under active investigation.'
  });
});

/**
 * POST /:disputeId/evidence
 * 
 * Submit additional evidence URLs for an open dispute
 */
router.post('/:disputeId/evidence', (req: Request, res: Response) => {
  const dispute = disputesStore.get(req.params.disputeId);

  if (!dispute) {
    return res.status(404).json({ error: 'Dispute case not found' });
  }

  const { evidence_urls } = req.body;
  if (!evidence_urls || !Array.isArray(evidence_urls)) {
    return res.status(400).json({ error: 'Missing required parameter: evidence_urls (Array of strings)' });
  }

  dispute.evidence_urls.push(...evidence_urls);

  res.json({
    message: 'Additional evidence received',
    dispute_id: dispute.id,
    total_evidence_count: dispute.evidence_urls.length,
    evidence_urls: dispute.evidence_urls
  });
});

/**
 * GET /:disputeId/panel
 * 
 * Get Tier 2 Panel review details (for cases escalated to manual panel)
 */
router.get('/:disputeId/panel', (req: Request, res: Response) => {
  const dispute = disputesStore.get(req.params.disputeId);

  if (!dispute) {
    return res.status(404).json({ error: 'Dispute case not found' });
  }

  if (dispute.tier === 'tier1' && dispute.status !== 'resolved') {
    // Escalate to tier2 on demand for preview
    dispute.tier = 'tier2';
    dispute.tier2_panel_members = ['Dr. Evelyn Carter', 'Yuki Sato', 'Sophia Martinez'];
    dispute.tier2_meeting_date = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(); // 2 days out
    dispute.tier2_notes = 'Manual verification of DNS and fiber cut latency curves requested.';
  }

  res.json({
    dispute_id: dispute.id,
    tier: 'tier2',
    panel_status: dispute.status === 'resolved' ? 'reviewed' : 'scheduled',
    panel_members: dispute.tier2_panel_members || ['Dr. Evelyn Carter', 'Yuki Sato', 'Sophia Martinez'],
    meeting_date: dispute.tier2_meeting_date || new Date().toISOString(),
    decision: dispute.tier2_decision || 'pending',
    notes: dispute.tier2_notes || 'Manual review of the APAC cable-cut packet headers.'
  });
});

export default router;
