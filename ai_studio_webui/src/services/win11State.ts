import {
  Win11WindowState,
  VfsNode,
  Win11Process,
  HfLocalModelPreset,
  Win11SystemConfig,
} from '../types/win11';

export const HF_LOCAL_MODELS: HfLocalModelPreset[] = [
  {
    id: 'hermes-3-3b',
    name: 'Hermes-3-Llama-3.2-3B GGUF (Default Hermes Copilot)',
    repo: 'NousResearch/Hermes-3-Llama-3.2-3B-GGUF',
    filename: 'Hermes-3-Llama-3.2-3B.Q4_K_M.gguf',
    size: '1.92 GB',
    quant: 'Q4_K_M',
    architecture: 'Llama 3.2 (Hermes 3)',
    description: 'Official NousResearch Hermes 3 local weights tuned for OS control, PowerShell, and offline reasoning.',
  },
  {
    id: 'gemma-3-1b',
    name: 'Gemma-3-1B-IT GGUF (Google Mobile Local Model)',
    repo: 'ggml-org/gemma-3-1b-it-GGUF',
    filename: 'gemma-3-1b-it-Q4_K_M.gguf',
    size: '806 MB',
    quant: 'Q4_K_M',
    architecture: 'Gemma 3 (Mobile / Edge)',
    description: 'Ultra-lightweight on-device model used on mobile and embedded hardware with zero internet dependency.',
  },
  {
    id: 'qwen-coder-1.5b',
    name: 'Qwen2.5-Coder-1.5B-Instruct GGUF',
    repo: 'Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF',
    filename: 'qwen2.5-coder-1.5b-instruct-q4_k_m.gguf',
    size: '1.12 GB',
    quant: 'Q4_K_M',
    architecture: 'Qwen 2.5 Coder',
    description: 'Specialized for PowerShell, CMD batch scripting, C++/WinRT shell code, and SMB automation.',
  },
  {
    id: 'smollm2-360m',
    name: 'SmolLM2-360M-Instruct GGUF (Instant Boot)',
    repo: 'HuggingFaceTB/SmolLM2-360M-Instruct-GGUF',
    filename: 'smollm2-360m-instruct-q8_0.gguf',
    size: '386 MB',
    quant: 'Q8_0',
    architecture: 'SmolLM2',
    description: 'Fits entirely in L3/scratchpad cache for sub-50ms local token generation.',
  },
];

export const INITIAL_SYSTEM_CONFIG: Win11SystemConfig = {
  consoleIp: '192.168.1.50',
  smbUser: 'DevToolsUser',
  smbPassword: 'password',
  smbShareName: 'DevelopmentFiles',
  wdpPort: 11443,
  lanOnlyLockdown: true,
  resolution: '3840x2160 (4K UHD @ 120Hz)',
  uiScalePercent: 100,
  wallpaperId: 'bloom-dark',
  usbKeyboardConnected: true,
  usbKeyboardName: 'USB HID Full-Size Mechanical Keyboard (045E:07F8)',
  usbMouseConnected: true,
  usbMouseName: 'USB Optical Gaming Mouse 1000Hz Polling (045E:082A)',
  mouseDpi: 1600,
  controllerNavigation: true,
  activeAiEngine: 'hermes-gguf-local',
  selectedHfPresetId: 'hermes-3-3b',
  customHfRepo: 'NousResearch/Hermes-3-Llama-3.2-3B-GGUF',
  customHfFilename: 'Hermes-3-Llama-3.2-3B.Q4_K_M.gguf',
  localLlamaEndpoint: 'http://127.0.0.1:8080/v1/chat/completions',
  loadedLocalModelFile: null,
};

