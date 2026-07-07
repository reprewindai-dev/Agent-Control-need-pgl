import express, { Request, Response } from 'express';
import crypto from 'crypto';

const router = express.Router();

// ============================================================================
// DATA STORE (In-memory, replace with ClickHouse/PostgreSQL in production)
// ============================================================================

interface TSCMember {
  id: string;
  name: string;
  role: string;
  organization: string;
  joined_at: string;
  voting_weight: number;
}

interface Proposal {
  id: string;
  title: string;
  description: string;
  proposer: string;
  status: 'draft' | 'under_discussion' | 'voting' | 'passed' | 'failed' | 'implemented';
  votes_for: number;
  votes_against: number;
  votes_abstain: number;
  created_at: string;
  voting_ends_at?: string;
  category: 'methodology' | 'infrastructure' | 'charter' | 'membership';
}

const tscMembers: TSCMember[] = [
  {
    id: 'tsc-01',
    name: 'Dr. Evelyn Carter',
    role: 'TSC Chair / Principal Architect',
    organization: 'Independent Academic / University of Toronto',
    joined_at: '2025-11-12T00:00:00Z',
    voting_weight: 1,
  },
  {
    id: 'tsc-02',
    name: 'Marcus Vance',
    role: 'Infrastructure Lead',
    organization: 'Veklom Core Sponsor Team',
    joined_at: '2025-11-12T00:00:00Z',
    voting_weight: 1,
  },
  {
    id: 'tsc-03',
    name: 'Yuki Sato',
    role: 'Security & Consensus Lead',
    organization: 'Sovereign Nodes Initiative',
    joined_at: '2026-01-10T00:00:00Z',
    voting_weight: 1,
  },
  {
    id: 'tsc-04',
    name: 'Sophia Martinez',
    role: 'M2M Compliance Lead',
    organization: 'Decentralized Compute Syndicate',
    joined_at: '2026-03-01T00:00:00Z',
    voting_weight: 1,
  },
  {
    id: 'tsc-05',
    name: 'Devon Patel',
    role: 'Developer Experience Advocate',
    organization: 'OpenAPI Community Representative',
    joined_at: '2026-04-15T00:00:00Z',
    voting_weight: 1,
  }
];

const proposals: Proposal[] = [
  {
    id: 'prop-001',
    title: 'Formalize VNP v0.1.5 Scoring Methodology',
    description: 'Binds real-time micro-stakes (VNP) yields and performance bonds to the 10-dimensional scoring schema, moving from hourly batches to a 100-measurement rolling trigger.',
    proposer: 'Marcus Vance',
    status: 'passed',
    votes_for: 5,
    votes_against: 0,
    votes_abstain: 0,
    created_at: '2026-06-20T10:00:00Z',
    voting_ends_at: '2026-06-25T10:00:00Z',
    category: 'methodology',
  },
  {
    id: 'prop-002',
    title: 'Establish European measurement cluster (eu-west)',
    description: 'Deploys 5 new measurement nodes in Dublin and Frankfurt to normalize latency figures across trans-atlantic routes.',
    proposer: 'Yuki Sato',
    status: 'implemented',
    votes_for: 4,
    votes_against: 0,
    votes_abstain: 1,
    created_at: '2026-05-10T08:00:00Z',
    voting_ends_at: '2026-05-15T08:00:00Z',
    category: 'infrastructure',
  },
  {
    id: 'prop-003',
    title: 'Tighten Rate-Limit Header Validation',
    description: 'Draft proposal to make Ratelimit-Remaining detection mandatory for Tier-1 API classifications. Failure to supply structured standard rate limiting headers results in a 15-point penalty on the transparency axis.',
    proposer: 'Devon Patel',
    status: 'under_discussion',
    votes_for: 0,
    votes_against: 0,
    votes_abstain: 0,
    created_at: '2026-06-28T14:30:00Z',
    category: 'methodology',
  }
];

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /charter
 * 
 * Retrieve the active VNP governance charter summary and metadata
 */
