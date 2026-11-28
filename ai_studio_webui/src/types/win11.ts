export type Win11AppId =
  | 'explorer'
  | 'cmd'
  | 'powershell'
  | 'taskmgr'
  | 'settings'
  | 'hermes'
  | 'deployment'
  | 'notepad';

export interface Win11WindowState {
  id: Win11AppId;
  title: string;
  subtitle?: string;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VfsNode {
  id: string;
  name: string;
  type: 'folder' | 'file';
  parentPath: string; // e.g. 'D:\\DevelopmentFiles\\Models'
  sizeBytes?: number;
  modifiedAt: string;
  content?: string;
  extension?: string;
}

export interface Win11Process {
  pid: number;
  name: string;
  title: string;
  cpuPercent: number;
  memoryMb: number;
  diskMbPerSec: number;
  status: 'Running' | 'Background' | 'Suspended';
  category: 'App' | 'System' | 'AI Engine';
  appId?: Win11AppId;
}

export interface HfLocalModelPreset {
  id: string;
  name: string;
  repo: string;
  filename: string;
  size: string;
  quant: string;
  architecture: string;
  description: string;
}

export interface Win11SystemConfig {
  consoleIp: string;
  smbUser: string;
  smbPassword: string;
  smbShareName: string;
  wdpPort: number;
  lanOnlyLockdown: boolean;
  resolution: '3840x2160 (4K UHD @ 120Hz)' | '2560x1440 (1440p @ 120Hz)' | '1920x1080 (1080p @ 60Hz)';
  uiScalePercent: 100 | 125 | 150;
  wallpaperId: 'bloom-dark' | 'slate-mica' | 'emerald-aurora' | 'carbon-studio';
  usbKeyboardConnected: boolean;
  usbKeyboardName: string;
  usbMouseConnected: boolean;
  usbMouseName: string;
  mouseDpi: number;
  controllerNavigation: boolean;
  activeAiEngine: 'gemini-nano-local' | 'hermes-gguf-local' | 'ollama-local' | 'cloud-fallback';
  selectedHfPresetId: string;
  customHfRepo: string;
  customHfFilename: string;
  localLlamaEndpoint: string;
  loadedLocalModelFile: { name: string; sizeMb: string } | null;
}
