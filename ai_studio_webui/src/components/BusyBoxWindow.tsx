import React, { useState, useRef, useEffect } from 'react';
import { 
  Terminal, 
  X, 
  Minus, 
  Maximize2, 
  Minimize2, 
  Plus, 
  Copy, 
  Check, 
  Network, 
  Radio, 
  Cpu, 
  Server, 
  FolderSync, 
  Layers, 
  Send,
  Trash2,
  Sliders,
  ChevronDown
} from 'lucide-react';
import { XboxConnectionConfig, XboxTelemetry, XboxProcess, XboxAppPackage, XboxModeCode } from '../types/xbox';
import { getModeDetail, XBOX_MODES } from '../services/mockXboxData';

export type BridgeType = 
  | 'busybox' 
  | 'wdp_rest' 
  | 'websocket_debug' 
  | 'ftp_bridge' 
  | 'smb_bridge' 
  | 'custom_socket'
  | 'kali';

export interface CommandHistoryItem {
  id: string;
  command: string;
  output: string;
  timestamp: string;
  isError?: boolean;
}

export interface TerminalSession {
  id: string;
  title: string;
  bridgeType: BridgeType;
  port: string;
  status: 'connected' | 'connecting' | 'idle';
  history: CommandHistoryItem[];
  commandHistoryList: string[];
  historyIndex: number;
}

interface BusyBoxWindowProps {
  isOpen: boolean;
  onClose: () => void;
  config: XboxConnectionConfig;
  telemetry: XboxTelemetry;
  processes: XboxProcess[];
  apps: XboxAppPackage[];
  onReboot: () => void;
  onKillPid: (pid: number) => void;
  onSwitchHardwareMode?: (modeCode: XboxModeCode) => void;
}

const BRIDGE_METADATA: Record<BridgeType, { label: string; iconColor: string; defaultPort: string; promptPrefix: string }> = {
  busybox: {
    label: 'BusyBox Shell',
    iconColor: 'text-blue-400',
    defaultPort: 'bash',
    promptPrefix: 'xbxowned@devkit:~$',
  },
  wdp_rest: {
    label: 'WDP REST Bridge',
    iconColor: 'text-cyan-400',
    defaultPort: '11443',
    promptPrefix: 'WDP-REST:11443>',
  },
  websocket_debug: {
    label: 'WebSocket Debug Bridge',
    iconColor: 'text-purple-400',
    defaultPort: '11443',
    promptPrefix: 'WS-ETW:11443#',
  },
  ftp_bridge: {
    label: 'FTP / Storage Bridge',
    iconColor: 'text-amber-400',
    defaultPort: '21',
    promptPrefix: 'ftp@isolated:21>',
  },
  smb_bridge: {
    label: 'SMB Share Bridge',
    iconColor: 'text-emerald-400',
    defaultPort: '445',
    promptPrefix: 'smb://devkit/dev>',
  },
  custom_socket: {
    label: 'Custom TCP/UDP Bridge',
    iconColor: 'text-rose-400',
    defaultPort: '38920',
    promptPrefix: 'sock:38920>',
  },
  kali: {
    label: 'Kali Pentest Shell',
    iconColor: 'text-rose-400',
    defaultPort: 'kali',
    promptPrefix: 'root@kali-xbox:~#',
  },
};

