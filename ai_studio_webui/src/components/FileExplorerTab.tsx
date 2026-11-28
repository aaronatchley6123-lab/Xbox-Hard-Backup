import React, { useState, useEffect, useMemo } from 'react';
import {
  Folder,
  FileText,
  Upload,
  Download,
  Trash2,
  Plus,
  RefreshCw,
  Save,
  FileCode,
  X,
  Check,
  ChevronRight,
  HardDrive,
  Search,
  Bookmark,
  BookmarkCheck,
  NotebookPen,
  ArrowUp,
  Copy,
  FolderOpen,
  Wifi,
  AlertTriangle,
  Terminal,
  Regex,
  Binary,
  CaseSensitive,
  Brain,
  FolderTree,
  Eye,
  ShieldCheck,
} from 'lucide-react';
import { XboxAppPackage, XboxConnectionConfig, XboxFileItem } from '../types/xbox';

interface FileExplorerTabProps {
  config: XboxConnectionConfig;
  apps: XboxAppPackage[];
  selectedPackage: string;
  onSelectPackage: (pkg: string) => void;
  files: XboxFileItem[];
  currentFolder: string;
  onNavigateFolder: (folder: string) => void;
  onUploadFile: (file: File) => void;
  onSaveFileContent: (fileId: string, newContent: string) => void;
  onDeleteFile: (fileId: string) => void;
  onCreateFolder: (folderName: string) => void;
  onRefreshFiles: () => void;
}

type PartitionId =
  | 'DevelopmentFiles'
  | 'LocalAppData'
  | 'Dumps'
  | 'SystemScratch'
  | 'Certs'
  | 'SystemOS'
  | 'MPartition'
  | 'JPartition'
  | 'GameOS'
  | 'UserSaves'
  | 'LocalHostFS';

interface PartitionMeta {
  id: PartitionId;
  label: string;
  mountPoint: string;
  knownFolderId?: string;
  smbShare?: string;
  scope: string;
  accessNote: string;
}

interface DiscoveredMount {
  path: string;
  label: string;
  fsType: string;
  writable: boolean;
}

interface DiscoveredSmbShare {
  name: string;
  type: string;
  comment: string;
}

interface ExplorerBookmark {
  id: string;
  label: string;
  tag: 'Hardware' | 'Creds/LAPS' | 'Certs' | 'CrashDump' | 'Config' | 'General';
  partitionId: PartitionId;
  folderPath: string;
  fileName?: string;
  line?: number;
  offsetHex?: string;
  createdAt: string;
}

interface NotepadTab {
  id: string;
  title: string;
  content: string;
  linkedFileId?: string;
  linkedPartition?: PartitionId;
  linkedPath?: string;
  dirty?: boolean;
}

interface GrepMatch {
  id: string;
  sourceLabel: string;
  partitionId?: PartitionId;
  filePath: string;
  fileName: string;
  line: number;
  offsetHex: string;
  match: string;
  lineText: string;
  isBinary: boolean;
  fullContent?: string;
}

const PARTITIONS: PartitionMeta[] = [
  {
    id: 'DevelopmentFiles',
    label: 'DevelopmentFiles (D:\\)',
    mountPoint: 'D:\\DevelopmentFiles',
    knownFolderId: 'DevelopmentFiles',
    smbShare: 'DevelopmentFiles',
    scope: 'SMB3 :445 + WDP',
    accessNote: 'Sideloaded LooseApps, tools, staging builds',
  },
  {
    id: 'LocalAppData',
    label: 'LocalAppData (App Sandbox)',
    mountPoint: 'LocalAppData\\<Pkg>',
    knownFolderId: 'LocalAppData',
    scope: 'WDP KnownFolder',
    accessNote: 'Per-package isolated configs & local saves',
  },
  {
    id: 'Dumps',
    label: 'Crash Dumps',
    mountPoint: 'D:\\DevelopmentFiles\\Dumps',
    knownFolderId: 'Dumps',
    scope: 'WDP / SMB3',
    accessNote: 'Post-mortem .dmp minidumps & crash logs',
  },
  {
    id: 'SystemScratch',
    label: 'System Scratch / TempState',
    mountPoint: 'T:\\ / TempState',
    knownFolderId: 'TempState',
    scope: 'Volatile Scratch',
    accessNote: 'Title scratch buffers & temporary MSIX unpacks',
  },
  {
    id: 'Certs',
    label: 'Certs & Provisioning',
    mountPoint: 'Q:\\Certs / AppX',
    smbShare: 'Q$',
    scope: 'Trusted Root / Store',
    accessNote: 'DevRoot .cer, signing trust, LAPS TPM policy',
  },
  {
    id: 'SystemOS',
    label: 'SystemOS Root (C:\\)',
    mountPoint: 'C:\\',
    smbShare: 'C$',
    scope: 'SRA Host Root',
    accessNote: 'Windows\\System32, Program Files, ProgramData, Users',
  },
  {
    id: 'MPartition',
    label: 'Machine / System Media (M:\\)',
    mountPoint: 'M:\\',
    smbShare: 'M$',
    scope: 'Console M: Partition',
    accessNote: 'Xbox M:\\ System Support, Machine metadata & mounted volumes',
  },
  {
    id: 'JPartition',
    label: 'Shared / User Content (J:\\)',
    mountPoint: 'J:\\',
    smbShare: 'J$',
    scope: 'Console J: Partition',
    accessNote: 'Xbox J:\\ Shared / Title & User Content partition',
  },
  {
    id: 'GameOS',
    label: 'GameOS (X:\\ / G:\\)',
    mountPoint: 'X:\\ / G:\\',
    smbShare: 'X$',
    scope: 'ERA Title Partition',
    accessNote: 'Mounted XVD / active GameCore package',
  },
  {
    id: 'UserSaves',
    label: 'User & Connected Storage',
    mountPoint: 'U:\\ / S:\\',
    smbShare: 'U$',
    scope: 'Profile Cache',
    accessNote: 'User profile saves & connected storage cache',
  },
  {
    id: 'LocalHostFS',
    label: 'Local Host FS (Kali)',
    mountPoint: 'Local Workstation / SMB Mount',
    scope: 'Live Host OS',
    accessNote: 'Browse, edit & grep real files and mounted partitions on Kali',
  },
];

const INITIAL_PARTITION_FILES: Record<Exclude<PartitionId, 'LocalAppData' | 'LocalHostFS'>, XboxFileItem[]> = {
  DevelopmentFiles: [
    { id: 'df-dir-loose', name: 'LooseApps', path: '\\LooseApps', isDir: true, sizeBytes: 0, dateModified: '2026-11-12 09:00' },
    { id: 'df-dir-models', name: 'Models', path: '\\Models', isDir: true, sizeBytes: 0, dateModified: '2026-11-11 18:10' },
    {
      id: 'df-readme',
      name: 'DEVSHARE_INFO.txt',
      path: '\\DEVSHARE_INFO.txt',
      isDir: false,
      sizeBytes: 420,
      dateModified: '2026-11-12 09:00',
      extension: 'txt',
      content: `Mount: \\\\<XboxIP>\\DevelopmentFiles (SMB3 port 445)\nLocal Path on Console: D:\\DevelopmentFiles\\\nRegister LooseApp endpoint: POST https://<XboxIP>:11443/api/app/packagemanager/register?folder=<base64>`,
    },
    {
      id: 'df-loose-manifest',
      name: 'AppxManifest.xml',
      path: '\\LooseApps\\AppxManifest.xml',
      isDir: false,
      sizeBytes: 1840,
      dateModified: '2026-11-12 10:15',
      extension: 'xml',
      content: `<Package>\n  <Identity Name="XBXOwned.XboxDevKitStudio" Publisher="CN=XBXOwned DevKit Studio" Version="1.0.0.0" />\n  <TargetDeviceFamily Name="Windows.Xbox" MinVersion="10.0.19041.0" />\n  <Capabilities>\n    <Capability Name="internetClient" />\n    <Capability Name="privateNetworkClientServer" />\n  </Capabilities>\n</Package>`,
    },
  ],
  Dumps: [
    {
      id: 'dmp-1',
      name: 'wer_summary.log',
      path: '\\wer_summary.log',
      isDir: false,
      sizeBytes: 910,
      dateModified: '2026-11-11 22:04',
      extension: 'log',
      content: `[WER] Console: XDK-SERIESX-LAB01\nExceptionCode: 0xC0000005 (Access Violation)\nFaultModule: CyberpunkEngineCore.dll+0x00419B20\nDumpLocation: D:\\DevelopmentFiles\\Dumps\\title_1480.dmp`,
    },
  ],
  SystemScratch: [
    {
      id: 'tmp-1',
      name: 'msix_staging.cfg',
      path: '\\msix_staging.cfg',
      isDir: false,
      sizeBytes: 312,
      dateModified: '2026-11-12 08:30',
      extension: 'cfg',
      content: `SCRATCH_DRIVE=T:\\\nMAX_UNPACK_BUDGET_MB=4096\nCLEANUP_ON_REBOOT=1`,
    },
  ],
  Certs: [
    {
      id: 'cert-1',
      name: 'TrustedPeople_Summary.txt',
      path: '\\TrustedPeople_Summary.txt',
      isDir: false,
      sizeBytes: 510,
      dateModified: '2026-11-10 12:00',
      extension: 'txt',
      content: `Q:\\Certs\\xbox_sideload_auth.cer\nRequired Subject Match: AppxManifest <Identity Publisher="CN=...">\nWDP Upload Route: POST /api/app/packagemanager/package (multipart package + cert)`,
    },
  ],
  SystemOS: [
    { id: 'sys-dir-win', name: 'Windows', path: '\\Windows', isDir: true, sizeBytes: 0, dateModified: '2026-11-01 00:00' },
    { id: 'sys-dir-w32', name: 'System32', path: '\\Windows\\System32', isDir: true, sizeBytes: 0, dateModified: '2026-11-01 00:00' },
    { id: 'sys-dir-pf', name: 'Program Files', path: '\\Program Files', isDir: true, sizeBytes: 0, dateModified: '2026-11-01 00:00' },
    { id: 'sys-dir-pd', name: 'ProgramData', path: '\\ProgramData', isDir: true, sizeBytes: 0, dateModified: '2026-11-01 00:00' },
    { id: 'sys-dir-usr', name: 'Users', path: '\\Users', isDir: true, sizeBytes: 0, dateModified: '2026-11-01 00:00' },
    {
      id: 'sys-wdp',
      name: 'XboxDevicePortal_Notes.ini',
      path: '\\Windows\\System32\\XboxDevicePortal_Notes.ini',
      isDir: false,
      sizeBytes: 490,
      dateModified: '2026-11-01 00:00',
      extension: 'ini',
      content: `[XboxDevicePortal]\nPort=11443\nProtocol=HTTPS\nCSRFProtection=Enabled (Cookie CSRF-Token -> Header X-CSRF-Token)\nSSHService=DisabledByDefaultInDevHome`,
    },
  ],
  MPartition: [
    { id: 'm-dir-sys', name: 'SystemSupport', path: '\\SystemSupport', isDir: true, sizeBytes: 0, dateModified: '2026-11-10 00:00' },
    { id: 'm-dir-upd', name: 'SystemUpdate', path: '\\SystemUpdate', isDir: true, sizeBytes: 0, dateModified: '2026-11-10 00:00' },
    {
      id: 'm-info',
      name: 'M_PARTITION_INFO.txt',
      path: '\\M_PARTITION_INFO.txt',
      isDir: false,
      sizeBytes: 340,
      dateModified: '2026-11-10 00:00',
      extension: 'txt',
      content: `Drive: M:\\\nScope: Xbox Machine / System Support Partition\nNote: Live browsing probes SMB3 //ip/M$ or mounted LocalHostFS volume.`,
    },
  ],
  JPartition: [
    { id: 'j-dir-content', name: 'UserContent', path: '\\UserContent', isDir: true, sizeBytes: 0, dateModified: '2026-11-10 00:00' },
    { id: 'j-dir-dev', name: 'SharedDev', path: '\\SharedDev', isDir: true, sizeBytes: 0, dateModified: '2026-11-10 00:00' },
    {
      id: 'j-info',
      name: 'J_PARTITION_INFO.txt',
      path: '\\J_PARTITION_INFO.txt',
      isDir: false,
      sizeBytes: 330,
      dateModified: '2026-11-10 00:00',
      extension: 'txt',
      content: `Drive: J:\\\nScope: Xbox Shared / User Content Partition\nNote: Live browsing probes SMB3 //ip/J$ or mounted LocalHostFS volume.`,
    },
  ],
  GameOS: [
    {
      id: 'game-cfg',
      name: 'MicrosoftGame.config',
      path: '\\MicrosoftGame.config',
      isDir: false,
      sizeBytes: 620,
      dateModified: '2026-11-08 15:20',
      extension: 'config',
      content: `<Game configVersion="1">\n  <Identity Name="XBXOwned.SeriesXStudio" Publisher="CN=XBXOwned DevKit Studio" Version="1.0.0.0" />\n  <ExecutableList>\n    <Executable Name="XBXOwned.exe" Id="XBXOwnedApp" TargetDeviceFamily="Scarlett" />\n  </ExecutableList>\n</Game>`,
    },
  ],
  UserSaves: [
    {
      id: 'usr-save',
      name: 'sandbox_profile.json',
      path: '\\sandbox_profile.json',
      isDir: false,
      sizeBytes: 380,
      dateModified: '2026-11-11 19:45',
      extension: 'json',
      content: `{\n  "sandboxId": "XDKS.1",\n  "testGamertagXuid": "2535418291048201",\n  "connectedStorageMode": "LocalDevCache"\n}`,
    },
  ],
};

