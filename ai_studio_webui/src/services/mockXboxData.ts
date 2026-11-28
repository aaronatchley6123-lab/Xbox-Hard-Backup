import {
  XboxAppPackage,
  XboxFileItem,
  XboxProcess,
  XboxTelemetry,
  XboxLogEntry,
  XboxCertificate,
  GameSignatureRecord,
  XboxLocalUser,
  XboxLapsConfig,
  XboxModeCode
} from '../types/xbox';

export const INITIAL_APPS: XboxAppPackage[] = [
  {
    id: 'app-1',
    name: 'Cyberpunk 2077 (Scarlett Dev Build)',
    packageFullName: 'CDPR.Cyberpunk2077_1.24.901.0_x64__p8y69k32a901f',
    familyName: 'CDPR.Cyberpunk2077_p8y69k32a901f',
    aumid: 'CDPR.Cyberpunk2077_p8y69k32a901f!App',
    version: '1.24.901.0',
    publisher: 'CD PROJEKT RED (Dev Kit Build)',
    installSizeMb: 68420,
    installDate: '2026-10-24 14:18',
    isRunning: true,
    isDefaultBoot: true,
    type: 'Game',
    iconColor: '#3b82f6',
    launchArgs: '-dx12 -raytracing=high -renderdoc=enabled'
  },
  {
    id: 'app-2',
    name: 'Forza Motorsport Engine Test',
    packageFullName: 'Turn10.ForzaApexLab_8.1.4.0_x64__z44e59k02a90b',
    familyName: 'Turn10.ForzaApexLab_z44e59k02a90b',
    aumid: 'Turn10.ForzaApexLab_z44e59k02a90b!App',
    version: '8.1.4.0',
    publisher: 'Turn 10 Studios',
    installSizeMb: 41200,
    installDate: '2026-11-02 09:33',
    isRunning: false,
    isDefaultBoot: false,
    type: 'Game',
    iconColor: '#2563eb',
    launchArgs: '-benchmark -d3d12agility'
  },
  {
    id: 'app-3',
    name: 'DirectX 12 Agility SDK Benchmark',
    packageFullName: 'Microsoft.D3D12Agility_1.614.0_x64__8wekyb3d8bbwe',
    familyName: 'Microsoft.D3D12Agility_8wekyb3d8bbwe',
    aumid: 'Microsoft.D3D12Agility_8wekyb3d8bbwe!App',
    version: '1.614.0',
    publisher: 'Microsoft DirectX Team',
    installSizeMb: 1450,
    installDate: '2026-10-15 11:20',
    isRunning: false,
    isDefaultBoot: false,
    type: 'Tool',
    iconColor: '#60a5fa',
    launchArgs: '-tier3_mesh_shaders'
  },
  {
    id: 'app-4',
    name: 'Dev Home & Quick Launcher',
    packageFullName: 'Microsoft.Xbox.DevHome_10.0.22621.1_x64__8wekyb3d8bbwe',
    familyName: 'Microsoft.Xbox.DevHome_8wekyb3d8bbwe',
    aumid: 'Microsoft.Xbox.DevHome_8wekyb3d8bbwe!App',
    version: '10.0.22621.1',
    publisher: 'Microsoft Corporation',
    installSizeMb: 820,
    installDate: '2026-09-10 08:00',
    isRunning: true,
    isDefaultBoot: false,
    type: 'System',
    iconColor: '#1d4ed8'
  },
  {
    id: 'app-5',
    name: 'Unreal Engine 5.4 GameCore Sample',
    packageFullName: 'Epic.CitySample_5.4.1.0_x64__f8921a998bc12',
    familyName: 'Epic.CitySample_f8921a998bc12',
    aumid: 'Epic.CitySample_f8921a998bc12!App',
    version: '5.4.1.0',
    publisher: 'Epic Games',
    installSizeMb: 32100,
    installDate: '2026-11-05 16:42',
    isRunning: false,
    isDefaultBoot: false,
    type: 'Game',
    iconColor: '#0284c7'
  }
];

