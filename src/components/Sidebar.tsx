/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Terminal, Activity, GitCommit, Users, Server, Radio, Database, ShieldAlert } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  mcpHeartbeat: string;
  throughput: number;
}

export default function Sidebar({ activeTab, setActiveTab, mcpHeartbeat, throughput }: SidebarProps) {
  const menuItems = [
    { id: 'overview', name: 'Swarm Map', icon: Server, desc: '105 Node Swarm Active' },
    { id: 'spine', name: 'Run Spine', icon: GitCommit, desc: 'PGL consensus trails' },
    { id: 'runs', name: 'Runs Ledger', icon: Terminal, desc: 'Real-time telemetry' },
    { id: 'committee', name: 'Council Matrix', icon: Users, desc: 'ArbiterOS consensus' },
  ];

  return (
    <aside className="w-64 h-full border-r border-[#ffffff0a] bg-void-black flex flex-col justify-between shrink-0 select-none z-30">
      <div>
        {/* Cinematic Branding */}
        <div className="p-5 border-b border-[#ffffff0a]">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-8 h-8 rounded-none bg-black/80 border border-electric-cyan/40 flex items-center justify-center shadow-[0_0_8px_rgba(0,229,255,0.3)] animate-pulse-glow">
                <Radio className="w-4.5 h-4.5 text-electric-cyan stroke-[2]" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-matrix-emerald border border-void-black" />
            </div>
            <div>
              <div className="text-xs font-bold font-sans tracking-widest text-[#ffffffaa] uppercase flex items-center gap-1">
                UACP <span className="text-electric-cyan font-mono text-[10px]">V5.0</span>
              </div>
              <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider">Control Plane NOC</div>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3.5 space-y-1.5">
          <div className="px-2.5 mb-2 text-[10px] uppercase font-mono tracking-widest text-white/30">
            System Operations
          </div>
          {menuItems.map((item) => {
            const IsActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full group relative flex items-center gap-3.5 px-3 py-2.5 rounded-none text-left transition-all duration-300 pointer border border-transparent`}
                style={{ contentVisibility: 'auto' }}
              >
                {/* Framer motion background block */}
                {IsActive && (
                  <motion.div
                    layoutId="activeTabGlow"
                    className="absolute inset-0 rounded-none bg-white/[0.02] border border-white/5 border-l-2 border-l-electric-cyan"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}

                <Icon className={`w-4 h-4 z-10 transition-colors duration-200 ${IsActive ? 'text-electric-cyan' : 'text-white/40 group-hover:text-white/75'}`} />

                <div className="z-10 flex-grow">
                  <div className={`text-xs font-medium ${IsActive ? 'text-white font-semibold' : 'text-white/60 group-hover:text-white/90'}`}>
                    {item.name}
                  </div>
                  <div className="text-[9px] font-mono text-white/35 group-hover:text-white/50">{item.desc}</div>
                </div>

                {IsActive && (
                  <motion.div
                    className="w-1.5 h-3 rounded-none bg-electric-cyan shadow-[0_0_8px_#00E5FF] z-10"
                    layoutId="barGlow"
                  />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Metrics */}
      <div className="p-4 border-t border-[#ffffff0a] font-mono bg-void-charcoal/[0.4]">
        <div className="space-y-2.5">
          {/* Heartbeat system state */}
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-white/40 flex items-center gap-1 uppercase">
              <Database className="w-3 h-3 text-white/30" /> MCP-IO STATUS:
            </span>
            <span className={`flex items-center gap-1.5 font-bold ${mcpHeartbeat === 'NORMAL' ? 'text-matrix-emerald' : 'text-laser-red'}`}>
              <span className={`w-1.5 h-1.5 ${mcpHeartbeat === 'NORMAL' ? 'bg-matrix-emerald animate-fast-pulse' : 'bg-laser-red'} `} />
              {mcpHeartbeat}
            </span>
          </div>

          {/* Core Telemetry Speed throughput */}
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-white/40 uppercase">THROUGHPUT:</span>
            <span className="text-electric-cyan font-bold">{throughput} KB/S</span>
          </div>

          <div className="flex items-center justify-between text-[10px]">
            <span className="text-white/40 uppercase">Consensus Rate:</span>
            <span className="text-white/80 font-bold">99.98%</span>
          </div>

          <div className="mt-2.5 p-2 rounded-none bg-void-metal/30 border border-white/[0.04] text-[9px] text-white/50 leading-relaxed">
            <div className="flex items-center gap-1 text-hazard-amber font-semibold mb-0.5 uppercase">
              <ShieldAlert className="w-2.5 h-2.5" /> ArbiterOS Active
            </div>
            Policy enforcement engine secured under SEKED hardware sandbox.
          </div>
        </div>
      </div>
    </aside>
  );
}