const BOOKMARKS_KEY = 'xbxowned_explorer_bookmarks_v1';
const NOTEPAD_KEY = 'xbxowned_notepad_tabs_v1';

const DEFAULT_BOOKMARKS: ExplorerBookmark[] = [
  {
    id: 'bm-1',
    label: 'LooseApps Staging Folder (SMB3)',
    tag: 'Config',
    partitionId: 'DevelopmentFiles',
    folderPath: '\\LooseApps',
    createdAt: '2026-11-12',
  },
  {
    id: 'bm-2',
    label: 'Sideload Cert & Publisher Match Notes',
    tag: 'Certs',
    partitionId: 'Certs',
    folderPath: '\\',
    fileName: 'TrustedPeople_Summary.txt',
    createdAt: '2026-11-12',
  },
  {
    id: 'bm-3',
    label: 'WDP CSRF & SSH Config Notes',
    tag: 'Hardware',
    partitionId: 'SystemOS',
    folderPath: '\\System32',
    fileName: 'XboxDevicePortal_Notes.ini',
    createdAt: '2026-11-12',
  },
];

const DEFAULT_NOTES: NotepadTab[] = [
  {
    id: 'note-bench',
    title: 'bench_notes.txt',
    content: `# Bench Bring-Up Notes\nConsole IP: 192.168.1.100\nWDP Port: 11443 (requires bare username + X-CSRF-Token)\nSMB3 Share: //192.168.1.100/DevelopmentFiles\n\nReminders:\n- Check mode code (0x4001 DevKit / 0x6001 TestKit) before sideloading\n- Match .cer Subject == AppxManifest Identity Publisher\n`,
  },
  {
    id: 'note-tokens',
    title: 'token_order.md',
    content: `Order of Operations:\n1. Efuses & Hardware Mode (0x4001 / 0x6001)\n2. Local Account / LAPS Password\n3. WDP :11443 GET /api/os/info -> CSRF-Token cookie\n4. SMB3 :445 DevelopmentFiles check\n5. Install .cer + match Manifest Publisher\n6. Set AppContainer <Capabilities>\n7. Launch & verify Xbox Live SandboxId (XDKS.1)\n`,
  },
];

