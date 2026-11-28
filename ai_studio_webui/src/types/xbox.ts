export interface XboxAppPackage {
  id: string;
  name: string;
  packageFullName: string;
  familyName: string;
  aumid: string;
  version: string;
  publisher: string;
  installSizeMb: number;
  installDate: string;
  isRunning: boolean;
  isDefaultBoot: boolean;
  type: 'Game' | 'Tool' | 'System';
  iconColor?: string;
  launchArgs?: string;
}

export interface XboxFileItem {
  id: string;
  name: string;
  path: string;
  isDir: boolean;
  sizeBytes: number;
  dateModified: string;
  extension?: string;
  content?: string;
}

export interface XboxProcess {
  pid: number;
  name: string;
  cpuPercent: number;
  memoryMb: number;
  peakMemoryMb: number;
  threads: number;
  handles: number;
  status: string;
  isGame: boolean;
}

export interface XboxTelemetry {
  cpuCores: number[];
  cpuAvgLoad: number;
  cpuTempCelsius: number;
  memoryUsedMb: number;
  memoryTotalMb: number;
  gpuFastVramUsedMb: number;
  gpuFastVramTotalMb: number;
  gpuLoadPercent: number;
  internalStorageUsedGb: number;
  internalStorageTotalGb: number;
  frameRate: number;
  frameTimeMs: number;
  hdmiResolution: string;
  hdmiRefreshRate: string;
  hdrActive: boolean;
}

export interface XboxLogEntry {
  id: string;
  timestamp: string;
  level: string;
  category: string;
  message: string;
}

export interface XboxCertificate {
  id: string;
  name: string;
  type: string;
  subject: string;
  issuer: string;
  thumbprint: string;
  serialNumber: string;
  validFrom: string;
  validTo: string;
  keyAlgorithm: string;
  keyUsage: string[];
  isInstalledOnConsole: boolean;
  hasPrivateKey: boolean;
  passwordProtected: boolean;
  certFormat: string;
}

export interface GameSignatureRecord {
  id: string;
  packageName: string;
  packageFileName: string;
  publisher: string;
  certificateId: string;
  certSubject: string;
  certThumbprint: string;
  hashAlgorithm: string;
  timestampServer: string;
  signatureBlock: string;
  status: string;
  signedAt: string;
  packageSizeBytes: number;
  digest: string;
  isTrustedByTargetConsole: boolean;
}

export type XboxModeCode = '4001' | '2001' | '6001' | '8001' | '0001';

export interface ConsoleModel {
  id: string;
  name: string;
  code: string;
}

export interface CustomPortEntry {
  id: string;
  name: string;
  port: number;
  protocol: string;
  description: string;
  isEnabled: boolean;
  status: string;
  serviceType: string;
}

export interface XboxLapsConfig {
  enabled: boolean;
  targetAccount: string;
  adminUsername: string;
  currentPassword: string;
  expirationDate: string;
  rotationIntervalDays: number;
  passwordLength: number;
  requireSpecialChars: boolean;
  requireUppercase: boolean;
  requireDigits: boolean;
  backupStore: string;
  lastRotatedAt: string;
  lastRotatedBy: string;
  status: string;
}

export interface LapsAuditEntry {
  id: string;
  timestamp: string;
  event: string;
  triggeredBy: string;
  account: string;
  result: string;
  details: string;
}

export interface XboxLocalUser {
  id: string;
  username: string;
  displayName: string;
  sid: string;
  role: string;
  status: string;
  isLapsProtected: boolean;
  lastLogin: string;
  passwordLastSet: string;
  description: string;
  homeDirectory: string;
  privileges: string[];
  groups: string[];
  groupIds: string[];
}

export interface XboxLocalGroup {
  id: string;
  name: string;
  sid: string;
  description: string;
  members: string[];
}

export interface XboxConnectionConfig {
  ip: string;
  port: string;
  debugPort: string;
  ftpPort: string;
  smbPort: string;
  user: string;
  password: string;
  connectionState: 'connected' | 'disconnected' | 'connecting';
  isSimulated: boolean;
  modeCode: XboxModeCode;
  selectedAppId: string;
  activeSandbox: string;
  localUsers?: XboxLocalUser[];
  lapsConfig?: XboxLapsConfig;
}
