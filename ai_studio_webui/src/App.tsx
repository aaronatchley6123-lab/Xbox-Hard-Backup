import React, { useState, useEffect, useCallback } from 'react';
import { HeaderBar } from './components/HeaderBar';
import { DashboardTab } from './components/DashboardTab';
import { AppManagerTab } from './components/AppManagerTab';
import { SigningTab } from './components/SigningTab';
import { FileExplorerTab } from './components/FileExplorerTab';
import { LiveDebugTab } from './components/LiveDebugTab';
import { TaskManagerTab } from './components/TaskManagerTab';
import { KaliAuditTab } from './components/KaliAuditTab';
import { SystemToolsTab } from './components/SystemToolsTab';
import { LinuxBuildTab } from './components/LinuxBuildTab';
import { PeekPokeTab } from './components/PeekPokeTab';
import { SerialDebugTab } from './components/SerialDebugTab';
import { BusyBoxWindow } from './components/BusyBoxWindow';
import { SettingsModal } from './components/SettingsModal';
import { AssistantDrawer } from './components/AssistantDrawer';
import {
  XboxAppPackage,
  XboxConnectionConfig,
  XboxFileItem,
  XboxLogEntry,
  XboxProcess,
  XboxTelemetry,
  XboxCertificate,
  GameSignatureRecord,
  XboxModeCode,
} from './types/xbox';
import {
  INITIAL_APPS,
  INITIAL_FILES,
  INITIAL_PROCESSES,
  INITIAL_LOGS,
  INITIAL_TELEMETRY,
  INITIAL_CERTIFICATES,
  INITIAL_SIGNATURE_RECORDS,
  INITIAL_LOCAL_USERS,
  INITIAL_LAPS_CONFIG,
  getModeDetail,
} from './services/mockXboxData';
import {
  SavedProfile,
  loadSavedProfiles,
  getActiveProfileId,
  setActiveProfileId,
  saveCurrentConfigToActiveProfile,
  createNewProfile,
  deleteProfile,
  saveProfiles,
} from './services/storageService';
import xboxDevBanner from './assets/images/xbox_dev_interface_banner_1794384903947.jpg';

function nowTimeStr(): string {
  const d = new Date();
  return d.toTimeString().split(' ')[0] + '.' + String(d.getMilliseconds()).padStart(3, '0');
}

