import React, { useState } from 'react';
import { Cpu, HardDrive, Activity, Play, XCircle, Wifi } from 'lucide-react';
import { Win11Process, Win11SystemConfig } from '../../types/win11';

interface TaskManagerAppProps {
  processes: Win11Process[];
  onKillProcess: (pid: number) => void;
  onStartProcess: (name: string, title: string) => void;
  systemConfig: Win11SystemConfig;
}

export const TaskManagerApp: React.FC<TaskManagerAppProps> = ({
  processes,
  onKillProcess,
  onStartProcess,
  systemConfig,
}) => {
  const [subTab, setSubTab] = useState<'processes' | 'performance'>('processes');
  const [selectedPid, setSelectedPid] = useState<number | null>(null);
  const [newTaskName, setNewTaskName] = useState('');

  const totalCpu = processes.reduce((acc, p) => acc + p.cpuPercent, 0);
  const totalMemMb = processes.reduce((acc, p) => acc + p.memoryMb, 0);
  const memPercent = Math.min(99, Math.round((totalMemMb / 16384) * 100));

  return (
    <div className="flex flex-col h-full bg-[#181a1f] text-slate-100 select-none">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-[#20232a] border-b border-white/10">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSubTab('processes')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              subTab === 'processes'
                ? 'bg-sky-600 text-white'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            Processes ({processes.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('performance')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              subTab === 'performance'
                ? 'bg-sky-600 text-white'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            Xbox Scarlett Hardware Performance
          </button>
        </div>

        <div className="flex items-center gap-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newTaskName.trim()) {
                onStartProcess(newTaskName.trim(), 'User Launched Desktop Task');
                setNewTaskName('');
              }
            }}
            className="flex items-center gap-1.5"
          >
            <input
              type="text"
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
              placeholder="Run new task (e.g. llama-server.exe)"
              className="bg-[#121418] border border-white/15 rounded px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
            <button
              type="submit"
              className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/15 text-xs font-medium text-white flex items-center gap-1"
            >
              <Play className="w-3 h-3 text-emerald-400" />
              <span>Run</span>
            </button>
          </form>

          {selectedPid !== null && (
            <button
              type="button"
              onClick={() => {
                onKillProcess(selectedPid);
                setSelectedPid(null);
              }}
              className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-xs font-medium text-white flex items-center gap-1"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>End Task</span>
            </button>
          )}
        </div>
      </div>

      {subTab === 'processes' ? (
        <div className="flex-1 overflow-y-auto p-3">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-[11px] text-slate-400">
                <th className="py-2 px-2.5 font-medium">Name</th>
                <th className="py-2 px-2.5 font-medium">PID</th>
                <th className="py-2 px-2.5 font-medium">Category</th>
                <th className="py-2 px-2.5 font-medium text-right">CPU ({totalCpu.toFixed(1)}%)</th>
                <th className="py-2 px-2.5 font-medium text-right">
                  GDDR6 Memory ({memPercent}%)
                </th>
                <th className="py-2 px-2.5 font-medium text-right">NVMe Disk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {processes.map((proc) => {
                const isSelected = selectedPid === proc.pid;
                return (
                  <tr
                    key={proc.pid}
                    onClick={() => setSelectedPid(proc.pid)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-sky-600/25 text-white' : 'hover:bg-white/5 text-slate-200'
                    }`}
                  >
                    <td className="py-2 px-2.5">
                      <div className="font-medium text-white">{proc.name}</div>
                      <div className="text-[11px] text-slate-400">{proc.title}</div>
                    </td>
                    <td className="py-2 px-2.5 font-mono text-[11px] text-slate-400 tabular-nums">
                      {proc.pid}
                    </td>
                    <td className="py-2 px-2.5 text-slate-300">{proc.category}</td>
                    <td className="py-2 px-2.5 text-right font-mono tabular-nums text-sky-300">
                      {proc.cpuPercent.toFixed(1)}%
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono tabular-nums text-emerald-300">
                      {proc.memoryMb.toLocaleString()} MB
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono tabular-nums text-slate-300">
                      {proc.diskMbPerSec.toFixed(1)} MB/s
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-[#20242c] border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-sky-400" />
                <span>AMD Custom Zen 2 CPU (8C / 16T @ 3.80 GHz)</span>
              </span>
              <span className="text-lg font-mono font-bold text-sky-400 tabular-nums">
                {totalCpu.toFixed(1)}%
              </span>
            </div>
            <div className="w-full h-2 bg-black/40 rounded overflow-hidden">
              <div
                className="h-full bg-sky-500"
                style={{ width: `${Math.min(100, totalCpu * 3)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Hardware virtualization & AVX2 instructions active for local Hermes GGUF inference.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-[#20242c] border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>16.0 GB GDDR6 Unified Memory Pool</span>
              </span>
              <span className="text-lg font-mono font-bold text-emerald-400 tabular-nums">
                {(totalMemMb / 1024).toFixed(2)} / 16.0 GB
              </span>
            </div>
            <div className="w-full h-2 bg-black/40 rounded overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${memPercent}%` }} />
            </div>
            <p className="text-[11px] text-slate-400">
              560 GB/s bandwidth — fits Hermes-3 3B Q4_K_M & Gemma-3 1B in unified RAM simultaneously.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-[#20242c] border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-amber-400" />
                <span>Xbox Velocity NVMe SSD (D:\DevelopmentFiles)</span>
              </span>
              <span className="text-sm font-mono font-bold text-amber-300 tabular-nums">
                2.4 GB/s Raw
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              DirectStorage & SMB3 developer partition mounted read/write.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-[#20242c] border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Wifi className="w-4 h-4 text-indigo-400" />
                <span>SMB3 Server (:445) & LAN Security</span>
              </span>
              <span className="text-xs font-mono font-semibold text-emerald-400">
                //{systemConfig.consoleIp}/{systemConfig.smbShareName}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              WAN Lockdown: {systemConfig.lanOnlyLockdown ? 'Active (External IPs Blocked)' : 'Off'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