export const INITIAL_FILES: Record<string, XboxFileItem[]> = {
  'CDPR.Cyberpunk2077_1.24.901.0_x64__p8y69k32a901f': [
    {
      id: 'f-1',
      name: 'settings.json',
      path: '\\settings.json',
      isDir: false,
      sizeBytes: 1420,
      dateModified: '2026-11-10 18:24',
      extension: 'json',
      content: JSON.stringify({
        Graphics: {
          Resolution: "3840x2160",
          RayTracing: true,
          RayTracedReflections: true,
          RayTracedSunShadows: true,
          MeshLOD: "High",
          CrowdDensity: "Ultra",
          VRS: "Tier2_VariableRateShading"
        },
        Audio: {
          MasterVolume: 100,
          SpatialAudio: "DolbyAtmos",
          DynamicRange: "StudioReference"
        },
        DevKit: {
          MemoryBudgetStrict: true,
          TelemetryLevel: "FullDiagnostic",
          CrashReporting: "DumpAndNotifyLinux"
        }
      }, null, 2)
    },
    {
      id: 'f-2',
      name: 'engine_config.ini',
      path: '\\engine_config.ini',
      isDir: false,
      sizeBytes: 2180,
      dateModified: '2026-11-09 11:15',
      extension: 'ini',
      content: `[Engine.DirectX12]\nr.D3D12.RootSignatureVersion=1.2\nr.D3D12.UseMeshShaders=1\nr.D3D12.SuballocationMemoryPool=FastVRAM\nr.Xbox.ScarlettWaveSize=64\n\n[DevKit.Networking]\nRemoteDebugHost=192.168.1.45\nRemoteDebugPort=11443\nHeartbeatIntervalMs=1000\nLogEchoToOutputDebugString=1\n\n[GameCore.Sandbox]\nSandboxName=XDKS.1\nEnableTitleStorageMock=0`
    },
    {
      id: 'f-3',
      name: 'savegame_slot01.sav',
      path: '\\savegame_slot01.sav',
      isDir: false,
      sizeBytes: 842100,
      dateModified: '2026-11-10 22:45',
      extension: 'sav',
      content: `[BINARY SAVEDATA HEADER - XBOX CONNECTED STORAGE v2.4]\nPlayerProfile: V_Corporate_Netrunner\nQuestStage: Q204_Nocturne_Op55N1\nTimestamp: 2026-11-10T22:45:11Z\nChecksum: 0x9B8A44F1`
    },
    {
      id: 'f-4',
      name: 'crash_dumps',
      path: '\\crash_dumps',
      isDir: true,
      sizeBytes: 0,
      dateModified: '2026-11-08 14:10'
    },
    {
      id: 'f-5',
      name: 'latest_boot.log',
      path: '\\latest_boot.log',
      isDir: false,
      sizeBytes: 9480,
      dateModified: '2026-11-11 00:02',
      extension: 'log',
      content: `[00:01:42.110] [GameCore] Title Booted: AppID=CDPR.Cyberpunk2077!App\n[00:01:42.112] [D3D12] Scarlett GPU Hardware Init: 52 CUs @ 1825MHz\n[00:01:42.118] [Memory] 10.0GB Fast GDDR6 pool initialized\n[00:01:42.122] [Audio] AudioGraph XMA hardware decoder active\n[00:01:42.204] [Storage] DirectStorage NVMe queue initialized with 128 IO rings\n[00:01:42.310] [Engine] Shaders loaded: 14,290 PSOs in memory\n[00:01:42.410] [MainLoop] Frame rate locked to 60.00 FPS with VRR active`
    }
  ]
};

