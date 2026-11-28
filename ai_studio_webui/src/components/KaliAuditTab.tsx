import React, { useState } from 'react';
import {
  ShieldCheck,
  Terminal,
  Copy,
  Check,
  Cpu,
  Key,
  Lock,
  Layers,
  Network,
  FileCheck,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ListChecks,
  Wifi,
} from 'lucide-react';
import { XboxConnectionConfig } from '../types/xbox';

interface KaliAuditTabProps {
  config: XboxConnectionConfig;
  onOpenKaliTerminal: () => void;
}

interface PortProbeResult {
  port: number;
  service: string;
  state: 'open' | 'closed' | 'timeout';
  latencyMs: number;
}

interface EndpointProbeResult {
  path: string;
  statusCode: number;
  latencyMs: number;
  snippet: string;
}

export const KaliAuditTab: React.FC<KaliAuditTabProps> = ({ config, onOpenKaliTerminal }) => {
  const [activeSubTool, setActiveSubTool] = useState<'tokens' | 'order' | 'probe' | 'scripts'>('tokens');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});

  // Live probe state (never pre-seeded with fake results)
  const [isProbing, setIsProbing] = useState(false);
  const [probeError, setProbeError] = useState<string | null>(null);
  const [portResults, setPortResults] = useState<PortProbeResult[]>([]);
  const [endpointResults, setEndpointResults] = useState<EndpointProbeResult[]>([]);
  const [probedAt, setProbedAt] = useState<string | null>(null);

  const cleanUser = config.username.replace(/^.*[\\/]/, '') || 'DevUser';

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRunLiveProbe = async () => {
    setIsProbing(true);
    setProbeError(null);
    try {
      const res = await fetch('/api/xbox/probe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: config.ip,
          wdpPort: Number(config.port) || 11443,
          smbPort: Number(config.smbPort) || 445,
          ftpPort: Number(config.ftpPort) || 21,
          username: cleanUser,
          password: config.password,
        }),
      });
      const data = await res.json();
      setPortResults(Array.isArray(data.ports) ? data.ports : []);
      setEndpointResults(Array.isArray(data.endpoints) ? data.endpoints : []);
      setProbedAt(data.probedAt || null);
      if (!data.ok && data.error) {
        setProbeError(data.error);
      }
    } catch (err: any) {
      setProbeError(err?.message || 'Probe request failed');
    } finally {
      setIsProbing(false);
    }
  };

  const tokenLayers = [
    {
      layer: 'Layer 0 — Silicon & Efuses',
      icon: Cpu,
      accent: 'border-amber-500/40 bg-amber-950/15',
      badge: 'BootROM / PSP / Pluton',
      tokens: `Efuse Mode ${config.hexCode} (${config.hardwareMode}) · DeviceId ${config.deviceId} · ConsoleId ${config.consoleId} · Hardware TPM`,
      verifier: 'Verified by SoC BootROM & Hardware Security Module at cold boot before OS loads.',
      unlocks: 'Sets DevKit/TestKit policy, test-signing allowance, memory pool size (16 GB vs 13.5 GB), and whether WDP :11443 is exposed.',
    },
    {
      layer: 'Layer 1 — Hypervisor & Partition SIDs',
      icon: Layers,
      accent: 'border-purple-500/40 bg-purple-950/15',
      badge: 'HostOS -> SRA / ERA',
      tokens: 'Partition Isolation · S-1-5-18 (SYSTEM) · S-1-5-32-544 (Administrators) · S-1-5-32-578 (Hyper-V Admins)',
      verifier: 'Enforced by Hyper-V / Xbox Hypervisor across SystemOS (SRA) and GameOS/Title (ERA) partitions.',
      unlocks: 'Separates shared OS daemons & Dev Home from exclusive title GPU/RAM resources.',
    },
    {
      layer: 'Layer 2 — Network Session & CSRF',
      icon: Network,
      accent: 'border-blue-500/40 bg-blue-950/15',
      badge: `WDP :${config.port} / SMB3 :${config.smbPort}`,
      tokens: `HTTP Basic Auth (bare "${cleanUser}") + CSRF-Token Cookie -> X-CSRF-Token Header · WdpServer TLS Cert`,
      verifier: 'Microsoft-HTTPAPI/2.0 (XboxDevicePortal) & SMB3 server on the console.',
      unlocks: 'Every POST/PUT/DELETE on :11443 requires BOTH valid credentials and the matching CSRF-Token cookie/header.',
    },
    {
      layer: 'Layer 3 — Local Accounts & LAPS Escrow',
      icon: Key,
      accent: 'border-emerald-500/40 bg-emerald-950/15',
      badge: 'SAM / LocalTPM LAPS',
      tokens: `Accounts: DevToolsUser, DevUser, Administrator · Workgroup "${config.username}" (SMB) / bare "${cleanUser}" (WDP/SSH) · LAPS Secret`,
      verifier: 'Console local SAM / LAPS agent sealed to TPM or AD/Entra escrow.',
      unlocks: 'Authenticates WDP REST/WSS, SMB3 //ip/DevelopmentFiles (D:\\DevelopmentFiles), and OpenSSH (:22 if enabled).',
    },
    {
      layer: 'Layer 4 — Signing & AppContainer Capabilities',
      icon: FileCheck,
      accent: 'border-cyan-500/40 bg-cyan-950/15',
      badge: 'AppxManifest / AppxSignature.p7x',
      tokens: 'DeveloperRoot .cer + Code-Signing .pfx (Subject == Publisher) + AppContainer Capability SIDs (<Capabilities>)',
      verifier: 'AppX Deployment Service & SecurityBroker at install and launch time.',
      unlocks: 'Grants sandboxed UWP/ERA processes scoped access (internetClient, internetClientServer, privateNetworkClientServer, uap:removableStorage, uap:documentsLibrary, uap:sharedUserCertificates, uap:enterpriseAuthentication, plus optional rescap:* flags when toggled TRUE).',
    },
    {
      layer: 'Layer 5 — Runtime Title & Xbox Live Auth',
      icon: Lock,
      accent: 'border-slate-500/40 bg-slate-900/40',
      badge: `Sandbox ${config.sandboxId}`,
      tokens: `SandboxId "${config.sandboxId}" · XUserAddAsync / MSA / XSTS Token (XUserGetTokenAndSignatureAsync)`,
      verifier: 'XGameRuntime.dll + Xbox Live Auth servers against active SandboxId.',
      unlocks: 'Multiplayer, Title Storage, and Connected Saves for running games (completely separate from local DevKit admin creds).',
    },
  ];

  const orderSteps = [
    {
      step: 1,
      title: 'Verify Hardware Mode, Efuse Policy & Sandbox ID',
      why: 'If the kit boots in Retail (0x2001) without Dev Mode, WDP :11443 and package sideloading remain disabled regardless of credentials.',
      cmd: `# Verify configured target on Dev Home screen: Mode ${config.hexCode}, Sandbox ${config.sandboxId}`,
    },
    {
      step: 2,
      title: 'Provision Local Account / LAPS Password & Enable WDP',
      why: 'Enable Device Portal & SMB in Dev Home, then record or rotate the LAPS password in System Tools -> LAPS so WDP and SMB match.',
      cmd: `# Bare username "${cleanUser}" for WDP/SSH; WORKGROUP\\${cleanUser} for Windows SMB`,
    },
    {
      step: 3,
      title: 'Test WDP Reachability & Capture CSRF-Token Cookie',
      why: 'GET /api/os/info proves TLS + Basic Auth work and issues the CSRF-Token cookie required for any POST/deploy call.',
      cmd: `curl -sk -c /tmp/wdp.cookies -u "${cleanUser}:${config.password}" "https://${config.ip}:${config.port}/api/os/info"`,
    },
    {
      step: 4,
      title: 'Verify SMB3 Share (DevelopmentFiles) Access',
      why: 'SMB3 (:445) works even when SSH (:22) is stopped, giving direct write access to D:\\DevelopmentFiles\\LooseApps.',
      cmd: `smbclient //${config.ip}/DevelopmentFiles -W WORKGROUP -U "${cleanUser}%${config.password}" -m SMB3 -c "ls"`,
    },
    {
      step: 5,
      title: 'Match Signing Certificate Subject to Manifest Publisher',
      why: 'Xbox rejects .msix packages if the .cer Subject DN does not match <Identity Publisher="..."> or is missing from Trusted store.',
      cmd: `openssl x509 -in XBXOwned_Signing.cer -noout -subject -fingerprint -sha256`,
    },
    {
      step: 6,
      title: 'Scope AppContainer Permissions & Build/Deploy',
      why: 'Declare <Capabilities> in strict XSD order (Capability -> uap:Capability -> rescap:Capability), then push signed .msix or LooseApp + X-CSRF-Token.',
      cmd: `CSRF=$(grep -i "CSRF-Token" /tmp/wdp.cookies | awk '{print $NF}') && curl -sk -b /tmp/wdp.cookies -u "${cleanUser}:${config.password}" -H "X-CSRF-Token: $CSRF" "https://${config.ip}:${config.port}/api/app/packagemanager/packages"`,
    },
    {
      step: 7,
      title: 'Validate Runtime Title / Sandbox Auth After Launch',
      why: 'Once the title boots inside its AppContainer, verify XGameRuntime acquires the MSA/XSTS token for Sandbox ' + config.sandboxId + '.',
      cmd: `# Monitor live launch / XUser tokens via WDP WebSocket /ext/app/rundebug`,
    },
  ];

  const cliReference = `# ==============================================================================
# Real Linux CLI Reference for Xbox DevKit (${config.machineName} @ ${config.ip})
# ==============================================================================

# 1. Port & TLS Certificate Check
nmap -sT -p ${config.port},${config.smbPort},${config.ftpPort},22,80,38920 ${config.ip}
openssl s_client -connect ${config.ip}:${config.port} -showcerts </dev/null 2>/dev/null | openssl x509 -noout -subject -dates

# 2. Authenticate to WDP & Grab CSRF-Token Cookie (Use bare username "${cleanUser}")
curl -sk -c /tmp/wdp_cookies.txt -u "${cleanUser}:${config.password}" "https://${config.ip}:${config.port}/api/os/info"
CSRF=$(grep -i "CSRF-Token" /tmp/wdp_cookies.txt | awk '{print $NF}')

# 3. Query Installed Packages / Running Processes using CSRF Header
curl -sk -b /tmp/wdp_cookies.txt -u "${cleanUser}:${config.password}" -H "X-CSRF-Token: $CSRF" "https://${config.ip}:${config.port}/api/app/packagemanager/packages"
curl -sk -b /tmp/wdp_cookies.txt -u "${cleanUser}:${config.password}" -H "X-CSRF-Token: $CSRF" "https://${config.ip}:${config.port}/api/resourcemanager/processes"

# 4. Connect to SMB3 DevelopmentFiles Share
smbclient //${config.ip}/DevelopmentFiles -W WORKGROUP -U "${cleanUser}%${config.password}" -m SMB3

# 5. Live Packet Capture on Workstation NIC (Run as root/sudo)
sudo tshark -i eth0 -f "host ${config.ip}" -w xbox_capture.pcap
`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-blue-500/40 bg-gradient-to-r from-[#0c0f17] via-[#0f1422] to-[#0a0d14] p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-blue-400 font-bold tracking-widest uppercase">
                HARDWARE-TO-APP TRUST ARCHITECTURE
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-300">Target: {config.ip}:{config.port}</span>
              <span className="text-slate-600">·</span>
              <span className="text-emerald-400 font-semibold">{config.hexCode}</span>
            </div>

            <h2 className="text-2xl font-black text-white tracking-tight font-sans">
              Token Map, Order of Operations &amp; Live WDP Probe
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              End-to-end map of every hardware fuse, partition SID, WDP/CSRF session token, LAPS credential, signing chain, and AppContainer capability—plus real backend TCP/WDP probing.
            </p>
          </div>

          <button
            onClick={onOpenKaliTerminal}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all"
          >
            <Terminal className="w-4 h-4" />
            <span>Open Studio Terminal</span>
          </button>
        </div>

        {/* Sub-tab Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pt-5 border-t border-[#1a2333] mt-5">
          {[
            { id: 'tokens', label: '1. Complete Token Map' },
            { id: 'order', label: '2. Order of Operations' },
            { id: 'probe', label: '3. Live TCP & WDP Probe' },
            { id: 'scripts', label: '4. Real Linux CLI Commands' },
          ].map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActiveSubTool(tool.id as any)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-colors ${
                activeSubTool === tool.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-[#141a24]'
              }`}
            >
              {tool.label}
            </button>
          ))}
        </div>
      </div>

      {/* 1. TOKEN MAP */}
      {activeSubTool === 'tokens' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tokenLayers.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.layer} className={`p-5 rounded-xl border ${item.accent} space-y-2.5`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-blue-300 shrink-0" />
                    <h3 className="text-sm font-bold text-white">{item.layer}</h3>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-black/40 border border-slate-700 text-slate-200">
                    {item.badge}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-[#080b10] border border-[#1d2638] font-mono text-[11px] text-blue-200">
                  {item.tokens}
                </div>

                <div className="text-xs text-slate-300 space-y-1">
                  <p>
                    <span className="text-slate-400 font-semibold">Verifier: </span>
                    {item.verifier}
                  </p>
                  <p>
                    <span className="text-slate-400 font-semibold">Unlocks: </span>
                    {item.unlocks}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 2. ORDER OF OPERATIONS */}
      {activeSubTool === 'order' && (
        <div className="p-5 bg-[#0d1117] border border-[#1b2332] rounded-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#1b2332]">
            <div className="flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">
                Bench Bring-Up &amp; Deployment Order of Operations ({Object.values(completedSteps).filter(Boolean).length}/{orderSteps.length} verified)
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setCompletedSteps({})}
              className="text-xs font-mono text-slate-400 hover:text-white"
            >
              Reset Checklist
            </button>
          </div>

          <div className="space-y-3">
            {orderSteps.map((s) => {
              const checked = Boolean(completedSteps[s.step]);
              const cid = `step-${s.step}`;
              return (
                <div
                  key={s.step}
                  className={`p-4 rounded-xl border transition-colors ${
                    checked ? 'bg-emerald-950/20 border-emerald-500/40' : 'bg-[#090c12] border-[#1c2434]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <label className="flex items-start gap-3 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setCompletedSteps((prev) => ({ ...prev, [s.step]: !prev[s.step] }))
                        }
                        className="mt-1 accent-emerald-500"
                      />
                      <div>
                        <div className="text-xs font-bold text-white">
                          Step {s.step}: {s.title}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{s.why}</p>
                      </div>
                    </label>
                    <button
                      type="button"
                      onClick={() => copyText(s.cmd, cid)}
                      className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono rounded bg-[#141b27] border border-[#253248] text-blue-300 hover:text-white shrink-0"
                    >
                      {copiedId === cid ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedId === cid ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="mt-2.5 p-2.5 rounded bg-[#06080c] border border-[#172030] font-mono text-[11px] text-emerald-300 overflow-x-auto">
                    {s.cmd}
                  </pre>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. REAL LIVE TCP & WDP PROBE */}
      {activeSubTool === 'probe' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-[#0d1117] border border-[#1b2332] rounded-xl text-xs">
            <div className="flex items-center gap-2.5">
              <Wifi className="w-4 h-4 text-blue-400" />
              <div>
                <div className="font-bold text-white">Real Backend TCP &amp; WDP Probe (Zero Mock Data)</div>
                <div className="text-[11px] text-slate-400 font-mono">
                  Target: {config.ip} · WDP :{config.port} · SMB3 :{config.smbPort} · User: {cleanUser}
                  {probedAt ? ` · Last probed: ${new Date(probedAt).toLocaleTimeString()}` : ''}
                </div>
              </div>
            </div>

            <button
              onClick={handleRunLiveProbe}
              disabled={isProbing}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 text-xs font-bold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isProbing ? 'animate-spin' : ''}`} />
              <span>{isProbing ? 'Probing Console...' : `Run Live Probe on ${config.ip}`}</span>
            </button>
          </div>

          {probeError && (
            <div className="p-3.5 rounded-xl border border-amber-500/40 bg-amber-950/30 text-xs font-mono text-amber-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>{probeError}</span>
            </div>
          )}

          {portResults.length === 0 && !probeError && (
            <div className="p-8 text-center rounded-xl border border-[#1c2434] bg-[#0c1017] text-xs font-mono text-slate-400">
              No probe executed yet. Click <strong className="text-white">Run Live Probe</strong> above to test actual TCP sockets and WDP HTTP routes from this server.
            </div>
          )}

          {portResults.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="border border-[#1c2434] bg-[#0c1017] rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-[#10141d] border-b border-[#1b2332] text-xs font-bold text-white">
                  TCP Socket Reachability
                </div>
                <table className="w-full text-left text-xs font-mono">
                  <tbody className="divide-y divide-[#171d29]">
                    {portResults.map((p) => (
                      <tr key={p.port}>
                        <td className="py-2.5 px-4 font-bold text-blue-400">{p.port}</td>
                        <td className="py-2.5 px-3 text-slate-300">{p.service}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                              p.state === 'open'
                                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60'
                                : p.state === 'timeout'
                                ? 'bg-amber-950/80 text-amber-300 border border-amber-700/60'
                                : 'bg-rose-950/80 text-rose-300 border border-rose-700/60'
                            }`}
                          >
                            {p.state === 'open' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {p.state}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right text-slate-400">{p.latencyMs}ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border border-[#1c2434] bg-[#0c1017] rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-[#10141d] border-b border-[#1b2332] text-xs font-bold text-white">
                  WDP HTTPS Routes (https://{config.ip}:{config.port})
                </div>
                <table className="w-full text-left text-xs font-mono">
                  <tbody className="divide-y divide-[#171d29]">
                    {endpointResults.map((ep) => (
                      <tr key={ep.path}>
                        <td className="py-2.5 px-4 text-slate-200 font-bold">{ep.path}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`font-bold ${
                              ep.statusCode >= 200 && ep.statusCode < 400
                                ? 'text-emerald-400'
                                : ep.statusCode === 0
                                ? 'text-rose-400'
                                : 'text-amber-300'
                            }`}
                          >
                            {ep.statusCode === 0 ? 'ERR' : `HTTP ${ep.statusCode}`}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-400 truncate max-w-[220px]" title={ep.snippet}>
                          {ep.snippet}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. REAL LINUX CLI COMMANDS */}
      {activeSubTool === 'scripts' && (
        <div className="p-6 bg-[#0d1117] border border-[#1b2332] rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Copy-Pasteable Linux Workstation Commands</span>
            </h3>

            <button
              onClick={() => copyText(cliReference, 'cli-script')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500"
            >
              {copiedId === 'cli-script' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedId === 'cli-script' ? 'Copied!' : 'Copy Commands'}</span>
            </button>
          </div>

          <div className="p-4 bg-[#080b0f] rounded-lg border border-[#1c2434] overflow-x-auto font-mono text-xs text-blue-200">
            <pre>{cliReference}</pre>
          </div>
        </div>
      )}
    </div>
  );
};
