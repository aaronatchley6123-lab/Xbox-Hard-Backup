import React, { useState, useRef } from 'react';
import {
  Folder,
  FileText,
  HardDrive,
  ArrowUp,
  Plus,
  Upload,
  Trash2,
  Search,
  Cpu,
  FileCode,
  Monitor,
  Check,
  X,
} from 'lucide-react';
import { VfsNode, Win11SystemConfig } from '../../types/win11';

interface FileExplorerAppProps {
  vfs: VfsNode[];
  currentPath: string;
  onNavigate: (path: string) => void;
  onCreateFolder: (parentPath: string, name: string) => void;
  onCreateFile: (parentPath: string, name: string, content: string, sizeBytes?: number) => void;
  onUpdateFile: (id: string, content: string) => void;
  onDeleteNode: (id: string) => void;
  systemConfig: Win11SystemConfig;
}

const QUICK_LOCATIONS = [
  { label: 'Desktop (U:)', path: 'U:\\Users\\DevToolsUser\\Desktop', icon: Monitor },
  { label: 'DevelopmentFiles (D:)', path: 'D:\\DevelopmentFiles', icon: HardDrive },
  { label: 'Win11Desktop Build', path: 'D:\\DevelopmentFiles\\Windows11Desktop', icon: Folder },
  { label: 'Local AI Models (.GGUF)', path: 'D:\\DevelopmentFiles\\Models', icon: Cpu },
  { label: 'Xbox System OS (C:)', path: 'C:\\Windows', icon: HardDrive },
];