router.get('/charter', (req: Request, res: Response) => {
  res.json({
    version: '1.0',
    status: 'Open for Community Comment (60-day period)',
    effective_date: '2026-08-22',
    authority: 'Veklom Runtime Authority',
    mission: {
      core_values: [
        'Transparency: All methodology, test harnesses, and decision-making are public.',
        'Neutrality: No single organization controls VNP technical direction.',
        'Fairness: Scoring formula prevents gaming and levels the playing field.',
        'Interoperability: Integration into x402, settlement ledgers, and OpenAPI standard.'
      ],
      description: 'The Veklom Nexus Protocol (VNP) is a globally recognized, open-community, real-time API benchmark scoring standard.'
    },
    boards: {
      bgb: {
        name: 'Business Governing Board',
        scope: 'Funding, legal, corporate strategy, budget management, branding.'
      },
      tsc: {
        name: 'Technical Steering Committee',
        scope: 'VNP specifications, scoring methodology, measurement infrastructure, audit authority.'
      }
    },
    voting_rules: {
      quorum: 'Simple majority (>50% of active members) for standard operations.',
      supermajority: '2/3 majority for methodology amendments, charter changes, or member removal.',
      notice_period: 'All technical methodology changes require a minimum of 60 days public notice before implementation.'
    }
  });
});

/**
 * GET /tsc/members
 * 
 * List current Technical Steering Committee members
 */
router.get('/tsc/members', (req: Request, res: Response) => {
  res.json({
    total_active_members: tscMembers.length,
    members: tscMembers,
    authority_verification: 'did:vnp:governance-authority'
  });
});

/**
 * GET /proposals
 * 
 * Get list of all proposals
 */
router.get('/proposals', (req: Request, res: Response) => {
  res.json({
    total_count: proposals.length,
    proposals: proposals
  });
});

/**
 * POST /proposals
 * 
 * File a new governance proposal
 */
router.post('/proposals', (req: Request, res: Response) => {
  const { title, description, proposer, category } = req.body;

  if (!title || !description || !proposer || !category) {
    return res.status(400).json({
      error: 'Missing required fields: title, description, proposer, category'
    });
  }

  const validCategories = ['methodology', 'infrastructure', 'charter', 'membership'];
  if (!validCategories.includes(category)) {
    return res.status(400).json({
      error: `Invalid category. Must be one of: ${validCategories.join(', ')}`
    });
  }

  const newProposal: Proposal = {
    id: `prop-${crypto.randomBytes(4).toString('hex')}`,
    title,
    description,
    proposer,
    status: 'draft',
    votes_for: 0,
    votes_against: 0,
    votes_abstain: 0,
    created_at: new Date().toISOString(),
    category: category as any,
  };

  proposals.push(newProposal);

  res.status(201).json({
    message: 'Proposal registered successfully',
    proposal: newProposal
  });
});

/**
 * GET /proposals/{proposal-id}
 * 
 * Get details of a single proposal
 */
router.get('/proposals/:proposalId', (req: Request, res: Response) => {
  const proposal = proposals.find(p => p.id === req.params.proposalId);

  if (!proposal) {
    return res.status(404).json({ error: 'Proposal not found' });
  }

  res.json(proposal);
});

/**
 * POST /votes
 * 
 * Submit a vote on a proposal (for registered TSC members)
 */
router.post('/votes', (req: Request, res: Response) => {
  const { proposal_id, tsc_member_id, vote } = req.body;

  if (!proposal_id || !tsc_member_id || !vote) {
    return res.status(400).json({
      error: 'Missing required fields: proposal_id, tsc_member_id, vote'
    });
  }

  const proposal = proposals.find(p => p.id === proposal_id);
  if (!proposal) {
    return res.status(404).json({ error: 'Proposal not found' });
  }

  const member = tscMembers.find(m => m.id === tsc_member_id);
  if (!member) {
    return res.status(401).json({ error: 'Unauthorized. Not an active Technical Steering Committee member.' });
  }

  const normalizedVote = vote.toLowerCase();
  if (normalizedVote === 'for') {
    proposal.votes_for += member.voting_weight;
  } else if (normalizedVote === 'against') {
    proposal.votes_against += member.voting_weight;
  } else if (normalizedVote === 'abstain') {
    proposal.votes_abstain += member.voting_weight;
  } else {
    return res.status(400).json({ error: "Invalid vote. Must be 'for', 'against', or 'abstain'." });
  }

  res.json({
    message: 'Vote recorded successfully',
    proposal_id,
    current_tally: {
      votes_for: proposal.votes_for,
      votes_against: proposal.votes_against,
      votes_abstain: proposal.votes_abstain
    }
  });
});

export default router;
