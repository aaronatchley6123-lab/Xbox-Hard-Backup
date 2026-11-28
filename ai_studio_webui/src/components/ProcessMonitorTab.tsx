import React, { useState } from 'react';
import { 
  Square, 
  Pause, 
  Play, 
  Download, 
  RefreshCw, 
  Search, 
  Activity, 
  Cpu, 
  Layers, 
  AlertTriangle 
} from 'lucide-react';
import { XboxProcess, XboxTelemetry } from '../types/xbox';

interface ProcessMonitorTabProps {
  processes: XboxProcess[];
  telemetry: XboxTelemetry;
  onKillProcess: (pid: number) => void;
  onToggleSuspendProcess: (pid: number) => void;
  onDumpProcess: (pid: number) => void;
  onRefreshProcesses: () => void;
}

export const ProcessMonitorTab: React.FC<ProcessMonitorTabProps> = ({
  processes,
  telemetry,
  onKillProcess,
  onToggleSuspendProcess,
  onDumpProcess,
  onRefreshProcesses,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showGameOnly, setShowGameOnly] = useState(false);

  const filteredProcesses = processes.filter((proc) => {
    const matchesSearch = 
      proc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      proc.pid.toString().includes(searchQuery);
    const matchesGame = !showGameOnly || proc.isGame;
    return matchesSearch && matchesGame;
  });

  const totalRamUsedMb = processes.reduce((acc, p) => acc + p.memoryMb, 0);

  return (
    <div className="space-y-4">
      {/* Telemetry Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-[#0d1117] border border-[#1b2332] rounded-xl">
        <div className="space-y-1">
          <span className="text-[11px] font-mono uppercase text-slate-400 flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-blue-400" />
            Total CPU Utilization
          </span>
          <p className="text-xl font-bold font-mono text-white tabular-nums">
            {telemetry.cpuAvgLoad}%
          </p>
          <p className="text-[11px] text-slate-500 font-mono">
            Across 8 Zen 2 Cores @ 3.8 GHz
          </p>
        </div>

        <div className="space-y-1">
          <span className="text-[11px] font-mono uppercase text-slate-400 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-blue-400" />
            Tracked Working Set RAM
          </span>
          <p className="text-xl font-bold font-mono text-blue-400 tabular-nums">
            {(totalRamUsedMb / 1024).toFixed(2)} GB
          </p>
          <p className="text-[11px] text-slate-500 font-mono">
            {processes.length} Active System & Title Tasks
          </p>
        </div>

        <div className="space-y-1">
          <span className="text-[11px] font-mono uppercase text-slate-400 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-blue-400" />
            Direct3D 12 Compute Load
          </span>
          <p className="text-xl font-bold font-mono text-emerald-400 tabular-nums">
            {telemetry.gpuLoadPercent}%
          </p>
          <p className="text-[11px] text-slate-500 font-mono">
            52 Compute Units Active (12.15 TFLOPS)
          </p>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-[#0d1117] border border-[#1b2332] rounded-xl">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Filter processes by name or PID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#121620] border border-[#212938] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-300 font-medium cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={showGameOnly}
              onChange={(e) => setShowGameOnly(e.target.checked)}
              className="rounded bg-[#121620] border-slate-700 text-blue-600"
            />
            <span>Game Titles Only</span>
          </label>
        </div>

        <button
          onClick={onRefreshProcesses}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#141a25] border border-[#232c3d] text-slate-200 hover:text-white hover:border-blue-500 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Tasks</span>
        </button>
      </div>

      {/* Process Table */}
      <div className="border border-[#1c2434] bg-[#0c1017] rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#1b2332] bg-[#10141d] text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">PID</th>
                <th className="py-3 px-4">Image Name</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">CPU %</th>
                <th className="py-3 px-4">RAM Working Set</th>
                <th className="py-3 px-4">Peak RAM</th>
                <th className="py-3 px-4">Threads</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#171d29]">
              {filteredProcesses.map((proc) => (
                <tr key={proc.pid} className="hover:bg-[#111722] transition-colors group">
                  {/* PID */}
                  <td className="py-3 px-4 font-mono text-slate-400 tabular-nums font-bold">
                    {proc.pid}
                  </td>

                  {/* Image Name */}
                  <td className="py-3 px-4 font-mono font-medium text-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="text-white group-hover:text-blue-400 transition-colors">
                        {proc.name}
                      </span>
                      {proc.isGame && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-blue-900/40 text-blue-300 border border-blue-700/50">
                          TITLE
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-3 px-4 font-mono">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                      proc.status === 'Running'
                        ? 'bg-emerald-950/70 border border-emerald-700/60 text-emerald-300'
                        : 'bg-amber-950/70 border border-amber-700/60 text-amber-300'
                    }`}>
                      {proc.status}
                    </span>
                  </td>

                  {/* CPU */}
                  <td className="py-3 px-4 font-mono tabular-nums text-slate-200">
                    {proc.cpuPercent.toFixed(1)}%
                  </td>

                  {/* RAM */}
                  <td className="py-3 px-4 font-mono tabular-nums text-blue-400 font-bold">
                    {proc.memoryMb >= 1024
                      ? `${(proc.memoryMb / 1024).toFixed(2)} GB`
                      : `${proc.memoryMb} MB`}
                  </td>

                  {/* Peak RAM */}
                  <td className="py-3 px-4 font-mono tabular-nums text-slate-400">
                    {proc.peakMemoryMb >= 1024
                      ? `${(proc.peakMemoryMb / 1024).toFixed(2)} GB`
                      : `${proc.peakMemoryMb} MB`}
                  </td>

                  {/* Threads */}
                  <td className="py-3 px-4 font-mono tabular-nums text-slate-400">
                    {proc.threads}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onToggleSuspendProcess(proc.pid)}
                        className="p-1.5 rounded bg-[#131924] border border-[#212b3d] text-slate-300 hover:text-white hover:border-blue-500 transition-colors"
                        title={proc.status === 'Running' ? 'Suspend Execution' : 'Resume Process'}
                      >
                        {proc.status === 'Running' ? (
                          <Pause className="w-3.5 h-3.5" />
                        ) : (
                          <Play className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <button
                        onClick={() => onDumpProcess(proc.pid)}
                        className="p-1.5 rounded bg-[#131924] border border-[#212b3d] text-slate-300 hover:text-blue-400 hover:border-blue-500 transition-colors"
                        title="Generate Process Memory Dump (.dmp)"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          if (confirm(`Kill process ${proc.name} (PID ${proc.pid})?`)) {
                            onKillProcess(proc.pid);
                          }
                        }}
                        className="p-1.5 rounded bg-[#131924] border border-[#212b3d] text-slate-400 hover:text-rose-400 hover:border-rose-500/50 transition-colors"
                        title="Terminate Process"
                      >
                        <Square className="w-3.5 h-3.5 fill-current" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