export const FileExplorerTab: React.FC<FileExplorerTabProps> = ({
  config,
  apps,
  selectedPackage,
  onSelectPackage,
  files,
  currentFolder,
  onNavigateFolder,
  onUploadFile,
  onSaveFileContent,
  onDeleteFile,
  onCreateFolder,
  onRefreshFiles,
}) => {
  const [subView, setSubView] = useState<'explorer' | 'grep' | 'bookmarks' | 'notepad'>('explorer');
  const [activePartition, setActivePartition] = useState<PartitionId>('DevelopmentFiles');
  const [partitionPaths, setPartitionPaths] = useState<Record<PartitionId, string>>({
    DevelopmentFiles: '\\',
    LocalAppData: currentFolder || '\\',
    Dumps: '\\',
    SystemScratch: '\\',
    Certs: '\\',
    SystemOS: '\\',
    MPartition: '\\',
    JPartition: '\\',
    GameOS: '\\',
    UserSaves: '\\',
    LocalHostFS: '.',
  });

  // Partition virtual/custom file store (for non-LocalAppData reference/added files)
  const [partitionFiles, setPartitionFiles] = useState<Record<string, XboxFileItem[]>>(
    INITIAL_PARTITION_FILES
  );

  // Live WDP / SMB3 / Local Host FS state
  const [liveItems, setLiveItems] = useState<XboxFileItem[] | null>(null);
  const [liveSourceLabel, setLiveSourceLabel] = useState<string | null>(null);
  const [liveBackend, setLiveBackend] = useState<'local' | 'wdp' | 'smb' | null>(null);
  const [liveWritable, setLiveWritable] = useState<boolean>(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [liveWriteStatus, setLiveWriteStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [isLoadingLive, setIsLoadingLive] = useState(false);

  // Dynamic Discovery state (KnownFolders + SMB3 Shares + Linux Host Mounts)
  const [discoveredKnownFolders, setDiscoveredKnownFolders] = useState<string[]>([]);
  const [discoveredSmbShares, setDiscoveredSmbShares] = useState<DiscoveredSmbShare[]>([]);
  const [discoveredLocalMounts, setDiscoveredLocalMounts] = useState<DiscoveredMount[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);

  // Create Folder & Delete confirmation
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copiedPathId, setCopiedPathId] = useState<string | null>(null);

  // Grep Tool State
  const [grepQuery, setGrepQuery] = useState('');
  const [grepScope, setGrepScope] = useState<'all-partitions' | 'current-partition' | 'local-host'>('all-partitions');
  const [grepLocalRoot, setGrepLocalRoot] = useState('.');
  const [grepRegex, setGrepRegex] = useState(false);
  const [grepCaseSensitive, setGrepCaseSensitive] = useState(false);
  const [grepBinaryStrings, setGrepBinaryStrings] = useState(true);
  const [grepMatches, setGrepMatches] = useState<GrepMatch[]>([]);
  const [grepStatus, setGrepStatus] = useState<string | null>(null);
  const [isGrepping, setIsGrepping] = useState(false);

  // Bookmarks State (localStorage persisted)
  const [bookmarks, setBookmarks] = useState<ExplorerBookmark[]>(() => {
    try {
      const raw = localStorage.getItem(BOOKMARKS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return DEFAULT_BOOKMARKS;
  });
  const [bookmarkFilter, setBookmarkFilter] = useState<string>('All');
  const [newBmLabel, setNewBmLabel] = useState('');
  const [newBmTag, setNewBmTag] = useState<ExplorerBookmark['tag']>('General');
  const [showAddBookmarkForm, setShowAddBookmarkForm] = useState(false);

  // Multi-tab Notepad State (localStorage persisted)
  const [notes, setNotes] = useState<NotepadTab[]>(() => {
    try {
      const raw = localStorage.getItem(NOTEPAD_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return DEFAULT_NOTES;
  });
  const [activeNoteId, setActiveNoteId] = useState<string>(notes[0]?.id || 'note-bench');
  const [noteFindText, setNoteFindText] = useState('');
  const [noteSaveBanner, setNoteSaveBanner] = useState<string | null>(null);

  // Dynamic Custom Share / KnownFolder target (when user clicks a live discovered share or KnownFolder not in static PARTITIONS)
  const [customSmbShare, setCustomSmbShare] = useState<string | null>(null);
  const [customKnownFolder, setCustomKnownFolder] = useState<string | null>(null);

  // Recursive Full-FS Tree ("Open Book" on actual Kit FS) + Live RW Probe state
  const [isTreeMode, setIsTreeMode] = useState(false);
  const [treeDepth, setTreeDepth] = useState(3);
  const [treeSkippedDirs, setTreeSkippedDirs] = useState<Array<{ path: string; reason: string }>>([]);
  const [isProbingRw, setIsProbingRw] = useState(false);

  // Full-Content Kit File Inspector Drawer/Modal + Corpus Export (replaces paper book modal)
  const [inspectorTarget, setInspectorTarget] = useState<{
    id: string;
    title: string;
    subtitle: string;
    content: string;
    loadedBytes: number;
    totalBytes: number;
    hasMore: boolean;
    nextOffset: number;
    fsPayload?: Record<string, any>;
    usedAccount?: string;
    fallbackBackend?: string;
  } | null>(null);
  const [inspectorSearch, setInspectorSearch] = useState('');
  const [isStreamingChunk, setIsStreamingChunk] = useState(false);

  // Kit Filesystem -> JSONL Training Corpus modal/bar
  const [showCorpusPanel, setShowCorpusPanel] = useState(false);
  const [corpusFormat, setCorpusFormat] = useState<'sharegpt' | 'alpaca' | 'raw_pretrain'>('sharegpt');
  const [corpusChunkSize, setCorpusChunkSize] = useState(4096);
  const [corpusStatus, setCorpusStatus] = useState<string | null>(null);
  const [isBuildingCorpus, setIsBuildingCorpus] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
    } catch {
      // ignore
    }
  }, [bookmarks]);

  useEffect(() => {
    try {
      localStorage.setItem(NOTEPAD_KEY, JSON.stringify(notes));
    } catch {
      // ignore
    }
  }, [notes]);

  const activePartMeta: PartitionMeta = useMemo(() => {
    if (customSmbShare) {
      return {
        id: activePartition,
        label: `SMB Share (//${customSmbShare})`,
        mountPoint: `\\\\${config.ip}\\${customSmbShare}`,
        smbShare: customSmbShare,
        scope: 'Discovered SMB3',
        accessNote: `Dynamic live SMB3 share //${config.ip}/${customSmbShare}`,
      };
    }
    if (customKnownFolder) {
      return {
        id: activePartition,
        label: `WDP KnownFolder (${customKnownFolder})`,
        mountPoint: `${customKnownFolder}\\`,
        knownFolderId: customKnownFolder,
        scope: 'Discovered WDP',
        accessNote: `Dynamic Windows Device Portal folder ${customKnownFolder}`,
      };
    }
    return PARTITIONS.find((p) => p.id === activePartition) || PARTITIONS[0];
  }, [activePartition, customSmbShare, customKnownFolder, config.ip]);

  const activePath =
    activePartition === 'LocalAppData' && !customSmbShare && !customKnownFolder
      ? currentFolder
      : partitionPaths[activePartition] || '\\';

  // Keep domain prefix (WORKGROUP\User) for backend SMB3 while backend strips domain cleanly for WDP HTTP Basic
  const fullCredUsername = config.username || 'DevUser';

  const discoverLiveStorage = async () => {
    setIsDiscovering(true);
    try {
      const res = await fetch('/api/xbox/fs/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: config.ip,
          wdpPort: Number(config.port) || 11443,
          username: fullCredUsername,
          password: config.password,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        if (Array.isArray(data.knownFolders)) setDiscoveredKnownFolders(data.knownFolders);
        if (Array.isArray(data.smbShares)) setDiscoveredSmbShares(data.smbShares);
        if (Array.isArray(data.localMounts)) setDiscoveredLocalMounts(data.localMounts);
      }
    } catch {
      // ignore discovery errors
    } finally {
      setIsDiscovering(false);
    }
  };

  useEffect(() => {
    void discoverLiveStorage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.ip, config.port]);

  // Fetch real LocalHostFS, WDP KnownFolder, or SMB3 Share items (Flat folder OR Full Recursive Tree)
  const loadLiveDirectory = async (
    targetPartition: PartitionId = activePartition,
    overridePath?: string,
    opts?: {
      tree?: boolean;
      probeRw?: boolean;
      overrideSmbShare?: string | null;
      overrideKnownFolder?: string | null;
    }
  ) => {
    const effSmbShare = opts && 'overrideSmbShare' in opts ? opts.overrideSmbShare : customSmbShare;
    const effKnownFolder = opts && 'overrideKnownFolder' in opts ? opts.overrideKnownFolder : customKnownFolder;
    const staticMeta = PARTITIONS.find((p) => p.id === targetPartition) || PARTITIONS[0];
    const targetPath =
      overridePath ??
      (targetPartition === 'LocalAppData' && !effSmbShare && !effKnownFolder
        ? currentFolder
        : partitionPaths[targetPartition] || '\\');

    const sourceMode: 'local' | 'wdp' | 'smb' = effSmbShare
      ? 'smb'
      : effKnownFolder
      ? 'wdp'
      : targetPartition === 'LocalHostFS'
      ? 'local'
      : staticMeta?.knownFolderId
      ? 'wdp'
      : 'smb';

    const effectiveShareName = effSmbShare || staticMeta?.smbShare || 'DevelopmentFiles';
    const effectiveKnownName = effKnownFolder || staticMeta?.knownFolderId || 'DevelopmentFiles';
    const useTree = opts?.tree ?? isTreeMode;

    setIsLoadingLive(true);
    setLiveError(null);
    setTreeSkippedDirs([]);
    try {
      const endpoint = useTree ? '/api/xbox/fs/tree' : '/api/xbox/fs/list';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: sourceMode,
          localPath: targetPath || '.',
          ip: config.ip,
          wdpPort: Number(config.port) || 11443,
          username: fullCredUsername,
          password: config.password,
          knownFolderId: effectiveKnownName,
          packageFullName: selectedPackage,
          smbShare: effectiveShareName,
          subPath: targetPath || '\\',
          maxDepth: treeDepth,
          probeRw: Boolean(opts?.probeRw),
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        // Fallback: if WDP failed on DevelopmentFiles/Dumps, retry over SMB3 automatically
        if (sourceMode === 'wdp' && (staticMeta?.smbShare || effectiveKnownName === 'DevelopmentFiles')) {
          const smbRes = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              source: 'smb',
              ip: config.ip,
              wdpPort: Number(config.port) || 11443,
              username: fullCredUsername,
              password: config.password,
              smbShare: staticMeta?.smbShare || 'DevelopmentFiles',
              subPath: targetPath || '\\',
              maxDepth: treeDepth,
              probeRw: Boolean(opts?.probeRw),
            }),
          });
          const smbData = await smbRes.json();
          if (smbData.ok) {
            setLiveItems(useTree ? smbData.entries || [] : smbData.items || []);
            if (useTree) setTreeSkippedDirs(smbData.skippedDirs || []);
            setLiveBackend('smb');
            setLiveWritable(Boolean(smbData.writable));
            setLiveSourceLabel(
              useTree
                ? `Full Kit Tree (${smbData.totalFiles || 0} files, ${smbData.totalDirs || 0} dirs) via SMB3`
                : smbData.accessLabel || `SMB3 //${config.ip}/${staticMeta?.smbShare || 'DevelopmentFiles'}`
            );
            setIsLoadingLive(false);
            return;
          }
        }
        setLiveError(data.error || 'Failed to read directory');
        setLiveBackend(null);
        setLiveWritable(false);
        if (targetPartition === 'LocalHostFS') setLiveItems([]);
      } else {
        setLiveItems(useTree ? data.entries || [] : data.items || []);
        if (useTree) setTreeSkippedDirs(data.skippedDirs || []);
        setLiveBackend(sourceMode);
        setLiveWritable(Boolean(data.writable));
        setLiveSourceLabel(
          useTree
            ? `Full FS Tree (${data.totalFiles || 0} files, ${data.totalDirs || 0} folders) · ${data.root || targetPath}`
            : targetPartition === 'LocalHostFS' && !effSmbShare && !effKnownFolder
            ? `Live Host FS (${data.resolvedPath})`
            : data.accessLabel || `Live Xbox (${config.ip}:${config.port})`
        );
        if (targetPartition === 'LocalHostFS' && !effSmbShare && !effKnownFolder && data.resolvedPath) {
          setPartitionPaths((prev) => ({ ...prev, LocalHostFS: data.resolvedPath }));
        }
      }
    } catch (err: any) {
      setLiveError(err?.message || 'Directory request failed');
    } finally {
      setIsLoadingLive(false);
    }
  };

  const handleProbeWritableLive = async () => {
    setIsProbingRw(true);
    setLiveWriteStatus(null);
    const sourceMode: 'local' | 'wdp' | 'smb' = customSmbShare
      ? 'smb'
      : customKnownFolder
      ? 'wdp'
      : activePartition === 'LocalHostFS'
      ? 'local'
      : activePartMeta.smbShare
      ? 'smb'
      : 'wdp';
    try {
      const res = await fetch('/api/xbox/fs/probe-rw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: sourceMode,
          localPath: activePath || '.',
          ip: config.ip,
          wdpPort: Number(config.port) || 11443,
          username: fullCredUsername,
          password: config.password,
          smbShare: activePartMeta.smbShare || 'DevelopmentFiles',
          subPath: activePath || '\\',
        }),
      });
      const data = await res.json();
      setLiveWritable(Boolean(data.writable));
      setLiveWriteStatus({
        ok: Boolean(data.writable),
        msg: data.detail || (data.writable ? 'Directory is Writable (RW Verified)' : 'Read-Only / Access Restricted'),
      });
    } catch (err: any) {
      setLiveWriteStatus({ ok: false, msg: err?.message || 'RW Probe failed' });
    } finally {
      setIsProbingRw(false);
    }
  };

  const handleSelectPartition = (partId: PartitionId) => {
    setCustomSmbShare(null);
    setCustomKnownFolder(null);
    setActivePartition(partId);
    setLiveError(null);
    setLiveWriteStatus(null);
    setLiveItems(null);
    setLiveBackend(null);
    setLiveWritable(false);
    setLiveSourceLabel(null);
    setTreeSkippedDirs([]);
    setConfirmDeleteId(null);
    if (partId === 'LocalHostFS') {
      void loadLiveDirectory('LocalHostFS', partitionPaths.LocalHostFS || '.', {
        overrideSmbShare: null,
        overrideKnownFolder: null,
      });
    } else if (!config.isSimulated) {
      void loadLiveDirectory(
        partId,
        partId === 'LocalAppData' ? currentFolder : partitionPaths[partId] || '\\',
        { overrideSmbShare: null, overrideKnownFolder: null }
      );
    }
  };

  // Compute displayed items in current partition & folder
  const displayedFiles: XboxFileItem[] = useMemo(() => {
    if (liveItems !== null) return liveItems;
    if (activePartition === 'LocalAppData') return files;
    const allInPart = partitionFiles[activePartition] || [];
    if (isTreeMode) return allInPart;
    return allInPart.filter((item) => {
      if (activePath === '\\') {
        return !item.path.slice(1).includes('\\');
      }
      const prefix = activePath + '\\';
      if (!item.path.startsWith(prefix)) return false;
      const remainder = item.path.slice(prefix.length);
      return remainder.length > 0 && !remainder.includes('\\');
    });
  }, [liveItems, activePartition, files, partitionFiles, activePath, isTreeMode]);

  const navigateInPartition = (nextPath: string) => {
    if (activePartition === 'LocalAppData' && !customSmbShare && !customKnownFolder) {
      onNavigateFolder(nextPath);
      if (liveItems !== null || !config.isSimulated) void loadLiveDirectory('LocalAppData', nextPath);
      return;
    }
    setPartitionPaths((prev) => ({ ...prev, [activePartition]: nextPath }));
    if (activePartition === 'LocalHostFS' || liveItems !== null || !config.isSimulated) {
      void loadLiveDirectory(activePartition, nextPath);
    }
  };

  const handleGoUp = () => {
    if (activePartition === 'LocalHostFS' && !customSmbShare && !customKnownFolder) {
      const parts = activePath.replace(/\/+$/, '').split('/').filter(Boolean);
      if (parts.length <= 1) {
        navigateInPartition('/');
      } else {
        navigateInPartition('/' + parts.slice(0, -1).join('/'));
      }
      return;
    }
    if (activePath === '\\') return;
    const parts = activePath.split('\\').filter(Boolean);
    const parent = parts.length <= 1 ? '\\' : '\\' + parts.slice(0, -1).join('\\');
    navigateInPartition(parent);
  };

  const buildReadPayload = (file: XboxFileItem) => {
    const readSource: 'local' | 'wdp' | 'smb' = customSmbShare
      ? 'smb'
      : customKnownFolder
      ? 'wdp'
      : liveBackend || (activePartition === 'LocalHostFS' ? 'local' : activePartMeta.knownFolderId ? 'wdp' : 'smb');
    const derivedSub =
      file.path && file.path.includes('\\') && readSource !== 'local'
        ? file.path.slice(0, file.path.lastIndexOf('\\')) || '\\'
        : activePath;
    return {
      source: readSource,
      filePath: file.path,
      ip: config.ip,
      wdpPort: Number(config.port) || 11443,
      username: fullCredUsername,
      password: config.password,
      knownFolderId: activePartMeta.knownFolderId || 'DevelopmentFiles',
      packageFullName: selectedPackage,
      smbShare: activePartMeta.smbShare || 'DevelopmentFiles',
      subPath: derivedSub,
      filename: file.name,
    };
  };

  const openFileInNotepad = async (file: XboxFileItem) => {
    let content = file.content;
    if (content === undefined && (liveBackend || activePartition === 'LocalHostFS' || !config.isSimulated)) {
      try {
        const res = await fetch('/api/xbox/fs/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildReadPayload(file)),
        });
        const data = await res.json();
        content = data.ok
          ? data.content
          : `[Error reading file: ${data.error || 'Unknown error'}]`;
      } catch (err: any) {
        content = `[Error reading file: ${err?.message || 'Failed'}]`;
      }
    }

    const existing = notes.find(
      (n) =>
        (n.linkedFileId && n.linkedFileId === file.id) ||
        (n.linkedPartition === activePartition && n.linkedPath === file.path)
    );
    if (existing) {
      setActiveNoteId(existing.id);
      setSubView('notepad');
      return;
    }

    const newNote: NotepadTab = {
      id: `note-${Date.now()}`,
      title: file.name,
      content: content ?? `[No text content preview for ${file.name}]`,
      linkedFileId: file.id,
      linkedPartition: activePartition,
      linkedPath: file.path,
      dirty: false,
    };
    setNotes((prev) => [...prev, newNote]);
    setActiveNoteId(newNote.id);
    setSubView('notepad');
  };

  const openFullContentInspector = async (file: XboxFileItem) => {
    const fsPayload = buildReadPayload(file);
    setInspectorSearch('');

    if (file.content !== undefined && !liveBackend && activePartition !== 'LocalHostFS' && config.isSimulated) {
      setInspectorTarget({
        id: file.id,
        title: file.name,
        subtitle: `${activePartMeta.mountPoint}${file.path}`,
        content: file.content,
        loadedBytes: file.content.length,
        totalBytes: file.sizeBytes || file.content.length,
        hasMore: false,
        nextOffset: file.content.length,
      });
      return;
    }

    try {
      const res = await fetch('/api/xbox/fs/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...fsPayload,
          offset: 0,
          maxBytes: 1024 * 1024,
          extractPdfText: true,
        }),
      });
      const data = await res.json();
      const loadedContent = data.ok
        ? String(data.content || '')
        : file.content || `[Error reading file: ${data.error || 'Unknown error'}]`;
      setInspectorTarget({
        id: file.id,
        title: file.name,
        subtitle: data.resolvedPath || `${activePartMeta.mountPoint}${file.path}`,
        content: loadedContent,
        loadedBytes: Number(data.nextOffset ?? loadedContent.length),
        totalBytes: Number(data.sizeBytes ?? file.sizeBytes ?? loadedContent.length),
        hasMore: Boolean(data.hasMore),
        nextOffset: Number(data.nextOffset ?? 0),
        fsPayload,
        usedAccount: data.usedAccount,
        fallbackBackend: data.fallbackBackend,
      });
    } catch (err: any) {
      setInspectorTarget({
        id: file.id,
        title: file.name,
        subtitle: file.path,
        content: file.content || `[Error reading file: ${err?.message || 'Failed'}]`,
        loadedBytes: 0,
        totalBytes: file.sizeBytes || 0,
        hasMore: false,
        nextOffset: 0,
      });
    }
  };

  const handleLoadNextChunkInspector = async (loadAll = false) => {
    if (!inspectorTarget?.fsPayload || !inspectorTarget.hasMore) return;
    setIsStreamingChunk(true);
    try {
      let curOffset = inspectorTarget.nextOffset;
      let accContent = inspectorTarget.content;
      let totalBytes = inspectorTarget.totalBytes;
      let hasMore: boolean = inspectorTarget.hasMore;
      const maxPasses = loadAll ? 12 : 1;

      for (let i = 0; i < maxPasses && hasMore; i++) {
        const res = await fetch('/api/xbox/fs/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...inspectorTarget.fsPayload,
            offset: curOffset,
            maxBytes: 1024 * 1024,
            extractPdfText: false,
          }),
        });
        const data = await res.json();
        if (!data.ok) break;
        accContent += String(data.content || '');
        curOffset = Number(data.nextOffset || curOffset);
        totalBytes = Number(data.sizeBytes || totalBytes);
        hasMore = Boolean(data.hasMore);
      }

      setInspectorTarget((prev) =>
        prev
          ? {
              ...prev,
              content: accContent,
              loadedBytes: curOffset,
              totalBytes,
              hasMore,
              nextOffset: curOffset,
            }
          : null
      );
    } finally {
      setIsStreamingChunk(false);
    }
  };

  const handleBuildKitTrainingCorpus = async () => {
    setIsBuildingCorpus(true);
    setCorpusStatus(null);
    try {
      const localScanPath =
        activePartition === 'LocalHostFS' && !customSmbShare && !customKnownFolder ? activePath || '.' : '';

      let inlineDocs: Array<{ title: string; sourcePath: string; category: string; text: string }> = [];
      let skippedCount = 0;

      if (!localScanPath) {
        const candidateFiles = displayedFiles.filter((f) => !f.isDir && f.readable !== false);
        const TEXT_LIKE_RE =
          /\.(txt|md|json|jsonl|csv|tsv|log|ini|cfg|conf|yaml|yml|xml|toml|c|h|cpp|hpp|cs|rs|go|py|ts|tsx|js|jsx|sh|ps1|bat|cmd|sql|reg|manifest|xex|pdb|inf|etl|dmp|pdf)$/i;

        for (const f of candidateFiles) {
          if (f.content && f.content.trim()) {
            inlineDocs.push({
              title: f.name,
              sourcePath: `${activePartMeta.mountPoint}${f.path}`,
              category: activePartMeta.label,
              text: f.content,
            });
            continue;
          }
          // Live remote file on Xbox SMB3 / WDP: fetch actual readable content if text/config/code/log or unknown small ext
          const hasExt = f.name.includes('.');
          const isReadableSize = (f.sizeBytes ?? 0) <= 2 * 1024 * 1024;
          if ((liveBackend || !config.isSimulated) && isReadableSize && (!hasExt || TEXT_LIKE_RE.test(f.name))) {
            if (inlineDocs.length >= 60) break;
            try {
              setCorpusStatus(`Reading kit files for corpus (${inlineDocs.length}/60): ${f.name}...`);
              const r = await fetch('/api/xbox/fs/read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  ...buildReadPayload(f),
                  offset: 0,
                  maxBytes: 512 * 1024,
                  extractPdfText: true,
                }),
              });
              const d = await r.json();
              if (d.ok && String(d.content || '').trim()) {
                inlineDocs.push({
                  title: f.name,
                  sourcePath: d.resolvedPath || `${activePartMeta.mountPoint}${f.path}`,
                  category: activePartMeta.label,
                  text: String(d.content),
                });
              } else {
                skippedCount++;
              }
            } catch {
              skippedCount++;
            }
          }
        }
      }

      const res = await fetch('/api/local-llm/export-training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: corpusFormat,
          chunkSize: corpusChunkSize,
          overlap: 256,
          includeVault: false,
          localRootPath: localScanPath,
          inlineDocs,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setCorpusStatus(`Corpus export failed: ${data.error || 'No readable files found'}`);
        return;
      }
      const blob = new Blob([data.jsonl || ''], { type: 'application/x-ndjson' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `xbx_kit_fs_training_${corpusFormat}.jsonl`;
      a.click();
      URL.revokeObjectURL(url);
      const docTotal = data.totalDocs ?? data.docCount ?? inlineDocs.length;
      const recTotal = data.totalRecords ?? data.sampleCount ?? 0;
      setCorpusStatus(
        `Exported ${recTotal} JSONL training records from ${docTotal} files (${Math.round((data.totalChars || 0) / 1024)} KB text)${skippedCount > 0 ? ` · ${skippedCount} restricted/binary skipped` : ''}.`
      );
    } catch (err: any) {
      setCorpusStatus(err?.message || 'Corpus export failed');
    } finally {
      setIsBuildingCorpus(false);
    }
  };

  const handleSaveNotepadTab = async (note: NotepadTab) => {
    const partId = note.linkedPartition || activePartition;
    const partMeta = PARTITIONS.find((p) => p.id === partId) || activePartMeta;

    // Live write back to Host FS, WDP, or SMB3 when linked to a real source or live mode
    if (liveBackend || partId === 'LocalHostFS' || !config.isSimulated) {
      const writeSource: 'local' | 'wdp' | 'smb' = customSmbShare
        ? 'smb'
        : customKnownFolder
        ? 'wdp'
        : partId === 'LocalHostFS'
        ? 'local'
        : partMeta.knownFolderId
        ? 'wdp'
        : 'smb';
      try {
        const res = await fetch('/api/xbox/fs/write', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: writeSource,
            filePath: note.linkedPath,
            ip: config.ip,
            wdpPort: Number(config.port) || 11443,
            username: fullCredUsername,
            password: config.password,
            knownFolderId: partMeta.knownFolderId || 'DevelopmentFiles',
            packageFullName: selectedPackage,
            smbShare: partMeta.smbShare || 'DevelopmentFiles',
            subPath: note.linkedPath ? note.linkedPath.replace(/\\[^\\]+$/, '') || '\\' : activePath,
            filename: note.title,
            textContent: note.content,
          }),
        });
        const data = await res.json();
        if (data.ok) {
          setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, dirty: false } : n)));
          setNoteSaveBanner(`Saved live to ${partMeta.label}: "${note.title}" (${new Blob([note.content]).size} bytes)`);
          void loadLiveDirectory(partId);
          setTimeout(() => setNoteSaveBanner(null), 3500);
          return;
        }
        setNoteSaveBanner(`Write failed (${partMeta.mountPoint}): ${data.error || 'Read-only or Access Denied'}`);
        setTimeout(() => setNoteSaveBanner(null), 5000);
        return;
      } catch (err: any) {
        setNoteSaveBanner(`Write error: ${err?.message || 'Failed'}`);
        return;
      }
    }

    if (note.linkedFileId && note.linkedPartition === 'LocalAppData') {
      onSaveFileContent(note.linkedFileId, note.content);
    } else if (note.linkedFileId && note.linkedPartition && note.linkedPartition !== 'LocalHostFS') {
      setPartitionFiles((prev) => ({
        ...prev,
        [note.linkedPartition!]: (prev[note.linkedPartition!] || []).map((f) =>
          f.id === note.linkedFileId
            ? {
                ...f,
                content: note.content,
                sizeBytes: new Blob([note.content]).size,
                dateModified: new Date().toISOString().slice(0, 16).replace('T', ' '),
              }
            : f
        ),
      }));
    }
    setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, dirty: false } : n)));
    setNoteSaveBanner(`Saved "${note.title}" (${new Blob([note.content]).size} bytes).`);
    setTimeout(() => setNoteSaveBanner(null), 3000);
  };

  const handleCreateFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newFolderName.trim();
    if (!trimmed) return;

    if (liveBackend || activePartition === 'LocalHostFS' || !config.isSimulated) {
      const sourceMode: 'local' | 'wdp' | 'smb' =
        activePartition === 'LocalHostFS'
          ? 'local'
          : activePartMeta.knownFolderId
          ? 'wdp'
          : 'smb';
      try {
        const res = await fetch('/api/xbox/fs/mkdir', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: sourceMode,
            localPath: activePath,
            ip: config.ip,
            wdpPort: Number(config.port) || 11443,
            username: fullCredUsername,
            password: config.password,
            knownFolderId: activePartMeta.knownFolderId || 'DevelopmentFiles',
            packageFullName: selectedPackage,
            smbShare: activePartMeta.smbShare || 'DevelopmentFiles',
            subPath: activePath || '\\',
            folderName: trimmed,
          }),
        });
        const data = await res.json();
        setLiveWriteStatus(
          data.ok
            ? { ok: true, msg: `Created folder "${trimmed}" and refreshed listing.` }
            : { ok: false, msg: `Cannot create folder here (${activePartMeta.mountPoint}): ${data.error || 'Read-only / Access Denied'}` }
        );
        if (data.ok) {
          void loadLiveDirectory(activePartition, activePath);
        }
      } catch (err: any) {
        setLiveWriteStatus({ ok: false, msg: err?.message || 'mkdir failed' });
      }
      setNewFolderName('');
      setIsCreatingFolder(false);
      return;
    }

    if (activePartition === 'LocalAppData') {
      onCreateFolder(trimmed);
    } else {
      const prefix = activePath === '\\' ? '' : activePath;
      const folderItem: XboxFileItem = {
        id: `dir-${Date.now()}`,
        name: trimmed,
        path: `${prefix}\\${trimmed}`,
        isDir: true,
        sizeBytes: 0,
        dateModified: new Date().toISOString().slice(0, 16).replace('T', ' '),
      };
      setPartitionFiles((prev) => ({
        ...prev,
        [activePartition]: [folderItem, ...(prev[activePartition] || [])],
      }));
    }
    setNewFolderName('');
    setIsCreatingFolder(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (liveBackend || activePartition === 'LocalHostFS' || !config.isSimulated) {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = '';
      for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      }
      const sourceMode: 'local' | 'wdp' | 'smb' = customSmbShare
        ? 'smb'
        : customKnownFolder
        ? 'wdp'
        : activePartition === 'LocalHostFS'
        ? 'local'
        : activePartMeta.knownFolderId
        ? 'wdp'
        : 'smb';
      try {
        const res = await fetch('/api/xbox/fs/write', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: sourceMode,
            ip: config.ip,
            wdpPort: Number(config.port) || 11443,
            username: fullCredUsername,
            password: config.password,
            knownFolderId: activePartMeta.knownFolderId || 'DevelopmentFiles',
            packageFullName: selectedPackage,
            smbShare: activePartMeta.smbShare || 'DevelopmentFiles',
            subPath: activePath || '\\',
            filename: file.name,
            contentBase64: btoa(binary),
          }),
        });
        const data = await res.json();
        setLiveWriteStatus(
          data.ok
            ? { ok: true, msg: `Uploaded "${file.name}" (${file.size} B) and refreshed listing.` }
            : { ok: false, msg: `Upload rejected on ${activePartMeta.mountPoint}: ${data.error || 'Read-only / Access Denied'}` }
        );
        if (data.ok) {
          void loadLiveDirectory(activePartition, activePath);
        }
      } catch (err: any) {
        setLiveWriteStatus({ ok: false, msg: err?.message || 'Upload failed' });
      }
      e.target.value = '';
      return;
    }

    if (activePartition === 'LocalAppData') {
      onUploadFile(file);
    } else {
      const text = await file.text().catch(() => `[Binary ${file.size} bytes]`);
      const prefix = activePath === '\\' ? '' : activePath;
      const item: XboxFileItem = {
        id: `up-${Date.now()}`,
        name: file.name,
        path: `${prefix}\\${file.name}`,
        isDir: false,
        sizeBytes: file.size,
        dateModified: new Date().toISOString().slice(0, 16).replace('T', ' '),
        extension: file.name.split('.').pop(),
        content: text,
      };
      setPartitionFiles((prev) => ({
        ...prev,
        [activePartition]: [item, ...(prev[activePartition] || [])],
      }));
    }
    e.target.value = '';
  };

  const handleDeleteItem = async (file: XboxFileItem) => {
    if (liveBackend || activePartition === 'LocalHostFS' || !config.isSimulated) {
      const sourceMode: 'local' | 'wdp' | 'smb' = customSmbShare
        ? 'smb'
        : customKnownFolder
        ? 'wdp'
        : activePartition === 'LocalHostFS'
        ? 'local'
        : activePartMeta.knownFolderId
        ? 'wdp'
        : 'smb';
      try {
        const res = await fetch('/api/xbox/fs/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: sourceMode,
            filePath: file.path,
            isDir: file.isDir,
            ip: config.ip,
            wdpPort: Number(config.port) || 11443,
            username: fullCredUsername,
            password: config.password,
            knownFolderId: activePartMeta.knownFolderId || 'DevelopmentFiles',
            packageFullName: selectedPackage,
            smbShare: activePartMeta.smbShare || 'DevelopmentFiles',
            subPath: activePath || '\\',
            filename: file.name,
          }),
        });
        const data = await res.json();
        setLiveWriteStatus(
          data.ok
            ? { ok: true, msg: `Deleted "${file.name}" and refreshed listing.` }
            : { ok: false, msg: `Delete denied on ${activePartMeta.mountPoint}: ${data.error || 'Read-only / Access Denied'}` }
        );
        if (data.ok) {
          void loadLiveDirectory(activePartition, activePath);
        }
      } catch (err: any) {
        setLiveWriteStatus({ ok: false, msg: err?.message || 'Delete failed' });
      }
      setConfirmDeleteId(null);
      return;
    }

    if (activePartition === 'LocalAppData') {
      onDeleteFile(file.id);
    } else {
      setPartitionFiles((prev) => ({
        ...prev,
        [activePartition]: (prev[activePartition] || []).filter((f) => f.id !== file.id),
      }));
    }
    setConfirmDeleteId(null);
  };

  const addBookmark = (bm: Omit<ExplorerBookmark, 'id' | 'createdAt'>) => {
    const exists = bookmarks.some(
      (b) =>
        b.partitionId === bm.partitionId &&
        b.folderPath === bm.folderPath &&
        b.fileName === bm.fileName &&
        b.line === bm.line
    );
    if (exists) return;
    setBookmarks((prev) => [
      {
        ...bm,
        id: `bm-${Date.now()}`,
        createdAt: new Date().toISOString().slice(0, 10),
      },
      ...prev,
    ]);
  };

  const jumpToBookmark = async (bm: ExplorerBookmark) => {
    setActivePartition(bm.partitionId);
    setLiveItems(null);
    setLiveSourceLabel(null);
    if (bm.partitionId === 'LocalAppData') {
      onNavigateFolder(bm.folderPath || '\\');
    } else {
      setPartitionPaths((prev) => ({ ...prev, [bm.partitionId]: bm.folderPath || '\\' }));
    }

    if (bm.fileName) {
      if (bm.partitionId === 'LocalHostFS') {
        const fullPath = bm.folderPath.endsWith('/')
          ? bm.folderPath + bm.fileName
          : bm.folderPath + '/' + bm.fileName;
        await openFileInNotepad({
          id: `bm-file-${bm.id}`,
          name: bm.fileName,
          path: fullPath,
          isDir: false,
          sizeBytes: 0,
          dateModified: '',
        });
        return;
      }
      const list =
        bm.partitionId === 'LocalAppData' ? files : partitionFiles[bm.partitionId] || [];
      const found = list.find((f) => f.name === bm.fileName);
      if (found) {
        await openFileInNotepad(found);
        return;
      }
    }
    setSubView('explorer');
  };

  // String Grepping Engine
  const handleRunGrep = async (overrideQuery?: string) => {
    const q = (overrideQuery ?? grepQuery).trim();
    if (!q) return;
    if (overrideQuery) setGrepQuery(overrideQuery);
    setIsGrepping(true);
    setGrepStatus(null);
    setGrepMatches([]);

    if (grepScope === 'local-host') {
      try {
        const res = await fetch('/api/xbox/fs/grep', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rootPath: grepLocalRoot || '.',
            pattern: q,
            isRegex: grepRegex,
            caseSensitive: grepCaseSensitive,
            scanBinaryStrings: grepBinaryStrings,
            maxResults: 250,
          }),
        });
        const data = await res.json();
        if (!data.ok) {
          setGrepStatus(`Error: ${data.error || 'Grep failed'}`);
        } else {
          const mapped: GrepMatch[] = (data.matches || []).map((m: any, idx: number) => ({
            id: `gm-host-${idx}`,
            sourceLabel: 'Local Host FS',
            partitionId: 'LocalHostFS' as PartitionId,
            filePath: m.file,
            fileName: String(m.file).split(/[\\/]/).pop() || m.file,
            line: m.line,
            offsetHex: m.offsetHex,
            match: m.match,
            lineText: m.lineText,
            isBinary: Boolean(m.isBinary),
          }));
          setGrepMatches(mapped);
          setGrepStatus(
            `Scanned ${data.filesScanned} host files under ${data.rootPath} — ${mapped.length} match(es)${data.truncated ? ' (capped at limit)' : ''}.`
          );
        }
      } catch (err: any) {
        setGrepStatus(`Error: ${err?.message || 'Grep request failed'}`);
      } finally {
        setIsGrepping(false);
      }
      return;
    }

    // In-memory scan across selected or all partitions + Notepad tabs
    try {
      const flags = grepCaseSensitive ? 'g' : 'gi';
      const re = grepRegex
        ? new RegExp(q, flags)
        : new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);

      const candidatePartitions: PartitionId[] =
        grepScope === 'current-partition'
          ? [activePartition]
          : PARTITIONS.map((p) => p.id).filter((id) => id !== 'LocalHostFS');

      const results: GrepMatch[] = [];
      let fileCount = 0;

      for (const pid of candidatePartitions) {
        const items = pid === 'LocalAppData' ? files : partitionFiles[pid] || [];
        for (const item of items) {
          if (item.isDir || !item.content) continue;
          fileCount++;
          const lines = item.content.split(/\r?\n/);
          let offset = 0;
          for (let i = 0; i < lines.length; i++) {
            re.lastIndex = 0;
            const m = re.exec(lines[i]);
            if (m) {
              results.push({
                id: `gm-${pid}-${item.id}-${i}`,
                sourceLabel: PARTITIONS.find((p) => p.id === pid)?.mountPoint || pid,
                partitionId: pid,
                filePath: item.path,
                fileName: item.name,
                line: i + 1,
                offsetHex: '0x' + offset.toString(16).toUpperCase().padStart(6, '0'),
                match: m[0],
                lineText: lines[i].trim().slice(0, 240),
                isBinary: false,
                fullContent: item.content,
              });
            }
            offset += lines[i].length + 1;
          }
        }
      }

      // Also scan open Notepad buffers when searching all partitions
      if (grepScope === 'all-partitions') {
        for (const note of notes) {
          fileCount++;
          const lines = note.content.split(/\r?\n/);
          let offset = 0;
          for (let i = 0; i < lines.length; i++) {
            re.lastIndex = 0;
            const m = re.exec(lines[i]);
            if (m) {
              results.push({
                id: `gm-note-${note.id}-${i}`,
                sourceLabel: 'Notepad Buffer',
                filePath: note.title,
                fileName: note.title,
                line: i + 1,
                offsetHex: '0x' + offset.toString(16).toUpperCase().padStart(6, '0'),
                match: m[0],
                lineText: lines[i].trim().slice(0, 240),
                isBinary: false,
                fullContent: note.content,
              });
            }
            offset += lines[i].length + 1;
          }
        }
      }

      setGrepMatches(results);
      setGrepStatus(`Grepped ${fileCount} files/notes — ${results.length} match(es) found.`);
    } catch (err: any) {
      setGrepStatus(`Regex error: ${err?.message || 'Invalid pattern'}`);
    } finally {
      setIsGrepping(false);
    }
  };

  const activeNote = notes.find((n) => n.id === activeNoteId) || notes[0];
  const noteLines = activeNote ? activeNote.content.split('\n') : [];
  const noteFindMatches = useMemo(() => {
    if (!activeNote || !noteFindText.trim()) return 0;
    const escaped = noteFindText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return (activeNote.content.match(new RegExp(escaped, 'gi')) || []).length;
  }, [activeNote, noteFindText]);

  return (
    <div className="space-y-4">
      {/* Top Workbench Header & Tool Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-[#0d1117] border border-[#1b2332] rounded-xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">
              Full Partition Explorer, String Grep, Bookmarks &amp; Notepad
            </h2>
            <p className="text-[11px] font-mono text-slate-400">
              Active Root: <span className="text-blue-300">{activePartMeta.mountPoint}</span>
              {liveSourceLabel ? (
                <span className="text-emerald-400"> · {liveSourceLabel}</span>
              ) : (
                <span className="text-slate-500"> · Reference / Staged View (click Sync Live to query console or Host FS)</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'explorer', label: 'Partitions & Files', icon: FolderOpen },
            { id: 'grep', label: 'String Grep', icon: Search },
            { id: 'bookmarks', label: `Bookmarks (${bookmarks.length})`, icon: Bookmark },
            { id: 'notepad', label: `Notepad (${notes.length})`, icon: NotebookPen },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setSubView(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  subView === tab.id
                    ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.4)]'
                    : 'bg-[#121722] border border-[#202a3c] text-slate-300 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* VIEW 1: FULL PARTITION EXPLORER */}
      {subView === 'explorer' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Sidebar: All Xbox Partitions (incl. C:, D:, M:, J:) + Discovered Live Mounts */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-2 p-3 bg-[#0d1117] border border-[#1b2332] rounded-xl h-fit">
            <div className="flex items-center justify-between px-1 pb-1 border-b border-[#1b2332]">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                Partitions &amp; Drives ({PARTITIONS.length})
              </span>
              <button
                type="button"
                onClick={() => void discoverLiveStorage()}
                disabled={isDiscovering}
                className="text-[10px] font-mono text-blue-400 hover:text-blue-300"
              >
                {isDiscovering ? 'Scanning...' : 'Scan Live'}
              </button>
            </div>
            <div className="space-y-1">
              {PARTITIONS.map((p) => {
                const selected = activePartition === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPartition(p.id)}
                    className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                      selected
                        ? 'bg-blue-950/50 border-blue-500/60 text-white'
                        : 'bg-[#090d14] border-[#182030] text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold truncate">{p.label}</span>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                          p.id === 'LocalHostFS'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : p.knownFolderId
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {p.scope}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-blue-300 truncate mt-0.5">
                      {p.mountPoint}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                      {p.accessNote}
                    </div>
                  </button>
                );
              })}
            </div>

            {(discoveredKnownFolders.length > 0 || discoveredSmbShares.length > 0 || discoveredLocalMounts.length > 0) && (
              <div className="pt-2 border-t border-[#1b2332] space-y-2 text-[10px] font-mono">
                {discoveredSmbShares.length > 0 && (
                  <div>
                    <div className="text-emerald-400 font-bold mb-1">Live SMB Shares ({config.ip}):</div>
                    <div className="flex flex-wrap gap-1">
                      {discoveredSmbShares.map((s) => {
                        const isActiveCustom = customSmbShare?.toLowerCase() === s.name.toLowerCase();
                        return (
                          <button
                            key={s.name}
                            type="button"
                            onClick={() => {
                              const match = PARTITIONS.find((p) => p.smbShare?.toLowerCase() === s.name.toLowerCase());
                              if (match) {
                                handleSelectPartition(match.id);
                              } else {
                                setCustomKnownFolder(null);
                                setCustomSmbShare(s.name);
                                setLiveItems(null);
                                setLiveError(null);
                                setPartitionPaths((prev) => ({ ...prev, [activePartition]: '\\' }));
                                void loadLiveDirectory(activePartition, '\\', {
                                  overrideSmbShare: s.name,
                                  overrideKnownFolder: null,
                                });
                              }
                            }}
                            className={`px-1.5 py-0.5 rounded border transition-colors ${
                              isActiveCustom
                                ? 'bg-emerald-600 border-emerald-400 text-white'
                                : 'bg-emerald-950/50 border-emerald-500/30 text-emerald-200 hover:border-emerald-400'
                            }`}
                            title={s.comment || `Open SMB share //${config.ip}/${s.name}`}
                          >
                            //{s.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {discoveredKnownFolders.length > 0 && (
                  <div>
                    <div className="text-blue-400 font-bold mb-1">WDP KnownFolders:</div>
                    <div className="flex flex-wrap gap-1">
                      {discoveredKnownFolders.map((kf) => {
                        const isActiveKf = customKnownFolder === kf;
                        return (
                          <button
                            key={kf}
                            type="button"
                            onClick={() => {
                              const match = PARTITIONS.find((p) => p.knownFolderId === kf);
                              if (match) {
                                handleSelectPartition(match.id);
                              } else {
                                setCustomSmbShare(null);
                                setCustomKnownFolder(kf);
                                setLiveItems(null);
                                setLiveError(null);
                                void loadLiveDirectory(activePartition, '\\', {
                                  overrideSmbShare: null,
                                  overrideKnownFolder: kf,
                                });
                              }
                            }}
                            className={`px-1.5 py-0.5 rounded border transition-colors ${
                              isActiveKf
                                ? 'bg-blue-600 border-blue-400 text-white'
                                : 'bg-blue-950/50 border-blue-500/30 text-blue-200 hover:border-blue-400'
                            }`}
                          >
                            {kf}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {discoveredLocalMounts.length > 0 && (
                  <div>
                    <div className="text-amber-300 font-bold mb-1">Host Partitions / Mounts:</div>
                    <div className="flex flex-wrap gap-1">
                      {discoveredLocalMounts.slice(0, 10).map((m) => (
                        <button
                          key={m.path}
                          type="button"
                          onClick={() => {
                            setCustomSmbShare(null);
                            setCustomKnownFolder(null);
                            setActivePartition('LocalHostFS');
                            setPartitionPaths((prev) => ({ ...prev, LocalHostFS: m.path }));
                            void loadLiveDirectory('LocalHostFS', m.path, {
                              overrideSmbShare: null,
                              overrideKnownFolder: null,
                            });
                          }}
                          className="px-1.5 py-0.5 rounded bg-[#141a25] border border-[#253248] text-slate-200 hover:border-amber-400"
                          title={`${m.label} (${m.fsType}) ${m.writable ? 'RW' : 'RO'}`}
                        >
                          {m.path} [{m.writable ? 'RW' : 'RO'}]
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Pane: Breadcrumb + Actions + File Table */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-3">
            {/* Context Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-[#0d1117] border border-[#1b2332] rounded-xl">
              <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                {activePartition === 'LocalAppData' ? (
                  <select
                    value={selectedPackage}
                    onChange={(e) => onSelectPackage(e.target.value)}
                    className="w-full bg-[#121620] border border-[#212938] rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500 truncate cursor-pointer"
                  >
                    {apps.map((app) => (
                      <option key={app.id} value={app.packageFullName}>
                        {app.name} — ({app.packageFullName})
                      </option>
                    ))}
                  </select>
                ) : activePartition === 'LocalHostFS' ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void loadLiveDirectory('LocalHostFS', partitionPaths.LocalHostFS);
                    }}
                    className="flex items-center gap-2 w-full"
                  >
                    <input
                      type="text"
                      value={partitionPaths.LocalHostFS}
                      onChange={(e) =>
                        setPartitionPaths((prev) => ({ ...prev, LocalHostFS: e.target.value }))
                      }
                      placeholder="/home/nitrokali or /mnt/xbox or ."
                      className="flex-1 bg-[#121620] border border-[#212938] rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500"
                    >
                      Go
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-300 truncate">
                    <span className="text-blue-400 font-bold">{activePartMeta.mountPoint}</span>
                    {activePath !== '\\' && <span className="text-slate-200">{activePath}</span>}
                    {liveBackend && (
                      <span
                        className={`px-1.5 py-0.5 text-[10px] rounded ${
                          liveWritable ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {liveWritable ? 'RW LIVE' : 'RO / ADMIN'}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => void loadLiveDirectory(activePartition, activePath, { probeRw: true })}
                  disabled={isLoadingLive}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  <Wifi className={`w-3.5 h-3.5 ${isLoadingLive ? 'animate-pulse' : ''}`} />
                  <span>
                    {activePartition === 'LocalHostFS' && !customSmbShare && !customKnownFolder
                      ? 'Refresh Host FS'
                      : `Sync Live (${activePartMeta.knownFolderId && !customSmbShare ? `:${config.port}` : activePartMeta.smbShare || 'SMB'})`}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const nextTree = !isTreeMode;
                    setIsTreeMode(nextTree);
                    if (liveItems !== null || activePartition === 'LocalHostFS' || !config.isSimulated) {
                      void loadLiveDirectory(activePartition, activePath, { tree: nextTree });
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                    isTreeMode
                      ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]'
                      : 'bg-[#141a25] border-[#232c3d] text-blue-300 hover:text-white hover:border-blue-500'
                  }`}
                  title="Expand all readable subfolders & files recursively across this partition (Open-Book Kit FS Tree)"
                >
                  <FolderTree className="w-3.5 h-3.5" />
                  <span>{isTreeMode ? 'Full FS Tree (ON)' : 'Open Full FS Tree'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => void handleProbeWritableLive()}
                  disabled={isProbingRw}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-[#141a25] border border-[#232c3d] text-emerald-300 hover:border-emerald-500 disabled:opacity-50"
                  title="Dynamically test if current partition/folder is writable right now"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{isProbingRw ? 'Testing R/W...' : 'Probe R/W'}</span>
                </button>

                <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-500 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload</span>
                  <input type="file" onChange={handleFileUpload} className="hidden" />
                </label>

                <button
                  onClick={() => setIsCreatingFolder(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#141a25] border border-[#232c3d] text-slate-200 hover:text-white hover:border-blue-500"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Folder</span>
                </button>

                <button
                  onClick={() => {
                    addBookmark({
                      label: `${activePartMeta.label} (${activePath})`,
                      tag: activePartition === 'Certs' ? 'Certs' : 'Config',
                      partitionId: activePartition,
                      folderPath: activePath,
                    });
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-[#141a25] border border-[#232c3d] text-amber-300 hover:border-amber-500"
                  title="Bookmark current folder"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Star</span>
                </button>

                <button
                  onClick={() => {
                    if (liveItems !== null || activePartition === 'LocalHostFS' || !config.isSimulated) {
                      void loadLiveDirectory(activePartition, activePath, { probeRw: true });
                    } else {
                      onRefreshFiles();
                    }
                  }}
                  className="p-1.5 rounded-lg bg-[#141a25] border border-[#232c3d] text-slate-300 hover:text-white hover:border-blue-500"
                  title="Refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingLive ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Breadcrumb Ribbon */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-[#0a0d13] border border-[#18202d] rounded-lg text-xs font-mono text-slate-400">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <button
                  onClick={handleGoUp}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#141b27] text-slate-200 hover:text-white shrink-0"
                >
                  <ArrowUp className="w-3 h-3" />
                  <span>Up</span>
                </button>
                <button
                  onClick={() => navigateInPartition(activePartition === 'LocalHostFS' && !customSmbShare && !customKnownFolder ? '/' : '\\')}
                  className="text-blue-400 font-bold hover:text-white shrink-0"
                >
                  {activePartMeta.mountPoint}
                </button>
                {activePath !== '\\' && activePath !== '.' && (
                  <>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    <span className="text-slate-200 truncate">{activePath}</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {isTreeMode && (
                  <label className="flex items-center gap-1 text-[11px] text-slate-300">
                    <span>Depth:</span>
                    <select
                      value={treeDepth}
                      onChange={(e) => {
                        const d = Number(e.target.value) || 3;
                        setTreeDepth(d);
                      }}
                      className="bg-[#121722] border border-[#233048] rounded px-1.5 py-0.5 text-[11px] text-white"
                    >
                      <option value={2}>2</option>
                      <option value={3}>3</option>
                      <option value={4}>4</option>
                      <option value={5}>5</option>
                    </select>
                  </label>
                )}

                <button
                  type="button"
                  onClick={() => setShowCorpusPanel((v) => !v)}
                  className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 shrink-0"
                  title="Scan readable kit/host filesystem into JSONL training corpus"
                >
                  <Brain className="w-3 h-3" />
                  <span>Export Corpus (.jsonl)</span>
                </button>

                <button
                  onClick={() => {
                    setGrepScope(activePartition === 'LocalHostFS' ? 'local-host' : 'current-partition');
                    if (activePartition === 'LocalHostFS') setGrepLocalRoot(activePath || '.');
                    setSubView('grep');
                  }}
                  className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 shrink-0"
                >
                  <Search className="w-3 h-3" />
                  <span>Grep Here</span>
                </button>
              </div>
            </div>

            {showCorpusPanel && (
              <div className="p-3.5 rounded-xl bg-[#0e1420] border border-emerald-500/35 space-y-2.5 text-xs font-mono">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-emerald-300 font-bold flex items-center gap-2">
                    <Brain className="w-4 h-4" />
                    <span>Kit Filesystem -&gt; JSONL Training Corpus Exporter</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={corpusFormat}
                      onChange={(e) => setCorpusFormat(e.target.value as any)}
                      className="bg-[#080b10] border border-[#243249] rounded px-2 py-1 text-[11px] text-white"
                    >
                      <option value="sharegpt">ShareGPT / ChatML (.jsonl)</option>
                      <option value="alpaca">Alpaca Instruct (.jsonl)</option>
                      <option value="raw_pretrain">Raw Pretrain (.jsonl)</option>
                    </select>
                    <select
                      value={corpusChunkSize}
                      onChange={(e) => setCorpusChunkSize(Number(e.target.value))}
                      className="bg-[#080b10] border border-[#243249] rounded px-2 py-1 text-[11px] text-white"
                    >
                      <option value={2048}>2K chunks</option>
                      <option value={4096}>4K chunks</option>
                      <option value={8192}>8K chunks</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => void handleBuildKitTrainingCorpus()}
                      disabled={isBuildingCorpus}
                      className="px-3 py-1 rounded bg-emerald-600 text-white font-bold hover:bg-emerald-500 disabled:opacity-50"
                    >
                      {isBuildingCorpus ? 'Scanning & Exporting...' : 'Download JSONL Corpus'}
                    </button>
                  </div>
                </div>
                {corpusStatus && (
                  <div className="text-[11px] text-emerald-200 bg-[#080b10] px-2.5 py-1.5 rounded border border-[#1d2a40]">
                    {corpusStatus}
                  </div>
                )}
              </div>
            )}

            {treeSkippedDirs.length > 0 && (
              <div className="px-3.5 py-2 rounded-lg border border-slate-700 bg-[#0b0f16] text-[11px] font-mono text-slate-300">
                Skipped {treeSkippedDirs.length} OS-restricted subfolder(s) while keeping all basic user-level folders readable:{' '}
                <span className="text-slate-400">
                  {treeSkippedDirs.slice(0, 4).map((s) => s.path).join(', ')}
                  {treeSkippedDirs.length > 4 ? ` (+${treeSkippedDirs.length - 4} more)` : ''}
                </span>
              </div>
            )}

            {liveWriteStatus && (
              <div
                className={`px-3.5 py-2 rounded-lg border text-xs font-mono flex items-center justify-between gap-2 ${
                  liveWriteStatus.ok
                    ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-200'
                    : 'border-rose-500/40 bg-rose-950/40 text-rose-200'
                }`}
              >
                <span>{liveWriteStatus.msg}</span>
                <button
                  type="button"
                  onClick={() => setLiveWriteStatus(null)}
                  className="text-slate-400 hover:text-white"
                >
                  Dismiss
                </button>
              </div>
            )}

            {liveError && (
              <div className="px-3.5 py-2.5 rounded-lg border border-amber-500/40 bg-amber-950/30 text-xs font-mono text-amber-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{liveError}</span>
              </div>
            )}

            {isCreatingFolder && (
              <form
                onSubmit={handleCreateFolderSubmit}
                className="flex gap-2 p-3 bg-[#111622] border border-[#212b3d] rounded-lg"
              >
                <input
                  type="text"
                  placeholder="Folder name (e.g. shaders, configs, LooseApps)..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="flex-1 bg-[#0a0d13] border border-[#26334a] rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-500"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingFolder(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </form>
            )}

            {/* File Table */}
            <div className="border border-[#1c2434] bg-[#0c1017] rounded-xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#1b2332] bg-[#10141d] text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                      <th className="py-2.5 px-4">Name</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Size</th>
                      <th className="py-2.5 px-3">Modified</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#171d29]">
                    {displayedFiles.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-slate-500 font-mono">
                          Directory is empty.
                        </td>
                      </tr>
                    ) : (
                      displayedFiles.map((file) => {
                        const isBookmarked = bookmarks.some(
                          (b) => b.partitionId === activePartition && b.fileName === file.name
                        );
                        return (
                          <tr
                            key={file.id}
                            className="hover:bg-[#111722] transition-colors group cursor-pointer"
                            onClick={() => {
                              if (file.isDir) {
                                navigateInPartition(file.path);
                              } else {
                                void openFileInNotepad(file);
                              }
                            }}
                          >
                            <td className="py-2.5 px-4 min-w-[200px]">
                              <div className="flex items-center gap-2">
                                {file.isDir ? (
                                  <Folder className="w-4 h-4 text-amber-400 fill-amber-400/20 shrink-0" />
                                ) : (
                                  <FileCode className="w-4 h-4 text-blue-400 shrink-0" />
                                )}
                                <div className="min-w-0">
                                  <span
                                    className={`font-mono font-medium block truncate ${
                                      file.isDir
                                        ? 'text-amber-200 font-semibold'
                                        : 'text-slate-200 group-hover:text-blue-400'
                                    }`}
                                  >
                                    {isTreeMode && (file as any).relativePath ? (file as any).relativePath : file.name}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-slate-400 font-mono whitespace-nowrap">
                              {file.isDir ? 'DIR' : file.extension?.toUpperCase() || 'FILE'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-400 font-mono tabular-nums whitespace-nowrap">
                              {file.isDir
                                ? '—'
                                : file.sizeBytes > 1024 * 1024
                                ? `${(file.sizeBytes / (1024 * 1024)).toFixed(2)} MB`
                                : `${Math.max(0.1, file.sizeBytes / 1024).toFixed(1)} KB`}
                            </td>
                            <td className="py-2.5 px-3 text-slate-400 font-mono whitespace-nowrap">
                              {file.dateModified || '—'}
                            </td>
                            <td
                              className="py-2.5 px-4 text-right whitespace-nowrap"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-end gap-1">
                                {!file.isDir && (
                                  <>
                                    <button
                                      onClick={() => void openFullContentInspector(file)}
                                      className="p-1.5 rounded bg-blue-600/20 border border-blue-500/40 text-blue-200 hover:text-white hover:bg-blue-600/40"
                                      title="Inspect Full Contents (Streamed FS Viewer)"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => void openFileInNotepad(file)}
                                      className="p-1.5 rounded bg-[#131924] border border-[#212b3d] text-blue-300 hover:text-white hover:border-blue-500"
                                      title="Open in Notepad"
                                    >
                                      <NotebookPen className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}

                                <button
                                  onClick={() => {
                                    addBookmark({
                                      label: file.name,
                                      tag: file.name.endsWith('.dmp')
                                        ? 'CrashDump'
                                        : file.name.endsWith('.cer')
                                        ? 'Certs'
                                        : 'Config',
                                      partitionId: activePartition,
                                      folderPath: activePath,
                                      fileName: file.isDir ? undefined : file.name,
                                    });
                                  }}
                                  className={`p-1.5 rounded bg-[#131924] border border-[#212b3d] transition-colors ${
                                    isBookmarked
                                      ? 'text-amber-400 border-amber-500/40'
                                      : 'text-slate-400 hover:text-amber-300'
                                  }`}
                                  title="Bookmark item"
                                >
                                  {isBookmarked ? (
                                    <BookmarkCheck className="w-3.5 h-3.5" />
                                  ) : (
                                    <Bookmark className="w-3.5 h-3.5" />
                                  )}
                                </button>

                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(
                                      activePartition === 'LocalHostFS'
                                        ? file.path
                                        : `${activePartMeta.mountPoint}${file.path}`
                                    );
                                    setCopiedPathId(file.id);
                                    setTimeout(() => setCopiedPathId(null), 1500);
                                  }}
                                  className="p-1.5 rounded bg-[#131924] border border-[#212b3d] text-slate-300 hover:text-white"
                                  title="Copy Full Path"
                                >
                                  {copiedPathId === file.id ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>

                                {!file.isDir && file.content && (
                                  <button
                                    onClick={() => {
                                      const blob = new Blob([file.content || ''], {
                                        type: 'text/plain;charset=utf-8',
                                      });
                                      const url = URL.createObjectURL(blob);
                                      const a = document.createElement('a');
                                      a.href = url;
                                      a.download = file.name;
                                      a.click();
                                      URL.revokeObjectURL(url);
                                    }}
                                    className="p-1.5 rounded bg-[#131924] border border-[#212b3d] text-slate-300 hover:text-white"
                                    title="Download"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {confirmDeleteId === file.id ? (
                                  <button
                                    onClick={() => void handleDeleteItem(file)}
                                    className="px-2 py-1 rounded bg-rose-600 text-white text-[10px] font-bold hover:bg-rose-500"
                                  >
                                    Confirm
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setConfirmDeleteId(file.id)}
                                    className="p-1.5 rounded bg-[#131924] border border-[#212b3d] text-slate-400 hover:text-rose-400"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: STRING GREPPING TOOL */}
      {subView === 'grep' && (
        <div className="space-y-4">
          <div className="p-5 bg-[#0d1117] border border-[#1b2332] rounded-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white">
                  String &amp; Binary Pattern Grepping Tool
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {['password', 'CSRF', 'LAPS', '192.168.', 'DevUser', 'CN=', 'Sandbox', 'broadFileSystemAccess'].map(
                  (preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => void handleRunGrep(preset)}
                      className="px-2 py-0.5 text-[11px] font-mono rounded bg-[#141b27] border border-[#233047] text-blue-300 hover:border-blue-500"
                    >
                      {preset}
                    </button>
                  )
                )}
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleRunGrep();
              }}
              className="grid grid-cols-1 md:grid-cols-12 gap-2.5"
            >
              <input
                type="text"
                value={grepQuery}
                onChange={(e) => setGrepQuery(e.target.value)}
                placeholder="Search pattern or regex (e.g. CSRF-Token|X-XRO|CN=.*)"
                className="md:col-span-6 bg-[#080b10] border border-[#222d42] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
              />

              <select
                value={grepScope}
                onChange={(e) => setGrepScope(e.target.value as any)}
                className="md:col-span-4 bg-[#121620] border border-[#222d42] rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="all-partitions">All Xbox Partitions &amp; Notepad Buffers</option>
                <option value="current-partition">
                  Current Partition ({activePartMeta.label})
                </option>
                <option value="local-host">
                  Real Local Host / SMB Mount Recursive (/api/xbox/fs/grep)
                </option>
              </select>

              <button
                type="submit"
                disabled={isGrepping || !grepQuery.trim()}
                className="md:col-span-2 flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
              >
                <Search className="w-3.5 h-3.5" />
                <span>{isGrepping ? 'Scanning...' : 'Run Grep'}</span>
              </button>
            </form>

            {grepScope === 'local-host' && (
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
                <input
                  type="text"
                  value={grepLocalRoot}
                  onChange={(e) => setGrepLocalRoot(e.target.value)}
                  placeholder="Host directory or file path (e.g. . or ~/Downloads or /mnt/xbox)"
                  className="flex-1 bg-[#080b10] border border-[#222d42] rounded-lg px-3 py-1.5 text-xs font-mono text-emerald-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-300">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={grepRegex}
                  onChange={(e) => setGrepRegex(e.target.checked)}
                  className="accent-blue-500"
                />
                <Regex className="w-3.5 h-3.5 text-blue-400" />
                <span>Regex</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={grepCaseSensitive}
                  onChange={(e) => setGrepCaseSensitive(e.target.checked)}
                  className="accent-blue-500"
                />
                <CaseSensitive className="w-3.5 h-3.5 text-amber-400" />
                <span>Case Sensitive</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={grepBinaryStrings}
                  onChange={(e) => setGrepBinaryStrings(e.target.checked)}
                  className="accent-blue-500"
                />
                <Binary className="w-3.5 h-3.5 text-emerald-400" />
                <span>Extract Binary ASCII Strings (.exe / .dll / .msix / .xvd)</span>
              </label>
            </div>

            {grepStatus && (
              <div className="px-3.5 py-2 rounded-lg bg-[#080b10] border border-[#1d273b] text-xs font-mono text-emerald-300">
                {grepStatus}
              </div>
            )}
          </div>

          <div className="border border-[#1c2434] bg-[#0c1017] rounded-xl overflow-hidden">
            {grepMatches.length === 0 ? (
              <div className="p-8 text-center text-xs font-mono text-slate-500">
                Enter a string or regex above and click <strong>Run Grep</strong>.
              </div>
            ) : (
              <div className="divide-y divide-[#171d29] max-h-[460px] overflow-y-auto">
                {grepMatches.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 hover:bg-[#111722] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 text-[10px]">
                          {m.sourceLabel}
                        </span>
                        <span className="text-white font-bold truncate">{m.filePath}</span>
                        <span className="text-amber-300">
                          {m.isBinary ? `offset ${m.offsetHex}` : `line ${m.line} (${m.offsetHex})`}
                        </span>
                      </div>
                      <div className="text-slate-300 bg-[#080b10] px-2.5 py-1 rounded border border-[#1a2232] truncate">
                        {m.lineText}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          addBookmark({
                            label: `Grep "${m.match}" @ ${m.fileName}`,
                            tag: 'General',
                            partitionId: m.partitionId || 'LocalHostFS',
                            folderPath:
                              m.partitionId === 'LocalHostFS'
                                ? m.filePath.slice(0, m.filePath.lastIndexOf('/')) || '/'
                                : '\\',
                            fileName: m.fileName,
                            line: m.line,
                            offsetHex: m.offsetHex,
                          });
                        }}
                        className="px-2.5 py-1 rounded bg-[#141b27] border border-[#232f44] text-amber-300 hover:border-amber-500"
                      >
                        Bookmark
                      </button>

                      <button
                        onClick={() => {
                          void openFullContentInspector({
                            id: m.partitionId === 'LocalHostFS' ? `host-${m.filePath}` : m.id,
                            name: m.fileName,
                            path: m.filePath,
                            isDir: false,
                            sizeBytes: (m.fullContent || m.lineText).length,
                            dateModified: '',
                            content: m.partitionId === 'LocalHostFS' ? undefined : m.fullContent || m.lineText,
                          });
                        }}
                        className="px-2.5 py-1 rounded bg-[#141b27] border border-blue-500/40 text-blue-200 hover:bg-blue-600/30 flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect Full</span>
                      </button>

                      <button
                        onClick={() => {
                          if (m.partitionId === 'LocalHostFS') {
                            void openFileInNotepad({
                              id: `host-${m.filePath}`,
                              name: m.fileName,
                              path: m.filePath,
                              isDir: false,
                              sizeBytes: 0,
                              dateModified: '',
                            });
                          } else {
                            void openFileInNotepad({
                              id: m.id,
                              name: m.fileName,
                              path: m.filePath,
                              isDir: false,
                              sizeBytes: (m.fullContent || m.lineText).length,
                              dateModified: '',
                              content: m.fullContent || m.lineText,
                            });
                          }
                        }}
                        className="px-2.5 py-1 rounded bg-blue-600 text-white hover:bg-blue-500"
                      >
                        Open in Notepad
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 3: PERSISTENT BOOKMARKS */}
      {subView === 'bookmarks' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-[#0d1117] border border-[#1b2332] rounded-xl">
            <div className="flex flex-wrap items-center gap-1.5">
              {['All', 'Hardware', 'Creds/LAPS', 'Certs', 'CrashDump', 'Config', 'General'].map(
                (tag) => (
                  <button
                    key={tag}
                    onClick={() => setBookmarkFilter(tag)}
                    className={`px-2.5 py-1 text-xs font-mono rounded-md ${
                      bookmarkFilter === tag
                        ? 'bg-blue-600 text-white'
                        : 'bg-[#121722] text-slate-400 hover:text-white'
                    }`}
                  >
                    {tag}
                  </button>
                )
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddBookmarkForm((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Bookmark Current Path</span>
              </button>
              <button
                onClick={() => {
                  const blob = new Blob([JSON.stringify(bookmarks, null, 2)], {
                    type: 'application/json',
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'xbxowned_bookmarks.json';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#141b27] border border-[#243046] text-slate-200 hover:text-white"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON</span>
              </button>
            </div>
          </div>

          {showAddBookmarkForm && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newBmLabel.trim()) return;
                addBookmark({
                  label: newBmLabel.trim(),
                  tag: newBmTag,
                  partitionId: activePartition,
                  folderPath: activePath,
                });
                setNewBmLabel('');
                setShowAddBookmarkForm(false);
              }}
              className="flex flex-wrap gap-2 p-4 bg-[#111622] border border-[#212b3d] rounded-xl"
            >
              <input
                type="text"
                value={newBmLabel}
                onChange={(e) => setNewBmLabel(e.target.value)}
                placeholder={`Label for ${activePartMeta.mountPoint}${activePath}`}
                className="flex-1 min-w-[200px] bg-[#080b10] border border-[#253249] rounded px-3 py-1.5 text-xs text-white"
                autoFocus
              />
              <select
                value={newBmTag}
                onChange={(e) => setNewBmTag(e.target.value as any)}
                className="bg-[#080b10] border border-[#253249] rounded px-2.5 py-1.5 text-xs font-mono text-slate-200"
              >
                <option value="General">General</option>
                <option value="Hardware">Hardware</option>
                <option value="Creds/LAPS">Creds/LAPS</option>
                <option value="Certs">Certs</option>
                <option value="CrashDump">CrashDump</option>
                <option value="Config">Config</option>
              </select>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold rounded bg-blue-600 text-white hover:bg-blue-500"
              >
                Save Bookmark
              </button>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {bookmarks
              .filter((b) => bookmarkFilter === 'All' || b.tag === bookmarkFilter)
              .map((bm) => (
                <div
                  key={bm.id}
                  className="p-4 rounded-xl bg-[#0d1117] border border-[#1b2332] flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-amber-500/20 text-amber-300">
                        {bm.tag}
                      </span>
                      <span className="text-xs font-bold text-white truncate">{bm.label}</span>
                    </div>
                    <div className="text-[11px] font-mono text-blue-300 truncate">
                      {bm.partitionId} · {bm.folderPath}
                      {bm.fileName ? `\\${bm.fileName}` : ''}
                      {bm.line ? ` (line ${bm.line})` : bm.offsetHex ? ` (${bm.offsetHex})` : ''}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">Saved {bm.createdAt}</div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => void jumpToBookmark(bm)}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-500"
                    >
                      Jump
                    </button>
                    <button
                      onClick={() => setBookmarks((prev) => prev.filter((x) => x.id !== bm.id))}
                      className="p-1.5 rounded-lg bg-[#141a25] border border-[#222c3e] text-slate-400 hover:text-rose-400"
                      title="Remove Bookmark"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* VIEW 4: MULTI-TAB PERSISTENT NOTEPAD */}
      {subView === 'notepad' && activeNote && (
        <div className="border border-[#1c2434] bg-[#0b0f17] rounded-xl overflow-hidden shadow-2xl flex flex-col">
          {/* Notepad Tabs Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[#0f141e] border-b border-[#1c2434]">
            <div className="flex items-center gap-1 overflow-x-auto py-0.5">
              {notes.map((n) => (
                <div
                  key={n.id}
                  onClick={() => setActiveNoteId(n.id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono cursor-pointer transition-colors ${
                    n.id === activeNote.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-[#141b28] text-slate-300 hover:text-white'
                  }`}
                >
                  <FileText className="w-3 h-3" />
                  <span>{n.title}{n.dirty ? '*' : ''}</span>
                  {notes.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const remaining = notes.filter((x) => x.id !== n.id);
                        setNotes(remaining);
                        if (activeNoteId === n.id && remaining[0]) {
                          setActiveNoteId(remaining[0].id);
                        }
                      }}
                      className="ml-1 opacity-75 hover:opacity-100"
                      title="Close tab"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}

              <button
                onClick={() => {
                  const idx = notes.length + 1;
                  const created: NotepadTab = {
                    id: `note-${Date.now()}`,
                    title: `scratch_${idx}.txt`,
                    content: '',
                  };
                  setNotes((prev) => [...prev, created]);
                  setActiveNoteId(created.id);
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono bg-[#141b28] text-emerald-300 hover:text-white border border-[#24324a]"
              >
                <Plus className="w-3 h-3" />
                <span>New Note</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={noteFindText}
                  onChange={(e) => setNoteFindText(e.target.value)}
                  placeholder="Find in note..."
                  className="bg-[#080b10] border border-[#232f45] rounded pl-6 pr-2 py-1 text-[11px] font-mono text-white w-36 focus:outline-none focus:border-blue-500"
                />
              </div>
              {noteFindText && (
                <span className="text-[11px] font-mono text-amber-300">
                  {noteFindMatches} hit(s)
                </span>
              )}

              <button
                onClick={() =>
                  setInspectorTarget({
                    id: activeNote.id,
                    title: activeNote.title,
                    subtitle: activeNote.linkedPath || 'Notepad Buffer',
                    content: activeNote.content,
                    loadedBytes: activeNote.content.length,
                    totalBytes: activeNote.content.length,
                    hasMore: false,
                    nextOffset: activeNote.content.length,
                  })
                }
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600/20 border border-blue-500/40 text-blue-200 text-xs font-semibold hover:bg-blue-600/35"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Full Viewer</span>
              </button>

              <button
                onClick={() => handleSaveNotepadTab(activeNote)}
                className="flex items-center gap-1 px-3 py-1 rounded bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>

              <button
                onClick={() => {
                  const blob = new Blob([activeNote.content], { type: 'text/plain;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = activeNote.title;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#141b28] border border-[#24324a] text-slate-200 text-xs hover:text-white"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
              </button>
            </div>
          </div>

          {noteSaveBanner && (
            <div className="px-4 py-1.5 bg-emerald-950/60 border-b border-emerald-500/30 text-xs font-mono text-emerald-200">
              {noteSaveBanner}
            </div>
          )}

          {/* Editor with Line Numbers */}
          <div className="flex bg-[#070a0f] min-h-[420px] max-h-[560px] overflow-y-auto font-mono text-xs">
            <div className="py-3 px-2.5 bg-[#0a0e16] border-r border-[#172030] text-slate-600 text-right select-none leading-6">
              {noteLines.map((_, idx) => (
                <div key={idx}>{idx + 1}</div>
              ))}
            </div>
            <textarea
              value={activeNote.content}
              onChange={(e) => {
                const val = e.target.value;
                setNotes((prev) =>
                  prev.map((n) => (n.id === activeNote.id ? { ...n, content: val, dirty: true } : n))
                );
              }}
              spellCheck={false}
              className="flex-1 bg-transparent text-blue-100 p-3 leading-6 resize-none focus:outline-none selection:bg-blue-600/40"
              rows={Math.max(18, noteLines.length)}
            />
          </div>

          {/* Notepad Footer */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-[#0f141e] border-t border-[#1c2434] text-[11px] font-mono text-slate-400">
            <span>
              {activeNote.linkedPartition
                ? `Linked: ${activeNote.linkedPartition}${activeNote.linkedPath || ''}`
                : 'Persistent Local Scratchpad (auto-saved in browser)'}
            </span>
            <span>
              Lines: {noteLines.length} · Chars: {activeNote.content.length} · Bytes: {new Blob([activeNote.content]).size}
            </span>
          </div>
        </div>
      )}
      {/* Kit Filesystem Full-Content Stream Inspector Modal */}
      {inspectorTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
          onClick={() => setInspectorTarget(null)}
        >
          <div
            className="w-full max-w-5xl max-h-[90vh] flex flex-col bg-[#0c1018] border border-[#24324a] rounded-xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-[#090c12] border-b border-[#1c2536]">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-blue-400 shrink-0" />
                  <h3 className="text-sm font-bold font-mono text-white truncate">{inspectorTarget.title}</h3>
                  {inspectorTarget.fallbackBackend && (
                    <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      via {inspectorTarget.fallbackBackend.toUpperCase()} fallback
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                  {inspectorTarget.subtitle}
                  {inspectorTarget.usedAccount ? ` · Auth: ${inspectorTarget.usedAccount}` : ''}
                  {' · '}
                  Loaded {Math.round(inspectorTarget.loadedBytes / 1024)} KB / {Math.round(Math.max(inspectorTarget.totalBytes, inspectorTarget.loadedBytes) / 1024)} KB
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <div className="relative">
                  <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={inspectorSearch}
                    onChange={(e) => setInspectorSearch(e.target.value)}
                    placeholder="Filter lines..."
                    className="bg-[#06090e] border border-[#233048] rounded pl-6 pr-2 py-1 text-[11px] font-mono text-white w-36 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {inspectorTarget.hasMore && (
                  <>
                    <button
                      type="button"
                      onClick={() => void handleLoadNextChunkInspector(false)}
                      disabled={isStreamingChunk}
                      className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
                    >
                      {isStreamingChunk ? 'Loading...' : '+ Load Next 1 MB'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleLoadNextChunkInspector(true)}
                      disabled={isStreamingChunk}
                      className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      Stream Full File
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const blob = new Blob([inspectorTarget.content], { type: 'text/plain;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = inspectorTarget.title;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-2.5 py-1 rounded text-xs font-mono bg-[#141b28] border border-[#24324a] text-slate-200 hover:text-white"
                >
                  Download
                </button>

                <button
                  type="button"
                  onClick={() => setInspectorTarget(null)}
                  className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-[#161e2c]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-[#06090e] p-4 font-mono text-xs text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
              {(() => {
                const q = inspectorSearch.trim().toLowerCase();
                if (!q) return inspectorTarget.content;
                const filtered = inspectorTarget.content
                  .split(/\r?\n/)
                  .filter((line) => line.toLowerCase().includes(q));
                return filtered.length > 0
                  ? filtered.join('\n')
                  : `[No lines matched filter "${inspectorSearch}"]`;
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