export const INITIAL_WINDOWS: Win11WindowState[] = [
  {
    id: 'deployment',
    title: 'Xbox Series X Native Desktop — Deployment & MSIX Builder',
    subtitle: 'Series X OneCore UWP (Windows.Xbox)',
    isOpen: true,
    isMinimized: false,
    isMaximized: false,
    zIndex: 30,
    x: 132,
    y: 20,
    width: 820,
    height: 540,
  },
  {
    id: 'hermes',
    title: 'Hermes AI Copilot (Local Offline GGUF / Mobile Nano)',
    subtitle: 'On-Device Local Model Engine',
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    zIndex: 35,
    x: 240,
    y: 44,
    width: 520,
    height: 520,
  },
  {
    id: 'explorer',
    title: 'File Explorer',
    subtitle: 'D:\\DevelopmentFiles',
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    zIndex: 20,
    x: 90,
    y: 60,
    width: 860,
    height: 520,
  },
  {
    id: 'cmd',
    title: 'Administrator: Command Prompt (cmd.exe)',
    subtitle: 'D:\\DevelopmentFiles\\Windows11Desktop',
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    zIndex: 21,
    x: 130,
    y: 80,
    width: 760,
    height: 460,
  },
  {
    id: 'powershell',
    title: 'Administrator: PowerShell 7.4 (pwsh.exe)',
    subtitle: 'PS D:\\DevelopmentFiles\\Windows11Desktop>',
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    zIndex: 22,
    x: 160,
    y: 95,
    width: 780,
    height: 470,
  },
  {
    id: 'taskmgr',
    title: 'Task Manager — Xbox Series X (Project Scarlett)',
    subtitle: '8-Core Zen 2 @ 3.80 GHz · 16.0 GB GDDR6',
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    zIndex: 23,
    x: 110,
    y: 55,
    width: 840,
    height: 530,
  },
  {
    id: 'settings',
    title: 'Settings',
    subtitle: 'System · USB Input · Local AI Models · SMB Deploy',
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    zIndex: 24,
    x: 120,
    y: 48,
    width: 880,
    height: 550,
  },
  {
    id: 'notepad',
    title: 'Notepad — WINDOWS_11_NATIVE_DESKTOP_DEPLOYMENT.md',
    subtitle: 'UTF-8 · Windows (CRLF)',
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    zIndex: 25,
    x: 180,
    y: 70,
    width: 720,
    height: 490,
  },
];

export const DEPLOYMENT_REPORT_MARKDOWN = `# WINDOWS 11 NATIVE DESKTOP DEPLOYMENT REPORT
## Target Hardware: Xbox Series X DevKit (Project Scarlett — 16GB GDDR6 / 8-Core Zen 2)
## Build ID: dd55b21d-c3d7-4cb6-8d3c-7d872aa4690c (Reconstructed Standalone Release)

### 1. Executive Summary
This build deploys a complete, native **Windows 11 Desktop Operating System Shell** directly onto the Xbox Series X DevKit TV display over HDMI 2.1 (up to 4K UHD @ 120Hz), replacing the single-app sandbox view with an interactive multi-window desktop environment.

### 2. Validated Core Subsystems
- **USB HID Keyboard & Mouse Input Stack**: Full hardware cursor acceleration, right-click context menus, window drag/resize, and keyboard shortcuts (Win+E, Win+R, Ctrl+Shift+Esc).
- **Desktop Window Manager (DWM)**: Floating,overlapping, minimizable, maximizable windows with taskbar state synchronization and z-order focus management.
- **File Explorer (explorer.exe)**: Direct read/write access to Xbox Series X partitions:
  - \`C:\\\` — Xbox System OS Core Volume
  - \`D:\\DevelopmentFiles\` — Mapped to \`//<xbox-ip>/DevelopmentFiles\` over SMB3 (Port 445)
  - \`E:\\\` — Developer Scratchpad Storage
  - \`U:\\Users\\DevToolsUser\\Desktop\` — Active User Desktop Workspace
- **Command Prompt (cmd.exe) & PowerShell (pwsh.exe)**: Native administrative shell execution for network diagnostics, SMB share management, and local GGUF model execution.
- **Task Manager (taskmgr.exe)**: Real-time telemetry across the 8-Core AMD Zen 2 CPU, 16GB GDDR6 Unified Memory pool, RDNA 2 GPU, and internal NVMe SSD.
- **Hermes Local AI Copilot**: Configured to run **100% offline** using either the **Local Mobile Model (Gemini Nano / Gemma-3-1B-IT GGUF)** or **Hermes-3-Llama-3.2-3B.Q4_K_M.gguf** downloaded directly from Hugging Face into \`D:\\DevelopmentFiles\\Windows11Desktop\\models\\\`.

### 3. Re-Deployment Over Working SMB (Port 445 — No SSH Required)
Because \`//<xbox-ip>/DevelopmentFiles\` runs over TCP Port 445 independently of SSH (Port 22), this entire Windows 11 Desktop OS and its local Hugging Face model can be deployed or restored in one step from your \`nitrokali\` workstation.`;