export const INITIAL_PROCESSES: XboxProcess[] = [
  { pid: 1480, name: 'Cyberpunk2077.exe', cpuPercent: 64.2, memoryMb: 7850, peakMemoryMb: 8420, threads: 32, handles: 1420, status: 'Running', isGame: true },
  { pid: 1044, name: 'GameCoreHost.exe', cpuPercent: 4.8, memoryMb: 412, peakMemoryMb: 450, threads: 14, handles: 820, status: 'Running', isGame: false },
  { pid: 820, name: 'D3D12Worker.exe', cpuPercent: 12.1, memoryMb: 980, peakMemoryMb: 1100, threads: 8, handles: 512, status: 'Running', isGame: true },
  { pid: 612, name: 'XboxDevicePortal.exe', cpuPercent: 1.2, memoryMb: 86, peakMemoryMb: 120, threads: 12, handles: 480, status: 'Running', isGame: false },
  { pid: 540, name: 'DevHome.exe', cpuPercent: 0.6, memoryMb: 140, peakMemoryMb: 210, threads: 10, handles: 390, status: 'Running', isGame: false },
  { pid: 480, name: 'Audiodg.exe', cpuPercent: 2.1, memoryMb: 68, peakMemoryMb: 75, threads: 6, handles: 180, status: 'Running', isGame: false },
  { pid: 310, name: 'SystemIdleProcess', cpuPercent: 15, memoryMb: 8, peakMemoryMb: 8, threads: 1, handles: 0, status: 'Running', isGame: false }
];

export const INITIAL_LOGS: XboxLogEntry[] = [
  { id: 'l-1', timestamp: '00:14:01.042', level: 'INFO', category: 'GameCore', message: 'Xbox Scarlett Developer Kit online. MachineName="XDK-SERIESX-LAB01"' },
  { id: 'l-2', timestamp: '00:14:01.088', level: 'INFO', category: 'Network', message: 'Device Portal listening on HTTPS 11443 and WebSocket /ext/app/rundebug' },
  { id: 'l-3', timestamp: '00:14:01.120', level: 'DEBUG', category: 'D3D12', message: 'Direct3D 12.2 Agility runtime initialized: 52 CUs / 12.15 TFLOPS enabled' },
  { id: 'l-4', timestamp: '00:14:01.155', level: 'INFO', category: 'Memory', message: 'Memory configuration: 10240 MB Fast GPU + 3584 MB CPU + 2176 MB System OS' },
  { id: 'l-5', timestamp: '00:14:02.810', level: 'VERBOSE', category: 'System', message: 'DirectStorage firmware API v1.2 ready. Bandwidth capacity: 4.8 GB/s compressed' },
  { id: 'l-6', timestamp: '00:14:03.400', level: 'INFO', category: 'GameCore', message: 'Sandbox switch verified: SandboxId=XDKS.1' },
  { id: 'l-7', timestamp: '00:14:05.112', level: 'DEBUG', category: 'Audio', message: 'Spatial Audio hardware DSP route established for 7.1.4 Dolby Atmos object mix' },
  { id: 'l-8', timestamp: '00:14:10.500', level: 'INFO', category: 'GameCore', message: 'Title [CDPR.Cyberpunk2077!App] is foreground active. Target 60 FPS VRR.' }
];

export const INITIAL_TELEMETRY: XboxTelemetry = {
  cpuCores: [68, 62, 59, 74, 55, 48, 60, 42],
  cpuAvgLoad: 58.5,
  cpuTempCelsius: 64,
  memoryUsedMb: 9420,
  memoryTotalMb: 16384,
  gpuFastVramUsedMb: 7650,
  gpuFastVramTotalMb: 10240,
  gpuLoadPercent: 78,
  internalStorageUsedGb: 442,
  internalStorageTotalGb: 1000,
  frameRate: 59.94,
  frameTimeMs: 16.68,
  hdmiResolution: '3840 x 2160 (4K UHD)',
  hdmiRefreshRate: '120 Hz Variable Refresh Rate (VRR)',
  hdrActive: true
};

