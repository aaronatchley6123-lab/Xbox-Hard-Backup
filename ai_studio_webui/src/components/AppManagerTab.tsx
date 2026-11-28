import React, { useState, useEffect } from 'react';
import {
  Play,
  Square,
  Trash2,
  Upload,
  Search,
  RefreshCw,
  FolderOpen,
  Sliders,
  Package,
  Star,
  AlertTriangle,
  Wifi,
  CheckCircle2,
} from 'lucide-react';
import { XboxAppPackage, XboxConnectionConfig } from '../types/xbox';

interface AppManagerTabProps {
  config: XboxConnectionConfig;
  apps: XboxAppPackage[];
  isLiveSynced: boolean;
  isLoadingApps?: boolean;
  syncError?: string | null;
  actionNotice?: { ok: boolean; message: string } | null;
  onLaunchApp: (app: XboxAppPackage, args?: string) => Promise<void> | void;
  onKillApp: (app: XboxAppPackage) => Promise<void> | void;
  onUninstallApp: (app: XboxAppPackage) => Promise<void> | void;
  onSetDefaultBoot: (app: XboxAppPackage) => void;
  onDeployPackage: (file: File, launchAfter: boolean) => Promise<{ ok: boolean; error?: string }>;
  onRefreshApps: (forceLive?: boolean) => Promise<void> | void;
  onOpenAppFiles: (pkgFullName: string) => void;
}