export const INITIAL_VFS_NODES: VfsNode[] = [
  // Root Folders under D:\DevelopmentFiles
  {
    id: 'vfs-1',
    name: 'Windows11Desktop',
    type: 'folder',
    parentPath: 'D:\\DevelopmentFiles',
    modifiedAt: '2026-11-12 10:05',
  },
  {
    id: 'vfs-2',
    name: 'Models',
    type: 'folder',
    parentPath: 'D:\\DevelopmentFiles',
    modifiedAt: '2026-11-12 10:05',
  },
  {
    id: 'vfs-3',
    name: 'LooseApps',
    type: 'folder',
    parentPath: 'D:\\DevelopmentFiles',
    modifiedAt: '2026-11-12 10:00',
  },
  {
    id: 'vfs-4',
    name: 'Certs',
    type: 'folder',
    parentPath: 'D:\\DevelopmentFiles',
    modifiedAt: '2026-11-12 09:50',
  },
  {
    id: 'vfs-5',
    name: 'WINDOWS_11_NATIVE_DESKTOP_DEPLOYMENT.md',
    type: 'file',
    parentPath: 'D:\\DevelopmentFiles',
    sizeBytes: 4820,
    modifiedAt: '2026-11-12 10:06',
    extension: 'md',
    content: DEPLOYMENT_REPORT_MARKDOWN,
  },

  // Inside D:\DevelopmentFiles\Windows11Desktop
  {
    id: 'vfs-6',
    name: 'Win11DesktopShell.exe',
    type: 'file',
    parentPath: 'D:\\DevelopmentFiles\\Windows11Desktop',
    sizeBytes: 18432000,
    modifiedAt: '2026-11-12 10:05',
    extension: 'exe',
    content: 'PE32+ executable (GUI) x86-64, for MS Windows 11 Xbox Series X GDK Shell',
  },
  {
    id: 'vfs-7',
    name: 'AppxManifest.xml',
    type: 'file',
    parentPath: 'D:\\DevelopmentFiles\\Windows11Desktop',
    sizeBytes: 3412,
    modifiedAt: '2026-11-12 10:05',
    extension: 'xml',
    content: `<?xml version="1.0" encoding="utf-8"?>
<Package xmlns="http://schemas.microsoft.com/appx/manifest/foundation/windows10"
         xmlns:uap="http://schemas.microsoft.com/appx/manifest/uap/windows10"
         IgnorableNamespaces="uap">
  <Identity Name="XboxWin11NativeDesktop" Publisher="CN=XboxDevStudio" Version="11.24.26100.0" ProcessorArchitecture="x64" />
  <Properties>
    <DisplayName>Windows 11 Native Desktop OS (Xbox Series X)</DisplayName>
    <PublisherDisplayName>Xbox Series X DevKit Studio</PublisherDisplayName>
    <Logo>Assets\\StoreLogo.png</Logo>
  </Properties>
  <Dependencies>
    <TargetDeviceFamily Name="Windows.Xbox" MinVersion="10.0.19041.0" MaxVersionTested="10.0.26100.0" />
    <TargetDeviceFamily Name="Windows.Universal" MinVersion="10.0.19041.0" MaxVersionTested="10.0.26100.0" />
  </Dependencies>
  <Capabilities>
    <Capability Name="internetClient" />
    <Capability Name="privateNetworkClientServer" />
  </Capabilities>
</Package>`,
  },
  {
    id: 'vfs-8',
    name: 'hermes_model_config.json',
    type: 'file',
    parentPath: 'D:\\DevelopmentFiles\\Windows11Desktop',
    sizeBytes: 1240,
    modifiedAt: '2026-11-12 10:06',
    extension: 'json',
    content: JSON.stringify(
      {
        copilot_name: 'Hermes Local AI Copilot',
        offline_mode: true,
        mobile_local_engine: 'gemini-nano-local',
        hf_gguf_repo: 'NousResearch/Hermes-3-Llama-3.2-3B-GGUF',
        hf_gguf_file: 'Hermes-3-Llama-3.2-3B.Q4_K_M.gguf',
        local_model_path: 'D:\\DevelopmentFiles\\Models\\Hermes-3-Llama-3.2-3B.Q4_K_M.gguf',
        fallback_mobile_model: 'D:\\DevelopmentFiles\\Models\\gemma-3-1b-it-Q4_K_M.gguf',
        brain_id: 'dd55b21d-c3d7-4cb6-8d3c-7d872aa4690c',
      },
      null,
      2
    ),
  },

  // Inside D:\DevelopmentFiles\Models
  {
    id: 'vfs-9',
    name: 'Hermes-3-Llama-3.2-3B.Q4_K_M.gguf',
    type: 'file',
    parentPath: 'D:\\DevelopmentFiles\\Models',
    sizeBytes: 2061584302,
    modifiedAt: '2026-11-12 10:05',
    extension: 'gguf',
    content: '[GGUF v3 Binary Model Weights — NousResearch/Hermes-3-Llama-3.2-3B-GGUF Q4_K_M]',
  },
  {
    id: 'vfs-10',
    name: 'gemma-3-1b-it-Q4_K_M.gguf',
    type: 'file',
    parentPath: 'D:\\DevelopmentFiles\\Models',
    sizeBytes: 845152256,
    modifiedAt: '2026-11-12 10:05',
    extension: 'gguf',
    content: '[GGUF v3 Binary Model Weights — ggml-org/gemma-3-1b-it-GGUF (Local Mobile Weights)]',
  },

  // Inside C:\Windows
  {
    id: 'vfs-11',
    name: 'System32',
    type: 'folder',
    parentPath: 'C:\\Windows',
    modifiedAt: '2026-11-02 04:20',
  },
  {
    id: 'vfs-12',
    name: 'explorer.exe',
    type: 'file',
    parentPath: 'C:\\Windows',
    sizeBytes: 5412800,
    modifiedAt: '2026-11-02 04:20',
    extension: 'exe',
  },

  // Inside U:\Users\DevToolsUser\Desktop
  {
    id: 'vfs-13',
    name: 'WINDOWS_11_NATIVE_DESKTOP_DEPLOYMENT.md',
    type: 'file',
    parentPath: 'U:\\Users\\DevToolsUser\\Desktop',
    sizeBytes: 4820,
    modifiedAt: '2026-11-12 10:06',
    extension: 'md',
    content: DEPLOYMENT_REPORT_MARKDOWN,
  },
  {
    id: 'vfs-14',
    name: 'restore_win11_xbox_smb.sh',
    type: 'file',
    parentPath: 'U:\\Users\\DevToolsUser\\Desktop',
    sizeBytes: 2150,
    modifiedAt: '2026-11-12 10:06',
    extension: 'sh',
    content: `#!/usr/bin/env bash
# Deploy Reconstructed Windows 11 Native Desktop + Hermes Local GGUF Model over SMB3 (:445)
XBOX_IP="192.168.1.50"
SMB_USER="DevToolsUser"
SMB_PASS="password"
BRAIN_DIR="/home/nitrokali/.gemini/antigravity-cli/brain/dd55b21d-c3d7-4cb6-8d3c-7d872aa4690c"

mkdir -p "$BRAIN_DIR/Models"
wget -c "https://huggingface.co/NousResearch/Hermes-3-Llama-3.2-3B-GGUF/resolve/main/Hermes-3-Llama-3.2-3B.Q4_K_M.gguf" -O "$BRAIN_DIR/Models/Hermes-3-Llama-3.2-3B.Q4_K_M.gguf"
wget -c "https://huggingface.co/ggml-org/gemma-3-1b-it-GGUF/resolve/main/gemma-3-1b-it-Q4_K_M.gguf" -O "$BRAIN_DIR/Models/gemma-3-1b-it-Q4_K_M.gguf"

cd "$BRAIN_DIR"
smbclient //$XBOX_IP/DevelopmentFiles -U "$SMB_USER%$SMB_PASS" -m SMB3 -c "mkdir Windows11Desktop; cd Windows11Desktop; prompt OFF; recurse ON; mput *"
`,
  },
];