export const INITIAL_CERTIFICATES: XboxCertificate[] = [
  {
    id: 'cert-device-live',
    name: 'Xbox Scarlett Hardware Device Certificate',
    type: 'ConsoleDevice',
    subject: 'CN=XboxDevice-04829103-6281-4239-A193-8B391D92801F, OU=Xbox Hardware Security, O=Microsoft Corporation, C=US',
    issuer: 'CN=Microsoft Xbox Device CA 2026, O=Microsoft Corporation, C=US',
    thumbprint: 'C4:29:A8:41:0E:17:8F:D2:77:3A:9B:6C:51:EE:80:31:04:BA:22:90',
    serialNumber: '71049281039840291048',
    validFrom: '2026-01-01 00:00:00 UTC',
    validTo: '2036-12-31 23:59:59 UTC',
    keyAlgorithm: 'RSA 4096-bit (e=65537)',
    keyUsage: ['Digital Signature', 'Key Encipherment', 'Client Authentication', 'Hardware Security Module (HSM) Attestation'],
    isInstalledOnConsole: true,
    hasPrivateKey: true,
    passwordProtected: false,
    certFormat: 'CER'
  },
  {
    id: 'cert-wdp-ssl',
    name: 'Xbox Device Portal HTTPS Server Certificate',
    type: 'WdpServer',
    subject: 'CN=XDK-SERIESX-LAB01.local, OU=WDP Web Portal, O=Microsoft Xbox, C=US',
    issuer: 'CN=Microsoft Xbox Device CA 2026, O=Microsoft Corporation, C=US',
    thumbprint: '5F:10:98:B4:7A:23:4E:91:D4:88:AC:32:01:7B:44:E9:FA:12:33:02',
    serialNumber: '58201948201948201948',
    validFrom: '2026-01-01 00:00:00 UTC',
    validTo: '2030-01-01 00:00:00 UTC',
    keyAlgorithm: 'RSA 2048-bit (e=65537)',
    keyUsage: ['Digital Signature', 'Key Encipherment', 'Server Authentication (1.3.6.1.5.5.7.3.1)'],
    isInstalledOnConsole: true,
    hasPrivateKey: true,
    passwordProtected: false,
    certFormat: 'PEM'
  },
  {
    id: 'cert-devroot',
    name: 'Microsoft Xbox Developer Root Authority (DevRoot)',
    type: 'DeveloperRoot',
    subject: 'CN=XboxOneDevRoot, OU=Xbox Developer Network, O=Microsoft Corporation, C=US',
    issuer: 'CN=XboxOneDevRoot, OU=Xbox Developer Network, O=Microsoft Corporation, C=US',
    thumbprint: '91:AC:54:33:EE:02:44:81:7A:BC:88:12:F4:91:00:22:83:EE:71:04',
    serialNumber: '00000000000000000001',
    validFrom: '2013-05-01 00:00:00 UTC',
    validTo: '2043-05-01 00:00:00 UTC',
    keyAlgorithm: 'RSA 4096-bit (e=65537)',
    keyUsage: ['Digital Signature', 'Certificate Signing', 'CRL Signing', 'Root Authority'],
    isInstalledOnConsole: true,
    hasPrivateKey: false,
    passwordProtected: false,
    certFormat: 'CER'
  },
  {
    id: 'cert-cdpr-signing',
    name: 'CD PROJEKT RED GameCore Sideload Signing Key',
    type: 'GameCodeSigning',
    subject: 'CN=CD PROJEKT RED (Dev Kit Build), O=CD PROJEKT S.A., L=Warsaw, C=PL',
    issuer: 'CN=XBXOwned Internal Game Signer CA, O=XBXOwned Linux Studio, C=US',
    thumbprint: 'E2:74:90:1B:3C:99:A4:71:82:F0:CD:18:24:91:88:41:A0:04:77:12',
    serialNumber: '44820194820194820199',
    validFrom: '2026-06-01 00:00:00 UTC',
    validTo: '2029-06-01 00:00:00 UTC',
    keyAlgorithm: 'RSA 2048-bit (e=65537)',
    keyUsage: ['Digital Signature', 'Code Signing (1.3.6.1.5.5.7.3.3)', 'Package Sideload Verification'],
    isInstalledOnConsole: true,
    hasPrivateKey: true,
    passwordProtected: true,
    certFormat: 'PFX'
  },
  {
    id: 'cert-turn10-signing',
    name: 'Turn 10 Studios Engine Test Signature Key',
    type: 'GameCodeSigning',
    subject: 'CN=Turn 10 Studios, OU=Forza Apex Core, O=Microsoft Studios, C=US',
    issuer: 'CN=Microsoft Game Studios Test CA, O=Microsoft Corporation, C=US',
    thumbprint: '33:71:B2:A9:04:91:88:22:CD:44:19:80:66:EA:41:10:55:FE:91:28',
    serialNumber: '99281039482019482011',
    validFrom: '2026-01-15 00:00:00 UTC',
    validTo: '2028-01-15 00:00:00 UTC',
    keyAlgorithm: 'RSA 2048-bit (e=65537)',
    keyUsage: ['Digital Signature', 'Code Signing (1.3.6.1.5.5.7.3.3)'],
    isInstalledOnConsole: true,
    hasPrivateKey: true,
    passwordProtected: true,
    certFormat: 'PFX'
  },
  {
    id: 'cert-xbxowned-default',
    name: 'XBXOwned Linux Default Developer Signer',
    type: 'PublisherKey',
    subject: 'CN=XBXOwned Dev Signer, OU=GDK Linux Engine, O=XBXOwned Studio, C=US',
    issuer: 'CN=XBXOwned Root CA, O=XBXOwned Linux Studio, C=US',
    thumbprint: 'AA:41:09:66:81:42:DE:09:88:21:77:33:55:10:92:44:CC:89:12:EE',
    serialNumber: '10928401928401928402',
    validFrom: '2026-10-01 00:00:00 UTC',
    validTo: '2031-10-01 00:00:00 UTC',
    keyAlgorithm: 'RSA 4096-bit (e=65537)',
    keyUsage: ['Digital Signature', 'Code Signing (1.3.6.1.5.5.7.3.3)', 'AppxSignature Generator'],
    isInstalledOnConsole: true,
    hasPrivateKey: true,
    passwordProtected: false,
    certFormat: 'PFX'
  }
];

