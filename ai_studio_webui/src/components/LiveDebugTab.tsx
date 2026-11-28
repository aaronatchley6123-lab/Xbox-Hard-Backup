import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Trash2, 
  Download, 
  Search, 
  Terminal, 
  Filter, 
  Send, 
  Sparkles,
  ArrowDown
} from 'lucide-react';
import { XboxLogEntry } from '../types/xbox';

interface LiveDebugTabProps {
  logs: XboxLogEntry[];
  isStreaming: boolean;
  onToggleStreaming: () => void;
  onClearLogs: () => void;
  onInjectLog: (message: string, level: XboxLogEntry['level'], category: XboxLogEntry['category']) => void;
}

export const LiveDebugTab: React.FC<LiveDebugTabProps> = ({
  logs,
  isStreaming,
  onToggleStreaming,
  onClearLogs,
  onInjectLog,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<'ALL' | XboxLogEntry['level']>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | XboxLogEntry['category']>('ALL');
  const [autoScroll, setAutoScroll] = useState(true);
  const [testMessage, setTestMessage] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = 
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.timestamp.includes(searchQuery);

    const matchesLevel = levelFilter === 'ALL' || log.level === levelFilter;
    const matchesCategory = categoryFilter === 'ALL' || log.category === categoryFilter;

    return matchesSearch && matchesLevel && matchesCategory;
  });

  const handleExportLogs = () => {
    const textContent = logs
      .map((l) => `[${l.timestamp}] [${l.level.padEnd(7)}] [${l.category.padEnd(8)}] ${l.message}`)
      .join('\n');
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xbox_debug_stream_${new Date().toISOString().replace(/[:.]/g, '_')}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSendTestMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testMessage.trim()) return;
    onInjectLog(testMessage.trim(), 'DEBUG', 'GameCore');
    setTestMessage('');
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-[#0d1117] border border-[#1b2332] rounded-xl">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Stream Play/Pause Toggle */}
          <button
            onClick={onToggleStreaming}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              isStreaming
                ? 'bg-rose-950/80 border border-rose-700/80 text-rose-300 hover:bg-rose-900'
                : 'bg-blue-600 text-white hover:bg-blue-500 shadow-[0_0_12px_rgba(37,99,235,0.4)]'
            }`}
          >
            {isStreaming ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause Stream</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Resume Stream</span>
              </>
            )}
          </button>

          {/* Level Filter */}
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value as any)}
            className="bg-[#121620] border border-[#212938] rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="ALL">All Levels</option>
            <option value="VERBOSE">VERBOSE</option>
            <option value="DEBUG">DEBUG</option>
            <option value="INFO">INFO</option>
            <option value="WARN">WARN</option>
            <option value="ERROR">ERROR</option>
            <option value="FATAL">FATAL</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className="bg-[#121620] border border-[#212938] rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="ALL">All Subsystems</option>
            <option value="GameCore">GameCore</option>
            <option value="D3D12">D3D12</option>
            <option value="Audio">Audio</option>
            <option value="Network">Network</option>
            <option value="Memory">Memory</option>
            <option value="System">System</option>
          </select>

          {/* Search Box */}
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search debug messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#121620] border border-[#212938] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <label className="flex items-center gap-1.5 text-xs text-slate-400 font-medium cursor-pointer pr-1">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded bg-[#121620] border-slate-700 text-blue-600 focus:ring-0"
            />
            <span className="hidden sm:inline">Auto-Scroll</span>
          </label>

          <button
            onClick={onClearLogs}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#141a25] border border-[#232c3d] text-slate-300 hover:text-white hover:border-blue-500 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>

          <button
            onClick={handleExportLogs}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#141a25] border border-[#232c3d] text-slate-300 hover:text-white hover:border-blue-500 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Export (.log)</span>
          </button>
        </div>
      </div>

      {/* Main Terminal Window */}
      <div className="border border-[#1e273a] bg-[#07090e] rounded-xl overflow-hidden shadow-2xl flex flex-col h-[520px]">
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#161d2a] bg-[#0b0e14] text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-blue-400" />
            <span>wss://{logs.length > 0 ? '11443/ext/app/rundebug' : 'disconnected'}</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-300 tabular-nums">{filteredLogs.length} events logged</span>
          </div>

          <div className="flex items-center gap-2 text-slate-500">
            <span>ETW OutputDebugString Hook</span>
          </div>
        </div>

        {/* Scrollable Logs Container */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-1 font-mono text-xs select-text leading-relaxed"
        >
          {filteredLogs.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-600 italic">
              No debug events matching active filters.
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isError = log.level === 'ERROR' || log.level === 'FATAL';
              const isWarn = log.level === 'WARN';
              const isDebug = log.level === 'DEBUG';

              return (
                <div 
                  key={log.id} 
                  className={`flex items-start gap-2 hover:bg-[#0e131d] px-1.5 py-0.5 rounded transition-colors ${
                    isError ? 'text-rose-400 bg-rose-950/20' : isWarn ? 'text-amber-300' : 'text-slate-300'
                  }`}
                >
                  <span className="text-slate-600 tabular-nums shrink-0">
                    {log.timestamp}
                  </span>

                  <span className={`shrink-0 px-1 rounded text-[10px] font-bold ${
                    isError ? 'bg-rose-900/60 text-rose-200' :
                    isWarn ? 'bg-amber-900/60 text-amber-200' :
                    isDebug ? 'bg-blue-900/50 text-blue-300' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {log.level}
                  </span>

                  <span className="text-blue-400 font-semibold shrink-0">
                    [{log.category}]
                  </span>

                  <span className="break-all flex-1 text-slate-200">
                    {log.message}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Test Log Injector Footer */}
        <form onSubmit={handleSendTestMessage} className="flex items-center gap-2 p-2.5 border-t border-[#161d2a] bg-[#090c12]">
          <span className="text-xs font-mono text-blue-400 font-bold px-2">
            INJECT &gt;
          </span>
          <input
            type="text"
            placeholder="Send simulated debug string (e.g. [D3D12] Pipeline State Object compiled in 4.2ms)..."
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            className="flex-1 bg-[#10141d] border border-[#1f283a] rounded px-3 py-1.5 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-blue-600 text-white hover:bg-blue-500 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Emit</span>
          </button>
        </form>
      </div>
    </div>
  );
};