export const INITIAL_WIN11_PROCESSES: Win11Process[] = [
  {
    pid: 4120,
    name: 'Win11DesktopShell.exe',
    title: 'Windows 11 Native Desktop Window Manager (Xbox GDK)',
    cpuPercent: 4.2,
    memoryMb: 412,
    diskMbPerSec: 0.4,
    status: 'Running',
    category: 'System',
  },
  {
    pid: 4880,
    name: 'hermes-local-engine.exe',
    title: 'Hermes Local AI Copilot Engine (GGUF / On-Device Mobile Nano)',
    cpuPercent: 6.8,
    memoryMb: 1240,
    diskMbPerSec: 0.0,
    status: 'Running',
    category: 'AI Engine',
    appId: 'hermes',
  },
  {
    pid: 2140,
    name: 'dwm.exe',
    title: 'Desktop Window Manager (HDMI 2.1 4K120 Compositor)',
    cpuPercent: 2.1,
    memoryMb: 285,
    diskMbPerSec: 0.0,
    status: 'Running',
    category: 'System',
  },
  {
    pid: 3310,
    name: 'explorer.exe',
    title: 'Windows Explorer',
    cpuPercent: 1.4,
    memoryMb: 194,
    diskMbPerSec: 0.2,
    status: 'Running',
    category: 'App',
    appId: 'explorer',
  },
  {
    pid: 1092,
    name: 'srv2.sys (LanmanServer)',
    title: 'SMB3 Server (//DevelopmentFiles on TCP :445)',
    cpuPercent: 0.9,
    memoryMb: 88,
    diskMbPerSec: 1.8,
    status: 'Running',
    category: 'System',
  },
  {
    pid: 5112,
    name: 'HidUsbInputBroker.exe',
    title: 'Xbox USB Keyboard & Mouse HID Driver Broker',
    cpuPercent: 0.5,
    memoryMb: 46,
    diskMbPerSec: 0.0,
    status: 'Running',
    category: 'System',
  },
  {
    pid: 6024,
    name: 'pwsh.exe',
    title: 'PowerShell 7.4 (x64)',
    cpuPercent: 0.8,
    memoryMb: 112,
    diskMbPerSec: 0.0,
    status: 'Background',
    category: 'App',
    appId: 'powershell',
  },
];
