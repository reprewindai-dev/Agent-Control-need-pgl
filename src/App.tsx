import React, { useState, useEffect } from 'react';
import PGLTerminalGrid from './components/PGLTerminalGrid';
import AgentReplayController from './components/AgentReplayController';
import { loadPGLRegistry, PGLAgent } from './data/pglLoader';
import { Network, Search, Database, Cpu } from 'lucide-react';

export default function App() {
  const [agents, setAgents] = useState<PGLAgent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<PGLAgent | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    // Load the 16 primary agent phases mapped to PGL IDs
    const registryData = loadPGLRegistry();
    setAgents(registryData);

    const updateTime = () => {
      const now = new Date();
      const pad = (num: number) => String(num).padStart(2, '0');
      setCurrentTime(`${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())} UTC`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-screen w-screen bg-[#030303] text-white overflow-hidden flex flex-col font-sans">
      {/* Top Global Header */}
      <header className="h-14 border-b border-white/10 flex items-center px-6 justify-between shrink-0 bg-[#060608]">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Cpu className="w-5 h-5 text-[#00E5FF]" />
            <h1 className="text-sm font-mono font-bold tracking-widest text-white">
              VEKLOM <span className="text-gray-500">//</span> PGL CONTROL TERMINAL
            </h1>
          </div>
          <div className="h-4 w-px bg-white/20 mx-4" />
          <div className="flex items-center space-x-2 text-xs font-mono text-gray-400">
            <Network className="w-3 h-3" />
            <span>ARMY SIZE: 120+ AGENTS</span>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <div className="flex items-center bg-white/5 border border-white/10 rounded-sm px-3 py-1">
            <Search className="w-3 h-3 text-gray-400 mr-2" />
            <input 
              type="text" 
              placeholder="Query PGL ID..." 
              className="bg-transparent border-none outline-none text-xs font-mono w-48 text-white placeholder-gray-600"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Database className="w-4 h-4 text-[#00FF66]" />
            <span className="text-xs font-mono text-[#00FF66]">PGL SYNCED</span>
          </div>
          <div className="text-xs font-mono text-gray-500 w-24 text-right">
            {currentTime}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden">
        {selectedAgent ? (
          <AgentReplayController 
            agent={selectedAgent} 
            onClose={() => setSelectedAgent(null)} 
          />
        ) : (
          <PGLTerminalGrid 
            agents={agents} 
            onSelectAgent={setSelectedAgent} 
          />
        )}
      </main>

      {/* Footer Status Bar */}
      <footer className="h-8 border-t border-white/10 bg-[#060608] flex items-center px-4 justify-between text-[10px] font-mono text-gray-500 shrink-0">
        <div className="flex items-center space-x-4">
          <span>DETERMINISTIC AI INFRASTRUCTURE</span>
          <span>ROOT: /veklom-agents</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00FF66] animate-pulse" />
          <span>UPSTREAM: CONNECTED</span>
        </div>
      </footer>
    </div>
  );
}