export const AppManagerTab: React.FC<AppManagerTabProps> = ({
  config,
  apps,
  isLiveSynced,
  isLoadingApps = false,
  syncError = null,
  actionNotice = null,
  onLaunchApp,
  onKillApp,
  onUninstallApp,
  onSetDefaultBoot,
  onDeployPackage,
  onRefreshApps,
  onOpenAppFiles,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'Game' | 'Tool' | 'System'>('All');
  const [selectedAppForArgs, setSelectedAppForArgs] = useState<XboxAppPackage | null>(null);
  const [customArgs, setCustomArgs] = useState('');
  const [confirmUninstallId, setConfirmUninstallId] = useState<string | null>(null);

  // Deploy modal state
  const [isDeployOpen, setIsDeployOpen] = useState(false);
  const [deployFile, setDeployFile] = useState<File | null>(null);
  const [launchAfterDeploy, setLaunchAfterDeploy] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [deployStatus, setDeployStatus] = useState<{ ok: boolean; text: string } | null>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    app: XboxAppPackage | null;
  }>({ visible: false, x: 0, y: 0, app: null });

  useEffect(() => {
    const handleWindowClick = () => {
      setContextMenu((prev) => (prev.visible ? { ...prev, visible: false } : prev));
    };
    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, []);

  // Auto-sync live apps when tab mounts in Live Hardware Proxy mode
  useEffect(() => {
    if (!config.isSimulated) {
      onRefreshApps(true);
    }
  }, [config.isSimulated]);

  const handleRowContextMenu = (e: React.MouseEvent, app: XboxAppPackage) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      visible: true,
      x: Math.min(window.innerWidth - 240, e.clientX),
      y: Math.min(window.innerHeight - 300, e.clientY),
      app,
    });
  };

  const filteredApps = apps.filter((app) => {
    const matchesSearch =
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.packageFullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.aumid.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === 'All' || app.type === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleStartDeploy = async () => {
    if (!deployFile) return;
    setIsUploading(true);
    setDeployStatus({
      ok: true,
      text: config.isSimulated
        ? 'Registering package in local sandbox...'
        : `Uploading ${deployFile.name} to https://${config.ip}:${config.port}/api/app/packagemanager/package...`,
    });

    const res = await onDeployPackage(deployFile, launchAfterDeploy);
    setIsUploading(false);

    if (res.ok) {
      setDeployStatus({
        ok: true,
        text: config.isSimulated
          ? 'Added to local sandbox list (Simulator Mode).'
          : `Installed on Xbox (${config.ip}:${config.port}).`,
      });
      setTimeout(() => {
        setIsDeployOpen(false);
        setDeployFile(null);
        setDeployStatus(null);
      }, 900);
    } else {
      setDeployStatus({
        ok: false,
        text: res.error || 'WDP package upload rejected or unreachable.',
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Honest Source Banner */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-2.5 rounded-xl border text-xs ${
          isLiveSynced
            ? 'bg-emerald-950/25 border-emerald-700/50 text-emerald-200'
            : syncError
              ? 'bg-rose-950/25 border-rose-700/50 text-rose-200'
              : 'bg-amber-950/20 border-amber-700/40 text-amber-200/90'
        }`}
      >
        <div className="flex items-center gap-2">
          {isLiveSynced ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          )}
          <span>
            {isLiveSynced ? (
              <>
                <strong>Live Xbox WDP:</strong> Showing actual installed packages from{' '}
                <code className="font-mono">https://{config.ip}:{config.port}/api/app/packagemanager/packages</code> ({apps.length} packages).
              </>
            ) : syncError ? (
              <>
                <strong>Live WDP Sync Failed:</strong> {syncError}
              </>
            ) : (
              <>
                <strong>Reference Sandbox List:</strong> Simulator is active (sample placeholder packages shown). Click{' '}
                <strong>Sync Live WDP (:11443)</strong> or toggle off Simulator in the top bar to query your real console.
              </>
            )}
          </span>
        </div>

        <button
          onClick={() => onRefreshApps(true)}
          disabled={isLoadingApps}
          className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#0b1018] border border-blue-600/50 text-blue-300 hover:bg-blue-600 hover:text-white font-semibold shrink-0 disabled:opacity-50"
        >
          <Wifi className={`w-3.5 h-3.5 ${isLoadingApps ? 'animate-pulse' : ''}`} />
          <span>{isLoadingApps ? 'Querying WDP...' : 'Sync Live WDP (:11443)'}</span>
        </button>
      </div>

      {actionNotice && (
        <div
          className={`px-4 py-2 rounded-lg border text-xs font-mono ${
            actionNotice.ok
              ? 'bg-emerald-950/30 border-emerald-700/50 text-emerald-300'
              : 'bg-rose-950/40 border-rose-700/60 text-rose-300'
          }`}
        >
          {actionNotice.message}
        </div>
      )}

      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-[#0d1117] border border-[#1b2332] rounded-xl">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Filter by title, AUMID, or package full name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#121620] border border-[#212938] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-[#121620] border border-[#212938] rounded-lg text-xs">
            {(['All', 'Game', 'Tool', 'System'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  categoryFilter === cat ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onRefreshApps()}
            disabled={isLoadingApps}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#141a25] border border-[#232c3d] text-slate-200 hover:text-white hover:border-blue-500 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingApps ? 'animate-spin text-blue-400' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => {
              setDeployStatus(null);
              setIsDeployOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-500 shadow-[0_0_14px_rgba(37,99,235,0.4)] transition-all"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Deploy Package (.msix)</span>
          </button>
        </div>
      </div>

      {/* Applications Table */}
      <div className="border border-[#1c2434] bg-[#0c1017] rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#1b2332] bg-[#10141d] text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">Title / Package</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Version</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#171d29]">
              {filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    {syncError
                      ? 'No live packages loaded because WDP was unreachable.'
                      : 'No packages matching filter.'}
                  </td>
                </tr>
              ) : (
                filteredApps.map((app) => (
                  <tr
                    key={app.id}
                    onContextMenu={(e) => handleRowContextMenu(e, app)}
                    className="hover:bg-[#111722] transition-colors group cursor-pointer"
                    title="Right-click for options"
                  >
                    <td className="py-3 px-4 min-w-[280px]">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 font-bold font-mono text-white text-xs border border-white/10"
                          style={{ backgroundColor: app.iconColor || '#2563eb' }}
                        >
                          {app.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white group-hover:text-blue-400 transition-colors truncate">
                              {app.name}
                            </span>
                            {app.isDefaultBoot && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono flex items-center gap-0.5">
                                <Star className="w-2.5 h-2.5 fill-current" />
                                Boot
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-mono text-slate-500 truncate max-w-md">
                            {app.packageFullName}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-slate-400 font-mono">{app.type}</td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-300 font-mono">{app.version}</td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-400 font-mono tabular-nums">
                      {app.installSizeMb >= 1024
                        ? `${(app.installSizeMb / 1024).toFixed(1)} GB`
                        : `${app.installSizeMb} MB`}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {app.isRunning ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-950/80 text-blue-300 border border-blue-600/50">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                          Running
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Installed</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {app.isRunning ? (
                          <button
                            onClick={() => onKillApp(app)}
                            className="p-1.5 rounded bg-rose-950/70 border border-rose-800 text-rose-300 hover:bg-rose-900 transition-colors"
                            title="Terminate Title"
                          >
                            <Square className="w-3.5 h-3.5 fill-current" />
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedAppForArgs(app);
                              setCustomArgs(app.launchArgs || '');
                            }}
                            className="p-1.5 rounded bg-blue-600 text-white hover:bg-blue-500 shadow-sm transition-colors"
                            title="Launch Title"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>
                        )}

                        <button
                          onClick={() => onOpenAppFiles(app.packageFullName)}
                          className="p-1.5 rounded bg-[#131924] border border-[#212b3d] text-slate-300 hover:text-white hover:border-blue-500 transition-colors"
                          title="Open LocalAppData in File Explorer"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onSetDefaultBoot(app)}
                          className={`p-1.5 rounded border transition-colors ${
                            app.isDefaultBoot
                              ? 'bg-amber-950/60 border-amber-600 text-amber-300'
                              : 'bg-[#131924] border-[#212b3d] text-slate-400 hover:text-amber-300 hover:border-amber-600/50'
                          }`}
                          title="Mark Default Boot Title"
                        >
                          <Star className="w-3.5 h-3.5" />
                        </button>

                        {app.type !== 'System' &&
                          (confirmUninstallId === app.id ? (
                            <button
                              onClick={() => {
                                setConfirmUninstallId(null);
                                onUninstallApp(app);
                              }}
                              onMouseLeave={() => setConfirmUninstallId(null)}
                              className="px-2 py-1 rounded bg-rose-600 text-white text-[11px] font-bold hover:bg-rose-500"
                            >
                              Confirm?
                            </button>
                          ) : (
                            <button
                              onClick={() => setConfirmUninstallId(app.id)}
                              className="p-1.5 rounded bg-[#131924] border border-[#212b3d] text-slate-400 hover:text-rose-400 hover:border-rose-500/50 transition-colors"
                              title="Uninstall Package"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Launch Modal */}
      {selectedAppForArgs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0e1219] border border-[#222b3d] rounded-xl p-6 shadow-2xl space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white">Launch {selectedAppForArgs.name}</h3>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">AUMID: {selectedAppForArgs.aumid}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Command Line Launch Arguments
              </label>
              <input
                type="text"
                value={customArgs}
                onChange={(e) => setCustomArgs(e.target.value)}
                placeholder="-d3d12 -log"
                className="w-full bg-[#121620] border border-[#212938] rounded-md px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedAppForArgs(null)}
                className="px-4 py-2 text-xs font-semibold rounded-md text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onLaunchApp(selectedAppForArgs, customArgs);
                  setSelectedAppForArgs(null);
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-md bg-blue-600 text-white hover:bg-blue-500"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Launch Title</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Package Deployment Modal */}
      {isDeployOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0e1219] border border-[#222b3d] rounded-xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#1b2332] pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Deploy Xbox Package to DevKit</h3>
                <p className="text-xs text-slate-400">
                  Target: {config.isSimulated ? 'Local Sandbox (Simulator Active)' : `https://${config.ip}:${config.port}`}
                </p>
              </div>
              <button onClick={() => setIsDeployOpen(false)} className="text-slate-400 hover:text-white text-xs font-bold p-1">
                ✕
              </button>
            </div>

            <div className="p-6 border-2 border-dashed border-[#232c3d] rounded-xl bg-[#0b0e14] text-center space-y-2 hover:border-blue-500/60 transition-colors">
              <Package className="w-8 h-8 text-blue-400 mx-auto" />
              <div className="text-xs text-slate-300">
                {deployFile ? (
                  <span className="font-bold font-mono text-blue-300">
                    {deployFile.name} ({(deployFile.size / (1024 * 1024)).toFixed(2)} MB)
                  </span>
                ) : (
                  <span>Select package file (.msix, .appx, .msixvc)</span>
                )}
              </div>
              <input
                type="file"
                accept=".msix,.appx,.msixvc"
                onChange={(e) => setDeployFile(e.target.files?.[0] || null)}
                className="cursor-pointer file:cursor-pointer file:text-xs file:bg-blue-600 file:text-white file:border-none file:rounded file:px-3 file:py-1 file:mr-2 text-xs text-slate-400"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={launchAfterDeploy}
                onChange={(e) => setLaunchAfterDeploy(e.target.checked)}
                className="rounded bg-[#121620] border-slate-700 text-blue-600"
              />
              <span>Launch title automatically after WDP registration</span>
            </label>

            {deployStatus && (
              <div
                className={`px-3 py-2 rounded-lg border text-xs font-mono ${
                  deployStatus.ok
                    ? 'bg-emerald-950/30 border-emerald-700/50 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-700/60 text-rose-300'
                }`}
              >
                {deployStatus.text}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1b2332]">
              <button
                type="button"
                onClick={() => setIsDeployOpen(false)}
                disabled={isUploading}
                className="px-4 py-2 text-xs font-semibold rounded-md text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!deployFile || isUploading}
                onClick={handleStartDeploy}
                className="flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-md bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                <span>{isUploading ? 'Uploading...' : 'Deploy to Console'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Right-Click Context Menu */}
      {contextMenu.visible && contextMenu.app && (
        <div
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          className="fixed z-50 w-64 bg-[#0d1117] border border-blue-500/50 rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.85)] py-1.5 text-xs text-slate-200 font-sans select-none"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 border-b border-[#1b2332] text-[11px] font-mono text-slate-400 truncate">
            <span className="font-bold text-white block truncate">{contextMenu.app.name}</span>
            <span className="text-[10px] text-blue-400 block truncate">{contextMenu.app.aumid}</span>
          </div>

          <div className="py-1">
            {contextMenu.app.isRunning ? (
              <button
                onClick={() => {
                  onKillApp(contextMenu.app!);
                  setContextMenu({ ...contextMenu, visible: false });
                }}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-rose-950/60 hover:text-rose-300 text-left text-rose-400 font-semibold"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Terminate / Kill Title</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  onLaunchApp(contextMenu.app!);
                  setContextMenu({ ...contextMenu, visible: false });
                }}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-blue-600 hover:text-white text-left text-blue-400 font-semibold"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Launch Title on DevKit</span>
              </button>
            )}

            <button
              onClick={() => {
                setSelectedAppForArgs(contextMenu.app!);
                setCustomArgs(contextMenu.app!.launchArgs || '');
                setContextMenu({ ...contextMenu, visible: false });
              }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#161c28] hover:text-white text-left"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-400" />
              <span>Launch with Arguments...</span>
            </button>
          </div>

          <div className="border-t border-[#1b2332] py-1">
            <button
              onClick={() => {
                onOpenAppFiles(contextMenu.app!.packageFullName);
                setContextMenu({ ...contextMenu, visible: false });
              }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#161c28] hover:text-white text-left"
            >
              <FolderOpen className="w-3.5 h-3.5 text-blue-400" />
              <span>Explore LocalAppData Storage</span>
            </button>

            <button
              onClick={() => {
                onSetDefaultBoot(contextMenu.app!);
                setContextMenu({ ...contextMenu, visible: false });
              }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#161c28] hover:text-amber-300 text-left"
            >
              <Star className="w-3.5 h-3.5 text-amber-400" />
              <span>Set as Default Boot Title</span>
            </button>
          </div>

          <div className="border-t border-[#1b2332] py-1">
            <button
              onClick={() => {
                navigator.clipboard.writeText(contextMenu.app!.packageFullName);
                setContextMenu({ ...contextMenu, visible: false });
              }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#161c28] hover:text-white text-left text-[11px] font-mono text-slate-400"
            >
              <span>Copy PackageFullName</span>
            </button>

            <button
              onClick={() => {
                navigator.clipboard.writeText(contextMenu.app!.aumid);
                setContextMenu({ ...contextMenu, visible: false });
              }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#161c28] hover:text-white text-left text-[11px] font-mono text-slate-400"
            >
              <span>Copy AUMID</span>
            </button>

            {contextMenu.app.type !== 'System' && (
              <button
                onClick={() => {
                  onUninstallApp(contextMenu.app!);
                  setContextMenu({ ...contextMenu, visible: false });
                }}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-rose-950/50 hover:text-rose-300 text-left text-slate-400"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Uninstall Package</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
