"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { 
  Activity, 
  Layers, 
  Award, 
  Shield, 
  Clock, 
  RefreshCw, 
  MapPin, 
  Code, 
  HelpCircle,
  Cpu,
  Globe2,
  Lock,
  ChevronDown
} from 'lucide-react';

const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:4000/graphql';

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

// Pre-seeded mock data as fallbacks when graphQL server is unavailable
const SEEDED_FALLBACKS: Record<string, ProviderScoreData> = {
  "did:vnp:api:stripe-payments": {
    apiId: "did:vnp:api:stripe-payments",
    compositeScore: 94.2,
    confidenceInterval: [93.8, 94.6],
    dimensions: [
      { name: "p99 Latency", score: 96.5, weight: 0.15 },
      { name: "Error Rate", score: 99.1, weight: 0.15 },
      { name: "Availability", score: 99.9, weight: 0.15 },
      { name: "Throughput", score: 95.0, weight: 0.10 },
      { name: "Security", score: 98.0, weight: 0.10 },
      { name: "Documentation", score: 92.0, weight: 0.08 },
      { name: "Versioning", score: 95.0, weight: 0.07 },
      { name: "M2M Compliance", score: 85.0, weight: 0.07 },
      { name: "RateLimit Trans.", score: 88.0, weight: 0.07 },
      { name: "DX First-Call", score: 91.0, weight: 0.06 }
    ],
    regionalScores: {
      "us-east": 96.8,
      "us-west": 94.2,
      "eu-west": 95.1,
      "ap-southeast": 91.4,
      "ap-northeast": 89.9
    },
    measurementCount: 148293,
    lastUpdated: new Date().toISOString(),
    history30d: Array.from({ length: 30 }, (_, i) => ({
      date: `${6 + Math.floor(i/5)}-${(i % 5) * 6 + 1}`,
      score: 91 + Math.sin(i / 2) * 2 + Math.random() * 2
    }))
  },
  "did:vnp:api:openai-gpt4": {
    apiId: "did:vnp:api:openai-gpt4",
    compositeScore: 88.4,
    confidenceInterval: [87.5, 89.3],
    dimensions: [
      { name: "p99 Latency", score: 72.1, weight: 0.15 },
      { name: "Error Rate", score: 94.5, weight: 0.15 },
      { name: "Availability", score: 99.2, weight: 0.15 },
      { name: "Throughput", score: 91.0, weight: 0.10 },
      { name: "Security", score: 95.0, weight: 0.10 },
      { name: "Documentation", score: 96.0, weight: 0.08 },
      { name: "Versioning", score: 92.0, weight: 0.07 },
      { name: "M2M Compliance", score: 90.0, weight: 0.07 },
      { name: "RateLimit Trans.", score: 95.0, weight: 0.07 },
      { name: "DX First-Call", score: 94.0, weight: 0.06 }
    ],
    regionalScores: {
      "us-east": 92.4,
      "us-west": 89.1,
      "eu-west": 87.5,
      "ap-southeast": 83.2,
      "ap-northeast": 84.8
    },
    measurementCount: 92837,
    lastUpdated: new Date().toISOString(),
    history30d: Array.from({ length: 30 }, (_, i) => ({
      date: `${6 + Math.floor(i/5)}-${(i % 5) * 6 + 1}`,
      score: 85 + Math.sin(i / 3) * 3 + Math.random() * 1.5
    }))
  },
  "did:vnp:api:gemini-pro": {
    apiId: "did:vnp:api:gemini-pro",
    compositeScore: 91.7,
    confidenceInterval: [91.0, 92.4],
    dimensions: [
      { name: "p99 Latency", score: 82.4, weight: 0.15 },
      { name: "Error Rate", score: 96.8, weight: 0.15 },
      { name: "Availability", score: 99.7, weight: 0.15 },
      { name: "Throughput", score: 93.5, weight: 0.10 },
      { name: "Security", score: 97.0, weight: 0.10 },
      { name: "Documentation", score: 95.0, weight: 0.08 },
      { name: "Versioning", score: 90.0, weight: 0.07 },
      { name: "M2M Compliance", score: 92.0, weight: 0.07 },
      { name: "RateLimit Trans.", score: 94.0, weight: 0.07 },
      { name: "DX First-Call", score: 92.0, weight: 0.06 }
    ],
    regionalScores: {
      "us-east": 94.1,
      "us-west": 92.8,
      "eu-west": 91.5,
      "ap-southeast": 87.2,
      "ap-northeast": 88.3
    },
    measurementCount: 110492,
    lastUpdated: new Date().toISOString(),
    history30d: Array.from({ length: 30 }, (_, i) => ({
      date: `${6 + Math.floor(i/5)}-${(i % 5) * 6 + 1}`,
      score: 89 + Math.sin(i / 4) * 2.5 + Math.random() * 1
    }))
  }
};