export const INITIAL_SIGNATURE_RECORDS: GameSignatureRecord[] = [
  {
    id: 'sig-1',
    packageName: 'Cyberpunk 2077 (Scarlett Dev Build)',
    packageFileName: 'CDPR.Cyberpunk2077_1.24.901.0_x64__p8y69k32a901f.msix',
    publisher: 'CN=CD PROJEKT RED (Dev Kit Build)',
    certificateId: 'cert-cdpr-signing',
    certSubject: 'CN=CD PROJEKT RED (Dev Kit Build)',
    certThumbprint: 'E2:74:90:1B:3C:99:A4:71:82:F0:CD:18:24:91:88:41:A0:04:77:12',
    hashAlgorithm: 'SHA-256',
    timestampServer: 'http://timestamp.digicert.com',
    signatureBlock: 'AppxSignature.p7x (PKCS #7 Detached SignedData, 4.2 KB)',
    status: 'Verified',
    signedAt: '2026-10-24 14:15:22 UTC',
    packageSizeBytes: 71743602688,
    digest: 'SHA256: 4f9b201a88c2490b81e2890a5d448102ff91840291048b291a0c883921bf4019',
    isTrustedByTargetConsole: true
  },
  {
    id: 'sig-2',
    packageName: 'Forza Motorsport Engine Test',
    packageFileName: 'Turn10.ForzaApexLab_8.1.4.0_x64__z44e59k02a90b.appx',
    publisher: 'CN=Turn 10 Studios',
    certificateId: 'cert-turn10-signing',
    certSubject: 'CN=Turn 10 Studios',
    certThumbprint: '33:71:B2:A9:04:91:88:22:CD:44:19:80:66:EA:41:10:55:FE:91:28',
    hashAlgorithm: 'SHA-256',
    timestampServer: 'http://timestamp.comodoca.com',
    signatureBlock: 'AppxSignature.p7x (PKCS #7 Detached SignedData, 3.8 KB)',
    status: 'Verified',
    signedAt: '2026-11-02 09:30:11 UTC',
    packageSizeBytes: 43201300480,
    digest: 'SHA256: 9918bc240188ef419028471b0284019284019284019284019284019284019284',
    isTrustedByTargetConsole: true
  }
];

