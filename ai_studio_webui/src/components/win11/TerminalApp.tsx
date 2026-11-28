import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Plus, Trash2 } from 'lucide-react';
import { VfsNode, Win11Process, Win11SystemConfig } from '../../types/win11';

interface TerminalAppProps {
  initialShell: 'cmd' | 'powershell';
  vfs: VfsNode[];
  processes: Win11Process[];
  systemConfig: Win11SystemConfig;
}

interface TermLine {
  id: string;
  text: string;
  isCommand?: boolean;
}

export const TerminalApp: React.FC<TerminalAppProps> = ({
  initialShell,
  vfs,
  processes,
  systemConfig,
}) => {
  const [shellMode, setShellMode] = useState<'cmd' | 'powershell'>(initialShell);
  const [cwd, setCwd] = useState<string>('D:\\DevelopmentFiles\\Windows11Desktop');
  const [input, setInput] = useState('');
  const [lines, setLines] = useState<TermLine[]>(() => [
    {
      id: 'init-1',
      text:
        initialShell === 'powershell'
          ? `PowerShell 7.4.6 (Xbox Series X Native Desktop Build 26100.1)\nCopyright (c) Microsoft Corporation. All rights reserved.\n\nType 'help', 'Get-Process', 'Get-Volume', 'ollama list', or 'smb-deploy' for commands.`
          : `Microsoft Windows [Version 10.0.26100.1 - Xbox Series X Native Desktop]\n(c) Microsoft Corporation. All rights reserved.\n\nType 'help', 'dir', 'ipconfig', 'tasklist', 'net share', or 'llama-cli' for commands.`,
    },
  ]);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  const runCommand = (raw: string) => {
    const cmd = raw.trim();
    const promptPrefix = shellMode === 'powershell' ? `PS ${cwd}> ` : `${cwd}>`;

    const nextLines: TermLine[] = [
      ...lines,
      { id: `cmd-${Date.now()}`, text: `${promptPrefix}${cmd}`, isCommand: true },
    ];

    if (!cmd) {
      setLines(nextLines);
      return;
    }

    const lower = cmd.toLowerCase();
    let output = '';

    if (lower === 'cls' || lower === 'clear') {
      setLines([]);
      return;
    } else if (lower === 'help') {
      output = [
        `Available Native Desktop Commands (${shellMode.toUpperCase()}):`,
        `  dir / ls          List files and folders in current Xbox partition (${cwd})`,
        `  cd <path>         Change active directory (e.g., cd D:\\DevelopmentFiles\\Models)`,
        `  ipconfig          Display Xbox Series X Ethernet/Wi-Fi & SMB3 (:445) configuration`,
        `  systeminfo        Show Xbox Series X (Project Scarlett) Windows 11 Desktop OS specs`,
        `  tasklist          List running Windows 11 Desktop & Hermes AI processes`,
        `  Get-Process       PowerShell process table with CPU and GDDR6 memory usage`,
        `  Get-Volume        List mounted Xbox Series X SSD volumes (C:, D:, E:, Q:, U:)`,
        `  net share         Show active SMB3 shares (//${systemConfig.consoleIp}/DevelopmentFiles)`,
        `  llama-cli / ollama Run or inspect local offline Hugging Face GGUF models`,
        `  cls / clear       Clear terminal buffer`,
      ].join('\n');
    } else if (lower === 'dir' || lower === 'ls' || lower === 'get-childitem') {
      const items = vfs.filter((n) => n.parentPath.toLowerCase() === cwd.toLowerCase());
      output = [
        ` Volume in drive ${cwd.slice(0, 1)} is Xbox_NVMe_SSD`,
        ` Directory of ${cwd}`,
        ``,
        ...items.map((item) =>
          item.type === 'folder'
            ? `${item.modifiedAt}    <DIR>          ${item.name}`
            : `${item.modifiedAt}         ${String(item.sizeBytes || 1024).padStart(9, ' ')} ${item.name}`
        ),
        `               ${items.length} Item(s)`,
      ].join('\n');
    } else if (lower.startsWith('cd ')) {
      let target = cmd.slice(3).trim();
      if (/^\/d\s+/i.test(target)) {
        target = target.replace(/^\/d\s+/i, '').trim();
      }
      if (target === '..') {
        const parts = cwd.split('\\');
        if (parts.length > 1) {
          parts.pop();
          setCwd(parts.join('\\') || 'D:\\');
        }
      } else if (target.includes(':')) {
        setCwd(target.replace(/\//g, '\\'));
      } else {
        setCwd(`${cwd.endsWith('\\') ? cwd : cwd + '\\'}${target.replace(/\//g, '\\')}`);
      }
      setLines(nextLines);
      return;
    } else if (lower === 'ipconfig' || lower === 'get-netipaddress') {
      output = [
        `Windows IP Configuration (Xbox Series X DevKit)`,
        ``,
        `Ethernet adapter Gaming-NIC0:`,
        `   Connection-specific DNS Suffix  . : localdomain`,
        `   IPv4 Address. . . . . . . . . . . : ${systemConfig.consoleIp}`,
        `   Subnet Mask . . . . . . . . . . . : 255.255.255.0`,
        `   SMB3 Listener Port  . . . . . . . : TCP 445 (ACTIVE - //${systemConfig.consoleIp}/${systemConfig.smbShareName})`,
        `   Windows Device Portal . . . . . . : HTTPS ${systemConfig.wdpPort}`,
        `   WAN Lockdown Firewall . . . . . . : ${systemConfig.lanOnlyLockdown ? 'ENABLED (External WAN Blocked)' : 'DISABLED'}`,
      ].join('\n');
    } else if (lower === 'systeminfo') {
      output = [
        `Host Name:                 XBOX-WIN11-DESKTOP`,
        `OS Name:                   Microsoft Windows 11 Pro for Xbox Series X (Native Desktop)`,
        `OS Version:                10.0.26100 N/A Build 26100.1`,
        `System Model:              Xbox Series X DevKit (Project Scarlett - 8-Core Zen 2 @ 3.80GHz)`,
        `Total Physical Memory:     16,384 MB GDDR6 (320-bit bus)`,
        `Display Output:            HDMI 2.1 (${systemConfig.resolution})`,
        `USB Input Stack:           ${systemConfig.usbKeyboardName} + ${systemConfig.usbMouseName}`,
        `Local AI Engine:           ${systemConfig.customHfFilename} (100% Offline Local Inference)`,
      ].join('\n');
    } else if (lower === 'tasklist' || lower === 'get-process') {
      output = [
        `Image Name                     PID Session Name        Mem Usage      CPU`,
        `========================= ======== ================ ============ ========`,
        ...processes.map(
          (p) =>
            `${p.name.padEnd(25, ' ')} ${String(p.pid).padStart(8, ' ')} Console          ${String(
              p.memoryMb + ' MB'
            ).padStart(12, ' ')} ${String(p.cpuPercent.toFixed(1) + '%').padStart(8, ' ')}`
        ),
      ].join('\n');
    } else if (lower === 'get-volume') {
      output = [
        `DriveLetter FileSystemLabel FileSystem DriveType HealthStatus SizeRemaining     Size`,
        `----------- --------------- ---------- --------- ------------ -------------     ----`,
        `C           XboxSystemOS    NTFS       Fixed     Healthy            18.4 GB  64.0 GB`,
        `D           DevelopmentFiles NTFS      Fixed     Healthy           642.1 GB 802.0 GB`,
        `E           DevScratchpad   NTFS       Fixed     Healthy            44.0 GB  64.0 GB`,
        `Q           SystemCerts     NTFS       Fixed     Healthy             3.8 GB   4.0 GB`,
        `U           UserDesktop     NTFS       Fixed     Healthy           642.1 GB 802.0 GB`,
      ].join('\n');
    } else if (lower === 'net share') {
      output = [
        `Share name         Resource                        Remark`,
        `-------------------------------------------------------------------------------`,
        `DevelopmentFiles   D:\\DevelopmentFiles             Xbox DevKit SMB3 Share (:445)`,
        `IPC$                                               Remote IPC`,
        `The command completed successfully.`,
      ].join('\n');
    } else if (lower.startsWith('ollama') || lower.startsWith('llama')) {
      output = [
        `[Hermes Local AI Runtime — On-Device GGUF Engine]`,
        `Active Weights : D:\\DevelopmentFiles\\Models\\${systemConfig.customHfFilename}`,
        `Fallback Model : D:\\DevelopmentFiles\\Models\\gemma-3-1b-it-Q4_K_M.gguf (Mobile Local)`,
        `Network Status : 100% Offline Ready (Zero external API dependency)`,
      ].join('\n');
    } else {
      output = `[${shellMode.toUpperCase()}] Executed: '${cmd}' on D:\\DevelopmentFiles\\Windows11Desktop (Exit Code 0). Type 'help' for built-in system diagnostics.`;
    }

    setLines([
      ...nextLines,
      { id: `out-${Date.now()}`, text: output },
    ]);
  };

  return (
    <div className="flex flex-col h-full bg-[#0c0c0c] text-slate-100 font-mono">
      {/* Windows Terminal Tab Strip */}
      <div className="flex items-center justify-between px-2 pt-1.5 bg-[#1b1b1b] border-b border-white/10 select-none">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShellMode('cmd')}
            className={`px-3 py-1.5 rounded-t text-xs flex items-center gap-1.5 transition-colors ${
              shellMode === 'cmd'
                ? 'bg-[#0c0c0c] text-white border-t border-x border-white/10'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-amber-400" />
            <span>Command Prompt (cmd.exe)</span>
          </button>

          <button
            type="button"
            onClick={() => setShellMode('powershell')}
            className={`px-3 py-1.5 rounded-t text-xs flex items-center gap-1.5 transition-colors ${
              shellMode === 'powershell'
                ? 'bg-[#012456] text-white border-t border-x border-sky-400/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-sky-400" />
            <span>PowerShell 7.4 (pwsh.exe)</span>
          </button>
        </div>

        <div className="flex items-center gap-1 pb-1">
          <button
            type="button"
            onClick={() => runCommand('help')}
            className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[11px] text-slate-300 flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            <span>Help</span>
          </button>
          <button
            type="button"
            onClick={() => setLines([])}
            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
            title="Clear Screen"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Console Buffer */}
      <div
        ref={scrollRef}
        className={`flex-1 overflow-y-auto p-3.5 space-y-2 text-xs leading-relaxed ${
          shellMode === 'powershell' ? 'bg-[#011638]' : 'bg-[#0c0c0c]'
        }`}
      >
        {lines.map((line) => (
          <pre
            key={line.id}
            className={`whitespace-pre-wrap font-mono ${
              line.isCommand ? 'text-amber-300 font-semibold' : 'text-slate-200'
            }`}
          >
            {line.text}
          </pre>
        ))}

        {/* Active Prompt Line */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            runCommand(input);
            setInput('');
          }}
          className="flex items-center gap-1.5 pt-1"
        >
          <span className="text-emerald-400 shrink-0">
            {shellMode === 'powershell' ? `PS ${cwd}>` : `${cwd}>`}
          </span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoFocus
            className="flex-1 bg-transparent text-white focus:outline-none font-mono text-xs"
            placeholder="Type dir, ipconfig, systeminfo, Get-Volume, net share..."
          />
        </form>
      </div>
    </div>
  );
};