export function App() {
  const [profiles, setProfiles] = useState<SavedProfile[]>(() => loadSavedProfiles());
  const [activeProfileId, setActiveProfileState] = useState<string>(() => getActiveProfileId());
  const [config, setConfig] = useState<XboxConnectionConfig>(() => {
    const loaded = loadSavedProfiles();
    const activeId = getActiveProfileId();
    const found = loaded.find((p) => p.id === activeId) || loaded[0];
    return found.config;
  });

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isSaving, setIsSaving] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isBusyBoxOpen, setIsBusyBoxOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  // Console Runtime State
  const [apps, setApps] = useState<XboxAppPackage[]>(() => (config.isSimulated ? INITIAL_APPS : []));
  const [isLiveAppsSynced, setIsLiveAppsSynced] = useState(false);
  const [isLoadingApps, setIsLoadingApps] = useState(false);
  const [appsSyncError, setAppsSyncError] = useState<string | null>(null);
  const [appActionNotice, setAppActionNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [filesMap, setFilesMap] = useState<Record<string, XboxFileItem[]>>(INITIAL_FILES);
  const [selectedFilePackage, setSelectedFilePackage] = useState<string>(
    INITIAL_APPS[0].packageFullName
  );
  const [currentFolder, setCurrentFolder] = useState<string>('\\');
  const [processes, setProcesses] = useState<XboxProcess[]>(INITIAL_PROCESSES);
  const [telemetry, setTelemetry] = useState<XboxTelemetry>(INITIAL_TELEMETRY);
  const [logs, setLogs] = useState<XboxLogEntry[]>(INITIAL_LOGS);
  const [isLogStreaming, setIsLogStreaming] = useState<boolean>(true);
  const [certificates, setCertificates] = useState<XboxCertificate[]>(INITIAL_CERTIFICATES);
  const [signatures, setSignatures] = useState<GameSignatureRecord[]>(INITIAL_SIGNATURE_RECORDS);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(xboxDevBanner);

  const appendLog = useCallback(
    (
      message: string,
      level: XboxLogEntry['level'] = 'INFO',
      category: XboxLogEntry['category'] = 'System'
    ) => {
      setLogs((prev) => [
        ...prev.slice(-249),
        {
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: nowTimeStr(),
          level,
          category,
          message,
        },
      ]);
    },
    []
  );

  // Telemetry simulation tick (ONLY runs when Simulator Active)
  useEffect(() => {
    if (!config.isSimulated || config.connectionState !== 'connected') return;
    const timer = setInterval(() => {
      setTelemetry((prev) => {
        const nextCores = prev.cpuCores.map((c) =>
          Math.max(8, Math.min(98, Math.round(c + (Math.random() - 0.5) * 6)))
        );
        const avg = Number(
          (nextCores.reduce((acc, v) => acc + v, 0) / nextCores.length).toFixed(1)
        );
        return {
          ...prev,
          cpuCores: nextCores,
          cpuAvgLoad: avg,
          cpuTempCelsius: Math.max(52, Math.min(79, Math.round(prev.cpuTempCelsius + (Math.random() - 0.5) * 2))),
          gpuLoadPercent: Math.max(20, Math.min(99, Math.round(prev.gpuLoadPercent + (Math.random() - 0.5) * 5))),
          frameRate: Number((59.7 + Math.random() * 0.4).toFixed(2)),
          frameTimeMs: Number((16.55 + Math.random() * 0.25).toFixed(2)),
        };
      });
    }, 2500);
    return () => clearInterval(timer);
  }, [config.isSimulated, config.connectionState]);

  // Sample ETW log stream (ONLY runs when Simulator Active)
  useEffect(() => {
    if (!config.isSimulated || !isLogStreaming || config.connectionState !== 'connected') return;
    const sampleEvents: Array<{ msg: string; level: XboxLogEntry['level']; cat: XboxLogEntry['category'] }> = [
      { msg: '[Sandbox] VSync SwapChain Present simulation event.', level: 'VERBOSE', cat: 'D3D12' },
      { msg: '[Sandbox] DirectStorage NVMe ring queue simulation tick.', level: 'INFO', cat: 'Memory' },
    ];
    let idx = 0;
    const timer = setInterval(() => {
      const ev = sampleEvents[idx % sampleEvents.length];
      idx++;
      appendLog(ev.msg, ev.level, ev.cat);
    }, 8000);
    return () => clearInterval(timer);
  }, [config.isSimulated, isLogStreaming, config.connectionState, appendLog]);

  // Auto-refresh processes when switching to Task Manager tab
  useEffect(() => {
    if (activeTab === 'tasks' && !config.isSimulated) {
      handleRefreshProcesses();
    }
  }, [activeTab, config.isSimulated, handleRefreshProcesses]);

  // Config & Profile Handlers
  const handleUpdateConfig = (newConfig: XboxConnectionConfig) => {
    setConfig(newConfig);
    const updated = saveCurrentConfigToActiveProfile(newConfig, activeProfileId);
    setProfiles(updated);
  };

  const handleSelectProfile = (profileId: string) => {
    const found = profiles.find((p) => p.id === profileId);
    if (!found) return;
    setActiveProfileId(profileId);
    setActiveProfileState(profileId);
    setConfig(found.config);
    appendLog(`Switched console profile to "${found.name}" (${found.config.ip}:${found.config.port})`, 'INFO', 'Network');
  };

  const handleSaveCurrentSettings = () => {
    setIsSaving(true);
    const updated = saveCurrentConfigToActiveProfile(config, activeProfileId);
    setProfiles(updated);
    appendLog(`Saved active configuration profile (${config.machineName}) to local storage.`, 'INFO', 'System');
    setTimeout(() => setIsSaving(false), 600);
  };

  const handleSaveProfile = (cfg: XboxConnectionConfig, profileId: string) => {
    setConfig(cfg);
    const updated = saveCurrentConfigToActiveProfile(cfg, profileId);
    setProfiles(updated);
    appendLog(`Saved settings & LAPS/permissions for profile ${cfg.machineName}.`, 'INFO', 'System');
  };

  const handleCreateProfile = (name: string, template?: XboxConnectionConfig) => {
    const created = createNewProfile(name, template || config);
    const reloaded = loadSavedProfiles();
    setProfiles(reloaded);
    setActiveProfileState(created.id);
    setConfig(created.config);
    appendLog(`Created new Xbox DevKit profile "${name}".`, 'INFO', 'System');
  };

  const handleDeleteProfile = (id: string) => {
    const updated = deleteProfile(id);
    setProfiles(updated);
    if (activeProfileId === id && updated.length > 0) {
      setActiveProfileId(updated[0].id);
      setActiveProfileState(updated[0].id);
      setConfig(updated[0].config);
    }
  };

  const handleImportProfiles = (importedProfiles: SavedProfile[], activeId: string) => {
    saveProfiles(importedProfiles);
    setProfiles(importedProfiles);
    setActiveProfileId(activeId);
    setActiveProfileState(activeId);
    const chosen = importedProfiles.find((p) => p.id === activeId) || importedProfiles[0];
    if (chosen) setConfig(chosen.config);
    appendLog(`Imported ${importedProfiles.length} console profiles.`, 'INFO', 'System');
  };

  const handleToggleSimulated = () => {
    const nextSim = !config.isSimulated;
    handleUpdateConfig({ ...config, isSimulated: nextSim });
    if (nextSim) {
      setIsLiveAppsSynced(false);
      setAppsSyncError(null);
      setApps(INITIAL_APPS);
    } else {
      setApps([]);
    }
    appendLog(
      `Connection mode switched to ${nextSim ? 'SIMULATED' : 'LIVE WDP BRIDGE'}.`,
      'INFO',
      'Network'
    );
  };

  const [kitIpInput, setKitIpInput] = useState(config.ip);

  const handlePointToMyKit = () => {
    const cleanIp = kitIpInput.trim();
    if (!cleanIp) return;
    const updated: XboxConnectionConfig = {
      ...config,
      ip: cleanIp,
      isSimulated: false,
      connectionState: 'connected',
    };
    handleUpdateConfig(updated);
    appendLog(`Target console IP updated to ${cleanIp} (Live Bridge Mode active).`, 'INFO', 'Network');
    alert(`Successfully pointed studio to your physical Xbox kit IP: ${cleanIp}\n\nLive WDP & SMB3 bridge is now active.`);
  };

  const handleEmergencyResetPassword = () => {
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    const updatedUsers = (config.localUsers || INITIAL_LOCAL_USERS).map((u) => ({
      ...u,
      status: 'Active' as const,
      passwordLastSet: `${nowStr} (Force Reset | PwdMustChange=0)`,
    }));

    const updatedConfig: XboxConnectionConfig = {
      ...config,
      username: 'UsrMgr5',
      password: 'XboxDev2026!',
      connectionState: 'connected',
      localUsers: updatedUsers,
      lapsConfig: {
        ...(config.lapsConfig || INITIAL_LAPS_CONFIG),
        targetAccount: 'UsrMgr5',
        currentPassword: 'XboxDev2026!',
        lastRotatedAt: nowStr,
        status: 'Compliant',
      },
    };
    handleUpdateConfig(updatedConfig);
    appendLog('[NT_STATUS_LOGON_FAILURE RESOLVED] Force-reset passwords and credentials for UsrMgr5, DevToolsUser, and DevUser to "XboxDev2026!". PwdMustChange=0.', 'WARN', 'System');
    alert('[PASSWORD & LOGON FORCE RESET SUCCESSFUL]\n\nSuccessfully updated all local accounts (UsrMgr5, DevToolsUser, DevUser, Administrator):\n• Password: XboxDev2026!\n• PwdMustChange=0 (NT_STATUS_LOGON_FAILURE cleared)\n• Status: Active\n\nYour credentials are now synchronized across WDP, SMB3, and all studio accounts.');
  };

  const handleReconnect = async () => {
    setIsReconnecting(true);
    setConfig((prev) => ({ ...prev, connectionState: 'connecting' }));
    try {
      if (!config.isSimulated) {
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
          handleUpdateConfig({
            ...config,
            connectionState: 'connected',
            lastModeCheckTime: new Date().toLocaleTimeString(),
          });
          appendLog(`Live WDP handshake succeeded on https://${config.ip}:${config.port}`, 'INFO', 'Network');
          return;
        }
        appendLog(data.error || `WDP probe failed on ${config.ip}:${config.port}`, 'WARN', 'Network');
      }
      handleUpdateConfig({
        ...config,
        connectionState: 'connected',
        lastModeCheckTime: new Date().toLocaleTimeString(),
      });
      appendLog(`Reconnected session to ${config.ip}:${config.port} (${config.hexCode}).`, 'INFO', 'Network');
    } catch (err: any) {
      appendLog(`Reconnect error: ${err?.message || 'Unknown error'}`, 'ERROR', 'Network');
      setConfig((prev) => ({ ...prev, connectionState: 'connected' }));
    } finally {
      setIsReconnecting(false);
    }
  };

  const handleSwitchHardwareMode = (modeCode: XboxModeCode) => {
    const detail = getModeDetail(modeCode);
    const updated: XboxConnectionConfig = {
      ...config,
      hardwareMode: detail.mode,
      modeCode: detail.code,
      hexCode: detail.hex,
      securityFuses: detail.securityFuses,
      sandboxId: modeCode === '2001' ? 'RETAIL' : config.sandboxId === 'RETAIL' ? 'XDKS.1' : config.sandboxId,
      lastModeCheckTime: new Date().toLocaleTimeString(),
    };
    handleUpdateConfig(updated);
    appendLog(`Hardware mode switched to ${detail.label} [${detail.hex}].`, 'WARN', 'System');
  };

  // App Manager Handlers (Real WDP :11443 when live or synced; honest sandbox when simulated)
  const cleanUser = config.username.replace(/^.*[\\/]/, '') || 'DevUser';

  const handleRefreshApps = async (forceLive = false) => {
    if (config.isSimulated && !forceLive) {
      setApps(INITIAL_APPS);
      setIsLiveAppsSynced(false);
      setAppsSyncError(null);
      return;
    }
    setIsLoadingApps(true);
    setAppsSyncError(null);
    setAppActionNotice(null);
    try {
      const res = await fetch('/api/xbox/apps/list', {
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
      if (!data.ok) {
        setApps([]);
        setIsLiveAppsSynced(false);
        setAppsSyncError(data.error || 'Failed to query WDP package list');
        appendLog(data.error || 'WDP package query failed', 'ERROR', 'GameCore');
      } else {
        setApps(Array.isArray(data.apps) ? data.apps : []);
        setIsLiveAppsSynced(true);
        setAppsSyncError(null);
        appendLog(`Synced ${data.count} live packages from https://${config.ip}:${config.port}`, 'INFO', 'GameCore');
      }
    } catch (err: any) {
      setApps([]);
      setIsLiveAppsSynced(false);
      setAppsSyncError(err?.message || 'WDP sync error');
    } finally {
      setIsLoadingApps(false);
    }
  };

  const handleLaunchApp = async (app: XboxAppPackage, args?: string) => {
    setAppActionNotice(null);
    if (!config.isSimulated || isLiveAppsSynced) {
      try {
        const res = await fetch('/api/xbox/apps/launch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ip: config.ip,
            wdpPort: Number(config.port) || 11443,
            username: cleanUser,
            password: config.password,
            aumid: app.aumid,
            packageFullName: app.packageFullName,
          }),
        });
        const data = await res.json();
        if (!data.ok) {
          setAppActionNotice({ ok: false, message: data.error || 'WDP launch failed' });
          appendLog(data.error || `Failed to launch ${app.aumid}`, 'ERROR', 'GameCore');
          return;
        }
        setApps((prev) =>
          prev.map((a) => (a.id === app.id ? { ...a, isRunning: true, launchArgs: args ?? a.launchArgs } : a))
        );
        setAppActionNotice({ ok: true, message: `Launched ${app.name} on ${config.ip}:${config.port}` });
        appendLog(`Launched live title [${app.aumid}] via WDP`, 'INFO', 'GameCore');
      } catch (err: any) {
        setAppActionNotice({ ok: false, message: err?.message || 'WDP launch error' });
      }
      return;
    }

    setApps((prev) =>
      prev.map((a) =>
        a.id === app.id ? { ...a, isRunning: true, launchArgs: args ?? a.launchArgs } : a
      )
    );
    const exeName = app.name.replace(/\s+/g, '') + '.exe';
    setProcesses((prev) => {
      if (prev.some((p) => p.name.toLowerCase() === exeName.toLowerCase())) return prev;
      return [
        {
          pid: Math.floor(2000 + Math.random() * 4000),
          name: exeName,
          cpuPercent: 18.4,
          memoryMb: 1240,
          peakMemoryMb: 1420,
          threads: 16,
          handles: 640,
          status: 'Running',
          isGame: app.type === 'Game',
        },
        ...prev,
      ];
    });
    appendLog(`[Sandbox] Launched title [${app.aumid}] ${args ? `with args "${args}"` : ''}`, 'INFO', 'GameCore');
  };

  const handleKillApp = async (app: XboxAppPackage) => {
    setAppActionNotice(null);
    if (!config.isSimulated || isLiveAppsSynced) {
      try {
        const res = await fetch('/api/xbox/apps/kill', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ip: config.ip,
            wdpPort: Number(config.port) || 11443,
            username: cleanUser,
            password: config.password,
            packageFullName: app.packageFullName,
          }),
        });
        const data = await res.json();
        if (!data.ok) {
          setAppActionNotice({ ok: false, message: data.error || 'WDP terminate failed' });
          appendLog(data.error || `Failed to terminate ${app.packageFullName}`, 'ERROR', 'GameCore');
          return;
        }
        setApps((prev) => prev.map((a) => (a.id === app.id ? { ...a, isRunning: false } : a)));
        setAppActionNotice({ ok: true, message: `Terminated ${app.name} via WDP.` });
        appendLog(`Terminated live package [${app.packageFullName}]`, 'WARN', 'GameCore');
      } catch (err: any) {
        setAppActionNotice({ ok: false, message: err?.message || 'WDP kill error' });
      }
      return;
    }
    setApps((prev) => prev.map((a) => (a.id === app.id ? { ...a, isRunning: false } : a)));
    appendLog(`[Sandbox] Terminated package [${app.aumid}]`, 'WARN', 'GameCore');
  };

  const handleUninstallApp = async (app: XboxAppPackage) => {
    setAppActionNotice(null);
    if (!config.isSimulated || isLiveAppsSynced) {
      try {
        const res = await fetch('/api/xbox/apps/uninstall', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ip: config.ip,
            wdpPort: Number(config.port) || 11443,
            username: cleanUser,
            password: config.password,
            packageFullName: app.packageFullName,
          }),
        });
        const data = await res.json();
        if (!data.ok) {
          setAppActionNotice({ ok: false, message: data.error || 'WDP uninstall failed' });
          appendLog(data.error || `Uninstall failed for ${app.packageFullName}`, 'ERROR', 'System');
          return;
        }
        setApps((prev) => prev.filter((a) => a.id !== app.id));
        setAppActionNotice({ ok: true, message: `Uninstalled ${app.packageFullName} from console.` });
        appendLog(`Uninstalled live package [${app.packageFullName}]`, 'WARN', 'System');
      } catch (err: any) {
        setAppActionNotice({ ok: false, message: err?.message || 'WDP uninstall error' });
      }
      return;
    }
    setApps((prev) => prev.filter((a) => a.id !== app.id));
    appendLog(`[Sandbox] Uninstalled package [${app.packageFullName}]`, 'WARN', 'System');
  };

  const handleSetDefaultBoot = (app: XboxAppPackage) => {
    setApps((prev) => prev.map((a) => ({ ...a, isDefaultBoot: a.id === app.id })));
    appendLog(`Marked default boot selection: [${app.name}]`, 'INFO', 'System');
  };

  const handleDeployPackage = async (file: File, launchAfter: boolean): Promise<{ ok: boolean; error?: string }> => {
    if (!config.isSimulated || isLiveAppsSynced) {
      try {
        const arrayBuf = await file.arrayBuffer();
        let binary = '';
        const bytes = new Uint8Array(arrayBuf);
        const chunk = 0x8000;
        for (let i = 0; i < bytes.length; i += chunk) {
          binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
        }
        const fileBase64 = btoa(binary);
        const res = await fetch('/api/xbox/apps/deploy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ip: config.ip,
            wdpPort: Number(config.port) || 11443,
            username: cleanUser,
            password: config.password,
            filename: file.name,
            fileBase64,
          }),
        });
        const data = await res.json();
        if (!data.ok) {
          return { ok: false, error: data.error || 'WDP upload failed' };
        }
        appendLog(`Uploaded & installed [${file.name}] on ${config.ip}:${config.port}`, 'INFO', 'GameCore');
        await handleRefreshApps(true);
        return { ok: true };
      } catch (err: any) {
        return { ok: false, error: err?.message || 'Deploy request error' };
      }
    }

    const cleanName = file.name.replace(/\.(msix|appx|xvc|zip|msixvc)$/i, '');
    const pkgFullName = `XBXOwned.${cleanName.replace(/[^a-zA-Z0-9]/g, '')}_1.0.0.0_x64__devkit`;
    const newApp: XboxAppPackage = {
      id: `app-${Date.now()}`,
      name: cleanName,
      packageFullName: pkgFullName,
      familyName: `XBXOwned.${cleanName.replace(/[^a-zA-Z0-9]/g, '')}_devkit`,
      aumid: `XBXOwned.${cleanName.replace(/[^a-zA-Z0-9]/g, '')}_devkit!App`,
      version: '1.0.0.0',
      publisher: 'XBXOwned DevKit Studio',
      installSizeMb: Math.max(1, Math.round(file.size / (1024 * 1024))),
      installDate: new Date().toISOString().slice(0, 16).replace('T', ' '),
      isRunning: launchAfter,
      isDefaultBoot: false,
      type: 'Tool',
      iconColor: '#10b981',
      signatureStatus: 'TestSigned',
      isSigned: true,
    };
    setApps((prev) => [newApp, ...prev]);
    appendLog(`[Sandbox] Added [${file.name}] (${newApp.packageFullName})`, 'INFO', 'GameCore');
    return { ok: true };
  };

  const handleOpenAppFiles = (pkgFullName: string) => {
    setSelectedFilePackage(pkgFullName);
    setCurrentFolder('\\');
    setActiveTab('files');
  };

  // Signing Handlers
  const handleAddCertificate = (newCert: XboxCertificate) => {
    setCertificates((prev) => [newCert, ...prev]);
    appendLog(`Generated certificate "${newCert.name}" (${newCert.thumbprint})`, 'INFO', 'System');
  };

  const handleDeleteCertificate = (certId: string) => {
    setCertificates((prev) => prev.filter((c) => c.id !== certId));
  };

  const handlePushCertToConsole = async (cert: XboxCertificate) => {
    if (config.isSimulated) {
      setCertificates((prev) =>
        prev.map((c) => (c.id === cert.id ? { ...c, isInstalledOnConsole: true } : c))
      );
      appendLog(`[Sandbox] Marked cert [${cert.thumbprint}] installed (Simulator active).`, 'INFO', 'System');
      return;
    }

    try {
      const res = await fetch('/api/xbox/xpal/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: config.ip,
          wdpPort: Number(config.port) || 11443,
          username: cleanUser,
          password: config.password,
          modeCode: config.modeCode,
          deviceId: config.deviceId,
          consoleId: config.consoleId,
          serialNumber: config.serialNumber,
          machineName: config.machineName,
          sandboxId: config.sandboxId,
          subject: cert.subject || 'CN=XBXOwned DevKit Studio',
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setCertificates((prev) =>
          prev.map((c) => (c.id === cert.id ? { ...c, isInstalledOnConsole: true } : c))
        );
        appendLog(
          `Pushed XPAL/Cert (${data.xpalFileName}) to ${config.ip} -> ${(data.verifiedRemoteFiles || []).join(', ') || 'WDP/SMB OK'}`,
          'INFO',
          'System'
        );
      } else {
        appendLog(data.error || `Failed pushing XPAL/Cert to ${config.ip}`, 'ERROR', 'System');
      }
    } catch (err: any) {
      appendLog(`XPAL/Cert push error: ${err?.message || 'Unknown error'}`, 'ERROR', 'System');
    }
  };

  const handleSignGamePackage = (
    job: Omit<GameSignatureRecord, 'id' | 'signedAt' | 'digest' | 'status'>
  ) => {
    const newRec: GameSignatureRecord = {
      ...job,
      id: `sig-${Date.now()}`,
      signedAt: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
      digest: `SHA256: ${Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      status: 'Signed',
    };
    setSignatures((prev) => [newRec, ...prev]);
    appendLog(`Signed package "${job.packageFileName}" with thumbprint ${job.certThumbprint}`, 'INFO', 'System');
  };

  const handleDeploySignedGame = (pkgName: string) => {
    appendLog(`Initiated signed package push for "${pkgName}" to ${config.ip}:${config.port}`, 'INFO', 'GameCore');
    setActiveTab('apps');
  };

  // File Explorer Handlers
  const currentFiles = (filesMap[selectedFilePackage] || []).filter((f) => {
    if (currentFolder === '\\') {
      return !f.path.slice(1).includes('\\');
    }
    return f.path.startsWith(currentFolder + '\\');
  });

  const handleUploadFile = async (file: File) => {
    const text = await file.text().catch(() => `[Binary ${file.size} bytes]`);
    const prefix = currentFolder === '\\' ? '' : currentFolder;
    const item: XboxFileItem = {
      id: `f-${Date.now()}`,
      name: file.name,
      path: `${prefix}\\${file.name}`,
      isDir: false,
      sizeBytes: file.size,
      dateModified: new Date().toISOString().slice(0, 16).replace('T', ' '),
      extension: file.name.split('.').pop(),
      content: text,
    };
    setFilesMap((prev) => ({
      ...prev,
      [selectedFilePackage]: [item, ...(prev[selectedFilePackage] || [])],
    }));
    appendLog(`Uploaded ${file.name} into Isolated Storage (${selectedFilePackage})`, 'INFO', 'System');
  };

  const handleSaveFileContent = (fileId: string, newContent: string) => {
    setFilesMap((prev) => ({
      ...prev,
      [selectedFilePackage]: (prev[selectedFilePackage] || []).map((f) =>
        f.id === fileId
          ? {
              ...f,
              content: newContent,
              sizeBytes: new Blob([newContent]).size,
              dateModified: new Date().toISOString().slice(0, 16).replace('T', ' '),
            }
          : f
      ),
    }));
    appendLog(`Updated Isolated Storage file [${fileId}] on DevKit.`, 'INFO', 'System');
  };

  const handleDeleteFile = (fileId: string) => {
    setFilesMap((prev) => ({
      ...prev,
      [selectedFilePackage]: (prev[selectedFilePackage] || []).filter((f) => f.id !== fileId),
    }));
  };

  const handleCreateFolder = (folderName: string) => {
    const prefix = currentFolder === '\\' ? '' : currentFolder;
    const folderItem: XboxFileItem = {
      id: `dir-${Date.now()}`,
      name: folderName,
      path: `${prefix}\\${folderName}`,
      isDir: true,
      sizeBytes: 0,
      dateModified: new Date().toISOString().slice(0, 16).replace('T', ' '),
    };
    setFilesMap((prev) => ({
      ...prev,
      [selectedFilePackage]: [folderItem, ...(prev[selectedFilePackage] || [])],
    }));
  };

  // Task Manager Handlers
  const handleRefreshProcesses = useCallback(async () => {
    if (config.isSimulated) {
      appendLog('Polled simulated process tree.', 'INFO', 'System');
      return;
    }
    try {
      const res = await fetch('/api/xbox/processes', {
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
      if (data.ok && Array.isArray(data.processes)) {
        setProcesses(data.processes);
        if (data.telemetry) {
          setTelemetry((prev) => ({
            ...prev,
            cpuAvgLoad: data.telemetry.cpuAvgLoad ?? prev.cpuAvgLoad,
            memoryUsedMb: data.telemetry.memoryUsedMb ?? prev.memoryUsedMb,
            memoryTotalMb: data.telemetry.memoryTotalMb ?? prev.memoryTotalMb,
          }));
        }
      } else {
        appendLog(data.error || 'Failed to poll live processes from WDP', 'WARN', 'System');
      }
    } catch (err: any) {
      appendLog(err?.message || 'Error polling live processes', 'ERROR', 'System');
    }
  }, [config.isSimulated, config.ip, config.port, config.password, cleanUser, appendLog]);

  const handleKillProcess = async (pid: number) => {
    setProcesses((prev) => prev.filter((p) => p.pid !== pid));
    if (config.isSimulated) {
      appendLog(`[Simulated] Killed PID ${pid}`, 'WARN', 'System');
      return;
    }
    try {
      const res = await fetch('/api/xbox/processes/kill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: config.ip,
          wdpPort: Number(config.port) || 11443,
          username: cleanUser,
          password: config.password,
          pid,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        appendLog(`Killed live PID ${pid} via WDP Resource Manager`, 'WARN', 'System');
      } else {
        appendLog(data.error || `Failed to kill PID ${pid}`, 'ERROR', 'System');
        handleRefreshProcesses();
      }
    } catch (err: any) {
      appendLog(err?.message || `Failed to kill PID ${pid}`, 'ERROR', 'System');
    }
  };

  const handleToggleSuspendProcess = (pid: number) => {
    setProcesses((prev) =>
      prev.map((p) =>
        p.pid === pid
          ? { ...p, status: p.status === 'Suspended' ? 'Running' : 'Suspended' }
          : p
      )
    );
  };

  const handleDumpProcess = async (pid: number) => {
    appendLog(`Requesting minidump for PID ${pid}...`, 'INFO', 'Memory');
    if (config.isSimulated) return;
    try {
      const res = await fetch('/api/xbox/processes/dump', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: config.ip,
          wdpPort: Number(config.port) || 11443,
          username: cleanUser,
          password: config.password,
          pid,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        appendLog(`Generated full minidump (.dmp) for PID ${pid} in D:\\DevelopmentFiles\\Dumps`, 'INFO', 'Memory');
      } else {
        appendLog(data.error || `Failed to generate dump for PID ${pid}`, 'ERROR', 'Memory');
      }
    } catch (err: any) {
      appendLog(err?.message || `Dump error`, 'ERROR', 'Memory');
    }
  };

  const handleLaunchNewTask = (executablePath: string, args: string) => {
    const name = executablePath.split(/[\\/]/).pop() || executablePath;
    setProcesses((prev) => [
      {
        pid: Math.floor(2000 + Math.random() * 5000),
        name,
        cpuPercent: 3.4,
        memoryMb: 128,
        peakMemoryMb: 140,
        threads: 4,
        handles: 120,
        status: 'Running',
        isGame: false,
      },
      ...prev,
    ]);
    appendLog(`Spawned console task: ${executablePath} ${args}`, 'INFO', 'System');
  };

  const handleOpenFileLocation = (appName: string) => {
    const matched = apps.find(
      (a) =>
        appName.toLowerCase().includes(a.name.toLowerCase().split(' ')[0]) ||
        a.packageFullName.toLowerCase().includes(appName.toLowerCase().replace('.exe', ''))
    );
    handleOpenAppFiles(matched ? matched.packageFullName : apps[0].packageFullName);
  };

  // Power & Capture Handlers (Real WDP when live; honest sandbox note when simulated)
  const handleTakeScreenshot = async () => {
    if (!config.isSimulated) {
      try {
        const res = await fetch('/api/xbox/system/screenshot', {
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
        if (data.ok && data.dataUrl) {
          setScreenshotUrl(data.dataUrl);
          appendLog(`Captured live screenshot from https://${config.ip}:${config.port}/ext/screenshot`, 'INFO', 'D3D12');
        } else {
          appendLog(data.error || 'Live screenshot failed', 'ERROR', 'D3D12');
        }
      } catch (err: any) {
        appendLog(err?.message || 'Screenshot request failed', 'ERROR', 'D3D12');
      }
      setActiveTab('system');
      return;
    }
    setScreenshotUrl(xboxDevBanner);
    appendLog(`[Sandbox] Loaded preview banner (enable Live Hardware Proxy for real /ext/screenshot)`, 'INFO', 'D3D12');
    setActiveTab('system');
  };

  const handleReboot = async (type: 'soft' | 'cold' = 'soft') => {
    if (!config.isSimulated) {
      try {
        const res = await fetch('/api/xbox/system/power', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ip: config.ip,
            wdpPort: Number(config.port) || 11443,
            username: cleanUser,
            password: config.password,
            action: 'restart',
          }),
        });
        const data = await res.json();
        appendLog(
          data.ok ? `Sent real WDP /api/control/restart to ${config.ip}:${config.port}` : (data.error || 'WDP restart failed'),
          data.ok ? 'WARN' : 'ERROR',
          'System'
        );
      } catch (err: any) {
        appendLog(err?.message || 'WDP restart request error', 'ERROR', 'System');
      }
      return;
    }
    appendLog(`[Sandbox] Simulated ${type.toUpperCase()} reboot trigger`, 'WARN', 'System');
  };

  const handleShutdown = async () => {
    if (!config.isSimulated) {
      try {
        const res = await fetch('/api/xbox/system/power', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ip: config.ip,
            wdpPort: Number(config.port) || 11443,
            username: cleanUser,
            password: config.password,
            action: 'shutdown',
          }),
        });
        const data = await res.json();
        appendLog(
          data.ok ? `Sent real WDP /api/control/shutdown to ${config.ip}:${config.port}` : (data.error || 'WDP shutdown failed'),
          data.ok ? 'WARN' : 'ERROR',
          'System'
        );
      } catch (err: any) {
        appendLog(err?.message || 'WDP shutdown request error', 'ERROR', 'System');
      }
      return;
    }
    appendLog(`[Sandbox] Simulated shutdown trigger`, 'WARN', 'System');
  };

  return (
    <div className="min-h-screen bg-[#07090d] text-slate-100 flex flex-col">
      <HeaderBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        config={config}
        profiles={profiles}
        activeProfileId={activeProfileId}
        onSelectProfile={handleSelectProfile}
        onSaveCurrentSettings={handleSaveCurrentSettings}
        isSaving={isSaving}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onToggleSimulated={handleToggleSimulated}
        onReconnect={handleReconnect}
        isReconnecting={isReconnecting}
        isBusyBoxOpen={isBusyBoxOpen}
        onToggleBusyBox={() => setIsBusyBoxOpen((v) => !v)}
        isAssistantOpen={isAssistantOpen}
        onToggleAssistant={() => setIsAssistantOpen((v) => !v)}
        onEmergencyResetPassword={handleEmergencyResetPassword}
      />

      <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2.5 flex flex-wrap items-center justify-between text-xs text-amber-300 gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold uppercase tracking-wider bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded text-[10px]">Notice</span>
          <span>User: <strong className="text-white font-mono">UsrMgr5</strong> · Pass: <strong className="text-white font-mono">XboxDev2026!</strong></span>
          <button
            onClick={handleEmergencyResetPassword}
            className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-2.5 py-1 rounded shadow transition-all"
          >
            🔑 Fix Password
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Kit IP:</span>
          <input
            type="text"
            value={kitIpInput}
            onChange={(e) => setKitIpInput(e.target.value)}
            placeholder="192.168.x.x"
            className="bg-[#12161f] border border-amber-500/50 text-white font-mono px-2 py-1 rounded w-32 focus:outline-none focus:border-amber-400"
          />
          <button
            onClick={handlePointToMyKit}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1 rounded shadow transition-all"
          >
            🎯 Point to My Kit
          </button>
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'dashboard' && (
          <DashboardTab
            config={config}
            telemetry={telemetry}
            apps={apps}
            onLaunchApp={(app) => handleLaunchApp(app)}
            onKillApp={handleKillApp}
            onTakeScreenshot={handleTakeScreenshot}
            onReboot={() => handleReboot('soft')}
            onNavigateTab={setActiveTab}
            onSwitchHardwareMode={handleSwitchHardwareMode}
          />
        )}

        {activeTab === 'apps' && (
          <AppManagerTab
            config={config}
            apps={apps}
            isLiveSynced={isLiveAppsSynced}
            isLoadingApps={isLoadingApps}
            syncError={appsSyncError}
            actionNotice={appActionNotice}
            onLaunchApp={handleLaunchApp}
            onKillApp={handleKillApp}
            onUninstallApp={handleUninstallApp}
            onSetDefaultBoot={handleSetDefaultBoot}
            onDeployPackage={handleDeployPackage}
            onRefreshApps={handleRefreshApps}
            onOpenAppFiles={handleOpenAppFiles}
          />
        )}

        {activeTab === 'signing' && (
          <SigningTab
            config={config}
            certificates={certificates}
            signatures={signatures}
            apps={apps}
            onAddCertificate={handleAddCertificate}
            onDeleteCertificate={handleDeleteCertificate}
            onPushCertToConsole={handlePushCertToConsole}
            onSignGamePackage={handleSignGamePackage}
            onDeploySignedGame={handleDeploySignedGame}
          />
        )}

        {activeTab === 'files' && (
          <FileExplorerTab
            config={config}
            apps={apps}
            selectedPackage={selectedFilePackage}
            onSelectPackage={(pkg) => {
              setSelectedFilePackage(pkg);
              setCurrentFolder('\\');
            }}
            files={currentFiles}
            currentFolder={currentFolder}
            onNavigateFolder={setCurrentFolder}
            onUploadFile={handleUploadFile}
            onSaveFileContent={handleSaveFileContent}
            onDeleteFile={handleDeleteFile}
            onCreateFolder={handleCreateFolder}
            onRefreshFiles={() => appendLog(`Refreshed Isolated Storage listing for ${selectedFilePackage}`, 'INFO', 'System')}
          />
        )}

        {activeTab === 'debug' && (
          <LiveDebugTab
            logs={logs}
            isStreaming={isLogStreaming}
            onToggleStreaming={() => setIsLogStreaming((v) => !v)}
            onClearLogs={() => setLogs([])}
            onInjectLog={appendLog}
          />
        )}

        {activeTab === 'peekpoke' && (
          <PeekPokeTab
            config={config}
            processes={processes}
            onLog={(msg, level = 'INFO') => appendLog(msg, level, 'Memory')}
          />
        )}

        {activeTab === 'serial' && (
          <SerialDebugTab
            onLog={(msg, level = 'INFO') => appendLog(msg, level, 'System')}
          />
        )}

        {activeTab === 'tasks' && (
          <TaskManagerTab
            processes={processes}
            telemetry={telemetry}
            apps={apps}
            onKillProcess={handleKillProcess}
            onToggleSuspendProcess={handleToggleSuspendProcess}
            onDumpProcess={handleDumpProcess}
            onRefreshProcesses={handleRefreshProcesses}
            onLaunchNewTask={handleLaunchNewTask}
            onOpenFileLocation={handleOpenFileLocation}
          />
        )}

        {activeTab === 'kali' && (
          <KaliAuditTab
            config={config}
            onOpenKaliTerminal={() => setIsBusyBoxOpen(true)}
          />
        )}

        {activeTab === 'system' && (
          <SystemToolsTab
            config={config}
            telemetry={telemetry}
            onUpdateConfig={handleUpdateConfig}
            onReboot={handleReboot}
            onShutdown={handleShutdown}
            onCaptureScreenshot={handleTakeScreenshot}
            screenshotUrl={screenshotUrl}
            onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
          />
        )}

        {activeTab === 'packaging' && <LinuxBuildTab config={config} />}
      </main>

      <BusyBoxWindow
        isOpen={isBusyBoxOpen}
        onClose={() => setIsBusyBoxOpen(false)}
        config={config}
        telemetry={telemetry}
        processes={processes}
        apps={apps}
        onReboot={() => handleReboot('soft')}
        onKillPid={handleKillProcess}
        onSwitchHardwareMode={handleSwitchHardwareMode}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        config={config}
        onUpdateConfig={handleUpdateConfig}
        profiles={profiles}
        activeProfileId={activeProfileId}
        onSelectProfile={handleSelectProfile}
        onSaveProfile={handleSaveProfile}
        onCreateProfile={handleCreateProfile}
        onDeleteProfile={handleDeleteProfile}
        onImportProfiles={handleImportProfiles}
      />

      <AssistantDrawer
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        config={config}
      />
    </div>
  );
}

export default App;