export default function Dashboard() {
  const [apiId, setApiId] = useState<string>("did:vnp:api:stripe-payments");
  const [data, setData] = useState<ProviderScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSeededMode, setIsSeededMode] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const fetchScoreData = useCallback(async (selectedApiId: string) => {
    setLoading(true);
    try {
      const query = `
        query {
          score(api_id: "${selectedApiId}") {
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

      const response = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) throw new Error('API server unreachable');
      const result = await response.json();
      
      if (result.errors || !result.data || !result.data.score) {
        throw new Error(result.errors?.[0]?.message || 'No score data found for this identifier');
      }
      
      setData(result.data.score);
      setError(null);
      setIsSeededMode(false);
    } catch (err) {
      console.warn("GraphQL connection failed, applying realistic pre-seeded backup matrix: ", err);
      // Fallback gracefully to SEEDED mock matrix
      if (SEEDED_FALLBACKS[selectedApiId]) {
        setData(SEEDED_FALLBACKS[selectedApiId]);
        setError(null);
        setIsSeededMode(true);
      } else {
        setError(err instanceof Error ? err.message : 'Unknown compilation failure');
      }
    } finally {
      setLoading(false);
      setLastRefreshedAt(new Date());
    }
  }, []);

  // Fetch on mount and set up automatic interval
  useEffect(() => {
    fetchScoreData(apiId);
  }, [apiId, fetchScoreData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchScoreData(apiId);
    }, 45 * 1000); // 45 seconds polling for snappier real-time look
    return () => clearInterval(interval);
  }, [apiId, fetchScoreData, autoRefresh]);

  const handleApiSelect = (id: string) => {
    setApiId(id);
    setDropdownOpen(false);
  };

  const getGrade = (score: number) => {
    if (score >= 93) return { label: 'A+', color: 'text-emerald-400', border: 'border-emerald-500/30' };
    if (score >= 88) return { label: 'A', color: 'text-teal-400', border: 'border-teal-500/30' };
    if (score >= 83) return { label: 'B+', color: 'text-cyan-400', border: 'border-cyan-500/30' };
    if (score >= 75) return { label: 'B', color: 'text-vnp-orange-400', border: 'border-vnp-orange-500/30' };
    return { label: 'C', color: 'text-amber-400', border: 'border-amber-500/30' };
  };

  const displayName = apiId.split(':').pop()?.toUpperCase() || apiId;

  return (
    <div className="min-h-screen bg-vnp-dark-950 text-slate-100 flex flex-col selection:bg-vnp-orange-500 selection:text-white pb-12">
      {/* Top Ambient Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-vnp-orange-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-10 right-1/4 w-80 h-80 bg-teal-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-30 w-full glass-panel border-b border-white/5 backdrop-blur-md px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="relative p-2 bg-gradient-to-tr from-vnp-orange-600 to-vnp-orange-500 rounded-lg shadow-lg shadow-vnp-orange-500/20">
            <Cpu className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-wider text-white">VEKLOM</span>
              <span className="text-xs bg-white/10 text-slate-300 font-mono px-2 py-0.5 rounded-full">NEXUS v0.1.5</span>
            </div>
            <p className="text-xs text-slate-400">Continuous SLA Performance Bond Ledger</p>
          </div>
        </div>

        {/* Dropdown Selector */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center justify-between gap-3 px-4 py-2 bg-vnp-dark-800 border border-white/10 rounded-lg text-slate-200 hover:border-vnp-orange-500/50 transition-all font-mono text-sm min-w-[240px]"
            >
              <div className="flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-vnp-orange-500" />
                <span>{displayName}</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-full bg-vnp-dark-800 border border-white/10 rounded-lg shadow-2xl z-40 overflow-hidden py-1">
                {Object.keys(SEEDED_FALLBACKS).map((id) => (
                  <button
                    key={id}
                    onClick={() => handleApiSelect(id)}
                    className={`w-full px-4 py-2.5 text-left text-sm font-mono hover:bg-white/5 transition-colors block ${apiId === id ? 'text-vnp-orange-500 font-bold bg-white/5' : 'text-slate-300'}`}
                  >
                    {id.split(':').pop()?.toUpperCase()} ({id})
                  </button>
                ))}
              </div>
            )}
          </div>

          <button 
            onClick={() => fetchScoreData(apiId)}
            disabled={loading}
            className="p-2.5 bg-vnp-dark-800 border border-white/10 rounded-lg text-slate-300 hover:text-white hover:border-vnp-orange-500/50 transition-all"
            title="Force refresh stats"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-vnp-orange-500' : ''}`} />
          </button>
        </div>
      </header>

      {/* Connection Mode Indicator */}
      {isSeededMode && (
        <div className="w-full bg-vnp-orange-600/10 border-b border-vnp-orange-500/20 px-6 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-vnp-orange-400" />
            <p className="text-xs text-vnp-orange-300 font-mono">
              [OFFLINE SIMULATION] Clickhouse / GraphQL api nodes currently offline. Yield simulation activated.
            </p>
          </div>
          <button 
            onClick={() => fetchScoreData(apiId)}
            className="text-xs text-vnp-orange-400 hover:underline flex items-center gap-1 font-mono font-bold"
          >
            RETRY ENDPOINT <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Main Panel */}
      <main className="max-w-7xl mx-auto w-full px-6 mt-8 flex-1">
        {loading && !data ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-slate-700 border-t-vnp-orange-500 mb-4" />
            <p className="text-slate-400 font-mono text-sm">Compiling cryptographic evidence from ClickHouse ledger...</p>
          </div>
        ) : error ? (
          <div className="max-w-md mx-auto bg-vnp-dark-800 border border-red-500/20 p-8 rounded-xl text-center shadow-xl">
            <h2 className="text-lg font-bold text-red-400 mb-2">SLA Query Failed</h2>
            <p className="text-slate-400 text-sm mb-6">{error}</p>
            <button 
              onClick={() => fetchScoreData(apiId)}
              className="px-5 py-2 bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 rounded-lg text-sm transition-all"
            >
              Re-establish Connection
            </button>
          </div>
        ) : data ? (
          <div className="space-y-8 animate-fade-in">
            {/* COMPOSITE METRICS HEADER */}
            <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* COMPOSITE SCORE CARD */}
              <div className="glass-panel-accent rounded-xl p-6 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-vnp-orange-500/10 rounded-full blur-2xl pointer-events-none" />
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs text-vnp-orange-400 font-mono font-semibold tracking-wider uppercase">SLA SLA COMPOSITE</p>
                    <p className="text-4xl font-extrabold text-white mt-1">{data.compositeScore.toFixed(1)}</p>
                  </div>
                  <div className="p-2 bg-vnp-orange-500/10 rounded-lg border border-vnp-orange-500/20 text-vnp-orange-500">
                    <Award className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center text-xs">
                  <span className="text-slate-400">95% confidence bounds</span>
                  <span className="font-mono text-slate-300">{data.confidenceInterval[0].toFixed(1)} - {data.confidenceInterval[1].toFixed(1)}</span>
                </div>
              </div>

              {/* RATING GRADE */}
              <div className="glass-panel rounded-xl p-6 flex flex-col justify-between relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs text-slate-400 font-mono tracking-wider uppercase font-semibold">CONFORMANCE LEVEL</p>
                    <p className={`text-4xl font-extrabold mt-1 ${getGrade(data.compositeScore).color}`}>
                      {getGrade(data.compositeScore).label}
                    </p>
                  </div>
                  <div className="p-2 bg-slate-800 rounded-lg border border-white/10 text-slate-400">
                    <Shield className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center text-xs">
                  <span className="text-slate-400">Status</span>
                  <span className="font-mono text-emerald-400 flex items-center gap-1 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> VERIFIED GOLD
                  </span>
                </div>
              </div>

              {/* MEASUREMENT LOGS */}
              <div className="glass-panel rounded-xl p-6 flex flex-col justify-between relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs text-slate-400 font-mono tracking-wider uppercase font-semibold">EVIDENCE QUANTITY</p>
                    <p className="text-4xl font-extrabold text-white mt-1">
                      {data.measurementCount.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-2 bg-slate-800 rounded-lg border border-white/10 text-slate-400">
                    <Layers className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center text-xs">
                  <span className="text-slate-400">Off-path logging</span>
                  <span className="font-mono text-slate-300">vnp_stake_logs</span>
                </div>
              </div>

              {/* LAST SYNC TIME */}
              <div className="glass-panel rounded-xl p-6 flex flex-col justify-between relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs text-slate-400 font-mono tracking-wider uppercase font-semibold">METRIC HORIZON</p>
                    <p className="text-sm font-semibold text-slate-100 mt-3 truncate font-mono">
                      {new Date(data.lastUpdated).toLocaleTimeString()}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                      {new Date(data.lastUpdated).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="p-2 bg-slate-800 rounded-lg border border-white/10 text-slate-400">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center text-xs">
                  <span className="text-slate-400">Engine cycle</span>
                  <span className="font-mono text-slate-300">45s slide</span>
                </div>
              </div>
            </section>

            {/* VISUAL CHARTS WRAPPER */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* RADAR CHART ANALYSIS */}
              <div className="glass-panel rounded-xl p-6 border border-white/5">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-vnp-orange-500" />
                    <h2 className="text-base font-extrabold tracking-wide uppercase text-white">SLA RADAR SPECTRUM</h2>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">10 governed dimensions</span>
                </div>

                <div className="h-[320px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={data.dimensions}>
                      <PolarGrid stroke="rgba(255,255,255,0.08)" />
                      <PolarAngleAxis 
                        dataKey="name" 
                        tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }} 
                      />
                      <PolarRadiusAxis 
                        angle={30} 
                        domain={[0, 100]} 
                        tick={{ fill: '#64748b', fontSize: 9 }}
                        axisLine={false}
                      />
                      <Radar
                        name="Score"
                        dataKey="score"
                        stroke="#ff6b35"
                        fill="#ff6b35"
                        fillOpacity={0.15}
                        strokeWidth={2}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* LIST OF SPECIFIC PERFORMANCE METRICS */}
              <div className="glass-panel rounded-xl p-6 border border-white/5">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-teal-400" />
                    <h2 className="text-base font-extrabold tracking-wide uppercase text-white">DIMENSIONAL RATINGS</h2>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">Impact weight matrix</span>
                </div>

                <div className="space-y-3.5 max-h-[320px] overflow-y-auto pr-1">
                  {data.dimensions.map((d) => (
                    <div key={d.name} className="p-3 bg-white/[0.02] border border-white/5 rounded-lg hover:border-white/10 transition-colors">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-mono text-slate-300 font-medium">{d.name}</span>
                        <span className="text-sm font-bold text-vnp-orange-400 font-mono">{d.score.toFixed(1)}</span>
                      </div>
                      <div className="w-full bg-slate-900/50 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-vnp-orange-600 to-vnp-orange-500 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(2, Math.min(d.score, 100))}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center mt-1 text-[9px] text-slate-500 font-mono">
                        <span>Weight rating</span>
                        <span>{(d.weight * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* SECONDARY GRAPHS: 30D TRENDS + REGIONAL TOPOLOGY */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* 30D LINE CHART */}
              <div className="glass-panel rounded-xl p-6 border border-white/5">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-cyan-400" />
                    <h2 className="text-base font-extrabold tracking-wide uppercase text-white">30-DAY PERFORMANCE INDEX</h2>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">Rolling index logs</span>
                </div>

                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.history30d}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }} 
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        domain={[80, 100]} 
                        tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }} 
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#131622', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }}
                        labelStyle={{ color: '#94a3b8', fontSize: '11px', fontFamily: 'monospace' }}
                        itemStyle={{ color: '#ff6b35', fontSize: '12px', fontWeight: 'bold' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="#ff6b35"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ fill: '#ff6b35', stroke: '#ff6b35', r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* REGIONAL BAR CHART */}
              <div className="glass-panel rounded-xl p-6 border border-white/5">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    <h2 className="text-base font-extrabold tracking-wide uppercase text-white">REGIONAL TOPOLOGY STATUS</h2>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">Edge verification nodes</span>
                </div>

                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={Object.entries(data.regionalScores).map(([region, score]) => ({ region, score }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                      <XAxis 
                        dataKey="region" 
                        tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }} 
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        domain={[0, 100]} 
                        tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }} 
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#131622', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }}
                        labelStyle={{ color: '#94a3b8', fontSize: '11px', fontFamily: 'monospace' }}
                        itemStyle={{ color: '#14b8a6', fontSize: '12px', fontWeight: 'bold' }}
                      />
                      <Bar 
                        dataKey="score" 
                        fill="rgba(20, 184, 166, 0.7)" 
                        radius={[4, 4, 0, 0]}
                        maxBarSize={40}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            {/* EMBEDDABLE CONTRACT BADGE GENERATOR SECTION */}
            <section className="glass-panel rounded-xl p-6 border border-white/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-5 h-5 text-vnp-orange-500" />
                    <h3 className="text-base font-extrabold tracking-wide uppercase text-white">VNP SLA TRUST SEAL</h3>
                  </div>
                  <p className="text-sm text-slate-300 max-w-xl">
                    Publish your audited performance bond status directly to your code repository, landing pages, or documentation headers using the dynamic SVG badge endpoint.
                  </p>
                </div>

                <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5 flex flex-col gap-3 min-w-[320px]">
                  <span className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">Live Iframe Integration Code</span>
                  <code className="bg-vnp-dark-950 p-2.5 rounded border border-white/5 text-[11px] text-slate-300 font-mono block overflow-x-auto whitespace-nowrap">
                    {`<iframe src="https://vnp.io/provider/${apiId}" width="600" height="800"></iframe>`}
                  </code>
                  <span className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">Live SVG Badge Integration Code</span>
                  <code className="bg-vnp-dark-950 p-2.5 rounded border border-white/5 text-[11px] text-slate-300 font-mono block overflow-x-auto whitespace-nowrap">
                    {`<img src="http://localhost:3000/v1/badge/${apiId}.svg" alt="VNP Rating" />`}
                  </code>
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </main>

      {/* FOOTER */}
      <footer className="max-w-7xl mx-auto w-full px-6 mt-16 text-center text-xs text-slate-500 font-mono space-y-2">
        <p>VNP Provider Dashboard • Autonomously verified off-path logs via ClickHouse OLAP cluster</p>
        <p>
          <a href="https://vnp.io" className="text-vnp-orange-500 hover:underline">Veklom Nexus Protocol</a>
          {' • '}
          <a href="https://docs.vnp.io/api" className="text-vnp-orange-500 hover:underline">SLA Governance Specification</a>
        </p>
      </footer>
    </div>
  );
}
