import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  RotateCw, 
  Power, 
  Download, 
  Monitor, 
  Shield, 
  Wifi, 
  Check, 
  Radio, 
  Gamepad2, 
  Save, 
  Cpu, 
  Clock,
  Layers,
  Fingerprint,
  Key,
  Copy,
  Sliders,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  RefreshCw,
  Zap,
  UserCog,
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Rocket
} from 'lucide-react';
import { XboxConnectionConfig, XboxTelemetry, XboxModeCode, XboxLapsConfig, XboxLocalGroup, XboxLocalUser } from '../types/xbox';
import { XBOX_MODES, getModeDetail, generateSecureLapsPassword, INITIAL_LOCAL_GROUPS, INITIAL_LOCAL_USERS } from '../services/mockXboxData';
import xboxControllerBlue from '../assets/images/xbox_controller_blue_1794384970871.jpg';

interface SystemToolsTabProps {
  config: XboxConnectionConfig;
  telemetry: XboxTelemetry;
  onUpdateConfig: (newConfig: XboxConnectionConfig) => void;
  onReboot: (type: 'soft' | 'cold') => void;
  onShutdown: () => void;
  onCaptureScreenshot: () => void;
  screenshotUrl: string | null;
  onOpenSettingsModal?: () => void;
}

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const SpeedometerGauge: React.FC<{ value: number; max?: number; label: string; unit?: string }> = ({
  value,
  max = 100,
  label,
  unit = '°C',
}) => {
  const clamped = Math.min(Math.max(value, 0), max);
  const color = clamped < 70 ? '#10b981' : clamped < 85 ? '#f59e0b' : '#ef4444';
  const data = [
    { name: 'Active', value: clamped },
    { name: 'Remaining', value: max - clamped },
  ];

  return (
    <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-[#0a0d13] border border-[#1e273a] relative overflow-hidden shadow-md">
      <div className="absolute top-2 left-3 text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider">
        {label}
      </div>
      <div className="w-full h-32 relative mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              startAngle={180}
              endAngle={0}
              innerRadius={52}
              outerRadius={72}
              paddingAngle={0}
              dataKey="value"
              stroke="none"
            >
              <Cell fill={color} />
              <Cell fill="#161e2e" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-5">
          <span className="text-xl font-bold font-mono text-white tracking-tight">
            {clamped}{unit}
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            {clamped < 70 ? 'Optimal' : clamped < 85 ? 'Warm' : 'Critical'}
          </span>
        </div>
      </div>
      <div className="w-full flex justify-between items-center text-[10px] font-mono text-slate-500 px-2 mt-1 border-t border-[#161e2e] pt-1">
        <span>0{unit}</span>
        <span>50{unit}</span>
        <span>100{unit}</span>
      </div>
    </div>
  );
};

export const SystemToolsTab: React.FC<SystemToolsTabProps> = ({
  config,
  telemetry,
  onUpdateConfig,
  onReboot,
  onShutdown,
  onCaptureScreenshot,
  screenshotUrl,
  onOpenSettingsModal,
}) => {
  const [targetSandbox, setTargetSandbox] = useState(config.sandboxId);
  const [targetName, setTargetName] = useState(config.machineName);
  const [targetModeCode, setTargetModeCode] = useState<XboxModeCode>(config.modeCode);
  const [targetDeviceId, setTargetDeviceId] = useState(config.deviceId);
  const [copiedId, setCopiedId] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  // LAPS & Selected Account state in System Tools (defaults to DevUser instead of DevToolsUser)
  const [selectedQuickUser, setSelectedQuickUser] = useState<string>(
    config.username && config.username !== 'admin' ? config.username.replace(/^.*[\\/]/, '') : 'DevUser'
  );
  const [syncAllAliasesQuick, setSyncAllAliasesQuick] = useState(true);
  const [showLaps, setShowLaps] = useState(false);
  const [copiedLaps, setCopiedLaps] = useState(false);
  const [lapsFeedback, setLapsFeedback] = useState<string | null>(null);

  // Manufacturing Mode (0x8001) & Console XPAL Push state + TRUE/FALSE target flags
  const [xpalTargets, setXpalTargets] = useState({
    wdpKnownFolder: true,
    smbDevFiles: true,
    mfgShares: false,
    certStore: true,
    verifyAfterPush: true,
  });
  const [customXpalFileName, setCustomXpalFileName] = useState<string>('');
  const [customXpalFileBase64, setCustomXpalFileBase64] = useState<string>('');
  const [isPushingXpal, setIsPushingXpal] = useState(false);
  const [xpalPushReport, setXpalPushReport] = useState<{
    ok: boolean;
    xpalFileName?: string;
    sha256?: string;
    verifiedRemoteFiles?: string[];
    steps?: Array<{ name: string; status: 'ok' | 'warn' | 'error'; detail: string }>;
    error?: string | null;
  } | null>(null);
  const [modeSyncNote, setModeSyncNote] = useState<string | null>(null);

  const handleResetLapsQuick = () => {
    const current = config.lapsConfig;
    const cleanTarget = (selectedQuickUser || 'DevUser').replace(/^.*[\\/]/, '');
    const newPwd = cleanTarget === 'DevUser' ? 'XboxDev2026!' : generateSecureLapsPassword(18, true, true, true);
    const now = new Date();
    const nowFormatted = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    const expiration = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const updatedLaps: XboxLapsConfig = {
      ...(current || {
        enabled: true,
        targetAccount: cleanTarget,
        adminUsername: cleanTarget,
        rotationIntervalDays: 30,
        passwordLength: 20,
        requireSpecialChars: true,
        requireUppercase: true,
        requireDigits: true,
        backupStore: 'LocalTPM',
        status: 'Compliant',
      }),
      targetAccount: cleanTarget,
      currentPassword: newPwd,
      expirationDate: expiration.toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
      lastRotatedAt: nowFormatted,
      lastRotatedBy: `Selected Account Reset (WORKGROUP\\${cleanTarget})`,
    };

    const updatedUsers = (config.localUsers || []).map((u) => {
      const isTarget = u.username.toLowerCase() === cleanTarget.toLowerCase();
      const isAlias = syncAllAliasesQuick && ['devuser', 'devtoolsuser', 'administrator', 'sshuser', 'wdpaccessuser'].includes(u.username.toLowerCase());
      if (isTarget || isAlias) {
        return {
          ...u,
          status: 'Active' as const,
          passwordLastSet: `${nowFormatted} (${isTarget ? 'Selected' : 'Alias-Synced'}, PwdMustChange=0)`,
        };
      }
      return u;
    });

    onUpdateConfig({
      ...config,
      username: cleanTarget,
      password: newPwd,
      lapsConfig: updatedLaps,
      localUsers: updatedUsers,
    });

    setLapsFeedback(
      `[RESET SELECTED: WORKGROUP\\${cleanTarget}] Password set to "${newPwd}" (PwdMustChange=0).${
        syncAllAliasesQuick ? ' Also synced to DevUser, DevToolsUser, admin & SshUser so any username works!' : ''
      }`
    );
    setTimeout(() => setLapsFeedback(null), 6000);
  };

  useEffect(() => {
    setTargetSandbox(config.sandboxId);
    setTargetName(config.machineName);
    setTargetModeCode(config.modeCode);
    setTargetDeviceId(config.deviceId);
    const activeClean = (config.username || '').replace(/^.*[\\/]/, '').trim();
    if (activeClean && activeClean.toLowerCase() !== 'admin') {
      setSelectedQuickUser(activeClean);
    }
  }, [config]);

  const handleApplyDevModeSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const modeDetail = getModeDetail(targetModeCode);
    onUpdateConfig({
      ...config,
      sandboxId: targetSandbox.trim() || 'XDKS.1',
      machineName: targetName.trim() || 'XDK-SERIESX',
      deviceId: targetDeviceId.trim() || config.deviceId,
      modeCode: targetModeCode,
      hexCode: modeDetail.hex,
      hardwareMode: modeDetail.mode,
      securityFuses: modeDetail.securityFuses,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);

    setModeSyncNote(null);
    if (!config.isSimulated) {
      try {
        if (targetModeCode === '8001') {
          setModeSyncNote('Manufacturing Mode 0x8001 cannot be done via WDP; executing required SMB3 / Manufacturing Share Push (MDSX.8001)...');
          const pushRes = await fetch('/api/xbox/xpal/push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ip: config.ip,
              wdpPort: Number(config.port) || 11443,
              username: config.username.replace(/^.*[\\/]/, '') || 'UsrMgr5',
              password: config.password,
              modeCode: '8001',
              machineName: targetName.trim() || config.machineName,
              sandboxId: targetSandbox.trim() || config.sandboxId,
              targets: { smbDevFiles: true, wdpKnownFolder: true, mfgShares: true, certStore: true, verifyAfterPush: true }
            }),
          });
          const pushData = await pushRes.json();
          const pushSummary = Array.isArray(pushData.steps) ? pushData.steps.map((s: any) => s.detail).join(' · ') : '';
          setModeSyncNote(`Manufacturing Mode MDSX.8001 Pushed: ${pushSummary || pushData.error || 'Success'}`);
        } else {
          const res = await fetch('/api/xbox/mode/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ip: config.ip,
              wdpPort: Number(config.port) || 11443,
              username: config.username.replace(/^.*[\\/]/, '') || 'UsrMgr5',
              password: config.password,
              modeCode: targetModeCode,
              sandboxId: targetSandbox.trim() || 'XDKS.1',
              machineName: targetName.trim() || 'XDK-SERIESX',
            }),
          });
          const data = await res.json();
          const summary = Array.isArray(data.steps) ? data.steps.join(' · ') : '';
          setModeSyncNote(
            [data.note, summary, data.error].filter(Boolean).join(' | ') || 'WDP settings synced.'
          );
        }
      } catch (err: any) {
        setModeSyncNote(err?.message || 'WDP sync/push failed');
      }
    }
  };

  const handleCustomXpalFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    setCustomXpalFileBase64(btoa(bin));
    setCustomXpalFileName(file.name);
    e.target.value = '';
  };

  const handlePushXpalToConsole = async () => {
    setIsPushingXpal(true);
    setXpalPushReport(null);
    try {
      const res = await fetch('/api/xbox/xpal/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: config.ip,
          wdpPort: Number(config.port) || 11443,
          username: config.username.replace(/^.*[\\/]/, '') || 'DevUser',
          password: config.password,
          modeCode: targetModeCode,
          deviceId: targetDeviceId || config.deviceId,
          consoleId: config.consoleId,
          serialNumber: config.serialNumber,
          machineName: targetName || config.machineName,
          sandboxId: targetSandbox || config.sandboxId,
          customFileName: customXpalFileName,
          customFileBase64: customXpalFileBase64,
          targets: xpalTargets,
        }),
      });
      const data = await res.json();
      setXpalPushReport(data);
    } catch (err: any) {
      setXpalPushReport({
        ok: false,
        error: err?.message || 'XPAL push request failed',
        steps: [{ name: 'XPAL Push', status: 'error', detail: err?.message || 'Network error' }],
      });
    } finally {
      setIsPushingXpal(false);
    }
  };

  const handleCapture = () => {
    setIsCapturing(true);
    setTimeout(() => {
      onCaptureScreenshot();
      setIsCapturing(false);
    }, 600);
  };

  const handleDownloadScreenshot = () => {
    if (!screenshotUrl) return;
    const a = document.createElement('a');
    a.href = screenshotUrl;
    a.download = `xbox_frame_${Date.now()}.jpg`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Top Split: HDMI Frame Capture & Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 bg-[#0d1117] border border-[#1b2332] rounded-xl shadow-xl">
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-400" />
            <h3 className="text-base font-bold text-white">
              HDMI Framebuffer Capture
            </h3>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Captures the live uncompressed Direct3D 12 frame from the console's display encoder.
            Supports 4K UHD 3840×2160 native frames with HDR10 tone mapping.
          </p>

          <div className="space-y-2 p-3 bg-[#111622] rounded-lg border border-[#1e273a] text-xs font-mono">
            <div className="flex justify-between text-slate-400">
              <span>Display Resolution:</span>
              <span className="text-slate-200 font-bold">{telemetry.hdmiResolution}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Refresh & VRR:</span>
              <span className="text-slate-200">{telemetry.hdmiRefreshRate}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Color Space:</span>
              <span className="text-blue-400 font-bold">BT.2020 / HDR10</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={handleCapture}
              disabled={isCapturing}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.4)] disabled:opacity-50 transition-all"
            >
              <Camera className="w-4 h-4" />
              <span>{isCapturing ? 'Grabbing Frame...' : 'Take Screenshot'}</span>
            </button>

            {screenshotUrl && (
              <button
                onClick={handleDownloadScreenshot}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#141b27] border border-[#26334a] text-slate-200 hover:text-white hover:border-blue-500 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span>Save Image</span>
              </button>
            )}
          </div>
        </div>

        {/* Screenshot Viewport */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center">
          <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-[#232c3f] bg-black shadow-inner flex items-center justify-center group">
            {screenshotUrl ? (
              <img
                src={screenshotUrl}
                alt="Captured Xbox HDMI Output"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-center p-6 space-y-2">
                <Monitor className="w-10 h-10 text-slate-700 mx-auto" />
                <p className="text-xs font-mono text-slate-500">
                  No HDMI frame captured yet. Click "Take Screenshot" to capture current framebuffer.
                </p>
              </div>
            )}
            
            {screenshotUrl && (
              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[10px] font-mono text-blue-300 backdrop-blur-sm">
                3840×2160 · 4K UHD
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Thermal & Hardware Telemetry (Speedometer-Style Gauges) */}
      <div className="p-6 bg-[#0d1117] border border-[#1b2332] rounded-xl space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#1b2434] pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-600/20 border border-rose-500/30 text-rose-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                SoC Thermal & Hardware Telemetry (Speedometer Speed Gauges)
              </h3>
              <p className="text-xs text-slate-400">
                Real-time thermal monitoring for AMD Zen 2 CPU cores and RDNA 2 GPU / GDDR6 FastVRAM memory pool
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded text-[11px] font-mono font-bold bg-emerald-950/80 border border-emerald-600 text-emerald-300">
              Fan Speed: 3,450 RPM (Auto)
            </span>
            <span className="px-2.5 py-1 rounded text-[11px] font-mono font-bold bg-blue-950/80 border border-blue-600 text-blue-300">
              Throttling: NONE
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SpeedometerGauge
            value={telemetry.cpuTempCelsius}
            max={100}
            label="CPU SoC Temperature (Zen 2)"
            unit="°C"
          />
          <SpeedometerGauge
            value={Math.min(100, Math.round(telemetry.cpuTempCelsius + 7))}
            max={100}
            label="GPU / GDDR6 FastVRAM Temp"
            unit="°C"
          />
          <SpeedometerGauge
            value={Math.min(100, Math.round((telemetry.memoryUsedMb / telemetry.memoryTotalMb) * 100))}
            max={100}
            label="Unified Memory Load"
            unit="%"
          />
        </div>
      </div>

      {/* Middle Grid: Power Controls & Dev Mode Identity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Power Management Card */}
        <div className="p-6 bg-[#0d1117] border border-[#1b2332] rounded-xl space-y-4">
          <div className="flex items-center gap-2">
            <Power className="w-5 h-5 text-rose-400" />
            <h3 className="text-base font-bold text-white">
              DevKit Power Controls
            </h3>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Dispatch direct hardware power commands via the Xbox Device Portal Control API (/api/control/restart).
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#121620] border border-[#1e2637]">
              <div>
                <h4 className="text-xs font-bold text-slate-200">
                  DevKit Soft Restart
                </h4>
                <p className="text-[11px] text-slate-500">
                  Quick OS reboot without losing temporary deployment scratchpad
                </p>
              </div>
              <button
                onClick={() => onReboot('soft')}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-500 shadow-sm"
              >
                Soft Reboot
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-[#121620] border border-[#1e2637]">
              <div>
                <h4 className="text-xs font-bold text-slate-200">
                  Cold Hardware Cycle
                </h4>
                <p className="text-[11px] text-slate-500">
                  Simulates complete power cycle with full hardware reinitialization
                </p>
              </div>
              <button
                onClick={() => onReboot('cold')}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-md bg-amber-600 text-white hover:bg-amber-500 shadow-sm"
              >
                Cold Cycle
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-[#121620] border border-[#1e2637]">
              <div>
                <h4 className="text-xs font-bold text-slate-200">
                  Shutdown Console
                </h4>
                <p className="text-[11px] text-slate-500">
                  Powers off the console into Connected Standby mode
                </p>
              </div>
              <button
                onClick={onShutdown}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-md bg-rose-600 text-white hover:bg-rose-500 shadow-sm"
              >
                Shutdown
              </button>
            </div>
          </div>
        </div>

        {/* Sandbox & Machine Identity Card */}
        <div className="p-6 bg-[#0d1117] border border-[#1b2332] rounded-xl space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            <h3 className="text-base font-bold text-white">
              Sandbox & Console Identity
            </h3>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Switch Xbox Live Sandbox IDs to access isolated partner environments, cert accounts, or test user profiles.
          </p>

          <form onSubmit={handleApplyDevModeSettings} className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Active Sandbox ID
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={targetSandbox}
                  onChange={(e) => setTargetSandbox(e.target.value)}
                  placeholder="XDKS.1"
                  className="flex-1 bg-[#121620] border border-[#212938] rounded-md px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setTargetSandbox('XDKS.1')}
                  className="px-2.5 py-1 text-xs font-mono bg-[#161c28] border border-[#232d3f] rounded text-blue-300 hover:text-white"
                >
                  XDKS.1
                </button>
                <button
                  type="button"
                  onClick={() => setTargetSandbox('RETAIL')}
                  className="px-2.5 py-1 text-xs font-mono bg-[#161c28] border border-[#232d3f] rounded text-slate-300 hover:text-white"
                >
                  RETAIL
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Machine / NetBIOS Name
              </label>
              <input
                type="text"
                value={targetName}
                onChange={(e) => setTargetName(e.target.value)}
                placeholder="XDK-SERIESX-LAB01"
                className="w-full bg-[#121620] border border-[#212938] rounded-md px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Hardware Operational Mode Register
                </label>
                <select
                  value={targetModeCode}
                  onChange={(e) => setTargetModeCode(e.target.value as XboxModeCode)}
                  className="w-full bg-[#121620] border border-[#212938] rounded-md px-2.5 py-1.5 text-xs font-mono text-blue-300 font-bold focus:outline-none focus:border-blue-500"
                >
                  <option value="4001">[0x4001] DevKit Mode (Full ERA)</option>
                  <option value="2001">[0x2001] Retail Mode (Locked DRM)</option>
                  <option value="6001">[0x6001] TestKit Mode (Cert QA)</option>
                  <option value="8001">[0x8001] Manufacturing / Factory</option>
                  <option value="0001">[0x0001] Safe Mode (Recovery)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Device ID (GUID)
                </label>
                <input
                  type="text"
                  value={targetDeviceId}
                  onChange={(e) => setTargetDeviceId(e.target.value)}
                  placeholder="04829103-6281-4239-A193-8B391D92801F"
                  className="w-full bg-[#121620] border border-[#212938] rounded-md px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500 text-[11px]"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg text-white transition-all ${
                  saveSuccess
                    ? 'bg-emerald-600 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                    : 'bg-blue-600 hover:bg-blue-500 shadow-[0_0_12px_rgba(37,99,235,0.4)]'
                }`}
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Applied to Console!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Apply Settings</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {modeSyncNote && (
            <div className="p-2.5 rounded-lg bg-[#090d14] border border-blue-500/30 text-[11px] font-mono text-blue-200">
              {modeSyncNote}
            </div>
          )}
        </div>
      </div>

      {/* Manufacturing Mode (0x8001) & Console XPAL Push */}
      <div className="p-6 bg-[#0d1117] border border-purple-500/35 rounded-xl space-y-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1b2434] pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-600/20 border border-purple-500/40 text-purple-300">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">
                  Manufacturing Mode (0x{targetModeCode}) XPAL &amp; Cert Pusher
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-950/80 border border-purple-600/50 text-purple-300">
                  WDP :11443 + SMB3 :445
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Pushes custom or auto-generated <code className="text-purple-300">.xpal</code> &amp; <code className="text-blue-300">.cer</code> directly to DevelopmentFiles\xpal, WDP KnownFolders, and probes Manufacturing shares (M$, J$, Q$).
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141c29] border border-[#25334a] text-xs font-mono text-blue-300 hover:border-blue-500 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>{customXpalFileName ? customXpalFileName : 'Load .xpal / .cer'}</span>
              <input type="file" accept=".xpal,.cer,.pfx,.bin,.json" onChange={handleCustomXpalFileSelect} className="hidden" />
            </label>
            {customXpalFileName && (
              <button
                type="button"
                onClick={() => {
                  setCustomXpalFileName('');
                  setCustomXpalFileBase64('');
                }}
                className="px-2 py-1.5 text-xs font-mono text-rose-300 hover:text-rose-200"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={handlePushXpalToConsole}
              disabled={isPushingXpal}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-60 shadow-[0_0_14px_rgba(147,51,234,0.4)] cursor-pointer"
            >
              {isPushingXpal ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />}
              <span>{isPushingXpal ? 'Pushing XPAL...' : `Push XPAL (0x${targetModeCode})`}</span>
            </button>
          </div>
        </div>

        {/* Toggleable TRUE / FALSE XPAL Push Targets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {(
            [
              { key: 'wdpKnownFolder', label: 'WDP KnownFolders', desc: 'POST /api/filesystem/apps/file (DevelopmentFiles\\xpal)' },
              { key: 'smbDevFiles', label: 'SMB3 DevelopmentFiles', desc: 'Push via SMB3 //ip/DevelopmentFiles/xpal/' },
              { key: 'mfgShares', label: 'Mfg Shares (M$/J$/Q$)', desc: 'Probe & push 0x8001 partition shares over SMB3' },
              { key: 'certStore', label: 'Push X.509 .CER', desc: 'Also write OpenSSL .CER to DevelopmentFiles\\Certs' },
              { key: 'verifyAfterPush', label: 'Verify Remote Dir', desc: 'Run live SMB dir check after upload completes' },
            ] as const
          ).map((item) => {
            const val = xpalTargets[item.key];
            return (
              <div
                key={item.key}
                onClick={() => setXpalTargets((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                role="switch"
                aria-checked={val}
                className={`p-2.5 rounded-lg border cursor-pointer flex items-start justify-between gap-2 transition-all select-none ${
                  val ? 'bg-[#121827] border-purple-500/50 text-slate-100' : 'bg-[#0a0e16] border-[#1a2232] text-slate-400'
                }`}
              >
                <div className="min-w-0">
                  <div className="text-[11px] font-mono font-bold truncate">{item.label}</div>
                  <p className="text-[10px] text-slate-400 leading-snug mt-0.5">{item.desc}</p>
                </div>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border shrink-0 ${
                    val
                      ? 'bg-emerald-600/25 border-emerald-500/60 text-emerald-300'
                      : 'bg-slate-900 border-slate-700 text-slate-400'
                  }`}
                >
                  {val ? 'TRUE' : 'FALSE'}
                </span>
              </div>
            );
          })}
        </div>

        {xpalPushReport && (
          <div className="p-3.5 rounded-lg bg-[#090d14] border border-[#232f46] space-y-2 text-xs font-mono">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className={xpalPushReport.ok ? 'font-bold text-emerald-400' : 'font-bold text-amber-300'}>
                {xpalPushReport.ok
                  ? `XPAL Pushed & Verified (${xpalPushReport.xpalFileName})`
                  : xpalPushReport.error || 'XPAL Push Report'}
              </span>
              {xpalPushReport.sha256 && (
                <span className="text-[11px] text-slate-400">SHA-256: {xpalPushReport.sha256.slice(0, 20)}...</span>
              )}
            </div>
            {(xpalPushReport.verifiedRemoteFiles || []).length > 0 && (
              <div className="text-[11px] text-emerald-300">
                Verified on Xbox: {(xpalPushReport.verifiedRemoteFiles || []).join(' | ')}
              </div>
            )}
            <div className="space-y-1">
              {(xpalPushReport.steps || []).map((st, idx) => (
                <div key={idx} className="flex items-start gap-2 text-[11px]">
                  {st.status === 'ok' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : st.status === 'warn' ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold text-slate-200">{st.name}: </span>
                    <span className="text-slate-400">{st.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Windows LAPS & Console Sign-In Card */}
      <div className="p-6 bg-[#0d1117] border border-[#1b2332] rounded-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#1b2434] pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">
                  Console Sign-In, Username Picker & Windows LAPS
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 border border-emerald-700 text-emerald-300">
                  {config.lapsConfig?.status || 'Compliant'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Select any console account (<code className="text-blue-300">WORKGROUP\{selectedQuickUser}</code>) to reset & sync across all developer aliases
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedQuickUser}
              onChange={(e) => setSelectedQuickUser(e.target.value)}
              className="bg-[#121824] border border-blue-500/50 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-white focus:outline-none"
              title="Select which account to reset"
            >
              {(config.localUsers || []).map((u) => (
                <option key={u.id} value={u.username}>
                  Target: WORKGROUP\{u.username} ({u.role})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleResetLapsQuick}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-600 text-white hover:bg-amber-500 shadow-[0_0_12px_rgba(217,119,6,0.4)] transition-all cursor-pointer font-mono"
              title={`Reset selected account WORKGROUP\\${selectedQuickUser} and sync aliases`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Reset Selected ({selectedQuickUser})</span>
            </button>

            {onOpenSettingsModal && (
              <button
                type="button"
                onClick={onOpenSettingsModal}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-500 shadow-[0_0_12px_rgba(37,99,235,0.4)] transition-all cursor-pointer"
                title="Open Studio Admin Employee Logins & User Groups Manager"
              >
                <UserCog className="w-3.5 h-3.5" />
                <span>Full Account & LAPS Manager</span>
              </button>
            )}
          </div>
        </div>

        {/* Forgot Username? 1-Click Account Switcher Strip */}
        <div className="p-3 rounded-lg bg-[#0a0f18] border border-blue-500/30 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-mono font-bold text-blue-300">
              💡 Dev Forgot Their Username? Click Any Account to Select & Activate:
            </span>
            <label className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-300 cursor-pointer">
              <input
                type="checkbox"
                checked={syncAllAliasesQuick}
                onChange={(e) => setSyncAllAliasesQuick(e.target.checked)}
                className="rounded bg-[#0c1017] border-slate-700 text-emerald-500 focus:ring-0"
              />
              <span>Accept same password on DevUser, DevToolsUser, admin & SshUser</span>
            </label>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(config.localUsers || []).map((u) => {
              const isSel = selectedQuickUser.toLowerCase() === u.username.toLowerCase();
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    setSelectedQuickUser(u.username);
                    onUpdateConfig({
                      ...config,
                      username: u.username,
                      lapsConfig: {
                        ...(config.lapsConfig || {
                          enabled: true,
                          targetAccount: u.username,
                          adminUsername: u.username,
                          currentPassword: config.password,
                          passwordLength: 20,
                          rotationIntervalDays: 30,
                          expirationDate: '2026-12-12 00:00:00 UTC',
                          lastRotatedAt: 'Recently',
                          lastRotatedBy: 'Studio Admin',
                          requireSpecialChars: true,
                          requireUppercase: true,
                          requireDigits: true,
                          backupStore: 'LocalTPM',
                          status: 'Compliant',
                        }),
                        targetAccount: u.username,
                      },
                    });
                    setLapsFeedback(`Selected account switched to WORKGROUP\\${u.username} (WDP User: ${u.username}).`);
                    setTimeout(() => setLapsFeedback(null), 3500);
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all cursor-pointer ${
                    isSel
                      ? 'bg-blue-600 text-white border border-blue-400 shadow-[0_0_8px_rgba(37,99,235,0.4)]'
                      : 'bg-[#121926] text-slate-300 hover:text-white border border-[#223049]'
                  }`}
                >
                  WORKGROUP\{u.username}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-[#111622] border border-[#1e273a] text-xs font-mono">
          <div>
            <span className="text-slate-500 block">Selected Target Account:</span>
            <span className="font-bold text-white">WORKGROUP\{selectedQuickUser}</span>
            <span className="text-[10px] text-blue-400 block">WDP HTTP User: {selectedQuickUser}</span>
          </div>

          <div>
            <span className="text-slate-500 block">Active Password (All Aliases):</span>
            <div className="flex items-center gap-1.5 pt-0.5">
              <span className="font-bold text-blue-300">
                {showLaps ? (config.lapsConfig?.currentPassword || config.password || 'XboxDev2026!') : '••••••••••••••••••••'}
              </span>
              <button
                type="button"
                onClick={() => setShowLaps(!showLaps)}
                className="text-slate-400 hover:text-white p-0.5"
              >
                {showLaps ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(config.lapsConfig?.currentPassword || config.password || 'XboxDev2026!');
                  setCopiedLaps(true);
                  setTimeout(() => setCopiedLaps(false), 2000);
                }}
                className="text-slate-400 hover:text-white p-0.5"
                title="Copy Password"
              >
                {copiedLaps ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>

          <div>
            <span className="text-slate-500 block">Accepted Usernames (Alias Sync):</span>
            <span className="text-emerald-300 font-bold">
              {syncAllAliasesQuick ? `${selectedQuickUser}, DevUser, DevToolsUser, admin` : selectedQuickUser}
            </span>
          </div>
        </div>

        {/* Quick Group & Group ID Assignment Bar for Selected User */}
        {(() => {
          const allLocalUsers: XboxLocalUser[] =
            config.localUsers && config.localUsers.length > 0 ? config.localUsers : INITIAL_LOCAL_USERS;
          const allLocalGroups: XboxLocalGroup[] =
            config.localGroups && config.localGroups.length > 0 ? config.localGroups : INITIAL_LOCAL_GROUPS;
          const cleanQuickUser = (selectedQuickUser || 'DevUser').replace(/^.*[\\/]/, '').trim();

          const selUserObj = allLocalUsers.find(
            (u) => u.username.toLowerCase() === cleanQuickUser.toLowerCase()
          );
          const targetGroups = allLocalGroups.filter((g) => g.name !== 'Guests');
          const userGroups = selUserObj?.groups || [];
          const userGroupIds =
            selUserObj?.groupIds && selUserObj.groupIds.length > 0
              ? selUserObj.groupIds
              : allLocalGroups.filter((g) => userGroups.includes(g.name)).map((g) => g.sid);

          const ensureQuickUserList = (): XboxLocalUser[] => {
            if (selUserObj) return allLocalUsers;
            return [
              ...allLocalUsers,
              {
                id: `user-${Date.now()}`,
                username: cleanQuickUser,
                displayName: `${cleanQuickUser} (Active Kit Account)`,
                sid: `S-1-5-21-3948201948-2849102934-104928103-${Math.floor(1100 + Math.random() * 8000)}`,
                role: 'Developer',
                status: 'Active',
                isLapsProtected: false,
                lastLogin: 'Active Session',
                passwordLastSet: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
                description: 'Auto-provisioned selected console user account.',
                homeDirectory: `D:\\DevelopmentFiles\\${cleanQuickUser}`,
                privileges: ['SeDebugPrivilege', 'SeBatchLogonRight', 'SeNetworkLogonRight'],
                groups: [],
                groupIds: [],
              },
            ];
          };

          const handleToggleQuickGroup = (grp: XboxLocalGroup) => {
            const hasGrp =
              userGroups.includes(grp.name) ||
              userGroupIds.some((gid) => gid.toLowerCase() === grp.sid.toLowerCase() || gid === grp.id);
            const baseUsers = ensureQuickUserList();
            const updatedUsers = baseUsers.map((u) => {
              if (u.username.toLowerCase() !== cleanQuickUser.toLowerCase()) return u;
              const nextGroups = hasGrp
                ? (u.groups || []).filter((g) => g !== grp.name)
                : Array.from(new Set([...(u.groups || []), grp.name]));
              const nextIds = hasGrp
                ? (u.groupIds || []).filter((gid) => gid.toLowerCase() !== grp.sid.toLowerCase() && gid !== grp.id)
                : Array.from(new Set([...(u.groupIds || []), grp.sid]));
              return { ...u, groups: nextGroups, groupIds: nextIds };
            });
            const updatedGroups = allLocalGroups.map((g) => {
              if (g.id !== grp.id) return g;
              const nextMembers = hasGrp
                ? g.members.filter((m) => m.toLowerCase() !== cleanQuickUser.toLowerCase())
                : Array.from(new Set([...g.members, cleanQuickUser]));
              return { ...g, members: nextMembers };
            });
            onUpdateConfig({
              ...config,
              localUsers: updatedUsers,
              localGroups: updatedGroups,
            });
            setLapsFeedback(
              hasGrp
                ? `Removed WORKGROUP\\${cleanQuickUser} from "${grp.name}" (${grp.sid}).`
                : `Added WORKGROUP\\${cleanQuickUser} to "${grp.name}" (Group ID: ${grp.sid}).`
            );
            setTimeout(() => setLapsFeedback(null), 3500);
          };

          const handleGrantAllQuick = (everybody: boolean) => {
            const targetNames = targetGroups.map((g) => g.name);
            const targetSids = targetGroups.map((g) => g.sid);
            const baseUsers = ensureQuickUserList();
            const updatedUsers = baseUsers.map((u) => {
              if (!everybody && u.username.toLowerCase() !== cleanQuickUser.toLowerCase()) return u;
              if (everybody && u.username.toLowerCase() === 'guest') return u;
              return {
                ...u,
                role: 'Administrator' as const,
                groups: Array.from(new Set([...(u.groups || []), ...targetNames])),
                groupIds: Array.from(new Set([...(u.groupIds || []), ...targetSids])),
              };
            });
            const updatedGroups = allLocalGroups.map((g) => {
              if (g.name === 'Guests') return g;
              const membersToAdd = everybody
                ? baseUsers.filter((u) => u.username.toLowerCase() !== 'guest').map((u) => u.username)
                : [cleanQuickUser];
              return {
                ...g,
                members: Array.from(new Set([...g.members, ...membersToAdd])),
              };
            });
            onUpdateConfig({
              ...config,
              localUsers: updatedUsers,
              localGroups: updatedGroups,
            });
            setLapsFeedback(
              everybody
                ? `Granted all ${targetGroups.length} Groups & Group IDs to EVERY developer account on this console!`
                : `Granted all ${targetGroups.length} Groups & Group IDs to WORKGROUP\\${cleanQuickUser}!`
            );
            setTimeout(() => setLapsFeedback(null), 4500);
          };

          const handleCreateQuickLocalCertUpdate = () => {
            const now = new Date();
            const validUntil = new Date(now.getFullYear() + 10, now.getMonth(), now.getDate());
            const nowStr = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
            const expStr = validUntil.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
            const chars = '0123456789ABCDEF';
            const randomHex = (len: number) =>
              Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
            const thumbprint = Array.from({ length: 20 }, () => randomHex(2)).join(':');
            const serial = randomHex(20);
            const activeGroups = userGroups.length > 0 ? userGroups : targetGroups.map((g) => g.name);
            const activeGroupSids = userGroupIds.length > 0 ? userGroupIds : targetGroups.map((g) => g.sid);

            const payload = {
              Schema: 'XboxGameCore.LocalOfflineCertificationUpdate.v3',
              NetworkPolicy: 'LOCAL_ONLY_AIRGAPPED (Offline LAN — No Internet Required)',
              OfflineKitActivation: true,
              LocalTimestampAuthority: 'LOCAL_CONSOLE_RTC',
              IssuedAt: nowStr,
              ValidUntil: expStr,
              ConsoleLAN_IP: config.ip,
              WdpPort: config.port,
              MachineName: config.machineName,
              DeviceId: config.deviceId,
              SerialNumber: serial,
              ThumbprintSHA1: thumbprint,
              PrimaryAccount: `WORKGROUP\\${cleanQuickUser}`,
              WdpHttpUser: cleanQuickUser,
              LocalSyncedAliases: ['DevUser', 'DevToolsUser', 'admin', 'Administrator', 'SshUser'],
              Password: config.lapsConfig?.currentPassword || config.password || 'XboxDev2026!',
              PwdMustChange: 0,
              AssignedLocalGroups: activeGroups,
              AssignedGroupIds: activeGroupSids,
            };
            const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload, null, 2))));
            const wrappedB64 = b64.match(/.{1,64}/g)?.join('\n') || b64;
            const certText = [
              '# =====================================================================',
              '# XBXOWNED - LOCAL-ONLY (OFFLINE AIR-GAPPED KIT) CERTIFICATION UPDATE',
              '# Zero Internet / Zero Xbox Live Dependency | 10-Year Local LAN Trust',
              '# =====================================================================',
              `Subject: CN=WORKGROUP\\${cleanQuickUser}, OU=Local Offline DevKit (${config.machineName}), O=XBXOwned Local Root Authority`,
              `Issuer: CN=Xbox Local-Only Studio Root CA (Offline Fuse ${config.hexCode})`,
              `Network Policy: LOCAL_ONLY_AIRGAPPED (Console LAN IP: ${config.ip}:${config.port})`,
              `Serial Number: ${serial}`,
              `SHA-1 Thumbprint: ${thumbprint}`,
              `Valid From: ${nowStr}`,
              `Valid To:   ${expStr} (10-Year Offline Kit Validity)`,
              `SAM Account: WORKGROUP\\${cleanQuickUser} (WDP User: ${cleanQuickUser} | PwdMustChange=0)`,
              `Assigned Local Security Groups: ${activeGroups.join(', ')}`,
              `Assigned Group IDs (SIDs): ${activeGroupSids.join(', ')}`,
              '-----BEGIN CERTIFICATE-----',
              wrappedB64,
              '-----END CERTIFICATE-----',
              '',
            ].join('\n');

            const filename = `xbox_local_cert_update_${cleanQuickUser.toLowerCase()}.cer`;
            const blob = new Blob([certText], { type: 'application/x-x509-ca-cert' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);

            setLapsFeedback(
              `Created & downloaded Local-Only Certification File "${filename}" (WORKGROUP\\${cleanQuickUser} | ${activeGroupSids.length} Group IDs | SHA1: ${thumbprint.slice(0, 14)}...)`
            );
            setTimeout(() => setLapsFeedback(null), 5000);
          };

          return (
            <div className="p-3 rounded-lg bg-[#0a0f18] border border-[#1e293b] space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-mono font-bold text-slate-300">
                  🛡️ Assigned Security Groups &amp; Group IDs for <code className="text-blue-300">WORKGROUP\{cleanQuickUser}</code> (Click to Toggle):
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleGrantAllQuick(false)}
                    className="px-2.5 py-1 rounded text-[10px] font-mono font-bold bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer"
                  >
                    + Grant All {targetGroups.length} Groups ({cleanQuickUser})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGrantAllQuick(true)}
                    className="px-2.5 py-1 rounded text-[10px] font-mono font-bold bg-blue-600 text-white hover:bg-blue-500 cursor-pointer"
                  >
                    Grant All Groups to Everyone
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateQuickLocalCertUpdate}
                    className="px-2.5 py-1 rounded text-[10px] font-mono font-bold bg-amber-600 text-white hover:bg-amber-500 cursor-pointer"
                    title="Generate & download 100% Local-Only / Offline Kit Certification Update (.cer)"
                  >
                    Create Local Cert Update (.CER)
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {targetGroups.map((grp) => {
                  const hasGrp =
                    userGroups.includes(grp.name) ||
                    userGroupIds.some((gid) => gid.toLowerCase() === grp.sid.toLowerCase() || gid === grp.id);
                  return (
                    <button
                      key={grp.id}
                      type="button"
                      onClick={() => handleToggleQuickGroup(grp)}
                      className={`px-2 py-1 rounded text-[10px] font-mono font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
                        hasGrp
                          ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-300 hover:bg-emerald-900/60'
                          : 'bg-[#0e1420] border-[#1f2b42] text-slate-400 hover:text-white hover:border-blue-500/50'
                      }`}
                    >
                      <span>{hasGrp ? '✓' : '+'}</span>
                      <span>{grp.name}</span>
                      <span className="text-[9px] opacity-75">[{grp.sid.split('-').pop()}]</span>
                    </button>
                  );
                })}
              </div>
              <div className="pt-1 text-[10px] font-mono text-slate-400 break-all">
                <span className="text-slate-500 mr-1.5">Active Group IDs ({userGroupIds.length}):</span>
                <span className="text-blue-300">{userGroupIds.join(', ') || 'None'}</span>
              </div>
            </div>
          );
        })()}

        {lapsFeedback && (
          <div className="p-2.5 rounded bg-emerald-950/60 border border-emerald-600/60 text-xs font-mono text-emerald-300 flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{lapsFeedback}</span>
          </div>
        )}
      </div>

      {/* Network & Controller Diagnostics Strip */}
      <div className="p-5 bg-[#0d1117] border border-[#1b2332] rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src={xboxControllerBlue}
            alt="Xbox Blue Controller"
            className="w-16 h-16 rounded-lg border border-blue-500/40 object-cover shrink-0 shadow-[0_0_15px_rgba(37,99,235,0.3)]"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-xs font-bold text-white">
                Xbox Wireless Controller Paired (User 1)
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-400 mt-0.5">
              Input Protocol: GDK GameInput v1.4 · Low Latency Bluetooth / Xbox Wireless
            </p>
            <p className="text-[11px] font-mono text-slate-500">
              MAC: {config.macAddress} · MTU: 1500 · IPv4: {config.ip}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-2 py-1 rounded bg-[#131924] border border-[#212b3d] text-blue-300">
            NAT Type: Open
          </span>
          <span className="px-2 py-1 rounded bg-[#131924] border border-[#212b3d] text-emerald-300">
            Link: 1000 Mbps Full Duplex
          </span>
        </div>
      </div>
    </div>
  );
};
