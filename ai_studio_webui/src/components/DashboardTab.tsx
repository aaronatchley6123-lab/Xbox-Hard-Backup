import React, { useState } from 'react';
import { 
  Play, 
  Square, 
  RotateCw, 
  Camera, 
  Monitor, 
  Cpu, 
  HardDrive, 
  Activity, 
  ShieldCheck, 
  Flame, 
  ArrowRight,
  ExternalLink,
  Layers,
  Sparkles,
  Fingerprint,
  Check,
  Copy,
  Shield,
  ShieldAlert,
  Wrench,
  Key,
  RefreshCw,
  Sliders
} from 'lucide-react';
import { XboxAppPackage, XboxConnectionConfig, XboxTelemetry, XboxModeCode } from '../types/xbox';
import { XBOX_MODES, getModeDetail } from '../services/mockXboxData';
import xboxDevkitBlue from '../assets/images/xbox_devkit_blue_1794384970429.jpg';

interface DashboardTabProps {
  config: XboxConnectionConfig;
  telemetry: XboxTelemetry;
  apps: XboxAppPackage[];
  onLaunchApp: (app: XboxAppPackage) => void;
  onKillApp: (app: XboxAppPackage) => void;
  onTakeScreenshot: () => void;
  onReboot: () => void;
  onNavigateTab: (tabId: string) => void;
  onSwitchHardwareMode?: (modeCode: XboxModeCode) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  config,
  telemetry,
  apps,
  onLaunchApp,
  onKillApp,
  onTakeScreenshot,
  onReboot,
  onNavigateTab,
  onSwitchHardwareMode,
}) => {
  const runningApp = apps.find((a) => a.isRunning && a.type === 'Game') || apps.find((a) => a.isRunning);
  const currentMode = getModeDetail(config.modeCode);

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isProbingMode, setIsProbingMode] = useState(false);
  const [probeResultMsg, setProbeResultMsg] = useState<string | null>(null);

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleProbeModeRegisters = async () => {
    setIsProbingMode(true);
    setProbeResultMsg(null);
    try {
      const cleanUser = config.username.replace(/^.*[\\/]/, '') || 'DevUser';
      const res = await fetch('/api/xbox/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: config.ip,
          wdpPort: Number(config.port) || 11443,
          username: cleanUser,
          password: config.password,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setProbeResultMsg(`WDP /api/os/info HTTP ${data.statusCode}: ${data.osInfo}`);
      } else {
        setProbeResultMsg(data.error || `WDP query returned HTTP ${data.statusCode || 'error'}`);
      }
    } catch (err: any) {
      setProbeResultMsg(err?.message || 'WDP query failed');
    } finally {
      setIsProbingMode(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Strip: Console Visual + Status Overview */}
      <div className="relative overflow-hidden rounded-xl border border-[#1f293d] bg-gradient-to-r from-[#0d1118] via-[#101520] to-[#0c1017] p-6 shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left Column: Console Details & Active Status */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-mono font-semibold text-blue-400">
                {config.machineName}
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-300 font-mono">
                {config.ip}:{config.port}
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400 font-mono">
                Sandbox: {config.sandboxId}
              </span>
              <span className="text-slate-600">·</span>
              <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${currentMode.badgeBg} ${currentMode.badgeBorder} ${currentMode.badgeColor}`}>
                [{currentMode.hex}] {currentMode.shortTag}
              </span>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-sans">
                {config.devkitModel}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
                Connected to Xbox Device Portal REST & WebSocket Debug runtime.
                Ready for game package deployment, live memory analysis, and isolated storage access.
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <button
                onClick={() => onNavigateTab('apps')}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all"
              >
                <Layers className="w-4 h-4" />
                <span>Deploy / Launch App</span>
              </button>

              <button
                onClick={onTakeScreenshot}
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#141b27] border border-[#26334a] text-slate-200 hover:text-white hover:border-blue-500 transition-colors"
              >
                <Camera className="w-4 h-4 text-blue-400" />
                <span>Capture HDMI Frame</span>
              </button>

              <button
                onClick={onReboot}
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#141b27] border border-[#26334a] text-slate-200 hover:text-rose-400 hover:border-rose-500/50 transition-colors"
              >
                <RotateCw className="w-4 h-4" />
                <span>Reboot DevKit</span>
              </button>
            </div>
          </div>

          {/* Right Column: Console Monolith Image Showcase */}
          <div className="lg:col-span-5 relative flex items-center justify-center">
            <div className="relative w-full max-w-sm rounded-xl overflow-hidden border border-[#222d42] shadow-[0_0_30px_rgba(37,99,235,0.25)] group">
              <img
                src={xboxDevkitBlue}
                alt="Xbox Series X DevKit (Blue Edition)"
                className="w-full h-48 sm:h-56 object-cover object-center group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#090b0e] via-transparent to-transparent" />
              
              <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                  Scarlett Dev Core Online
                </span>
                <span className="text-blue-400 text-[11px]">
                  OS: {config.osVersion.split(' ')[0]}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DEDICATED HARDWARE IDENTITY & MODE DETECTOR PANEL */}
      <div className="rounded-xl border border-[#1e273a] bg-[#0c1017] p-5 shadow-xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#182030] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Fingerprint className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Xbox Hardware Identity & Operational Mode Detection
                </h2>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${currentMode.badgeBg} ${currentMode.badgeBorder} ${currentMode.badgeColor}`}>
                  {currentMode.hex} {currentMode.shortTag}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Live inspection of hardware security registers, cryptographic device credentials, and operating mode privileges.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleProbeModeRegisters}
              disabled={isProbingMode}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-[#141b27] border border-[#25334a] text-blue-300 hover:text-white hover:border-blue-500 transition-colors shadow-sm"
              title="Query hardware registers and WDP security status"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isProbingMode ? 'animate-spin text-blue-400' : ''}`} />
              <span>{isProbingMode ? 'Probing Registers...' : 'Probe Security Registers'}</span>
            </button>
          </div>
        </div>

        {probeResultMsg && (
          <div className="p-3 rounded-lg bg-blue-950/40 border border-blue-700/50 text-xs font-mono text-blue-300 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{probeResultMsg}</span>
          </div>
        )}

        {/* Top Split: Hardware ID Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
          {/* Device ID GUID */}
          <div className="p-3 rounded-lg bg-[#111622] border border-[#1d2638] space-y-1.5">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span className="font-semibold text-slate-300 flex items-center gap-1">
                <Key className="w-3.5 h-3.5 text-blue-400" />
                Device ID (GUID)
              </span>
              <button
                onClick={() => handleCopy(config.deviceId, 'deviceId')}
                className="text-slate-400 hover:text-white"
                title="Copy Device ID"
              >
                {copiedField === 'deviceId' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-slate-100 font-bold truncate text-xs" title={config.deviceId}>
              {config.deviceId}
            </p>
            <p className="text-[10px] text-slate-500">Unique cryptographic console GUID</p>
          </div>

          {/* Serial Number */}
          <div className="p-3 rounded-lg bg-[#111622] border border-[#1d2638] space-y-1.5">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span className="font-semibold text-slate-300 flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-blue-400" />
                Serial Number
              </span>
              <button
                onClick={() => handleCopy(config.serialNumber, 'serialNumber')}
                className="text-slate-400 hover:text-white"
                title="Copy Serial Number"
              >
                {copiedField === 'serialNumber' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-slate-100 font-bold tracking-wider text-xs">
              {config.serialNumber}
            </p>
            <p className="text-[10px] text-slate-500">12-digit chassis hardware serial</p>
          </div>

          {/* Console / Certificate ID */}
          <div className="p-3 rounded-lg bg-[#111622] border border-[#1d2638] space-y-1.5">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span className="font-semibold text-slate-300 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                Console Certificate ID
              </span>
              <button
                onClick={() => handleCopy(config.consoleId, 'consoleId')}
                className="text-slate-400 hover:text-white"
                title="Copy Console ID"
              >
                {copiedField === 'consoleId' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-slate-100 font-bold truncate text-xs">
              {config.consoleId}
            </p>
            <p className="text-[10px] text-slate-500">Xbox Live & Kerberos cert token</p>
          </div>

          {/* Motherboard & Security Fuses */}
          <div className="p-3 rounded-lg bg-[#111622] border border-[#1d2638] space-y-1.5">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span className="font-semibold text-slate-300 flex items-center gap-1">
                <Wrench className="w-3.5 h-3.5 text-blue-400" />
                SoC Rev & Security Fuses
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold">Active</span>
            </div>
            <p className="text-slate-100 font-bold truncate text-xs" title={config.motherboardRev}>
              {config.motherboardRev}
            </p>
            <p className="text-[10px] text-blue-400 truncate" title={config.securityFuses}>
              {config.securityFuses}
            </p>
          </div>
        </div>

        {/* Interactive Mode Selector: 2001, 4001, 6001, 8001, 0001 */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 font-mono">
              <Sliders className="w-3.5 h-3.5 text-blue-400" />
              <span>Operational Mode Detection & Switcher Register (2001, 4001, 6001, 8001, 0001)</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              Current: <strong className="text-white">{currentMode.label}</strong> ({currentMode.hex})
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {(Object.keys(XBOX_MODES) as XboxModeCode[]).map((code) => {
              const mode = XBOX_MODES[code];
              const isSelected = config.modeCode === code;

              return (
                <div
                  key={code}
                  onClick={() => onSwitchHardwareMode && onSwitchHardwareMode(code)}
                  className={`p-3.5 rounded-lg border cursor-pointer transition-all flex flex-col justify-between space-y-2 group ${
                    isSelected
                      ? `bg-blue-950/40 border-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.3)]`
                      : `bg-[#10141f] border-[#1d2536] hover:border-blue-500/50 hover:bg-[#131926]`
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-extrabold text-blue-400">
                        {mode.hex}
                      </span>
                      {isSelected ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-mono bg-blue-600 text-white">
                          DETECTED
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-mono group-hover:text-slate-300">
                          Switch
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-bold text-white mt-1 group-hover:text-blue-300 transition-colors">
                      {mode.shortTag}
                    </h4>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                      {mode.label}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#1a2130] text-[10px] font-mono text-slate-400 space-y-1">
                    <div className="flex justify-between">
                      <span>Sideload:</span>
                      <span className={mode.sideloadAllowed ? 'text-emerald-400 font-bold' : 'text-rose-400'}>
                        {mode.sideloadAllowed ? 'Allowed' : 'Locked'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>WDP :11443:</span>
                      <span className={mode.wdpEnabled ? 'text-blue-400' : 'text-slate-500'}>
                        {mode.wdpEnabled ? 'Active' : 'Closed'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active Mode Capability Breakdown Strip */}
          <div className="p-3.5 rounded-lg bg-[#0e121a] border border-[#1b2333] text-xs font-mono text-slate-300 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-slate-400">
              <span className="font-bold text-slate-200 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Active Privilege Profile for {currentMode.hex} ({currentMode.label})
              </span>
              <span className="text-blue-400 text-[11px]">
                Memory Pool: {currentMode.memoryPool}
              </span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed font-sans">
              {currentMode.description}
            </p>
            <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-1 border-t border-[#171f2d]">
              <span><strong>Fuses:</strong> {currentMode.securityFuses}</span>
              <span>·</span>
              <span><strong>Network Ports:</strong> {currentMode.defaultPortAccess}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Real-Time Hardware Telemetry Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CPU 8-Core Zen 2 Metric */}
        <div className="p-4 rounded-xl border border-[#1c2434] bg-[#0d1117] space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-blue-400" />
              CPU Utilization
            </span>
            <span className="font-mono text-slate-300 font-bold tabular-nums">
              {telemetry.cpuAvgLoad}%
            </span>
          </div>

          {/* 8-Core Mini Bars */}
          <div className="grid grid-cols-8 gap-1 h-7 items-end pt-1">
            {telemetry.cpuCores.map((load, idx) => (
              <div key={idx} className="h-full bg-[#161c26] rounded flex flex-col justify-end overflow-hidden" title={`Core ${idx}: ${load}%`}>
                <div
                  className="w-full bg-blue-500 rounded transition-all duration-300"
                  style={{ height: `${load}%` }}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 font-mono">
            <span>8 Cores @ 3.8 GHz</span>
            <span className="flex items-center gap-1 text-slate-400">
              <Flame className="w-3 h-3 text-amber-400" />
              {telemetry.cpuTempCelsius}°C
            </span>
          </div>
        </div>

        {/* Unified 16 GB GDDR6 Memory Allocation */}
        <div className="p-4 rounded-xl border border-[#1c2434] bg-[#0d1117] space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-blue-400" />
              GDDR6 Unified RAM
            </span>
            <span className="font-mono text-slate-300 font-bold tabular-nums">
              {(telemetry.memoryUsedMb / 1024).toFixed(1)} / {(telemetry.memoryTotalMb / 1024).toFixed(0)} GB
            </span>
          </div>

          {/* Split Memory Bar: 10GB Fast GPU + 3.5GB CPU + 2.5GB OS */}
          <div className="w-full h-3 bg-[#161c26] rounded-full overflow-hidden flex">
            <div 
              className="bg-blue-500 h-full transition-all duration-300"
              style={{ width: `${(telemetry.gpuFastVramUsedMb / telemetry.memoryTotalMb) * 100}%` }}
              title="Fast GPU VRAM (10GB Pool)"
            />
            <div 
              className="bg-sky-400 h-full transition-all duration-300"
              style={{ width: `${((telemetry.memoryUsedMb - telemetry.gpuFastVramUsedMb) / telemetry.memoryTotalMb) * 100}%` }}
              title="Standard Game Memory"
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 font-mono">
            <span className="text-blue-400 font-medium">Fast VRAM: {(telemetry.gpuFastVramUsedMb / 1024).toFixed(1)} GB</span>
            <span>Bandwidth: 560 GB/s</span>
          </div>
        </div>

        {/* HDMI Display & GPU State */}
        <div className="p-4 rounded-xl border border-[#1c2434] bg-[#0d1117] space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold flex items-center gap-1.5">
              <Monitor className="w-4 h-4 text-blue-400" />
              HDMI Framebuffer
            </span>
            <span className="font-mono text-blue-400 font-bold tabular-nums">
              {telemetry.frameRate.toFixed(1)} FPS
            </span>
          </div>

          <p className="text-sm font-bold text-slate-200 truncate pt-1">
            {telemetry.hdmiResolution}
          </p>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 font-mono">
            <span>{telemetry.hdmiRefreshRate.split(' ')[0]} {telemetry.hdmiRefreshRate.split(' ')[1]}</span>
            <span className="text-emerald-400 font-semibold">HDR10 Active</span>
          </div>
        </div>

        {/* DirectStorage NVMe Internal Drive */}
        <div className="p-4 rounded-xl border border-[#1c2434] bg-[#0d1117] space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-blue-400" />
              DirectStorage NVMe
            </span>
            <span className="font-mono text-slate-300 font-bold tabular-nums">
              {telemetry.internalStorageUsedGb} / {telemetry.internalStorageTotalGb} GB
            </span>
          </div>

          <div className="w-full h-2 bg-[#161c26] rounded-full overflow-hidden">
            <div 
              className="bg-blue-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${(telemetry.internalStorageUsedGb / telemetry.internalStorageTotalGb) * 100}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 font-mono">
            <span>{(telemetry.internalStorageTotalGb - telemetry.internalStorageUsedGb)} GB Free</span>
            <span className="text-blue-400">Dev Drive: D:\</span>
          </div>
        </div>
      </div>

      {/* Active Running Game & Quick Controls Strip */}
      {runningApp ? (
        <div className="p-5 rounded-xl border border-blue-500/40 bg-gradient-to-r from-blue-950/30 via-[#101622] to-[#0c1017] shadow-[0_0_20px_rgba(37,99,235,0.15)] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-lg bg-blue-600/30 border border-blue-500/50 flex items-center justify-center shrink-0 text-blue-400">
              <Play className="w-6 h-6 fill-current" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-600 text-white uppercase font-mono">
                  Foreground Title
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  v{runningApp.version}
                </span>
              </div>
              <h3 className="text-base font-bold text-white truncate mt-0.5">
                {runningApp.name}
              </h3>
              <p className="text-xs font-mono text-slate-400 truncate max-w-lg">
                {runningApp.packageFullName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onKillApp(runningApp)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-rose-950/80 border border-rose-700/60 text-rose-300 hover:bg-rose-900 transition-colors"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Terminate Title</span>
            </button>

            <button
              onClick={() => onNavigateTab('files')}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#141b26] border border-[#253248] text-slate-200 hover:text-white hover:border-blue-500 transition-colors"
            >
              <span>Explore LocalAppData</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : null}

      {/* Linux Workflow Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <div 
          onClick={() => onNavigateTab('apps')}
          className="p-5 rounded-xl border border-[#1c2434] bg-[#0d1117] hover:border-blue-500/60 transition-all cursor-pointer group space-y-2"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
            <Layers className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
            MSIX / APPX Deployment
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Upload built game packages directly to the DevKit over local network or register loose layout folders.
          </p>
        </div>

        <div 
          onClick={() => onNavigateTab('files')}
          className="p-5 rounded-xl border border-[#1c2434] bg-[#0d1117] hover:border-blue-500/60 transition-all cursor-pointer group space-y-2"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
            <HardDrive className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
            FTP & LocalAppData Explorer
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Inspect sandboxed save states, edit game config INI/JSON files live, and pull crash dumps to Linux.
          </p>
        </div>

        <div 
          onClick={() => onNavigateTab('packaging')}
          className="p-5 rounded-xl border border-[#1c2434] bg-[#0d1117] hover:border-blue-500/60 transition-all cursor-pointer group space-y-2"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
            <ExternalLink className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
            Standalone Linux Packaging
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Compile the XBXOwned Python PyQt6 app into a standalone Linux binary, .deb package, or AppImage.
          </p>
        </div>
      </div>
    </div>
  );
};