export const INITIAL_LOCAL_USERS: XboxLocalUser[] = [
  {
    id: 'user-devtools',
    username: 'DevToolsUser',
    displayName: 'Xbox Dev Home Primary Administrator',
    sid: 'S-1-5-21-3948201948-2849102934-104928103-1000',
    role: 'Administrator',
    status: 'LapsManaged',
    isLapsProtected: true,
    lastLogin: 'Today, 01:14 UTC',
    passwordLastSet: '2026-10-29 14:22:10 UTC',
    description: 'Primary local administrator provisioned by Xbox Dev Home for remote REST management, deployment scratchpad, and kernel debugging.',
    homeDirectory: 'D:\\DevelopmentFiles\\DevToolsUser',
    privileges: ['SeDebugPrivilege', 'SeTcbPrivilege', 'SeShutdownPrivilege', 'SeRemoteShutdownPrivilege', 'SeNetworkLogonRight'],
    groups: ['Administrators', 'Hyper-V Administrators (VM Full Control)', 'Xbox Development Users', 'Device Portal Users', 'Remote Desktop & Shell Users', 'Performance Log Users'],
    groupIds: ['S-1-5-32-544', 'S-1-5-32-578', 'S-1-5-21-3948201948-2849102934-104928103-1001', 'S-1-5-32-582', 'S-1-5-32-555', 'S-1-5-32-559']
  },
  {
    id: 'user-usrmgr5',
    username: 'UsrMgr5',
    displayName: 'UsrMgr5 (Active Studio Administrator / Developer)',
    sid: 'S-1-5-21-3948201948-2849102934-104928103-1002',
    role: 'Administrator',
    status: 'LapsManaged',
    isLapsProtected: true,
    lastLogin: 'Today, 01:20 UTC',
    passwordLastSet: '2026-11-20 10:00:00 UTC',
    description: 'Hardware console manager user with full SRA/ERA trust.',
    homeDirectory: 'D:\\DevelopmentFiles\\UsrMgr5',
    privileges: ['SeDebugPrivilege', 'SeTcbPrivilege', 'SeShutdownPrivilege'],
    groups: ['Administrators', 'Hyper-V Administrators'],
    groupIds: ['S-1-5-32-544', 'S-1-5-32-578']
  }
];

export const INITIAL_LAPS_CONFIG: XboxLapsConfig = {
  enabled: true,
  targetAccount: 'DevToolsUser',
  adminUsername: 'DevToolsUser',
  currentPassword: 'xK9#mQ2$vL8!pZ5@wR4*',
  expirationDate: '2026-11-28 08:00:00 UTC',
  rotationIntervalDays: 30,
  passwordLength: 20,
  requireSpecialChars: true,
  requireUppercase: true,
  requireDigits: true,
  backupStore: 'LocalTPM',
  lastRotatedAt: '2026-10-29 14:22:10 UTC',
  lastRotatedBy: 'Scheduled LAPS Agent',
  status: 'Compliant'
};

