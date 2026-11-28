import React, { useState } from 'react';
import {
  Copy,
  Check,
  Download,
  ShieldCheck,
  Loader2,
  Gamepad2,
  Rocket,
  Wifi,
  Lock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Key,
  Terminal,
} from 'lucide-react';
import { XboxConnectionConfig } from '../types/xbox';
import {
  generatePythonStandaloneScript,
  generatePyInstallerBuildScript,
  generateDesktopEntry,
  generateDebianPackageScript,
  generateAppImageScript,
  generateXdkCppHost,
  generateAppxManifest,
  generateMicrosoftGameConfig,
  generateMsixWindowsScript,
  generateMsixLinuxScript,
  XDK_CAPABILITY_OPTIONS,
  DEFAULT_XDK_CAPABILITIES,
  XDK_MANIFEST_FLAG_OPTIONS,
  DEFAULT_XDK_MANIFEST_FLAGS,
  XdkManifestFlags,
} from '../services/linuxPackager';

interface LinuxBuildTabProps {
  config: XboxConnectionConfig;
}

type BuildSubTab =
  | 'xdk-ps1'
  | 'xdk-cpp'
  | 'xdk-manifest'
  | 'xdk-smb'
  | 'python'
  | 'pyinstaller'
  | 'desktop'
  | 'debian'
  | 'appimage';

interface DeployStep {
  name: string;
  status: 'ok' | 'warn' | 'error';
  detail: string;
}

