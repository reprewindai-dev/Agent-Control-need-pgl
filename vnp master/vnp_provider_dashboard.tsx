/**
 * VNP Provider Dashboard
 * 
 * Embeddable iframe component for API providers to see their VNP score breakdown
 * Read-only, no auth, publicly accessible
 * 
 * USAGE:
 * <iframe src="https://vnp.io/provider/did:vnp:api:stripe-payments" width="600" height="800"></iframe>
 * 
 * ARCHITECTURE:
 * - Single-page React app (no auth, no login)
 * - DNS TXT verification happens separately (claim/vnp.io/claim/[api-id])
 * - Data fetched from public GraphQL endpoint
 * - Embeddable in any website (GitHub, docs, landing page)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Line, Radar, Bar } from 'recharts';
import {
  LineChart,
  BarChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const API_ENDPOINT = process.env.REACT_APP_API_URL || 'https://api.vnp.io';

interface DimensionalScore {
  name: string;
  score: number;
  weight: number;
}

interface ProviderScoreData {
  apiId: string;
  compositeScore: number;
  confidenceInterval: [number, number];
  dimensions: DimensionalScore[];
  regionalScores: Record<string, number>;
  measurementCount: number;
  lastUpdated: string;
  history30d: Array<{
    date: string;
    score: number;
  }>;
}

export const ProviderDashboard: React.FC<{ apiId: string }> = ({ apiId }) => {
  const [data, setData] = useState<ProviderScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch score data from GraphQL
  const fetchScoreData = useCallback(async () => {
    try {
      const query = `
        query {
          score(api_id: "${apiId}") {
            apiId
            compositeScore
            confidenceInterval: confidence_interval_95
            dimensions {
              p99_latency { score, weight }
              error_rate { score, weight }
              availability { score, weight }
              throughput { score, weight }
              security { score, weight }
              documentation { score, weight }
              versioning { score, weight }
              m2m_compliance { score, weight }
              ratelimit_transparency { score, weight }
              dx_ttfc { score, weight }
            }
            regionalScores: regional_scores
            measurementCount: measurement_count
            lastUpdated: computed_at
            history30d: score_history(window: "30d") {
              date
              score
            }
          }
        }
      `;

      const response = await fetch(`${API_ENDPOINT}/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) throw new Error('Failed to fetch score');
      const result = await response.json();
      
      if (result.errors) throw new Error(result.errors[0].message);
      
      setData(result.data.score);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [apiId]);

  // Fetch on mount and set up auto-refresh (every 5 minutes)
  useEffect(() => {
    fetchScoreData();
    
    if (!autoRefresh) return;
    
    const interval = setInterval(fetchScoreData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchScoreData, autoRefresh]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading VNP score for {apiId}...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-md">
          <h2 className="text-xl font-bold text-red-600">Error Loading Score</h2>
          <p className="text-gray-600 mt-2">{error || 'API not found in VNP'}</p>
          <p className="text-sm text-gray-500 mt-4">
            Claim your API at{' '}
            <a href="https://vnp.io/claim" className="text-orange-500 underline">
              vnp.io/claim
            </a>
          </p>
        </div>
      </div>
    );
  }

  const radarData = data.dimensions.map((d) => ({
    dimension: d.name,
    score: d.score,
  }));

  const trendData = data.history30d;

  const regionalData = Object.entries(data.regionalScores).map(([region, score]) => ({
    region,
    score,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold">{apiId.split(':').pop()}</h1>
        <p className="text-gray-400 mt-2">VNP Score Dashboard</p>
      </div>

      {/* Main Score Card */}
      <div className="bg-gray-800 rounded-lg p-8 mb-8 border border-orange-500">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {/* Composite Score */}
          <div>
            <p className="text-gray-400 text-sm mb-2">COMPOSITE SCORE</p>
            <p className="text-5xl font-bold text-orange-500">{data.compositeScore.toFixed(1)}</p>
            <p className="text-xs text-gray-500 mt-2">
              95% CI: {data.confidenceInterval[0].toFixed(1)} — {data.confidenceInterval[1].toFixed(1)}
            </p>
          </div>

          {/* Grade */}
          <div>
            <p className="text-gray-400 text-sm mb-2">GRADE</p>
            <p className="text-5xl font-bold">
              {data.compositeScore >= 85
                ? 'A'
                : data.compositeScore >= 75
                ? 'B'
                : data.compositeScore >= 65
                ? 'C'
                : 'D'}
            </p>
          </div>

          {/* Measurements */}
          <div>
            <p className="text-gray-400 text-sm mb-2">MEASUREMENTS</p>
            <p className="text-3xl font-bold">{data.measurementCount.toLocaleString()}</p>
          </div>

          {/* Last Updated */}
          <div>
            <p className="text-gray-400 text-sm mb-2">LAST UPDATED</p>
            <p className="text-sm mt-4">
              {new Date(data.lastUpdated).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Dimensional Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Radar Chart */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-bold mb-4">SCORING DIMENSIONS</h2>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#444" />
              <PolarAngleAxis dataKey="dimension" tick={{ fill: '#999', fontSize: 12 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#999' }} />
              <Radar
                name="Score"
                dataKey="score"
                stroke="#FF6B35"
                fill="#FF6B35"
                fillOpacity={0.6}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Dimension Details */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-bold mb-4">WHERE YOU STAND</h2>
          <div className="space-y-4">
            {data.dimensions.map((d) => (
              <div key={d.name}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">{d.name}</span>
                  <span className="text-orange-500 font-bold">{d.score.toFixed(1)}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-orange-500 h-2 rounded-full"
                    style={{
                      width: `${Math.min(d.score, 100)}%`,
                    }}
                  ></div>
                </div>
                <p className="text-xs text-gray-400 mt-1">{(d.weight * 100).toFixed(0)}% weight</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trend Chart */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
        <h2 className="text-xl font-bold mb-4">30-DAY TREND</h2>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={trendData}>
            <CartesianGrid stroke="#444" />
            <XAxis dataKey="date" tick={{ fill: '#999' }} />
            <YAxis domain={[0, 100]} tick={{ fill: '#999' }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#222', border: '1px solid #555' }}
              labelStyle={{ color: '#fff' }}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#FF6B35"
              strokeWidth={2}
              dot={{ fill: '#FF6B35', r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Regional Performance */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
        <h2 className="text-xl font-bold mb-4">REGIONAL PERFORMANCE</h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={regionalData}>
            <CartesianGrid stroke="#444" />
            <XAxis dataKey="region" tick={{ fill: '#999' }} />
            <YAxis domain={[0, 100]} tick={{ fill: '#999' }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#222', border: '1px solid #555' }}
              labelStyle={{ color: '#fff' }}
            />
            <Bar dataKey="score" fill="#FF6B35" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Certification Badge Section */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
        <h2 className="text-xl font-bold mb-4">CERTIFICATION BADGE</h2>
        {data.compositeScore >= 85 ? (
          <div>
            <p className="text-green-400 mb-4">✓ Your API is VNP Certified Gold</p>
            <p className="text-sm text-gray-400 mb-4">
              Embed this badge on your website or GitHub:
            </p>
            <code className="bg-gray-900 p-4 rounded text-xs block mb-4 overflow-x-auto">
              {`<img src="https://vnp.io/badge/${apiId}.svg" alt="VNP Certified Gold" />`}
            </code>
            <p className="text-xs text-gray-500">
              Badge updates automatically when your score changes
            </p>
          </div>
        ) : (
          <p className="text-gray-400">
            Reach a score of 85+ to earn VNP Certified Gold badge
          </p>
        )}
      </div>

      {/* Settings */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-xl font-bold mb-4">SETTINGS</h2>
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm">Auto-refresh every 5 minutes</span>
        </label>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-gray-500 text-xs">
        <p>VNP Provider Dashboard • Read-only • Updated every 5 minutes</p>
        <p className="mt-2">
          <a href="https://vnp.io" className="text-orange-500 underline">
            Learn more about VNP
          </a>
          {' • '}
          <a href="https://docs.vnp.io/api" className="text-orange-500 underline">
            API Documentation
          </a>
        </p>
      </div>
    </div>
  );
};

export default ProviderDashboard;