const MODE_MAP: Record<string, any> = {
  '4001': {
    mode: 'DevKit',
    code: '4001',
    hex: '0x4001',
    label: 'Developer Mode (DevKit)',
    shortTag: 'DEV MODE',
    description: 'Unlocked GameCore / ERA runtime with unrestricted 16GB GDDR6 memory, WDP REST/WS enabled, sideloading active, and remote debugger stub attached.',
    badgeColor: 'text-blue-300',
    badgeBorder: 'border-blue-500/60',
    badgeBg: 'bg-blue-950/70',
    sideloadAllowed: true,
    wdpEnabled: true,
    memoryPool: '16.0 GB (Full Dev Allocation)',
    securityFuses: 'DevKit Override Active (0x4001)',
    defaultPortAccess: 'Full (WDP :11443, Debug, FTP, SMB, Profilers)'
  },
  '2001': {
    mode: 'Retail',
    code: '2001',
    hex: '0x2001',
    label: 'Retail Mode',
    shortTag: 'RETAIL',
    description: 'Standard consumer retail environment. Sandbox locked, signed retail packages only, DRM active, 13.5GB retail memory pool, WDP restricted.',
    badgeColor: 'text-slate-300',
    badgeBorder: 'border-slate-600',
    badgeBg: 'bg-slate-900/80',
    sideloadAllowed: false,
    wdpEnabled: false,
    memoryPool: '13.5 GB (Retail Constrained)',
    securityFuses: 'Production Fuses Blown (0x2001)',
    defaultPortAccess: 'Restricted (HTTP 80/443 outbound only)'
  },
  '6001': {
    mode: 'TestKit',
    code: '6001',
    hex: '0x6001 (Mode 12 / 13)',
    label: '6001 Level Kit — Mode 13 (VM Full Control + Built-In Windows Desktop)',
    shortTag: '6001 MODE 13 VM FULL',
    description: 'Studio 6001 Level Kit. Mode 12 (0x0C) restricts accounts to ERA Title Guest Kiosk (blocking VM Full Control & explorer.exe). Mode 13 (0x0D) + Hyper-V Administrators (S-1-5-32-578) unlocks VM Full Control over both the SRA Built-In Windows VM (explorer.exe) and ERA GameOS VM + Cloud GPU passthrough.',
    badgeColor: 'text-amber-300',
    badgeBorder: 'border-amber-500/60',
    badgeBg: 'bg-amber-950/70',
    sideloadAllowed: true,
    wdpEnabled: true,
    memoryPool: '16.0 GB (6001 Mode 13 VM Full Control)',
    securityFuses: '6001 Paired & Elevated (Mode 13 = 0x0D VM Full Control + Windows Desktop)',
    defaultPortAccess: 'Full 6001 Mode 13 (WDP :11443 + CSRF, SMB3 :445, Hyper-V VM Full Control, Cloud GPU)'
  },
  '8001': {
    mode: 'Manufacturing',
    code: '8001',
    hex: '0x8001',
    label: 'Manufacturing / Factory Mode',
    shortTag: 'MFG MODE',
    description: 'Factory floor calibration and low-level diagnostics. Direct EEPROM/eMMC flashing, SoC calibration, baremetal diagnostic tests, unburned fuses.',
    badgeColor: 'text-purple-300',
    badgeBorder: 'border-purple-500/60',
    badgeBg: 'bg-purple-950/70',
    sideloadAllowed: true,
    wdpEnabled: true,
    memoryPool: 'Baremetal Diagnostics (16 GB)',
    securityFuses: 'Manufacturing Open Fuses (0x8001)',
    defaultPortAccess: 'Factory UART / Raw TCP Diag Sockets'
  },
  '0001': {
    mode: 'SafeMode',
    code: '0001',
    hex: '0x0001',
    label: 'Safe Mode / Recovery',
    shortTag: 'SAFE MODE',
    description: 'Minimal failsafe boot partition (SREC). System repair, diagnostic recovery, offline OSU1 update mode, low-res 640x480 video fallback.',
    badgeColor: 'text-rose-300',
    badgeBorder: 'border-rose-500/60',
    badgeBg: 'bg-rose-950/70',
    sideloadAllowed: false,
    wdpEnabled: true,
    memoryPool: '512 MB Recovery Partition',
    securityFuses: 'SREC Failsafe Enforced (0x0001)',
    defaultPortAccess: 'Recovery Diagnostic Port Only'
  }
};

export function getModeDetail(code?: string | XboxModeCode) {
  const clean = (code || '6001').replace(/^0x/i, '').trim();
  return MODE_MAP[clean] || MODE_MAP['4001'];
}

export const XBOX_MODES = [
  MODE_MAP['4001'],
  MODE_MAP['2001'],
  MODE_MAP['6001'],
  MODE_MAP['8001'],
  MODE_MAP['0001']
];