export const LinuxBuildTab: React.FC<LinuxBuildTabProps> = ({ config }) => {
  const [activeSubTab, setActiveSubTab] = useState<BuildSubTab>('xdk-manifest');
  const [copied, setCopied] = useState(false);
  const [isExportingKit, setIsExportingKit] = useState(false);
  const [isDownloadingMsix, setIsDownloadingMsix] = useState(false);
  const [isDownloadingCert, setIsDownloadingCert] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  // OneCore Packaging Mode, Capabilities & Toggleable Boolean Flags
  const [uwpMode, setUwpMode] = useState<'html-uwp' | 'native-cpp'>('html-uwp');
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>(DEFAULT_XDK_CAPABILITIES);
  const [manifestFlags, setManifestFlags] = useState<XdkManifestFlags>(DEFAULT_XDK_MANIFEST_FLAGS);
  const [compiledExeBase64, setCompiledExeBase64] = useState<string>('');
  const [compiledExeName, setCompiledExeName] = useState<string>('');

  // Live 1-Click Test & Direct Deploy State
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
    runningInCloud?: boolean;
  } | null>(null);

  const [isDeploying, setIsDeploying] = useState(false);
  const [deploySteps, setDeploySteps] = useState<DeployStep[]>([]);
  const [deploySummary, setDeploySummary] = useState<{
    ok: boolean;
    runningInCloud?: boolean;
    looseAppConsolePath?: string;
  } | null>(null);

  const [isCheckingDumps, setIsCheckingDumps] = useState(false);
  const [dumpReport, setDumpReport] = useState<any>(null);

  const pythonCode = generatePythonStandaloneScript(config);
  const pyinstallerScript = generatePyInstallerBuildScript();
  const desktopEntry = generateDesktopEntry();
  const debianScript = generateDebianPackageScript();
  const appImageScript = generateAppImageScript();
  const xdkCppHost = generateXdkCppHost(config);
  const appxManifest = generateAppxManifest(config, selectedCapabilities, uwpMode, manifestFlags);
  const gameConfigXml = generateMicrosoftGameConfig(config);
  const msixWindowsScript = generateMsixWindowsScript(config);
  const msixLinuxScript = generateMsixLinuxScript(config);

  let activeCode = msixWindowsScript;
  let filename = 'build_and_deploy_xdk.ps1';

  if (activeSubTab === 'xdk-cpp') {
    activeCode = xdkCppHost;
    filename = 'Main.cpp';
  } else if (activeSubTab === 'xdk-manifest') {
    activeCode = appxManifest;
    filename = 'AppxManifest.xml';
  } else if (activeSubTab === 'xdk-smb') {
    activeCode = msixLinuxScript;
    filename = 'deploy_xdk_smb.sh';
  } else if (activeSubTab === 'python') {
    activeCode = pythonCode;
    filename = 'xbxowned_gui.py';
  } else if (activeSubTab === 'pyinstaller') {
    activeCode = pyinstallerScript;
    filename = 'build_xbxowned.sh';
  } else if (activeSubTab === 'desktop') {
    activeCode = desktopEntry;
    filename = 'xbxowned.desktop';
  } else if (activeSubTab === 'debian') {
    activeCode = debianScript;
    filename = 'build_deb.sh';
  } else if (activeSubTab === 'appimage') {
    activeCode = appImageScript;
    filename = 'build_appimage.sh';
  }

  const toggleCapability = (capId: string, forceValue?: boolean) => {
    setSelectedCapabilities((prev) => {
      const has = prev.includes(capId);
      const next = forceValue !== undefined ? forceValue : !has;
      if (next) return has ? prev : [...prev, capId];
      return prev.filter((c) => c !== capId);
    });
  };

  const toggleManifestFlag = (key: keyof XdkManifestFlags, forceValue?: boolean) => {
    setManifestFlags((prev) => ({
      ...prev,
      [key]: forceValue !== undefined ? forceValue : !prev[key],
    }));
  };

  const handleExeAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    setCompiledExeBase64(btoa(binary));
    setCompiledExeName(file.name);
    setUwpMode('native-cpp');
    e.target.value = '';
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(activeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadScript = () => {
    const blob = new Blob([activeCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleTestXdkConnection = async () => {
    setIsTestingConnection(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/xbox/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: config.ip,
          wdpPort: Number(config.port) || 11443,
          username: config.username,
          password: config.password,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setTestResult({
          ok: true,
          message: `Connected to Xbox WDP https://${config.ip}:${config.port} (HTTP ${data.statusCode}) — ready for 1-click deploy.`,
        });
      } else {
        setTestResult({
          ok: false,
          runningInCloud: data.runningInCloud,
          message: data.error || `Failed to reach https://${config.ip}:${config.port}`,
        });
      }
    } catch (err: any) {
      setTestResult({
        ok: false,
        message: err?.message || 'Network request failed',
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleDeployDirectlyToXdk = async () => {
    setIsDeploying(true);
    setDeploySteps([]);
    setDeploySummary(null);
    try {
      const res = await fetch('/api/xbox/deploy-xdk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: config.ip,
          wdpPort: Number(config.port) || 11443,
          username: config.username,
          password: config.password,
          smbShareName: 'DevelopmentFiles',
          packageName: 'XBXOwned.XboxDevKitStudio',
          publisher: 'CN=XBXOwned DevKit Studio',
          version: '1.0.0.0',
          displayName: `XBXOwned (${config.machineName || 'Series X'})`,
          uwpMode,
          capabilities: selectedCapabilities,
          manifestFlags,
          cppSource: xdkCppHost,
          compiledExeBase64,
        }),
      });
      const data = await res.json();
      setDeploySteps(Array.isArray(data.steps) ? data.steps : []);
      setDeploySummary({
        ok: Boolean(data.ok),
        runningInCloud: Boolean(data.runningInCloud),
        looseAppConsolePath: data.looseAppConsolePath,
      });
    } catch (err: any) {
      setDeploySteps([
        {
          name: 'Deploy Request',
          status: 'error',
          detail: err?.message || 'Failed to invoke /api/xbox/deploy-xdk',
        },
      ]);
      setDeploySummary({ ok: false });
    } finally {
      setIsDeploying(false);
    }
  };

  const handleCheckCrashDumps = async () => {
    setIsCheckingDumps(true);
    setDumpReport(null);
    try {
      const res = await fetch('/api/xbox/debug/dumps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: config.ip,
          wdpPort: Number(config.port) || 11443,
          username: config.username.replace(/^.*[\\/]/, '') || 'DevToolsUser',
          password: config.password,
          packageNamePrefix: 'XBXOwned',
        }),
      });
      const data = await res.json();
      setDumpReport(data);
    } catch (err: any) {
      setDumpReport({ ok: false, error: err?.message || 'Failed to query WDP crash dumps' });
    } finally {
      setIsCheckingDumps(false);
    }
  };

  const handleDownloadMsix = async () => {
    setIsDownloadingMsix(true);
    setExportStatus(null);
    try {
      const res = await fetch('/api/msix/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageName: 'XBXOwned.XboxDevKitStudio',
          publisher: 'CN=XBXOwned DevKit Studio',
          version: '1.0.0.0',
          displayName: `XBXOwned (${config.machineName || 'Series X'})`,
          capabilities: selectedCapabilities,
          manifestFlags,
          uwpMode,
          cppSource: xdkCppHost,
          compiledExeBase64,
        }),
      });
      if (!res.ok) throw new Error(`MSIX build failed (HTTP ${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'XBXOwned.XboxDevKitStudio_x64.msix';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExportStatus(
        `Downloaded XBXOwned.XboxDevKitStudio_x64.msix (${uwpMode === 'html-uwp' ? 'Zero-Compile StartPage=www/index.html' : 'Native C++'} + ${selectedCapabilities.length} AppxManifest permissions)`
      );
    } catch (err: any) {
      setExportStatus(`Error: ${err?.message || 'Failed to build .msix'}`);
    } finally {
      setIsDownloadingMsix(false);
    }
  };

  const handleDownloadCert = async () => {
    setIsDownloadingCert(true);
    setExportStatus(null);
    try {
      const res = await fetch('/api/msix/cert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publisher: 'CN=XBXOwned DevKit Studio',
          packageName: 'XBXOwned.XboxDevKitStudio',
        }),
      });
      if (!res.ok) throw new Error(`Cert generation failed (HTTP ${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'XBXOwned.XboxDevKitStudio_SigningCert.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExportStatus('Downloaded XBXOwned_Signing.cer + XBXOwned_Signing.pfx (PFX pass: xbox123).');
    } catch (err: any) {
      setExportStatus(`Error: ${err?.message || 'Failed to generate certificate'}`);
    } finally {
      setIsDownloadingCert(false);
    }
  };

  const handleDownloadXdkKit = async () => {
    setIsExportingKit(true);
    setExportStatus(null);
    try {
      const res = await fetch('/api/export/xdk-kit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manifestXml: appxManifest,
          gameConfigXml,
          cppHost: xdkCppHost,
          windowsBuildScript: msixWindowsScript,
          linuxDeployScript: msixLinuxScript,
          compiledExeBase64,
          compiledExeName: compiledExeName || 'XBXOwned.exe',
          publisher: 'CN=XBXOwned DevKit Studio',
          config,
        }),
      });

      if (!res.ok) {
        throw new Error(`Export failed with HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'XBXOwned_SeriesX_UWP_Kit.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExportStatus(
        `Downloaded XBXOwned_SeriesX_UWP_Kit.zip (${selectedCapabilities.length} OneCore capabilities + .cer/.pfx + dist/www bundle)`
      );
    } catch (err: any) {
      setExportStatus(`Error: ${err?.message || 'Could not generate XDK UWP kit'}`);
    } finally {
      setIsExportingKit(false);
    }
  };

  const latestLocalRunCmd = `cd ~/xbxowned && npm install && npm run build && PORT=3000 npx tsx server.ts`;

  return (
    <div className="space-y-6">
      {/* 1-Click Direct XDK Deploy + Mode + Permissions */}
      <div className="p-6 bg-[#0d1117] border border-[#1b2332] rounded-xl shadow-xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                XDK On-Console App, Permissions &amp; 1-Click .MSIX Deploy
              </h2>
              <p className="text-xs text-slate-400">
                Target: <span className="font-mono text-blue-300">{config.ip}:{config.port}</span> · SMB3 <span className="font-mono text-emerald-300">:{config.smbPort}</span> · Account <span className="font-mono text-amber-300">{config.username}</span> ({config.hexCode})
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleTestXdkConnection}
              disabled={isTestingConnection}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#141b27] border border-[#253248] text-blue-300 hover:text-white hover:border-blue-500 disabled:opacity-60 transition-all"
            >
              {isTestingConnection ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />}
              <span>Test XDK (:{config.port})</span>
            </button>

            <button
              onClick={handleDeployDirectlyToXdk}
              disabled={isDeploying}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-60 shadow-[0_0_14px_rgba(16,185,129,0.4)] transition-all"
            >
              {isDeploying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />}
              <span>{isDeploying ? 'Deploying to XDK...' : 'Deploy Directly to XDK'}</span>
            </button>

            <button
              onClick={handleDownloadMsix}
              disabled={isDownloadingMsix}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-60 shadow-[0_0_12px_rgba(37,99,235,0.4)] transition-all"
            >
              {isDownloadingMsix ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>Download .MSIX</span>
            </button>

            <button
              onClick={handleDownloadCert}
              disabled={isDownloadingCert}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#141b27] border border-[#253248] text-amber-300 hover:text-white hover:border-amber-500 disabled:opacity-60 transition-all"
            >
              {isDownloadingCert ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
              <span>Cert (.CER/.PFX)</span>
            </button>

            <button
              onClick={handleCheckCrashDumps}
              disabled={isCheckingDumps}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#141b27] border border-[#253248] text-rose-300 hover:text-white hover:border-rose-500 disabled:opacity-60 transition-all"
            >
              {isCheckingDumps ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />}
              <span>Crash Dumps (:{config.port})</span>
            </button>

            <button
              onClick={handleDownloadXdkKit}
              disabled={isExportingKit}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#141b27] border border-[#253248] text-slate-200 hover:text-white hover:border-emerald-500 disabled:opacity-60 transition-all"
            >
              {isExportingKit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
              <span>Full Kit (.ZIP)</span>
            </button>
          </div>
        </div>

        {/* Payload Mode Selector */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setUwpMode('html-uwp')}
            className={`text-left p-3.5 rounded-xl border transition-all ${
              uwpMode === 'html-uwp'
                ? 'bg-emerald-950/35 border-emerald-500/60 shadow-[0_0_16px_rgba(16,185,129,0.12)]'
                : 'bg-[#101520] border-[#1f293b] hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">Instant HTML / OneCore UWP (Recommended)</span>
              <span className={`px-2 py-0.5 text-[10px] font-mono rounded ${uwpMode === 'html-uwp' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                ZERO C++ COMPILE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-mono">
              Uses StartPage="www/index.html" with bundled XBXOwned React UI + WDP/LAPS/Signing tools directly inside OneCore WebView. Works immediately from Linux!
            </p>
          </button>

          <div
            onClick={() => setUwpMode('native-cpp')}
            className={`cursor-pointer text-left p-3.5 rounded-xl border transition-all ${
              uwpMode === 'native-cpp'
                ? 'bg-blue-950/35 border-blue-500/60 shadow-[0_0_16px_rgba(37,99,235,0.12)]'
                : 'bg-[#101520] border-[#1f293b] hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">Native C++/WinRT Host (Main.cpp)</span>
              <span className={`px-2 py-0.5 text-[10px] font-mono rounded ${uwpMode === 'native-cpp' ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-800 text-slate-400'}`}>
                /APPCONTAINER
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-mono">
              Compiles via clang-cl + ~/xwin or Windows SDK (windowsapp.lib). Optional pre-built XBXOwned.exe attach supported:
            </p>
            <div className="mt-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <label className="px-2.5 py-1 text-[11px] font-mono rounded bg-[#161e2e] border border-[#2a3954] text-blue-300 hover:text-white cursor-pointer">
                {compiledExeName ? `Attached: ${compiledExeName}` : 'Attach XBXOwned.exe (optional)'}
                <input type="file" accept=".exe" onChange={handleExeAttach} className="hidden" />
              </label>
              {compiledExeName && (
                <button
                  type="button"
                  onClick={() => {
                    setCompiledExeBase64('');
                    setCompiledExeName('');
                  }}
                  className="text-[11px] font-mono text-rose-400 hover:text-rose-300"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Xbox OneCore UWP Capabilities & Toggleable TRUE/FALSE Flags */}
        <div className="p-4 bg-[#0a0e15] border border-[#1d2638] rounded-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold text-white">
                AppxManifest Capabilities &amp; Flag Toggles ({selectedCapabilities.length}/{XDK_CAPABILITY_OPTIONS.length} TRUE)
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedCapabilities(DEFAULT_XDK_CAPABILITIES);
                  setManifestFlags(DEFAULT_XDK_MANIFEST_FLAGS);
                }}
                className="px-2.5 py-1 text-[11px] font-mono rounded bg-[#141c29] border border-[#24324a] text-emerald-300 hover:border-emerald-500 cursor-pointer"
              >
                Xbox-Safe Defaults
              </button>
              <button
                type="button"
                onClick={() => setSelectedCapabilities(XDK_CAPABILITY_OPTIONS.map((c) => c.id))}
                className="px-2.5 py-1 text-[11px] font-mono rounded bg-[#141c29] border border-[#24324a] text-blue-300 hover:border-blue-500 cursor-pointer"
              >
                All TRUE
              </button>
              <button
                type="button"
                onClick={() => setSelectedCapabilities(['internetClient', 'privateNetworkClientServer'])}
                className="px-2.5 py-1 text-[11px] font-mono rounded bg-[#141c29] border border-[#24324a] text-slate-300 hover:border-slate-500 cursor-pointer"
              >
                Minimal (2 TRUE)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {XDK_CAPABILITY_OPTIONS.map((cap) => {
              const enabled = selectedCapabilities.includes(cap.id);
              const blockedByFilter = manifestFlags.stripRestrictedOnXbox && cap.scope === 'Restricted';
              return (
                <div
                  key={cap.id}
                  onClick={() => toggleCapability(cap.id)}
                  role="switch"
                  aria-checked={enabled}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleCapability(cap.id);
                    }
                  }}
                  className={`flex items-start justify-between gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all select-none ${
                    enabled
                      ? blockedByFilter
                        ? 'bg-amber-950/25 border-amber-500/50 text-slate-100'
                        : 'bg-[#111927] border-emerald-500/50 text-slate-100'
                      : 'bg-[#0b0f17] border-[#1a2232] text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-mono font-bold truncate">{cap.label}</span>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                          cap.scope === 'Restricted'
                            ? 'bg-amber-500/20 text-amber-300'
                            : cap.scope === 'UAP'
                            ? 'bg-blue-500/20 text-blue-300'
                            : cap.scope === 'Device'
                            ? 'bg-purple-500/20 text-purple-300'
                            : 'bg-emerald-500/20 text-emerald-300'
                        }`}
                      >
                        {cap.scope}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-snug mt-0.5">{cap.description}</p>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCapability(cap.id);
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border shrink-0 transition-colors ${
                      enabled
                        ? 'bg-emerald-600/25 border-emerald-500/60 text-emerald-300'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {enabled ? 'TRUE' : 'FALSE'}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Manifest Capability & Deployment Flags (all toggleable true / false) */}
          <div className="pt-3 border-t border-[#182235] space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-mono font-bold text-slate-300">
                Manifest &amp; Capability Flags (Click any flag to toggle TRUE / FALSE)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setManifestFlags({
                      stripRestrictedOnXbox: true,
                      includeXboxDeviceFamily: true,
                      includeUniversalDeviceFamily: true,
                      windowsRuntimeAccessAll: true,
                      enableEdgeHtmlPolyfills: true,
                      autoEnableCrashDumps: true,
                      showNameOnTiles: true,
                    })
                  }
                  className="px-2 py-0.5 text-[10px] font-mono rounded bg-[#141c29] border border-[#24324a] text-emerald-300 hover:border-emerald-500 cursor-pointer"
                >
                  Flags: All TRUE
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setManifestFlags({
                      stripRestrictedOnXbox: false,
                      includeXboxDeviceFamily: true,
                      includeUniversalDeviceFamily: false,
                      windowsRuntimeAccessAll: false,
                      enableEdgeHtmlPolyfills: false,
                      autoEnableCrashDumps: false,
                      showNameOnTiles: false,
                    })
                  }
                  className="px-2 py-0.5 text-[10px] font-mono rounded bg-[#141c29] border border-[#24324a] text-slate-300 hover:border-slate-500 cursor-pointer"
                >
                  Flags: Minimal
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {XDK_MANIFEST_FLAG_OPTIONS.map((flag) => {
                const val = Boolean(manifestFlags[flag.key]);
                return (
                  <div
                    key={flag.key}
                    onClick={() => toggleManifestFlag(flag.key)}
                    role="switch"
                    aria-checked={val}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleManifestFlag(flag.key);
                      }
                    }}
                    className={`flex items-start justify-between gap-2 p-2.5 rounded-lg border cursor-pointer transition-all select-none ${
                      val
                        ? 'bg-[#101826] border-blue-500/45 text-slate-100'
                        : 'bg-[#0b0f17] border-[#1a2232] text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-mono font-bold truncate">{flag.label}</div>
                      <p className="text-[10px] text-slate-400 leading-snug mt-0.5">{flag.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleManifestFlag(flag.key);
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border shrink-0 transition-colors ${
                        val
                          ? 'bg-blue-600/25 border-blue-500/60 text-blue-300'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {val ? 'TRUE' : 'FALSE'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Status / Test / Direct Deploy Logs */}
        {testResult && (
          <div
            className={`px-3.5 py-2.5 rounded-lg border text-xs font-mono space-y-2 ${
              testResult.ok
                ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/50 border-rose-500/40 text-rose-200'
            }`}
          >
            <div>{testResult.message}</div>
            {testResult.runningInCloud && (
              <div className="p-2.5 bg-[#090d14] border border-amber-500/40 rounded text-[11px] text-amber-200 flex items-center justify-between gap-2">
                <span className="truncate font-mono">
                  <Terminal className="w-3.5 h-3.5 inline mr-1.5 text-amber-400" />
                  Run locally on Kali: {latestLocalRunCmd}
                </span>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(latestLocalRunCmd)}
                  className="px-2 py-1 bg-amber-600/20 border border-amber-500/40 rounded text-amber-200 hover:bg-amber-600/40 shrink-0"
                >
                  Copy
                </button>
              </div>
            )}
          </div>
        )}

        {deploySteps.length > 0 && (
          <div className="p-3.5 bg-[#090d14] border border-[#1d273b] rounded-lg space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className={deploySummary?.ok ? 'text-emerald-400' : 'text-amber-300'}>
                {deploySummary?.ok
                  ? '1-Click XDK Deployment Complete'
                  : '1-Click XDK Deployment Report'}
              </span>
              {deploySummary?.looseAppConsolePath && (
                <span className="font-mono text-[11px] text-slate-400">
                  LooseApp: {deploySummary.looseAppConsolePath}
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              {deploySteps.map((step, i) => (
                <div key={i} className="flex items-start gap-2 text-xs font-mono">
                  {step.status === 'ok' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : step.status === 'warn' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold text-slate-200">{step.name}: </span>
                    <span className="text-slate-400">{step.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {dumpReport && (
          <div className="p-3.5 bg-[#090d14] border border-rose-500/40 rounded-lg space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="font-bold text-rose-300">
                WDP Console Crash &amp; Process Report ({config.ip}:{config.port})
              </span>
              <button
                type="button"
                onClick={() => setDumpReport(null)}
                className="text-slate-400 hover:text-white"
              >
                Dismiss
              </button>
            </div>
            {!dumpReport.ok ? (
              <div className="text-rose-200">{dumpReport.error}</div>
            ) : (
              <div className="space-y-1 text-slate-300">
                <div>
                  OS: <span className="text-blue-300">{dumpReport.osInfo?.OsEdition || dumpReport.osInfo?.ComputerName || 'Xbox'}</span> · Build{' '}
                  <span className="text-emerald-300">{dumpReport.osInfo?.OsVersion || 'Unknown'}</span> · Total Processes:{' '}
                  <span>{dumpReport.allProcessCount}</span>
                </div>
                <div>
                  Installed XBXOwned Packages:{' '}
                  <span className="text-amber-300">
                    {dumpReport.installedMatches?.length
                      ? dumpReport.installedMatches.map((p: any) => p.PackageFullName).join(', ')
                      : 'None'}
                  </span>
                </div>
                <div>
                  Running Host Processes (WWAHost / XBXOwned):{' '}
                  <span className="text-emerald-300">
                    {dumpReport.matchingProcesses?.length
                      ? dumpReport.matchingProcesses.map((p: any) => `${p.ImageName} (PID ${p.ProcessId})`).join(', ')
                      : 'Not running'}
                  </span>
                </div>
                <div>
                  UserMode Dumps ({dumpReport.usermodeDumps?.length || 0}) / Dumps Folder ({dumpReport.dumpKnownFiles?.length || 0}):{' '}
                  <span className="text-rose-200">
                    {[
                      ...(dumpReport.usermodeDumps || []).map((d: any) => d.FileName || JSON.stringify(d)),
                      ...(dumpReport.dumpKnownFiles || []).map((f: any) => f.Name || f.Id),
                    ]
                      .slice(0, 8)
                      .join(', ') || 'No dumps recorded'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {exportStatus && (
          <div
            className={`px-3.5 py-2 rounded-lg border text-xs font-mono ${
              exportStatus.startsWith('Error')
                ? 'bg-rose-950/50 border-rose-500/40 text-rose-200'
                : 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
            }`}
          >
            {exportStatus}
          </div>
        )}
      </div>

      {/* Code Viewer Panel */}
      <div className="border border-[#1e273a] bg-[#07090e] rounded-xl overflow-hidden shadow-2xl flex flex-col">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b border-[#161d2a] bg-[#0b0e14]">
          <div className="flex items-center gap-1 overflow-x-auto py-0.5">
            {[
              { id: 'xdk-manifest', label: '1. AppxManifest.xml' },
              { id: 'xdk-smb', label: '2. Linux SMB Deploy (.sh)' },
              { id: 'xdk-ps1', label: '3. Windows SDK Build (.ps1)' },
              { id: 'xdk-cpp', label: '4. OneCore Host (Main.cpp)' },
              { id: 'python', label: '5. Python GUI' },
              { id: 'pyinstaller', label: '6. PyInstaller' },
              { id: 'desktop', label: '7. .desktop' },
              { id: 'debian', label: '8. .deb' },
              { id: 'appimage', label: '9. AppImage' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as BuildSubTab)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-colors ${
                  activeSubTab === tab.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#141a25]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md border transition-all ${
                copied
                  ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300'
                  : 'bg-[#141b27] border-[#253248] text-slate-200 hover:text-white hover:border-blue-500'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-blue-400" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={handleDownloadScript}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-md bg-blue-600 text-white hover:bg-blue-500 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{filename}</span>
            </button>
          </div>
        </div>

        <div className="p-4 bg-[#080b10] overflow-x-auto max-h-[500px] overflow-y-auto font-mono text-xs text-blue-200 leading-relaxed selection:bg-blue-600/40">
          <pre>{activeCode}</pre>
        </div>
      </div>
    </div>
  );
};