export const FileExplorerApp: React.FC<FileExplorerAppProps> = ({
  vfs,
  currentPath,
  onNavigate,
  onCreateFolder,
  onCreateFile,
  onUpdateFile,
  onDeleteNode,
  systemConfig,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState<VfsNode | null>(null);
  const [editingContent, setEditingContent] = useState<string>('');
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [savedNotice, setSavedNotice] = useState(false);

  const fileUploadRef = useRef<HTMLInputElement>(null);

  const visibleNodes = vfs.filter((node) => {
    if (node.parentPath !== currentPath) return false;
    if (!searchQuery.trim()) return true;
    return node.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleGoUp = () => {
    const parts = currentPath.split('\\');
    if (parts.length <= 2) return;
    parts.pop();
    onNavigate(parts.join('\\'));
    setSelectedNode(null);
  };

  const handleOpenItem = (node: VfsNode) => {
    if (node.type === 'folder') {
      onNavigate(`${node.parentPath}\\${node.name}`);
      setSelectedNode(null);
    } else {
      setSelectedNode(node);
      setEditingContent(node.content || '');
    }
  };

  const handleUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const textContent =
        file.size > 2 * 1024 * 1024
          ? `[Local Binary/GGUF Model File: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)]`
          : String(reader.result || '');
      onCreateFile(currentPath, file.name, textContent, file.size);
    };
    if (file.size > 2 * 1024 * 1024) {
      onCreateFile(
        currentPath,
        file.name,
        `[Local GGUF/Binary Model File: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)]`,
        file.size
      );
    } else {
      reader.readAsText(file);
    }
  };

  const formatBytes = (bytes?: number) => {
    if (bytes === undefined) return '—';
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  };

  return (
    <div className="flex flex-col h-full bg-[#191b1f] text-slate-100 select-none">
      {/* Windows 11 Command Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#202328] border-b border-white/10 gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsNewFolderOpen(true)}
            className="px-2.5 py-1.5 rounded hover:bg-white/10 text-xs font-medium flex items-center gap-1.5 text-slate-200 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5 text-sky-400" />
            <span>New Folder</span>
          </button>

          <input
            ref={fileUploadRef}
            type="file"
            onChange={handleUploadFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileUploadRef.current?.click()}
            className="px-2.5 py-1.5 rounded hover:bg-white/10 text-xs font-medium flex items-center gap-1.5 text-slate-200 transition-colors whitespace-nowrap shrink-0"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            <span>Upload File / .GGUF</span>
          </button>

          {selectedNode && (
            <button
              type="button"
              onClick={() => {
                onDeleteNode(selectedNode.id);
                setSelectedNode(null);
              }}
              className="px-2.5 py-1.5 rounded hover:bg-rose-500/20 text-xs font-medium flex items-center gap-1.5 text-rose-300 transition-colors whitespace-nowrap shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}
        </div>

        <div className="text-[11px] font-mono text-slate-400 truncate">
          SMB3 Share: //{systemConfig.consoleIp}/{systemConfig.smbShareName} (Port 445 Active)
        </div>
      </div>

      {/* Address & Search Bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#16181c] border-b border-white/10">
        <button
          type="button"
          onClick={handleGoUp}
          className="p-1.5 rounded hover:bg-white/10 text-slate-300 transition-colors"
          title="Up one level"
        >
          <ArrowUp className="w-3.5 h-3.5" />
        </button>

        <div className="flex-1 bg-[#22252b] border border-white/10 rounded px-3 py-1 text-xs font-mono text-slate-200 truncate">
          {currentPath}
        </div>

        <div className="relative w-52">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search folder..."
            className="w-full bg-[#22252b] border border-white/10 rounded pl-8 pr-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {/* New Folder Inline Prompt */}
      {isNewFolderOpen && (
        <div className="px-4 py-2 bg-[#232832] border-b border-sky-500/30 flex items-center gap-2">
          <span className="text-xs text-slate-300">Folder name:</span>
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="NewFolder"
            className="bg-[#15181e] border border-white/15 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-sky-400"
          />
          <button
            type="button"
            onClick={() => {
              if (newFolderName.trim()) {
                onCreateFolder(currentPath, newFolderName.trim());
                setNewFolderName('');
                setIsNewFolderOpen(false);
              }
            }}
            className="px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-xs font-medium text-white"
          >
            Create
          </button>
          <button
            type="button"
            onClick={() => setIsNewFolderOpen(false)}
            className="p-1 text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Split View: Left Navigation Pane + Right Files / File Inspector */}
      <div className="flex-1 flex min-h-0">
        {/* Left Sidebar */}
        <aside className="w-52 bg-[#17191e] border-r border-white/10 p-2 space-y-1 overflow-y-auto shrink-0">
          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Xbox Series X Volumes
          </div>
          {QUICK_LOCATIONS.map((loc) => {
            const Icon = loc.icon;
            const active = currentPath === loc.path;
            return (
              <button
                key={loc.path}
                type="button"
                onClick={() => {
                  onNavigate(loc.path);
                  setSelectedNode(null);
                }}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-medium transition-colors text-left ${
                  active
                    ? 'bg-sky-600/25 text-sky-300 border border-sky-500/30'
                    : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0 text-sky-400" />
                <span className="truncate">{loc.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Center File Table */}
        <div className="flex-1 overflow-y-auto p-3">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-[11px] text-slate-400">
                <th className="py-1.5 px-2 font-medium">Name</th>
                <th className="py-1.5 px-2 font-medium">Date modified</th>
                <th className="py-1.5 px-2 font-medium">Type</th>
                <th className="py-1.5 px-2 font-medium text-right">Size</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {visibleNodes.map((node) => {
                const isSelected = selectedNode?.id === node.id;
                return (
                  <tr
                    key={node.id}
                    onClick={() => setSelectedNode(node)}
                    onDoubleClick={() => handleOpenItem(node)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-sky-600/25 text-white' : 'hover:bg-white/5 text-slate-200'
                    }`}
                  >
                    <td className="py-2 px-2 flex items-center gap-2">
                      {node.type === 'folder' ? (
                        <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                      ) : node.extension === 'gguf' ? (
                        <Cpu className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : node.extension === 'sh' || node.extension === 'xml' || node.extension === 'json' ? (
                        <FileCode className="w-4 h-4 text-sky-400 shrink-0" />
                      ) : (
                        <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <span className="truncate font-medium">{node.name}</span>
                    </td>
                    <td className="py-2 px-2 text-slate-400 font-mono text-[11px] tabular-nums">
                      {node.modifiedAt}
                    </td>
                    <td className="py-2 px-2 text-slate-400">
                      {node.type === 'folder'
                        ? 'File folder'
                        : `${(node.extension || 'FILE').toUpperCase()} File`}
                    </td>
                    <td className="py-2 px-2 text-right font-mono text-[11px] text-slate-300 tabular-nums">
                      {node.type === 'folder' ? '' : formatBytes(node.sizeBytes)}
                    </td>
                  </tr>
                );
              })}

              {visibleNodes.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-xs text-slate-500">
                    This folder is empty. Use "New Folder" or "Upload File / .GGUF" above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Right File Inspector / Editor Pane */}
        {selectedNode && selectedNode.type === 'file' && (
          <div className="w-80 bg-[#14161a] border-l border-white/10 p-3 flex flex-col shrink-0">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
              <div className="truncate">
                <div className="text-xs font-semibold text-white truncate">{selectedNode.name}</div>
                <div className="text-[10px] font-mono text-slate-400">
                  {formatBytes(selectedNode.sizeBytes)} · {selectedNode.modifiedAt}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNode(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <textarea
              value={editingContent}
              onChange={(e) => setEditingContent(e.target.value)}
              className="flex-1 w-full bg-[#0e1014] border border-white/10 rounded p-2 text-[11px] font-mono text-slate-200 focus:outline-none focus:border-sky-500 resize-none"
            />

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  onUpdateFile(selectedNode.id, editingContent);
                  setSavedNotice(true);
                  setTimeout(() => setSavedNotice(false), 1500);
                }}
                className="px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-xs font-medium text-white flex items-center gap-1"
              >
                {savedNotice ? <Check className="w-3.5 h-3.5" /> : null}
                <span>{savedNotice ? 'Saved to Disk' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
