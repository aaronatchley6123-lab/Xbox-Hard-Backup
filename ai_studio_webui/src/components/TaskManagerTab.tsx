import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Cpu, 
  HardDrive, 
  Network, 
  Layers, 
  Square, 
  Pause, 
  Play, 
  Download, 
  RefreshCw, 
  Search, 
  Plus, 
  CheckCircle2, 
  Sliders, 
  Flame, 
  Server, 
  FolderOpen, 
  FileCode,
  ShieldAlert,
  ArrowUpRight,
  Gauge,
  Key,
  ShieldCheck,
  Check,
  Copy,
  Lock,
  Radio,
  Terminal,
  FileCheck
} from 'lucide-react';
import { XboxProcess, XboxTelemetry, XboxAppPackage } from '../types/xbox';

interface TaskManagerTabProps {
  processes: XboxProcess[];
  telemetry: XboxTelemetry;
  apps: XboxAppPackage[];
  onKillProcess: (pid: number) => void;
  onToggleSuspendProcess: (pid: number) => void;
  onDumpProcess: (pid: number) => void;
  onRefreshProcesses: () => void;
  onLaunchNewTask: (executablePath: string, args: string) => void;
  onOpenFileLocation: (appName: string) => void;
}

interface DevService {
  name: string;
  displayName: string;
  pid: number | null;
  status: 'Running' | 'Stopped' | 'Starting';
  startupType: 'Automatic' | 'Manual' | 'Disabled';
  description: string;
}

const INITIAL_SERVICES: DevService[] = [
  { name: 'XboxDevicePortal', displayName: 'Xbox Device Portal HTTPS & WSS Daemon', pid: 612, status: 'Running', startupType: 'Automatic', description: 'Provides web management API and remote control endpoint' },
  { name: 'GameCoreHost', displayName: 'Microsoft GameCore Title Isolation Host', pid: 1044, status: 'Running', startupType: 'Automatic', description: 'Manages sandboxed execution partitions and privilege rings' },
  { name: 'DirectStorageSvc', displayName: 'DirectStorage Hardware Queue Manager', pid: 412, status: 'Running', startupType: 'Automatic', description: 'Direct uncompressed NVMe pipeline for streaming assets' },
  { name: 'D3D12Worker', displayName: 'DirectX 12 Agility Suballocation Engine', pid: 820, status: 'Running', startupType: 'Automatic', description: 'Schedules shader compilation and GPU command lists' },
  { name: 'Audiodg', displayName: 'AudioGraph Spatial DSP Synthesizer', pid: 480, status: 'Running', startupType: 'Automatic', description: 'Hardware spatial audio decoding for Dolby Atmos / DTS:X' },
  { name: 'vsftpd', displayName: 'Xbox Isolated Storage FTP Server', pid: 410, status: 'Running', startupType: 'Automatic', description: 'Remote file management for LocalAppData sandbox' },
  { name: 'smbd', displayName: 'Samba SMB3 Share Daemon', pid: 510, status: 'Running', startupType: 'Automatic', description: 'Exposes //Xbox-IP/DevelopmentFiles network share' },
  { name: 'LiveAuthBroker', displayName: 'Xbox Live Title Authentication Broker', pid: 920, status: 'Running', startupType: 'Automatic', description: 'Token refresh and multiplayer session coordinator' },
  { name: 'EtwLogForwarder', displayName: 'Event Tracing for Windows Logger', pid: 312, status: 'Running', startupType: 'Automatic', description: 'Intercepts OutputDebugString calls and pipes to WebSocket' },
  { name: 'CrashDumpReporter', displayName: 'Automated Post-Mortem Crash Monitor', pid: null, status: 'Stopped', startupType: 'Manual', description: 'Generates minidumps when GameCore titles fault' },
];