export const BusyBoxWindow: React.FC<BusyBoxWindowProps> = ({
  isOpen,
  onClose,
  config,
  telemetry,
  processes,
  apps,
  onReboot,
  onKillPid,
  onSwitchHardwareMode,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [commandInput, setCommandInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [isNewBridgeModalOpen, setIsNewBridgeModalOpen] = useState(false);
  const [selectedBridgeForNew, setSelectedBridgeForNew] = useState<BridgeType>('wdp_rest');
  const [customPortInput, setCustomPortInput] = useState('38920');

  // Terminal sessions state
  const [sessions, setSessions] = useState<TerminalSession[]>([
    {
      id: 'term-busybox-1',
      title: 'BusyBox 1',
      bridgeType: 'busybox',
      port: 'shell',
      status: 'connected',
      history: [
        {
          id: 'init-1',
          command: 'busybox --install',
          output: `BusyBox v1.36.1 (XBXOwned GameCore Scarlett Embedded Edition)
Active Session: Shell #1 · Target: ${config.machineName} (${config.ip})
Type 'help' to view available applets, or click '+ Bridge' to open additional network terminals.`,
          timestamp: '00:00:01',
        },
      ],
      commandHistoryList: [],
      historyIndex: -1,
    },
    {
      id: 'term-wdp-1',
      title: 'WDP REST :11443',
      bridgeType: 'wdp_rest',
      port: config.port,
      status: 'connected',
      history: [
        {
          id: 'init-wdp',
          command: 'GET /api/os/info',
          output: `HTTP/1.1 200 OK
Content-Type: application/json
{
  "MachineName": "${config.machineName}",
  "OsVersion": "${config.osVersion}",
  "Platform": "XboxOne_Scarlett",
  "DevMode": true,
  "Sandbox": "${config.sandboxId}"
}`,
          timestamp: '00:00:02',
        },
      ],
      commandHistoryList: ['GET /api/os/info'],
      historyIndex: -1,
    },
  ]);

  const [activeSessionId, setActiveSessionId] = useState<string>('term-busybox-1');

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];

  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized, activeSessionId]);

  useEffect(() => {
    if (terminalEndRef.current && !isMinimized) {
      terminalEndRef.current.scrollTop = terminalEndRef.current.scrollHeight;
    }
  }, [sessions, activeSessionId, isMinimized]);

  if (!isOpen) return null;

  // Add new bridge terminal session
  const handleCreateBridgeSession = () => {
    const meta = BRIDGE_METADATA[selectedBridgeForNew];
    const port = selectedBridgeForNew === 'custom_socket' ? customPortInput : 
                 selectedBridgeForNew === 'wdp_rest' ? config.port :
                 selectedBridgeForNew === 'websocket_debug' ? config.debugPort :
                 selectedBridgeForNew === 'ftp_bridge' ? config.ftpPort :
                 selectedBridgeForNew === 'smb_bridge' ? config.smbPort : meta.defaultPort;

    const newId = `term-${selectedBridgeForNew}-${Date.now()}`;
    const initialGreeting = 
      selectedBridgeForNew === 'wdp_rest' ? `WDP HTTPS Bridge attached to https://${config.ip}:${port}
Authenticated with Basic credentials. Commands: GET <endpoint>, POST <endpoint>, STATUS` :
      selectedBridgeForNew === 'websocket_debug' ? `WebSocket Debug Bridge connected to wss://${config.ip}:${port}/ext/app/rundebug
Listening to ETW OutputDebugString frames. Send JSON payloads or 'stream' commands.` :
      selectedBridgeForNew === 'ftp_bridge' ? `FTP Bridge connected to ftp://${config.ip}:${port} (Isolated LocalAppData storage)
Supported: USER, PASS, PWD, LIST, CWD, RETR, STOR, QUIT` :
      selectedBridgeForNew === 'smb_bridge' ? `Samba SMB Bridge mapped to //${config.ip}:${port}/DevelopmentFiles
Protocol: SMB3 / MS-SMB2 dialect 3.1.1` :
      selectedBridgeForNew === 'custom_socket' ? `TCP/UDP Custom Socket open to ${config.ip}:${port}
Ready for raw telemetry, RenderDoc server (38920), or Unreal Profiler (1985).` :
      `BusyBox Shell session initialized.`;

    const newSession: TerminalSession = {
      id: newId,
      title: `${meta.label.split(' ')[0]} :${port}`,
      bridgeType: selectedBridgeForNew,
      port,
      status: 'connected',
      history: [
        {
          id: `init-${Date.now()}`,
          command: `bridge --connect ${config.ip}:${port}`,
          output: initialGreeting,
          timestamp: new Date().toTimeString().split(' ')[0],
        },
      ],
      commandHistoryList: [],
      historyIndex: -1,
    };

    setSessions((prev) => [...prev, newSession]);
    setActiveSessionId(newId);
    setIsNewBridgeModalOpen(false);
  };

  const handleCloseSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessions.length <= 1) return;
    const remaining = sessions.filter((s) => s.id !== id);
    setSessions(remaining);
    if (activeSessionId === id) {
      setActiveSessionId(remaining[0].id);
    }
  };

  const executeCommand = (cmdStr: string) => {
    const trimmed = cmdStr.trim();
    if (!trimmed) return;

    const timestamp = new Date().toTimeString().split(' ')[0];
    const bridge = activeSession.bridgeType;
    let output = '';
    let isError = false;

    // Bridge-Specific Response Handlers
    if (bridge === 'wdp_rest') {
      const parts = trimmed.split(' ');
      const verb = parts[0].toUpperCase();
      const endpoint = parts[1] || '';

      if (trimmed === 'clear') {
        setSessions((prev) =>
          prev.map((s) => (s.id === activeSession.id ? { ...s, history: [] } : s))
        );
        return;
      } else if (verb === 'GET' && (endpoint.includes('/os/mode') || endpoint.includes('/ext/devmode') || endpoint.includes('/security/mode'))) {
        const modeDetail = getModeDetail(config.modeCode);
        output = `HTTP/1.1 200 OK
Content-Type: application/json
{
  "DeviceId": "${config.deviceId}",
  "SerialNumber": "${config.serialNumber}",
  "ConsoleId": "${config.consoleId}",
  "ModeCode": "${config.modeCode}",
  "HexRegister": "${modeDetail.hex}",
  "ModeName": "${modeDetail.label}",
  "ShortTag": "${modeDetail.shortTag}",
  "SideloadAllowed": ${modeDetail.sideloadAllowed},
  "WdpEnabled": ${modeDetail.wdpEnabled},
  "MemoryPool": "${modeDetail.memoryPool}",
  "SecurityFuses": "${modeDetail.securityFuses}"
}`;
      } else if (verb === 'GET' && endpoint.includes('/os/info')) {
        output = `HTTP/1.1 200 OK\n{\n  "MachineName": "${config.machineName}",\n  "OsVersion": "${config.osVersion}",\n  "DevMode": ${config.modeCode === '4001'},\n  "ModeCode": "${config.modeCode}",\n  "Platform": "${config.devkitModel}",\n  "DeviceId": "${config.deviceId}"\n}`;
      } else if (verb === 'GET' && endpoint.includes('/packagemanager')) {
        output = `HTTP/1.1 200 OK\n{\n  "InstalledPackagesCount": ${apps.length},\n  "ActiveTitle": "${apps.find((a) => a.isRunning)?.name || 'None'}"\n}`;
      } else if (verb === 'POST' && endpoint.includes('/control/restart')) {
        onReboot();
        output = `HTTP/1.1 202 Accepted\n{\n  "Status": "RebootInitiated",\n  "Machine": "${config.machineName}"\n}`;
      } else if (verb === 'HELP' || trimmed === 'help') {
        output = `WDP REST Bridge Commands:
  GET /api/os/info
  GET /api/os/mode
  GET /ext/devmode
  GET /ext/smb/developerfolder
  POST /ext/smb/developerfolder
  GET /api/os/machinename
  GET /api/app/packagemanager/packages
  GET /api/resourcemanager/processes
  POST /api/control/restart
  curl -k -u ${config.username.replace(/^.*[\\/]/, '')}:**** https://${config.ip}:${activeSession.port}/api/os/info`;
      } else if (trimmed.toLowerCase().includes('/ext/smb/developerfolder')) {
        const cleanU = config.username.replace(/^.*[\\/]/, '') || 'DevUser';
        output = `HTTP/1.1 200 OK\nContent-Type: application/json\n\n{\n  "Path": "\\\\\\\\${config.ip}\\\\DevelopmentFiles",\n  "Username": "${cleanU}",\n  "Domain": "WORKGROUP",\n  "Password": "${config.password}",\n  "PwdMustChange": false,\n  "SMB3Dialect": "3.1.1",\n  "NTLMv2Auth": "Enabled"\n}`;
      } else {
        output = `HTTP/1.1 200 OK\nEndpoint '${trimmed}' dispatched to https://${config.ip}:${activeSession.port}.\n{"status":"success","bridge":"wdp_rest"}`;
      }
    } else if (bridge === 'websocket_debug') {
      if (trimmed === 'clear') {
        setSessions((prev) =>
          prev.map((s) => (s.id === activeSession.id ? { ...s, history: [] } : s))
        );
        return;
      } else if (trimmed === 'ping') {
        output = `[WS PONG] Latency 1.4ms from wss://${config.ip}:${activeSession.port}/ext/app/rundebug`;
      } else if (trimmed.startsWith('send ') || trimmed.startsWith('emit ')) {
        output = `[WS TX -> XBOX] Frame sent: ${trimmed.substring(5)}\n[WS RX <- XBOX] ACK frame received (Code 0x00)`;
      } else {
        output = `[WS DEBUG BRIDGE] Sent frame: "${trimmed}"\n[WS EVENT] Handshake active on port ${activeSession.port}`;
      }
    } else if (bridge === 'ftp_bridge') {
      const upper = trimmed.toUpperCase();
      if (trimmed === 'clear') {
        setSessions((prev) =>
          prev.map((s) => (s.id === activeSession.id ? { ...s, history: [] } : s))
        );
        return;
      } else if (upper.startsWith('USER')) {
        output = `331 Password required for ${config.username.replace(/^.*[\\/]/, '')}`;
      } else if (upper.startsWith('PASS')) {
        output = `230 User logged in, proceed. (DevKit LocalAppData Isolated Sandbox)`;
      } else if (upper === 'PWD') {
        output = `257 "/LocalAppData/DevelopmentFiles" is the current directory`;
      } else if (upper === 'LIST' || upper === 'DIR') {
        output = `150 Here comes the directory listing.\n-rw-r--r-- 1 admin xbox 1420 Nov 10 18:24 settings.json\n-rw-r--r-- 1 admin xbox 2180 Nov 09 11:15 engine_config.ini\n-rw-r--r-- 1 admin xbox 842100 Nov 10 22:45 savegame_slot01.sav\n226 Directory send OK.`;
      } else if (upper.startsWith('CWD')) {
        output = `250 Directory successfully changed to ${trimmed.substring(4)}`;
      } else {
        output = `FTP Command: "${trimmed}"\n200 Command okay.`;
      }
    } else if (bridge === 'smb_bridge') {
      if (trimmed === 'clear') {
        setSessions((prev) =>
          prev.map((s) => (s.id === activeSession.id ? { ...s, history: [] } : s))
        );
        return;
      } else if (trimmed === 'ls' || trimmed === 'dir') {
        output = `  .                                   D        0  Tue Nov 11 00:02:11 2026\n  ..                                  D        0  Mon Nov 10 18:00:00 2026\n  Cyberpunk2077_Save                  D        0  Sun Nov 09 14:10:00 2026\n  DirectStorageScratch                D        0  Sat Nov 08 09:30:00 2026\n  settings.json                       A     1420  Mon Nov 10 18:24:00 2026\n\n\t\t558291040 blocks of size 1024. 312849100 blocks available`;
      } else if (trimmed === 'smbfix' || trimmed.includes('nt_status_logon_failure')) {
        const cleanU = config.username.replace(/^.*[\\/]/, '') || 'DevUser';
        output = `[SMB3 / NTLMv2 AUTO-FIX APPLIED]\n• Synced WORKGROUP\\${cleanU} with /ext/smb/developerfolder\n• Set PwdLastSet=NOW (PwdMustChange=0) to prevent NT_STATUS_LOGON_FAILURE\n• Linux command:\n  smbclient //${config.ip}/DevelopmentFiles -W WORKGROUP -U ${cleanU}%'${config.password}' -m SMB3 --option="client ntlmv2 auth=yes"`;
      } else {
        output = `smb: \\> ${trimmed}\nSMB3_COMMAND_SUCCESS (Share: //${config.ip}/DevelopmentFiles | Domain: WORKGROUP | Auth: NTLMv2)`;
      }
    } else if (bridge === 'custom_socket') {
      output = `[TCP :${activeSession.port}] Payload dispatched to ${config.ip}:${activeSession.port}\nReceived 64 bytes response: 0x47 0x44 0x4B 0x5F 0x52 0x45 0x41 0x44 0x59`;
    } else {
      // BusyBox standard shell execution
      const parts = trimmed.split(' ');
      const cmd = parts[0].toLowerCase();
      const args = parts.slice(1);

      if (cmd === 'clear') {
        setSessions((prev) =>
          prev.map((s) => (s.id === activeSession.id ? { ...s, history: [] } : s))
        );
        return;
      } else if (cmd === 'help') {
        output = `BusyBox v1.36.1 multi-call binary.
System Commands:
  deviceid           Print cryptographic Device ID, Serial & Console ID
  mode / getmode     Inspect hardware mode registers (2001, 4001, 6001, 8001, 0001)
  setmode <code>     Shift operational hardware mode (e.g. setmode 4001 or setmode 2001)
  smbfix             Fix NT_STATUS_LOGON_FAILURE for WORKGROUP\\DevUser (NTLMv2 + SMB3)
  uname -a           Kernel and CPU architecture
  free -m            Memory & GDDR6 Fast VRAM allocation
  df -h              DirectStorage NVMe storage allocation
  netstat -tlpn      Active listening service ports
  ps aux             Running games and background service processes
  ping <ip>          Network latency probe
  laps [status|reset] Universal LAPS Reset across console TPM & DevToolsUser
  net user [name]    List & inspect local console accounts (WORKGROUP\\DevUser, DevToolsUser)
  net user <u> <p>   Studio Admin reset employee login credentials (PwdMustChange=0)
  net localgroup     List Xbox OS security groups & group members
  passwd <user>      Administrative password reset override
  reboot             Trigger DevKit restart sequence`;
      } else if (cmd === 'smbfix' || cmd === 'smbclient') {
        const cleanU = config.username.replace(/^.*[\\/]/, '') || 'DevUser';
        output = `======================================================================
[XBOX SMB3 & WDP NT_STATUS_LOGON_FAILURE RESOLVER]
======================================================================
1. Synced WORKGROUP\\${cleanU} with WDP /ext/smb/developerfolder -> 200 OK
2. Cleared PwdMustChange=1 (set PwdLastSet=NOW) so srv2.sys accepts network logon
3. Stripped double 'WORKGROUP\\' prefix from HTTP Basic Auth header
4. Ready-to-run Linux commands:
   gio mount -u smb://${config.ip}/DevelopmentFiles 2>/dev/null
   smbclient //${config.ip}/DevelopmentFiles -W WORKGROUP -U ${cleanU}%'${config.password}' -m SMB3 --option="client ntlmv2 auth=yes" --option="client lanman auth=no"
   sudo mount -t cifs //${config.ip}/DevelopmentFiles /mnt/xbox -o vers=3.0,sec=ntlmssp,domain=WORKGROUP,username=${cleanU},password='${config.password}'
======================================================================`;
      } else if (cmd === 'deviceid' || cmd === 'guid') {
        output = `====================================================
XBOX CRYPTOGRAPHIC DEVICE IDENTIFIERS
====================================================
Device ID (GUID):    ${config.deviceId}
Chassis Serial:      ${config.serialNumber}
Console Cert ID:     ${config.consoleId}
MAC Address:         ${config.macAddress}
Motherboard Rev:     ${config.motherboardRev}
Active Mode:         [${config.hexCode}] ${config.hardwareMode} (Register 0x${config.modeCode})
Active Sandbox:      ${config.sandboxId}
====================================================`;
      } else if (cmd === 'mode' || cmd === 'getmode') {
        const modeDetail = getModeDetail(config.modeCode);
        output = `====================================================
XBOX HARDWARE MODE DETECTION REGISTER
====================================================
Register Readout:       0x${config.modeCode} (${config.modeCode})
Operational Mode:       ${modeDetail.label} [${modeDetail.hex}]
Privilege Level:        ${modeDetail.shortTag}
Sideloading (MSIX):     ${modeDetail.sideloadAllowed ? 'ENABLED' : 'LOCKED'}
WDP Portal (:11443):    ${modeDetail.wdpEnabled ? 'ACTIVE' : 'RESTRICTED'}
GDDR6 Unified Memory:   ${modeDetail.memoryPool}
Security Fuses:         ${modeDetail.securityFuses}
Network Sockets:        ${modeDetail.defaultPortAccess}
Device ID GUID:         ${config.deviceId}
Chassis Serial:         ${config.serialNumber}
====================================================`;
      } else if (cmd === 'setmode') {
        const target = (args[0] || '').replace(/^0x/i, '').toLowerCase();
        let targetCode: XboxModeCode | null = null;
        if (target === '2001' || target === 'retail') targetCode = '2001';
        else if (target === '4001' || target === 'dev' || target === 'devkit') targetCode = '4001';
        else if (target === '6001' || target === 'testkit' || target === 'qa') targetCode = '6001';
        else if (target === '8001' || target === 'mfg' || target === 'factory') targetCode = '8001';
        else if (target === '0001' || target === 'safe' || target === 'recovery') targetCode = '0001';

        if (targetCode) {
          if (onSwitchHardwareMode) {
            onSwitchHardwareMode(targetCode);
          }
          const targetDetail = getModeDetail(targetCode);
          output = `[OK] Hardware Mode Register shifted to 0x${targetCode} (${targetDetail.label}).
Security fuses reconfigured: ${targetDetail.securityFuses}
Sideloading: ${targetDetail.sideloadAllowed ? 'ENABLED' : 'RESTRICTED'}.
Memory Pool: ${targetDetail.memoryPool}.`;
        } else {
          output = `Usage: setmode <2001|4001|6001|8001|0001>
  2001: Retail Mode (Consumer locked sandbox, 13.5GB)
  4001: Developer Mode (Full ERA unlocked, 16GB GDDR6)
  6001: TestKit Mode (QA certification test harness)
  8001: Manufacturing / Factory Mode (Baremetal diagnostics)
  0001: Safe Mode / Recovery (Failsafe boot partition)`;
        }
      } else if (cmd === 'laps' || cmd === 'reset-lapspassword' || cmd === 'invoke-lapspolicyprocessing') {
        const sub = (args[0] || '').toLowerCase();
        const isForceUniversal = sub.includes('reset') || sub.includes('/reset') || sub.includes('--force') || sub.includes('-force') || cmd === 'reset-lapspassword';
        const currentLaps = config.lapsConfig || {
          targetAccount: 'DevToolsUser',
          status: 'Compliant',
          expirationDate: '2026-11-28 08:00:00 UTC',
          backupStore: 'LocalTPM',
          rotationIntervalDays: 30,
          currentPassword: config.password,
        };

        if (isForceUniversal) {
          output = `======================================================================
[UNIVERSAL LAPS RESET COMMAND EXECUTED]
Command: Reset-LapsPassword -Identity DevToolsUser -Force
======================================================================
>> Target Account:          WORKGROUP\\${currentLaps.targetAccount} (Xbox Primary Local Admin)
>> Hardware Enclave:        Console TPM 2.0 (NVRAM Index 0x01800001)
>> Generating High-Entropy 20-character cryptographic secret...
>> Resealing password to ${currentLaps.backupStore} with Endorsement Key (EK)
>> Setting PwdLastSet=NOW (PwdMustChange=0) to prevent NT_STATUS_LOGON_FAILURE
>> Synchronizing Windows Device Portal Basic Auth (:11443) & SMB (:445)
[SUCCESS] Universal LAPS reset complete.
Next Expiration: in ${currentLaps.rotationIntervalDays} days.
Account ${currentLaps.targetAccount} is 100% compliant and sealed.
======================================================================`;
        } else {
          output = `====================================================
WINDOWS LOCAL ADMINISTRATOR PASSWORD SOLUTION (LAPS)
====================================================
Policy Status:        ${currentLaps.status} (RFC 4120 / TPM 2.0 Sealed)
Managed Account:      WORKGROUP\\${currentLaps.targetAccount}
Escrow Store:         ${currentLaps.backupStore}
Rotation Interval:    Every ${currentLaps.rotationIntervalDays} days
Expires At:           ${currentLaps.expirationDate}
WDP Basic Auth Sync:  ACTIVE (:11443) | SMB3 NTLMv2: ACTIVE (:445)
Universal Commands:
  laps reset              Universal reset across hardware TPM
  Reset-LapsPassword -Force Force universal rotation & ticket purge
  laps status             Display active LAPS compliance state
====================================================`;
        }
      } else if (cmd === 'net' && (args[0] === 'user' || args[0] === 'users')) {
        const rawTargetUser = args[1];
        const targetUser = rawTargetUser ? rawTargetUser.replace(/^.*[\\/]/, '') : undefined;
        const newPass = args[2];
        const usersList = config.localUsers || [];

        if (!targetUser) {
          // net user list
          output = `User accounts for \\\\${config.machineName} (Domain: WORKGROUP)\n\n-------------------------------------------------------------------------------\nAdministrator            DefaultAccount           DevToolsUser\nDevUser                  Guest                    SshUser\nWDPAccessUser            XboxTestGamer_01\nThe command completed successfully.`;
        } else if (newPass && !newPass.startsWith('/')) {
          // net user DevUser <password>
          output = `[STUDIO ADMIN] Password reset command dispatched for 'WORKGROUP\\${targetUser}'.\nNET USER: The command completed successfully.\nSynced with WDP /ext/smb/developerfolder (PwdLastSet=NOW, PwdMustChange=0).\nSMB3 NTLMv2 & WDP Basic Auth ready (No NT_STATUS_LOGON_FAILURE).`;
        } else {
          // net user <name> inspect
          const u = usersList.find((x) => x.username.toLowerCase() === targetUser.toLowerCase());
          if (u) {
            output = `User name                    ${u.username} (SAM: WORKGROUP\\${u.username})
Full Name                    ${u.displayName}
Comment                      ${u.description}
User's comment               Studio Development Profile
Country/region code          000 (System Default)
Account active               ${u.status !== 'Disabled' ? 'Yes' : 'No'}
Account expires              Never

Password last set            ${u.passwordLastSet}
Password expires             Never
Password changeable          Yes
Password required            Yes
User may change password     Yes

Workstations allowed         All (Scarlett / Durango)
Logon script                 None
User profile                 ${u.homeDirectory}
Home directory               ${u.homeDirectory}
Last logon                   ${u.lastLogin}

Logon hours allowed          All

Local Group Memberships      ${(u.groups || ['Xbox Development Users']).map((g) => '*' + g).join(' ')}
Global Group memberships     *None
The command completed successfully.`;
          } else {
            output = `The user name '${targetUser}' could not be found.\nType 'net user' to list available local accounts.`;
          }
        }
      } else if (cmd === 'net' && (args[0] === 'localgroup' || args[0] === 'group')) {
        const groupName = args[1];
        if (!groupName) {
          output = `Aliases for \\\\${config.machineName}\n\n-------------------------------------------------------------------------------\n*Administrators\n*Device Portal Users\n*GameCore Sandboxed Users\n*Guests\n*Performance Log Users\n*Remote Desktop & Shell Users\n*Xbox Development Users\n*Xbox Live Test Gamers\nThe command completed successfully.`;
        } else {
          output = `Alias name     ${groupName}\nComment        Xbox Operating System Security Boundary\n\nMembers\n-------------------------------------------------------------------------------\nDevToolsUser\nDevUser\nWDPAccessUser\nThe command completed successfully.`;
        }
      } else if (cmd === 'passwd') {
        const targetUser = args[0] || 'DevUser';
        output = `[STUDIO ADMIN] Changing password for ${targetUser}.\nEntering administrative override: New temporary password generated & hashed.\npasswd: password updated successfully.`;
      } else if (cmd === 'whoami') {
        output = `${config.machineName.toLowerCase()}\\${config.username}`;
      } else if (cmd === 'users' || cmd === 'who') {
        output = `DevToolsUser DevUser WDPAccessUser SshUser DefaultAccount XboxTestGamer_01`;
      } else if (cmd === 'id') {
        output = `uid=1002(DevUser) gid=1001(xbox_devs) groups=1001(xbox_devs),544(administrators),582(device_portal_users)`;
      } else if (cmd === 'uname') {
        output = `Linux ${config.machineName.toLowerCase()} 5.15.0-scarlett-xbox #1 SMP AMD Zen2 8-Core x86_64`;
      } else if (cmd === 'free') {
        output = `              total        used        free      shared  buff/cache\nMem:          16384        9420        5100         450        1864\nFastVRAM:     10240        7650        2590 (GPU 560 GB/s)`;
      } else if (cmd === 'df') {
        output = `Filesystem      Size  Used Avail Use% Mounted on\n/dev/nvme0n1p1  1000G  442G  558G  45% /\n/dev/sda1        1.0T  180G  820G  18% /mnt/expansion`;
      } else if (cmd === 'netstat') {
        output = `Active listening ports:\nTCP 0.0.0.0:${config.port} (WDP HTTPS)\nTCP 0.0.0.0:${config.debugPort} (Debug WSS)\nTCP 0.0.0.0:${config.ftpPort} (FTP)\nTCP 0.0.0.0:${config.smbPort} (SMB)`;
      } else if (cmd === 'ps') {
        output = processes.map((p) => `${p.pid.toString().padStart(5)} ${p.name.padEnd(20)} CPU:${p.cpuPercent}% RAM:${p.memoryMb}MB`).join('\n');
      } else if (cmd === 'ping') {
        output = `64 bytes from ${config.ip}: icmp_seq=1 ttl=64 time=${config.lastPingMs} ms`;
      } else if (cmd === 'reboot') {
        onReboot();
        output = `Broadcast: System reboot initiated.`;
      } else {
        output = `busybox: ${cmd}: command executed on ${config.machineName}`;
      }
    }

    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== activeSession.id) return s;
        return {
          ...s,
          history: [
            ...s.history,
            {
              id: `cmd-${Date.now()}`,
              command: trimmed,
              output,
              timestamp,
              isError,
            },
          ],
          commandHistoryList: [...s.commandHistoryList, trimmed],
          historyIndex: -1,
        };
      })
    );
    setCommandInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executeCommand(commandInput);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const list = activeSession.commandHistoryList;
      if (list.length === 0) return;
      const nextIdx = activeSession.historyIndex === -1 ? list.length - 1 : Math.max(0, activeSession.historyIndex - 1);
      setSessions((prev) =>
        prev.map((s) => (s.id === activeSession.id ? { ...s, historyIndex: nextIdx } : s))
      );
      setCommandInput(list[nextIdx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const list = activeSession.commandHistoryList;
      if (activeSession.historyIndex >= 0 && activeSession.historyIndex < list.length - 1) {
        const nextIdx = activeSession.historyIndex + 1;
        setSessions((prev) =>
          prev.map((s) => (s.id === activeSession.id ? { ...s, historyIndex: nextIdx } : s))
        );
        setCommandInput(list[nextIdx]);
      } else {
        setSessions((prev) =>
          prev.map((s) => (s.id === activeSession.id ? { ...s, historyIndex: -1 } : s))
        );
        setCommandInput('');
      }
    }
  };

  const currentMeta = BRIDGE_METADATA[activeSession.bridgeType];

  return (
    <div
      className={`fixed z-40 transition-all duration-200 flex flex-col bg-[#080a0e] border border-blue-500/40 rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.85)] overflow-hidden ${
        isMaximized
          ? 'inset-3'
          : isMinimized
          ? 'bottom-4 right-4 w-72 h-11'
          : 'bottom-4 right-4 sm:right-6 w-[94vw] sm:w-[760px] h-[520px]'
      }`}
    >
      {/* Title Bar (Linux Window Style + Multi-Terminal Tabs) */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#0c1017] border-b border-[#1c2434] select-none text-xs">
        {/* Terminal Sessions Tab Bar */}
        <div className="flex items-center gap-1 overflow-x-auto py-0.5 max-w-[80%]">
          {sessions.map((sess) => {
            const isActive = sess.id === activeSessionId;
            const meta = BRIDGE_METADATA[sess.bridgeType];
            return (
              <div
                key={sess.id}
                onClick={() => setActiveSessionId(sess.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-semibold cursor-pointer border transition-colors ${
                  isActive
                    ? 'bg-[#151c28] border-blue-500/80 text-white shadow-sm'
                    : 'bg-[#0e121a] border-[#1f2838] text-slate-400 hover:text-slate-200 hover:bg-[#121721]'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-blue-400' : 'bg-slate-500'}`} />
                <span className="truncate max-w-[110px]">{sess.title}</span>

                {sessions.length > 1 && (
                  <button
                    onClick={(e) => handleCloseSession(sess.id, e)}
                    className="text-slate-500 hover:text-rose-400 p-0.5 rounded"
                    title="Close Terminal Tab"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            );
          })}

          {/* Add New Bridge Terminal Button */}
          <button
            onClick={() => setIsNewBridgeModalOpen(true)}
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#131924] border border-blue-500/40 text-blue-300 hover:bg-blue-600 hover:text-white text-xs font-semibold shrink-0 transition-colors"
            title="Open additional terminal for WDP, WebSocket, FTP, or Custom Socket"
          >
            <Plus className="w-3 h-3" />
            <span className="hidden sm:inline">Bridge</span>
          </button>
        </div>

        {/* Window Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-[#161d2a]"
            title={isMinimized ? 'Restore' : 'Minimize'}
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          {!isMinimized && (
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-[#161d2a]"
              title={isMaximized ? 'Restore Size' : 'Maximize'}
            >
              {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-rose-950/40"
            title="Close BusyBox"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Active Bridge Status Strip */}
          <div className="flex items-center justify-between px-3 py-1 bg-[#0a0d13] border-b border-[#151c28] text-[11px] font-mono text-slate-400">
            <div className="flex items-center gap-2">
              <span className={`font-bold ${currentMeta.iconColor}`}>
                {currentMeta.label}
              </span>
              <span className="text-slate-600">·</span>
              <span>Port: {activeSession.port}</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-300">Target: {config.ip}</span>
            </div>

            <div className="flex items-center gap-2">
              {activeSession.bridgeType === 'wdp_rest' && (
                <span className="text-cyan-400 text-[10px]">Try: GET /api/os/info</span>
              )}
              {activeSession.bridgeType === 'ftp_bridge' && (
                <span className="text-amber-400 text-[10px]">Try: LIST or PWD</span>
              )}
              {activeSession.bridgeType === 'busybox' && (
                <span className="text-blue-400 text-[10px]">Try: free -m or df -h</span>
              )}
            </div>
          </div>

          {/* Terminal Output Area */}
          <div
            ref={terminalEndRef}
            className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs select-text leading-relaxed bg-[#05070a]"
          >
            {activeSession.history.map((item) => (
              <div key={item.id} className="space-y-1">
                <div className="flex items-center gap-1.5 text-blue-400 font-semibold">
                  <span className="text-emerald-400">
                    {currentMeta.promptPrefix}
                  </span>
                  <span className="text-white">{item.command}</span>
                </div>

                <pre
                  className={`pl-4 whitespace-pre-wrap ${
                    item.isError ? 'text-rose-400' : 'text-slate-300'
                  }`}
                >
                  {item.output}
                </pre>
              </div>
            ))}
          </div>

          {/* Prompt Input Row */}
          <div className="flex items-center gap-2 px-3 py-2 bg-[#0c1017] border-t border-[#1c2434] font-mono text-xs">
            <span className="text-emerald-400 font-bold shrink-0">
              {currentMeta.promptPrefix}
            </span>
            <input
              ref={inputRef}
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                activeSession.bridgeType === 'wdp_rest'
                  ? 'e.g. GET /api/os/info, GET /api/resourcemanager/processes...'
                  : activeSession.bridgeType === 'ftp_bridge'
                  ? 'e.g. LIST, PWD, CWD /LocalAppData...'
                  : activeSession.bridgeType === 'websocket_debug'
                  ? 'e.g. ping, send {"action":"trace"}...'
                  : 'Type shell command, e.g. help, df -h, free -m, ps...'
              }
              className="flex-1 bg-transparent text-white focus:outline-none placeholder:text-slate-600 font-mono text-xs"
              spellCheck={false}
              autoComplete="off"
            />
            <button
              onClick={() => executeCommand(commandInput)}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-bold font-sans transition-colors shrink-0"
            >
              Send
            </button>
          </div>
        </>
      )}

      {/* New Bridge Dialog Modal */}
      {isNewBridgeModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-100">
          <div className="w-full max-w-sm bg-[#0e1219] border border-[#222b3d] rounded-xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1c2434] pb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Network className="w-4 h-4 text-blue-400" />
                <span>Open Additional Bridge Terminal</span>
              </h3>
              <button
                onClick={() => setIsNewBridgeModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Select Bridge Protocol / Channel
              </label>

              <div className="space-y-1.5">
                {(
                  [
                    'busybox',
                    'wdp_rest',
                    'websocket_debug',
                    'ftp_bridge',
                    'smb_bridge',
                    'custom_socket',
                  ] as BridgeType[]
                ).map((type) => {
                  const meta = BRIDGE_METADATA[type];
                  const isSelected = selectedBridgeForNew === type;
                  return (
                    <div
                      key={type}
                      onClick={() => setSelectedBridgeForNew(type)}
                      className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-all ${
                        isSelected
                          ? 'bg-blue-950/60 border-blue-500 text-white shadow-sm'
                          : 'bg-[#111622] border-[#1d2535] text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <div className="font-semibold flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-blue-400' : 'bg-slate-600'}`} />
                        <span>{meta.label}</span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        Port: {type === 'wdp_rest' ? config.port : type === 'websocket_debug' ? config.debugPort : type === 'ftp_bridge' ? config.ftpPort : type === 'smb_bridge' ? config.smbPort : meta.defaultPort}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {selectedBridgeForNew === 'custom_socket' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Custom Socket Port
                </label>
                <input
                  type="text"
                  value={customPortInput}
                  onChange={(e) => setCustomPortInput(e.target.value)}
                  placeholder="38920 (RenderDoc) or 1985 (Unreal)"
                  className="w-full bg-[#121620] border border-[#212938] rounded px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1c2434]">
              <button
                type="button"
                onClick={() => setIsNewBridgeModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateBridgeSession}
                className="px-4 py-1.5 text-xs font-bold bg-blue-600 text-white rounded hover:bg-blue-500 shadow-sm"
              >
                Launch Terminal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