export function generateSecureLapsPassword(length = 20, requireUppercase = true, requireDigits = true, requireSpecialChars = true): string {
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const special = '!@#$%^&*_-+=';
  let charset = lower;
  const picked: string[] = [];

  picked.push(lower[Math.floor(Math.random() * lower.length)]);
  if (requireUppercase) {
    charset += upper;
    picked.push(upper[Math.floor(Math.random() * upper.length)]);
  }
  if (requireDigits) {
    charset += digits;
    picked.push(digits[Math.floor(Math.random() * digits.length)]);
  }
  if (requireSpecialChars) {
    charset += special;
    picked.push(special[Math.floor(Math.random() * special.length)]);
  }

  const remaining = Math.max(0, length - picked.length);
  for (let i = 0; i < remaining; i++) {
    picked.push(charset[Math.floor(Math.random() * charset.length)]);
  }

  for (let i = picked.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [picked[i], picked[j]] = [picked[j], picked[i]];
  }

  return picked.join('');
}

export const INITIAL_LOCAL_GROUPS: any[] = [
  {
    id: 'grp-admins',
    name: 'Administrators',
    sid: 'S-1-5-32-544',
    description: 'Full unconstrained supervisor control over Xbox kernel, DbgView, hardware registers, and LocalAppData scratchpad.',
    members: ['DevToolsUser', 'Administrator', 'DevUser'],
    privilegeScope: 'Kernel',
    isBuiltIn: true
  },
  {
    id: 'grp-hyperv',
    name: 'Hyper-V Administrators (VM Full Control)',
    sid: 'S-1-5-32-578',
    description: 'Unlocks VM Full Control (vmcompute / hcsdiag / VmConnect) over both the SRA Built-In Windows VM (explorer.exe Desktop) and ERA GameOS Title VM on 6001 Mode 13 kits.',
    members: ['DevUser', 'DevToolsUser', 'Administrator', 'WDPAccessUser', 'SshUser'],
    privilegeScope: 'Kernel',
    isBuiltIn: true
  },
  {
    id: 'grp-devs',
    name: 'Xbox Development Users',
    sid: 'S-1-5-21-3948201948-2849102934-104928103-1001',
    description: 'Authorized for title sideloading, loose folder deployment, and WDP REST/WS APIs.',
    members: ['DevToolsUser', 'DevUser'],
    privilegeScope: 'Developer',
    isBuiltIn: true
  }
];

export const INITIAL_LAPS_AUDIT_LOGS: any[] = [
  {
    id: 'laps-log-1',
    timestamp: '2026-10-29 14:22:10 UTC',
    event: 'PasswordRotated',
    triggeredBy: 'Scheduled LAPS Agent (Interval: 30d)',
    account: 'DevToolsUser',
    result: 'Success',
    details: 'Rotated password via LocalTPM sealed enclave. Synced with Device Portal auth.'
  },
  {
    id: 'laps-log-2',
    timestamp: '2026-09-29 14:22:10 UTC',
    event: 'PasswordRotated',
    triggeredBy: 'Scheduled LAPS Agent',
    account: 'DevToolsUser',
    result: 'Success',
    details: 'Automatic 30-day lifecycle password rotation.'
  },
  {
    id: 'laps-log-3',
    timestamp: '2026-08-30 09:15:42 UTC',
    event: 'PasswordReset',
    triggeredBy: 'Engineer Manual Reset (Console Admin Settings)',
    account: 'DevToolsUser',
    result: 'Success',
    details: 'Manual reset performed from XBXOwned Sign-in Settings. TPM sealed secret refreshed.'
  },
  {
    id: 'laps-log-4',
    timestamp: '2026-08-15 11:04:18 UTC',
    event: 'EscrowRetrieved',
    triggeredBy: 'Azure AD Device Portal Auth Provider',
    account: 'DevToolsUser',
    result: 'Success',
    details: 'Escrowed credential retrieved and validated against hardware TPM.'
  }
];

export const INITIAL_CONFIG: any = {
  ip: '192.168.1.100',
  port: '11443',
  debugPort: '11443',
  ftpPort: '21',
  smbPort: '445',
  user: 'DevUser',
  password: 'XboxDev2026!',
  connectionState: 'disconnected',
  isSimulated: true,
  modeCode: '4001',
  selectedAppId: 'app-1',
  activeSandbox: 'XDKS.1'
};