export const TaskManagerTab: React.FC<TaskManagerTabProps> = ({
  processes,
  telemetry,
  apps,
  onKillProcess,
  onToggleSuspendProcess,
  onDumpProcess,
  onRefreshProcesses,
  onLaunchNewTask,
  onOpenFileLocation,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'processes' | 'performance' | 'services' | 'details'>('processes');
  const [selectedProcessPid, setSelectedProcessPid] = useState<number | null>(processes[0]?.pid || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshInterval, setRefreshInterval] = useState<'fast' | 'normal' | 'slow' | 'paused'>('normal');

  // New task dialog
  const [isRunTaskOpen, setIsRunTaskOpen] = useState(false);
  const [runExeInput, setRunExeInput] = useState('');
  const [runArgsInput, setRunArgsInput] = useState('');

  // Priority modal
  const [isPriorityModalOpen, setIsPriorityModalOpen] = useState(false);
  const [targetPriority, setTargetPriority] = useState<string>('Normal');

  // Services state
  const [services, setServices] = useState<DevService[]>(INITIAL_SERVICES);

  // CPU History Sparkline (last 20 points)
  const [cpuHistory, setCpuHistory] = useState<number[]>([45, 52, 48, 60, 58, 62, 55, 68, 64, 70, 59, 62, 58, 64, 60, 56, 62, 58, 61, 58]);

  useEffect(() => {
    onRefreshProcesses();
    if (refreshInterval === 'paused') return;
    const ms = refreshInterval === 'fast' ? 1000 : refreshInterval === 'slow' ? 4000 : 2000;

    const interval = setInterval(() => {
      onRefreshProcesses();
      setCpuHistory((prev) => [...prev.slice(1), telemetry.cpuAvgLoad]);
    }, ms);

    return () => clearInterval(interval);
  }, [refreshInterval, onRefreshProcesses, telemetry.cpuAvgLoad]);

  const selectedProcess = processes.find((p) => p.pid === selectedProcessPid) || processes[0];

  const filteredProcesses = processes.filter((proc) => {
    return (
      proc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      proc.pid.toString().includes(searchQuery)
    );
  });

  const gameProcesses = filteredProcesses.filter((p) => p.isGame);
  const backgroundProcesses = filteredProcesses.filter((p) => !p.isGame);

  const handleToggleService = (name: string) => {
    setServices((prev) =>
      prev.map((s) => {
        if (s.name !== name) return s;
        const nextStatus = s.status === 'Running' ? 'Stopped' : 'Running';
        return {
          ...s,
          status: nextStatus,
          pid: nextStatus === 'Running' ? Math.floor(Math.random() * 800 + 400) : null,
        };
      })
    );
  };

  const handleRunTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!runExeInput.trim()) return;
    onLaunchNewTask(runExeInput.trim(), runArgsInput.trim());
    setRunExeInput('');
    setRunArgsInput('');
    setIsRunTaskOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Task Manager Ribbon Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-[#0d1117] border border-[#1b2332] rounded-xl">
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          {[
            { id: 'processes', label: 'Processes' },
            { id: 'performance', label: 'Performance' },
            { id: 'services', label: 'Services' },
            { id: 'details', label: 'Details' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
                activeSubTab === tab.id
                  ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.4)]'
                  : 'text-slate-300 hover:text-white hover:bg-[#141b25]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsRunTaskOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-[#141a24] border border-[#232c3d] text-blue-300 hover:bg-blue-600 hover:text-white hover:border-blue-500 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Run New Task</span>
          </button>

          {selectedProcess && (
            <button
              onClick={() => onKillProcess(selectedProcess.pid)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-950/70 border border-rose-800 text-rose-300 hover:bg-rose-900 transition-colors"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>End Task</span>
            </button>
          )}

          <button
            onClick={() => onRefreshProcesses()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono font-medium rounded-lg bg-[#121620] border border-[#212938] text-slate-300 hover:text-white hover:border-[#38455d] transition-colors"
            title="Refresh process list from WDP now"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(e.target.value as any)}
            className="bg-[#121620] border border-[#212938] rounded-lg px-2 py-1.5 text-xs font-mono text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
            title="Refresh Update Speed"
          >
            <option value="fast">High (1s)</option>
            <option value="normal">Normal (2s)</option>
            <option value="slow">Low (4s)</option>
            <option value="paused">Paused</option>
          </select>
        </div>
      </div>

      {/* SUB-TAB 1: PROCESSES */}
      {activeSubTab === 'processes' && (
        <div className="space-y-4">
          {/* Quick Search & Summary */}
          <div className="flex items-center justify-between gap-3 p-3 bg-[#0d1117] border border-[#1b2332] rounded-xl text-xs font-mono">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search processes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#121620] border border-[#212938] rounded-md pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-4 text-slate-400">
              <span>Processes: <strong className="text-white">{processes.length}</strong></span>
              <span>CPU: <strong className="text-blue-400">{telemetry.cpuAvgLoad}%</strong></span>
              <span>Memory: <strong className="text-blue-400">{(telemetry.memoryUsedMb / 1024).toFixed(1)} GB</strong></span>
            </div>
          </div>

          {/* Processes Table */}
          <div className="border border-[#1c2434] bg-[#0c1017] rounded-xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#1b2332] bg-[#10141d] text-slate-400 text-[11px] uppercase tracking-wider">
                    <th className="py-2.5 px-4">Name</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">PID</th>
                    <th className="py-2.5 px-3 text-right">CPU %</th>
                    <th className="py-2.5 px-3 text-right">Memory (MB)</th>
                    <th className="py-2.5 px-3 text-right">Disk I/O</th>
                    <th className="py-2.5 px-3 text-right">Network</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#171d29]">
                  {/* Game Titles Section Header */}
                  {gameProcesses.length > 0 && (
                    <tr className="bg-[#121824]/60 font-sans font-bold text-blue-400 text-[11px]">
                      <td colSpan={8} className="py-2 px-4">
                        Apps & GameCore Titles ({gameProcesses.length})
                      </td>
                    </tr>
                  )}
                  {gameProcesses.map((proc) => {
                    const isSelected = selectedProcessPid === proc.pid;
                    return (
                      <tr
                        key={proc.pid}
                        onClick={() => setSelectedProcessPid(proc.pid)}
                        className={`hover:bg-[#121824] transition-colors cursor-pointer ${
                          isSelected ? 'bg-blue-950/40 text-white' : ''
                        }`}
                      >
                        <td className="py-2.5 px-4 font-bold text-white flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                          <span>{proc.name}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950/70 border border-emerald-700/60 text-emerald-300">
                            {proc.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-400 tabular-nums">{proc.pid}</td>
                        <td className="py-2.5 px-3 text-right text-blue-300 font-bold tabular-nums">{proc.cpuPercent.toFixed(1)}%</td>
                        <td className="py-2.5 px-3 text-right text-slate-200 tabular-nums">{proc.memoryMb} MB</td>
                        <td className="py-2.5 px-3 text-right text-slate-400 tabular-nums">4.2 MB/s</td>
                        <td className="py-2.5 px-3 text-right text-slate-400 tabular-nums">128 Kbps</td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onKillProcess(proc.pid);
                            }}
                            className="px-2 py-0.5 text-[11px] rounded bg-rose-950/70 border border-rose-800 text-rose-300 hover:bg-rose-900"
                          >
                            End
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Background DevKit Services Section Header */}
                  <tr className="bg-[#10141d]/80 font-sans font-bold text-slate-400 text-[11px]">
                    <td colSpan={8} className="py-2 px-4">
                      DevKit Background Processes ({backgroundProcesses.length})
                    </td>
                  </tr>
                  {backgroundProcesses.map((proc) => {
                    const isSelected = selectedProcessPid === proc.pid;
                    return (
                      <tr
                        key={proc.pid}
                        onClick={() => setSelectedProcessPid(proc.pid)}
                        className={`hover:bg-[#121824] transition-colors cursor-pointer ${
                          isSelected ? 'bg-blue-950/40 text-white' : ''
                        }`}
                      >
                        <td className="py-2 px-4 text-slate-300">{proc.name}</td>
                        <td className="py-2 px-3">
                          <span className="text-[10px] text-slate-400">{proc.status}</span>
                        </td>
                        <td className="py-2 px-3 text-right text-slate-500 tabular-nums">{proc.pid}</td>
                        <td className="py-2 px-3 text-right text-slate-300 tabular-nums">{proc.cpuPercent.toFixed(1)}%</td>
                        <td className="py-2 px-3 text-right text-slate-400 tabular-nums">{proc.memoryMb} MB</td>
                        <td className="py-2 px-3 text-right text-slate-500 tabular-nums">0.1 MB/s</td>
                        <td className="py-2 px-3 text-right text-slate-500 tabular-nums">8 Kbps</td>
                        <td className="py-2 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onKillProcess(proc.pid);
                            }}
                            className="px-2 py-0.5 text-[11px] rounded bg-[#161c28] border border-[#232d3f] text-slate-400 hover:text-rose-300"
                          >
                            End
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: PERFORMANCE (INTERACTIVE GRAPHS) */}
      {activeSubTab === 'performance' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Navigation: Metric Selector */}
          <div className="lg:col-span-4 space-y-2">
            <div className="p-3.5 rounded-xl border border-blue-500/50 bg-[#121824] flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-blue-400" />
                  CPU (AMD Zen 2)
                </span>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  {telemetry.cpuAvgLoad}% @ 3.80 GHz
                </p>
              </div>
              <span className="text-lg font-bold font-mono text-blue-400 tabular-nums">
                {telemetry.cpuAvgLoad}%
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-[#1b2332] bg-[#0d1117] flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-blue-400" />
                  Memory (16GB GDDR6)
                </span>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  {(telemetry.memoryUsedMb / 1024).toFixed(1)} / 16.0 GB ({(telemetry.memoryUsedMb / telemetry.memoryTotalMb * 100).toFixed(0)}%)
                </p>
              </div>
              <span className="text-sm font-bold font-mono text-slate-300 tabular-nums">
                {(telemetry.gpuFastVramUsedMb / 1024).toFixed(1)} GB VRAM
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-[#1b2332] bg-[#0d1117] flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <HardDrive className="w-4 h-4 text-blue-400" />
                  DirectStorage NVMe
                </span>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Read 142 MB/s · Write 18 MB/s
                </p>
              </div>
              <span className="text-sm font-bold font-mono text-slate-300 tabular-nums">
                {telemetry.internalStorageUsedGb} GB
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-[#1b2332] bg-[#0d1117] flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-blue-400" />
                  Direct3D 12 GPU
                </span>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  52 CUs · {telemetry.frameRate.toFixed(1)} FPS VRR
                </p>
              </div>
              <span className="text-sm font-bold font-mono text-emerald-400 tabular-nums">
                {telemetry.gpuLoadPercent}%
              </span>
            </div>
          </div>

          {/* Right Main Performance Graph Canvas */}
          <div className="lg:col-span-8 p-6 bg-[#0d1117] border border-[#1b2332] rounded-xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#1b2332] pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-blue-400" />
                  <span>CPU — AMD Custom 8-Core Zen 2 Processor</span>
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  8 Physical Cores / 16 Threads @ 3.8 GHz (Scarlett DevKit Architecture)
                </p>
              </div>
              <span className="text-2xl font-bold font-mono text-blue-400 tabular-nums">
                {telemetry.cpuAvgLoad}%
              </span>
            </div>

            {/* Simulated Real-Time Wave Graph */}
            <div className="h-44 bg-[#080b0f] border border-[#1c2434] rounded-lg p-3 relative flex items-end gap-1.5 overflow-hidden">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#161e2c_1px,transparent_1px),linear-gradient(to_bottom,#161e2c_1px,transparent_1px)] bg-[size:24px_24px] opacity-40 pointer-events-none" />

              {cpuHistory.map((val, idx) => (
                <div key={idx} className="flex-1 flex flex-col justify-end h-full z-10">
                  <div
                    className="w-full bg-blue-500/80 hover:bg-blue-400 rounded-t transition-all duration-300 shadow-[0_0_8px_rgba(37,99,235,0.3)]"
                    style={{ height: `${val}%` }}
                    title={`${val}%`}
                  />
                </div>
              ))}
            </div>

            {/* Logical Processors Heatmap Grid */}
            <div>
              <span className="text-xs font-bold text-slate-300 uppercase font-mono block mb-2">
                Logical Processors Heatmap (Cores 0 - 7)
              </span>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {telemetry.cpuCores.map((coreLoad, cIdx) => (
                  <div key={cIdx} className="p-2.5 rounded-lg bg-[#111622] border border-[#1e273a] text-center space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 block">Core {cIdx}</span>
                    <span className="text-xs font-bold font-mono text-blue-400 tabular-nums block">{coreLoad}%</span>
                    <div className="w-full h-1 bg-[#1a2333] rounded overflow-hidden">
                      <div className="bg-blue-500 h-full rounded" style={{ width: `${coreLoad}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Core Metrics Footer */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-[#1b2332] text-xs font-mono">
              <div>
                <span className="text-slate-500 block">Utilization:</span>
                <span className="font-bold text-white">{telemetry.cpuAvgLoad}%</span>
              </div>
              <div>
                <span className="text-slate-500 block">Speed:</span>
                <span className="font-bold text-white">3.80 GHz Fixed</span>
              </div>
              <div>
                <span className="text-slate-500 block">Processes:</span>
                <span className="font-bold text-white">{processes.length}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Up Time:</span>
                <span className="font-bold text-white">3:14:12:04</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: SERVICES */}
      {activeSubTab === 'services' && (
        <div className="border border-[#1c2434] bg-[#0c1017] rounded-xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-[#1b2332] bg-[#10141d] text-slate-400 text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-3">PID</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Startup</th>
                  <th className="py-3 px-4 text-right">Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#171d29]">
                {services.map((svc) => (
                  <tr key={svc.name} className="hover:bg-[#111722] transition-colors">
                    <td className="py-2.5 px-4 font-bold text-white">{svc.name}</td>
                    <td className="py-2.5 px-3 text-slate-400 tabular-nums">{svc.pid || '—'}</td>
                    <td className="py-2.5 px-4 text-slate-300 font-sans">{svc.description}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        svc.status === 'Running'
                          ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-700/60'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {svc.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">{svc.startupType}</td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => handleToggleService(svc.name)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                          svc.status === 'Running'
                            ? 'bg-rose-950/60 border border-rose-800 text-rose-300 hover:bg-rose-900'
                            : 'bg-blue-600 text-white hover:bg-blue-500'
                        }`}
                      >
                        {svc.status === 'Running' ? 'Stop' : 'Start'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: DETAILS */}
      {activeSubTab === 'details' && (
        <div className="space-y-4">
          <div className="border border-[#1c2434] bg-[#0c1017] rounded-xl overflow-hidden shadow-lg p-4 space-y-4 font-mono text-xs">
            <h4 className="font-bold text-white text-sm">
              Process Inspection: {selectedProcess ? selectedProcess.name : 'Select a Process'} (PID {selectedProcess?.pid})
            </h4>

            {selectedProcess && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#111622] p-4 rounded-lg border border-[#1e273a]">
                <div>
                  <span className="text-slate-500 block">Working Set (Private):</span>
                  <span className="text-white font-bold">{selectedProcess.memoryMb} MB</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Peak Working Set:</span>
                  <span className="text-slate-200">{selectedProcess.peakMemoryMb} MB</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Active Threads:</span>
                  <span className="text-blue-400 font-bold">{selectedProcess.threads}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Kernel Handles:</span>
                  <span className="text-slate-200">{selectedProcess.handles}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Execution Ring:</span>
                  <span className="text-amber-400">Title Sandboxed (Ring 3)</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Base Priority:</span>
                  <span className="text-slate-200">Normal (8)</span>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                onClick={() => selectedProcess && onDumpProcess(selectedProcess.pid)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#151c28] border border-[#232f44] text-slate-200 hover:text-white hover:border-blue-500"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span>Create Full Memory Dump (.dmp)</span>
              </button>

              <button
                onClick={() => selectedProcess && onToggleSuspendProcess(selectedProcess.pid)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#151c28] border border-[#232f44] text-slate-200 hover:text-white hover:border-blue-500"
              >
                <Pause className="w-3.5 h-3.5 text-amber-400" />
                <span>Suspend Thread Queue</span>
              </button>

              <button
                onClick={() => selectedProcess && onKillProcess(selectedProcess.pid)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-rose-950/80 border border-rose-800 text-rose-300 hover:bg-rose-900"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Terminate Task</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Run New Task Modal */}
      {isRunTaskOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-100">
          <div className="w-full max-w-md bg-[#0e1219] border border-[#222b3d] rounded-xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1c2434] pb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-400" />
                <span>Run New Task / Executable</span>
              </h3>
              <button
                onClick={() => setIsRunTaskOpen(false)}
                className="text-slate-400 hover:text-white text-xs p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRunTaskSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Program or Package Name:
                </label>
                <input
                  type="text"
                  placeholder="e.g. D3D12AgilityBenchmark.exe or AppId!App"
                  value={runExeInput}
                  onChange={(e) => setRunExeInput(e.target.value)}
                  className="w-full bg-[#121620] border border-[#212938] rounded px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Arguments (Optional):
                </label>
                <input
                  type="text"
                  placeholder="-benchmark -d3d12 -log"
                  value={runArgsInput}
                  onChange={(e) => setRunArgsInput(e.target.value)}
                  className="w-full bg-[#121620] border border-[#212938] rounded px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1c2434]">
                <button
                  type="button"
                  onClick={() => setIsRunTaskOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-blue-600 text-white rounded hover:bg-blue-500 shadow-sm"
                >
                  Launch Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
