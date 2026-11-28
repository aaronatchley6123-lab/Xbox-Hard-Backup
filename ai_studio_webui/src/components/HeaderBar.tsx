import React, { useState } from 'react';
import { 
  SlidersHorizontal, 
  Save, 
  Wifi, 
  WifiOff, 
  Check, 
  Cpu, 
  RefreshCw,
  FolderOpen,
  Terminal,
  Copy,
  Fingerprint,
  ShieldAlert,
  MessageSquare,
  Key
} from 'lucide-react';
import { XboxConnectionConfig } from '../types/xbox';
import { SavedProfile } from '../services/storageService';
import { getModeDetail } from '../services/mockXboxData';
import wordmarkLogo from '../assets/images/xbxowned_wordmark_logo_1794385327828.jpg';

interface HeaderBarProps {
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  config: XboxConnectionConfig;
  profiles: SavedProfile[];
  activeProfileId: string;
  onSelectProfile: (profileId: string) => void;
  onSaveCurrentSettings: () => void;
  isSaving: boolean;
  onOpenSettingsModal: () => void;
  onToggleSimulated: () => void;
  onReconnect: () => void;
  isReconnecting: boolean;
  isBusyBoxOpen: boolean;
  onToggleBusyBox: () => void;
  isAssistantOpen?: boolean;
  onToggleAssistant?: () => void;
  onEmergencyResetPassword?: () => void;
}

export const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'apps', label: 'App Manager' },
  { id: 'signing', label: 'Certs & Sign' },
  { id: 'files', label: 'File Explorer' },
  { id: 'debug', label: 'Live Debug' },
  { id: 'peekpoke', label: 'Peek / Poke' },
  { id: 'serial', label: 'CH347 / UART' },
  { id: 'tasks', label: 'Task Manager' },
  { id: 'kali', label: 'Token Map' },
  { id: 'system', label: 'System Tools' },
  { id: 'packaging', label: 'XDK / MSIX' },
];

