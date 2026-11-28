import React, { useState, useRef } from 'react';
import {
  Monitor,
  Keyboard,
  Shield,
  Cpu,
  Download,
  FolderOpen,
  Check,
  Copy,
} from 'lucide-react';
import { Win11SystemConfig } from '../../types/win11';
import { HF_LOCAL_MODELS } from '../../services/win11State';

interface SettingsAppProps {
  config: Win11SystemConfig;
  onUpdateConfig: (patch: Partial<Win11SystemConfig>) => void;
  onRegisterModelInVfs: (filename: string, sizeBytes: number) => void;
}

export const SettingsApp: React.FC<SettingsAppProps> = ({
  config,
  onUpdateConfig,
  onRegisterModelInVfs,
}) => {
  const [section, setSection] = useState<'display' | 'input' | 'ai' | 'network'>('ai');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectHfPreset = (presetId: string) => {
    const found = HF_LOCAL_MODELS.find((m) => m.id === presetId);
    if (!found) return;
    onUpdateConfig({
      selectedHfPresetId: presetId,
      customHfRepo: found.repo,
      customHfFilename: found.filename,
    });
  };

  const handleLocalGgufSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    onUpdateConfig({
      loadedLocalModelFile: { name: file.name, sizeMb },
      customHfFilename: file.name,
      activeAiEngine: 'hermes-gguf-local',
    });
    onRegisterModelInVfs(file.name, file.size);
  };

  const copyCmd = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const hfDownloadUrl = `https://huggingface.co/${config.customHfRepo.trim()}/resolve/main/${config.customHfFilename.trim()}`;
  const smbPushModelCmd = `wget -c "${hfDownloadUrl}" -O "${config.customHfFilename.trim()}" && smbclient //${config.consoleIp}/${config.smbShareName} -U "${config.smbUser}%${config.smbPassword}" -m SMB3 -c 'mkdir Models; cd Models; put "${config.customHfFilename.trim()}"; ls'`;

  return (
    <div className="flex h-full bg-[#181a20] text-slate-100 select-none">
      {/* Left Navigation Sidebar */}
      <aside className="w-60 bg-[#14161b] border-r border-white/10 p-3 space-y-1 shrink-0">
        <div className="px-2.5 py-2 mb-2 border-b border-white/10">
          <div className="text-xs font-bold text-white">Xbox Series X — Windows 11</div>
          <div className="text-[11px] text-slate-400 font-mono">{config.consoleIp} (SMB :445)</div>
        </div>

        <button
          type="button"
          onClick={() => setSection('ai')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors text-left ${
            section === 'ai'
              ? 'bg-sky-600/25 text-sky-300 border border-sky-500/30'
              : 'text-slate-300 hover:bg-white/5'
          }`}
        >
          <Cpu className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Hermes Local AI & Hugging Face</span>
        </button>

        <button
          type="button"
          onClick={() => setSection('display')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors text-left ${
            section === 'display'
              ? 'bg-sky-600/25 text-sky-300 border border-sky-500/30'
              : 'text-slate-300 hover:bg-white/5'
          }`}
        >
          <Monitor className="w-4 h-4 text-sky-400 shrink-0" />
          <span>TV Display & Desktop Theme</span>
        </button>

        <button
          type="button"
          onClick={() => setSection('input')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors text-left ${
            section === 'input'
              ? 'bg-sky-600/25 text-sky-300 border border-sky-500/30'
              : 'text-slate-300 hover:bg-white/5'
          }`}
        >
          <Keyboard className="w-4 h-4 text-amber-400 shrink-0" />
          <span>USB Keyboard, Mouse & Controller</span>
        </button>

        <button
          type="button"
          onClick={() => setSection('network')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors text-left ${
            section === 'network'
              ? 'bg-sky-600/25 text-sky-300 border border-sky-500/30'
              : 'text-slate-300 hover:bg-white/5'
          }`}
        >
          <Shield className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>SMB3 Share & LAN Security</span>
        </button>
      </aside>

      {/* Right Content Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {section === 'ai' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-white">
                Hermes AI Copilot — Local Mobile & Hugging Face (.GGUF) Engine
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Runs 100% offline on-device without requiring internet. Select either the Mobile Local Model (Gemini Nano / Gemma-3-1B) or load any Hugging Face GGUF into D:\DevelopmentFiles\Models.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-[#20232b] border border-white/10 space-y-3">
              <label className="block text-xs font-medium text-slate-200">
                Active Inference Backend
              </label>
              <select
                value={config.activeAiEngine}
                onChange={(e) =>
                  onUpdateConfig({ activeAiEngine: e.target.value as Win11SystemConfig['activeAiEngine'] })
                }
                className="w-full bg-[#13151a] border border-white/15 rounded px-3 py-2 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-400"
              >
                <option value="hermes-gguf-local">
                  Hugging Face Local GGUF (D:\DevelopmentFiles\Models\{config.customHfFilename})
                </option>
                <option value="gemini-nano-local">
                  Gemini Nano / Gemma-3-1B (Mobile On-Device Local Model — Zero Internet)
                </option>
                <option value="ollama-local">
                  Local llama-server / Ollama Endpoint ({config.localLlamaEndpoint})
                </option>
                <option value="cloud-fallback">Cloud Fallback (Only when online)</option>
              </select>

              <div className="pt-2 border-t border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-200">
                    Hugging Face Model Preset (100% Offline Weights)
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".gguf,.bin,.onnx,.safetensors"
                    onChange={handleLocalGgufSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1 rounded bg-amber-600/25 hover:bg-amber-600/40 border border-amber-500/40 text-amber-200 text-xs font-medium flex items-center gap-1.5"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Load Local .GGUF File from Disk</span>
                  </button>
                </div>

                <select
                  value={config.selectedHfPresetId}
                  onChange={(e) => handleSelectHfPreset(e.target.value)}
                  className="w-full bg-[#13151a] border border-white/15 rounded px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-500"
                >
                  {HF_LOCAL_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} [{m.size} · {m.quant}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Hugging Face Repository ID
                  </label>
                  <input
                    type="text"
                    value={config.customHfRepo}
                    onChange={(e) => onUpdateConfig({ customHfRepo: e.target.value })}
                    className="w-full bg-[#13151a] border border-white/15 rounded px-2.5 py-1.5 text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    GGUF Model Filename
                  </label>
                  <input
                    type="text"
                    value={config.customHfFilename}
                    onChange={(e) => onUpdateConfig({ customHfFilename: e.target.value })}
                    className="w-full bg-[#13151a] border border-white/15 rounded px-2.5 py-1.5 text-xs font-mono text-white"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <a
                  href={hfDownloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .GGUF from Hugging Face</span>
                </a>

                <button
                  type="button"
                  onClick={() => copyCmd(smbPushModelCmd, 'smbmodel')}
                  className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/15 text-xs font-mono text-slate-200 flex items-center gap-1.5"
                >
                  {copiedKey === 'smbmodel' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>Copy Command to Push Model to Xbox SMB (:445)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {section === 'display' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-white">
                Xbox Series X HDMI 2.1 TV Display & Desktop Personalization
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure TV output resolution, desktop scaling, and Windows 11 Mica background surface.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-[#20232b] border border-white/10 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-200 mb-1">
                  HDMI 2.1 TV Resolution & Refresh Rate
                </label>
                <select
                  value={config.resolution}
                  onChange={(e) =>
                    onUpdateConfig({ resolution: e.target.value as Win11SystemConfig['resolution'] })
                  }
                  className="w-full bg-[#13151a] border border-white/15 rounded px-3 py-2 text-xs text-white"
                >
                  <option value="3840x2160 (4K UHD @ 120Hz)">3840x2160 (4K UHD @ 120Hz)</option>
                  <option value="2560x1440 (1440p @ 120Hz)">2560x1440 (1440p @ 120Hz)</option>
                  <option value="1920x1080 (1080p @ 60Hz)">1920x1080 (1080p @ 60Hz)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-200 mb-2">
                  Desktop Background Theme
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { id: 'bloom-dark', label: 'Windows 11 Dark Bloom (Default)' },
                    { id: 'slate-mica', label: 'Slate Mica Engineering' },
                    { id: 'emerald-aurora', label: 'Xbox Series X Emerald Horizon' },
                    { id: 'carbon-studio', label: 'Carbon Minimal Studio' },
                  ].map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() =>
                        onUpdateConfig({
                          wallpaperId: theme.id as Win11SystemConfig['wallpaperId'],
                        })
                      }
                      className={`p-3 rounded border text-left text-xs font-medium transition-colors ${
                        config.wallpaperId === theme.id
                          ? 'bg-sky-600/25 border-sky-500 text-white'
                          : 'bg-[#14171d] border-white/10 text-slate-300 hover:bg-white/5'
                      }`}
                    >
                      {theme.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {section === 'input' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-white">
                USB Keyboard, Mouse & Xbox Wireless Controller Input Stack
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Hardware USB HID passthrough on the Xbox Series X front and rear USB 3.1 Gen 1 ports.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-[#20232b] border border-white/10 space-y-3 text-xs">
              <div className="flex items-center justify-between py-2 border-b border-white/10">
                <div>
                  <div className="font-semibold text-white">{config.usbKeyboardName}</div>
                  <div className="text-slate-400">Windows key shortcuts, Alt+Tab, Ctrl+C/V active</div>
                </div>
                <span className="font-mono text-emerald-400">Connected</span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-white/10">
                <div>
                  <div className="font-semibold text-white">{config.usbMouseName}</div>
                  <div className="text-slate-400">Hardware cursor & right-click desktop menus</div>
                </div>
                <span className="font-mono text-emerald-400">{config.mouseDpi} DPI</span>
              </div>

              <div className="pt-2">
                <label className="block text-slate-300 mb-1">
                  Mouse Pointer Speed / DPI ({config.mouseDpi} DPI)
                </label>
                <input
                  type="range"
                  min={400}
                  max={3200}
                  step={200}
                  value={config.mouseDpi}
                  onChange={(e) => onUpdateConfig({ mouseDpi: Number(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        )}

        {section === 'network' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-white">
                Xbox SMB3 Share (:445) & LAN Lockdown Security
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure your Xbox IP and SMB credentials used to deploy/restore files over port 445 while blocking unauthorized WAN IPs.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-[#20232b] border border-white/10 space-y-3 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Xbox Console IP</label>
                  <input
                    type="text"
                    value={config.consoleIp}
                    onChange={(e) => onUpdateConfig({ consoleIp: e.target.value })}
                    className="w-full bg-[#13151a] border border-white/15 rounded px-2.5 py-1.5 font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">SMB Username</label>
                  <input
                    type="text"
                    value={config.smbUser}
                    onChange={(e) => onUpdateConfig({ smbUser: e.target.value })}
                    className="w-full bg-[#13151a] border border-white/15 rounded px-2.5 py-1.5 font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">SMB Password</label>
                  <input
                    type="password"
                    value={config.smbPassword}
                    onChange={(e) => onUpdateConfig({ smbPassword: e.target.value })}
                    className="w-full bg-[#13151a] border border-white/15 rounded px-2.5 py-1.5 font-mono text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-white/10">
                <div>
                  <div className="font-semibold text-white">
                    LAN-Only Firewall Lockdown (Block External WAN Access to :445 / :11443)
                  </div>
                  <div className="text-slate-400">
                    Prevents remote external IPs from deleting files on D:\DevelopmentFiles
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onUpdateConfig({ lanOnlyLockdown: !config.lanOnlyLockdown })}
                  className={`px-3 py-1.5 rounded text-xs font-semibold ${
                    config.lanOnlyLockdown
                      ? 'bg-emerald-600 text-white'
                      : 'bg-rose-600/30 text-rose-200 border border-rose-500/40'
                  }`}
                >
                  {config.lanOnlyLockdown ? 'Protected (LAN Only)' : 'Unprotected'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