export const HeaderBar: React.FC<HeaderBarProps> = ({
  activeTab,
  onSelectTab,
  config,
  profiles,
  activeProfileId,
  onSelectProfile,
  onSaveCurrentSettings,
  isSaving,
  onOpenSettingsModal,
  onToggleSimulated,
  onReconnect,
  isReconnecting,
  isBusyBoxOpen,
  onToggleBusyBox,
  isAssistantOpen,
  onToggleAssistant,
  onEmergencyResetPassword,
}) => {
  const isConnected = config.connectionState === 'connected';
  const modeDetail = getModeDetail(config.modeCode);
  const [copiedId, setCopiedId] = useState(false);

  const handleCopyDeviceId = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(config.deviceId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <header className="sticky top-0 z-30 bg-[#090b0e]/95 backdrop-blur-md border-b border-[#1c2331]">
      {/* Upper Status Ribbon with Hardware Mode & Device ID */}
      <div className="flex flex-wrap items-center justify-between px-4 py-1.5 border-b border-[#161c27] text-xs text-slate-400 gap-2">
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Connection Indicator & Machine Name */}
          <div className="flex items-center gap-2">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                isConnected ? 'bg-blue-500 shadow-[0_0_8px_#3b82f6]' : 'bg-rose-500'
              }`}
            />
            <span className="font-mono uppercase font-semibold text-slate-200">
              {isConnected ? config.machineName : 'DISCONNECTED'}
            </span>
          </div>

          <span className="text-slate-600 hidden sm:inline">·</span>

          {/* Hardware Mode Badge (2001, 4001, 6001, 8001, 0001) */}
          <div 
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-bold border transition-all ${modeDetail.badgeBg} ${modeDetail.badgeBorder} ${modeDetail.badgeColor}`}
            title={`Hardware Mode: ${modeDetail.label} (${modeDetail.hex}) - ${modeDetail.description}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80 animate-pulse" />
            <span>[{modeDetail.hex}]</span>
            <span className="tracking-wide">{modeDetail.shortTag}</span>
          </div>

          <span className="text-slate-600 hidden md:inline">·</span>

          {/* Device ID GUID with One-Click Copy */}
          <div 
            onClick={handleCopyDeviceId}
            className="hidden md:flex items-center gap-1.5 font-mono text-[11px] bg-[#11151f] hover:bg-[#161c29] border border-[#1e273a] hover:border-blue-500/50 px-2 py-0.5 rounded text-slate-300 cursor-pointer transition-colors group"
            title="Click to copy Xbox Device ID GUID"
          >
            <Fingerprint className="w-3 h-3 text-blue-400 group-hover:text-blue-300" />
            <span className="text-slate-500">ID:</span>
            <span className="text-slate-300 group-hover:text-white">{config.deviceId.slice(0, 13)}...</span>
            {copiedId ? (
              <Check className="w-3 h-3 text-emerald-400" />
            ) : (
              <Copy className="w-3 h-3 text-slate-500 group-hover:text-slate-300" />
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="hidden lg:flex items-center gap-2 text-slate-400">
            <span>IP: {config.ip}:{config.port}</span>
            <span className="text-slate-600">·</span>
            <span className="text-blue-400/90 font-medium">{config.devkitModel}</span>
          </div>

          <span className="text-slate-600 hidden lg:inline">·</span>

          <button
            onClick={onToggleSimulated}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              config.isSimulated
                ? 'bg-blue-950/70 border border-blue-700/60 text-blue-300 hover:bg-blue-900/80'
                : 'bg-emerald-950/70 border border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/80'
            }`}
            title="Toggle between Simulated DevKit Sandbox and Real Hardware Network Relay"
          >
            {config.isSimulated ? 'Simulator Active' : 'Live Hardware Proxy'}
          </button>
        </div>
      </div>

      {/* Main Bar: Brand + Navigation + Profile Controls */}
      <div className="flex items-center justify-between gap-4 px-4 py-2.5">
        {/* Zone 1: XBXOwned Brand */}
        <div className="flex items-center gap-3 shrink-0">
          <img
            src={wordmarkLogo}
            alt="XBXOwned Logo"
            className="h-8 md:h-9 w-auto rounded border border-blue-500/40 shadow-[0_0_15px_rgba(37,99,235,0.4)] object-cover"
          />
          <div className="hidden sm:block">
            <p className="text-[10px] font-mono tracking-widest text-blue-400 font-bold uppercase leading-none">
              GDK & XDK STUDIO
            </p>
            <p className="text-[11px] text-slate-400 leading-tight">
              Linux DevKit Controller
            </p>
          </div>
        </div>

        {/* Zone 2: Navigation Links (Single-Line, Zero-Pill) */}
        <nav className="hidden lg:flex items-center gap-1 overflow-x-auto py-0.5">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 rounded-md transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.45)]'
                    : 'text-slate-300 hover:text-white hover:bg-[#141923]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Profile Selector, Quick Save & Settings Modal */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Active Profile Dropdown */}
          <div className="relative hidden md:flex items-center">
            <select
              value={activeProfileId}
              onChange={(e) => onSelectProfile(e.target.value)}
              className="bg-[#12161f] border border-[#212938] text-xs text-slate-200 rounded-md pl-2.5 pr-7 py-1.5 font-mono focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Save Settings Button */}
          <button
            onClick={onSaveCurrentSettings}
            disabled={isSaving}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border transition-all ${
              isSaving
                ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300'
                : 'bg-[#141a24] border-blue-600/40 text-blue-300 hover:bg-blue-600 hover:text-white shadow-[0_0_10px_rgba(37,99,235,0.15)]'
            }`}
            title="Save all current ports, IP, credentials, and settings to local storage"
          >
            {isSaving ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Save Settings</span>
              </>
            )}
          </button>

          {/* Reconnect Button */}
          <button
            onClick={onReconnect}
            disabled={isReconnecting}
            className="p-1.5 rounded-md bg-[#12161f] border border-[#212938] text-slate-300 hover:text-white hover:border-blue-500 transition-colors"
            title="Test Connection & Reconnect"
          >
            <RefreshCw className={`w-4 h-4 ${isReconnecting ? 'animate-spin text-blue-400' : ''}`} />
          </button>

          {/* BusyBox Terminal Window Toggle */}
          <button
            onClick={onToggleBusyBox}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border transition-all ${
              isBusyBoxOpen
                ? 'bg-blue-600 text-white border-blue-500 shadow-[0_0_12px_rgba(37,99,235,0.45)]'
                : 'bg-[#12161f] border-[#212938] text-slate-300 hover:text-white hover:border-blue-500'
            }`}
            title="Toggle BusyBox Linux Embedded Terminal Window"
          >
            <Terminal className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">BusyBox</span>
          </button>

          {/* DevKit Assistant Toggle */}
          {onToggleAssistant && (
            <button
              onClick={onToggleAssistant}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border transition-all ${
                isAssistantOpen
                  ? 'bg-blue-600 text-white border-blue-500 shadow-[0_0_12px_rgba(37,99,235,0.45)]'
                  : 'bg-[#12161f] border-[#212938] text-slate-300 hover:text-white hover:border-blue-500'
              }`}
              title="Open DevKit Diagnostics Assistant"
            >
              <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Assistant</span>
            </button>
          )}

          {/* Emergency Password Fix Button */}
          {onEmergencyResetPassword && (
            <button
              onClick={onEmergencyResetPassword}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md bg-amber-600 text-white hover:bg-amber-500 shadow-[0_0_15px_rgba(217,119,6,0.6)] transition-all animate-pulse"
              title="Emergency Reset: Instantly restore default working credentials (UsrMgr5 / XboxDev2026!)"
            >
              <Key className="w-4 h-4" />
              <span>🔑 Fix Password (UsrMgr5)</span>
            </button>
          )}

          {/* Settings Modal Open */}
          <button
            onClick={onOpenSettingsModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-500 shadow-[0_0_14px_rgba(37,99,235,0.4)] transition-all"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Connection Settings</span>
          </button>
        </div>
      </div>

      {/* Mobile Nav strip */}
      <div className="flex lg:hidden overflow-x-auto gap-1 px-3 py-1.5 border-t border-[#161c27] bg-[#0c0f14]">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`px-2.5 py-1 text-xs font-medium whitespace-nowrap shrink-0 rounded transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </header>
  );
};
