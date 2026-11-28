import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Cable,
  Play,
  Square,
  Trash2,
  Download,
  Send,
  Search,
  Activity,
  FileJson,
} from 'lucide-react';

export interface SerialRxEntry {
  id: string;
  ts: string;
  direction: 'RX' | 'TX' | 'SYS';
  ascii: string;
  hex: string;
  byteCount: number;
}

interface UartLiveMonitorProps {
  isConnected: boolean;
  isBusy?: boolean;
  transport: 'host' | 'webserial';
  selectedDevice: string;
  baudRate: number;
  dataBits: 7 | 8;
  parity: 'none' | 'even' | 'odd';
  stopBits: 1 | 2;
  streamState: 'sse-live' | 'webserial-live' | 'disconnected' | 'error';
  entries: SerialRxEntry[];
  totalRxBytes: number;
  totalTxBytes: number;
  onStartMonitor: () => void;
  onStopMonitor: () => void;
  onSendTx: (
    payload: string,
    mode: 'ascii' | 'hex',
    lineEnding: 'crlf' | 'lf' | 'cr' | 'none'
  ) => Promise<boolean>;
  onClear: () => void;
}

function formatHexSpacing(hex: string): string {
  return (hex.match(/.{1,2}/g) || []).join(' ');
}

export const UartLiveMonitor: React.FC<UartLiveMonitorProps> = ({
  isConnected,
  isBusy = false,
  transport,
  selectedDevice,
  baudRate,
  dataBits,
  parity,
  stopBits,
  streamState,
  entries,
  totalRxBytes,
  totalTxBytes,
  onStartMonitor,
  onStopMonitor,
  onSendTx,
  onClear,
}) => {
  const [viewMode, setViewMode] = useState<'ascii' | 'split' | 'hex'>('split');
  const [stageFilter, setStageFilter] = useState<'all' | 'fatal' | 'boot' | 'tx'>('all');
  const [filterText, setFilterText] = useState<string>('');
  const [highlightKeyword, setHighlightKeyword] = useState<string>(
    'POST|PSP|UEFI|KDBG|SMC|0xE0|0xEC|ERROR|PANIC|FATAL'
  );
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [txInput, setTxInput] = useState<string>('');
  const [txMode, setTxMode] = useState<'ascii' | 'hex'>('ascii');
  const [lineEnding, setLineEnding] = useState<'crlf' | 'lf' | 'cr' | 'none'>('crlf');

  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [entries, autoScroll]);

  const highlightRe = useMemo(() => {
    if (!highlightKeyword.trim()) return null;
    try {
      return new RegExp(highlightKeyword.trim(), 'i');
    } catch {
      return null;
    }
  }, [highlightKeyword]);

  // Extract genuine hardware codes from actual received RX frames (never fabricated)
  const realStats = useMemo(() => {
    let lastFatalCode: string | null = null;
    let lastBootMarker: string | null = null;
    let matchedAlerts = 0;

    for (const e of entries) {
      if (e.direction !== 'RX') continue;
      const fatalMatch = /\b0xE[0C][0-9A-Fa-f]{2,4}\b/i.exec(e.ascii);
      if (fatalMatch) lastFatalCode = fatalMatch[0].toUpperCase();

      const bootMatch = /\b(POST(?:\s*[:=]\s*0x[0-9A-Fa-f]+)?|PSP|UEFI|KDBG|KER_DBG|SMC[^\s]*)\b/i.exec(
        e.ascii
      );
      if (bootMatch) lastBootMarker = bootMatch[0];

      if (highlightRe && highlightRe.test(e.ascii)) {
        matchedAlerts += 1;
      }
    }

    return { lastFatalCode, lastBootMarker, matchedAlerts };
  }, [entries, highlightRe]);

  const filteredEntries = useMemo(() => {
    let list = entries;
    if (stageFilter === 'fatal') {
      list = list.filter((e) => /0xE[0C][0-9A-Fa-f]{2,4}|ERROR|PANIC|FATAL|FAIL/i.test(e.ascii));
    } else if (stageFilter === 'boot') {
      list = list.filter((e) => /POST|PSP|UEFI|KDBG|SMC|KER_DBG|BOOT/i.test(e.ascii));
    } else if (stageFilter === 'tx') {
      list = list.filter((e) => e.direction === 'TX');
    }

    if (filterText.trim()) {
      const q = filterText.toLowerCase();
      list = list.filter(
        (e) => e.ascii.toLowerCase().includes(q) || e.hex.toLowerCase().includes(q)
      );
    }
    return list;
  }, [entries, stageFilter, filterText]);

  const handleSubmitTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txInput && lineEnding === 'none') return;
    const sent = await onSendTx(txInput, txMode, lineEnding);
    if (sent) {
      setTxInput('');
    }
  };

  const handleExportLog = () => {
    const text = entries
      .map(
        (e) =>
          `[${e.ts}] [${e.direction}] ${
            viewMode === 'hex' ? formatHexSpacing(e.hex) : e.ascii.replace(/\r?\n$/, '')
          }`
      )
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xbox_uart_${baudRate}_${new Date().toISOString().replace(/[:.]/g, '_')}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJsonl = () => {
    const jsonl = entries
      .map((e) =>
        JSON.stringify({
          ts: e.ts,
          direction: e.direction,
          device: transport === 'webserial' ? 'WebSerial' : selectedDevice,
          baudRate,
          bytes: e.byteCount,
          ascii: e.ascii,
          hex: e.hex,
        })
      )
      .join('\n');
    const blob = new Blob([jsonl], { type: 'application/x-ndjson;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xbox_uart_${baudRate}_${new Date().toISOString().replace(/[:.]/g, '_')}.jsonl`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const streamLabel =
    streamState === 'sse-live'
      ? 'SSE Live Push'
      : streamState === 'webserial-live'
        ? 'Web Serial Stream'
        : streamState === 'error'
          ? 'Stream Error'
          : 'Idle';

  return (
    <div className="border border-[#1b2332] bg-[#07090e] rounded-xl overflow-hidden flex flex-col">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#0b0f17] border-b border-[#1b2332]">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span
            className={`inline-block w-2 h-2 rounded-full shrink-0 ${
              isConnected ? 'bg-emerald-400' : 'bg-slate-600'
            }`}
          />
          <Activity className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="font-mono font-semibold text-slate-100 whitespace-nowrap">
            {isConnected
              ? `${transport === 'webserial' ? 'WebSerial' : selectedDevice} @ ${baudRate} ${dataBits}${parity[0].toUpperCase()}${stopBits}`
              : 'UART Monitor Idle'}
          </span>
          <span className="text-slate-600" aria-hidden="true">
            ·
          </span>
          <span
            className={`font-mono text-[11px] whitespace-nowrap ${
              isConnected ? 'text-emerald-400' : 'text-slate-500'
            }`}
          >
            {streamLabel}
          </span>
          <span className="text-slate-600" aria-hidden="true">
            ·
          </span>
          <span className="font-mono tabular-nums text-[11px] text-slate-400 whitespace-nowrap">
            RX {totalRxBytes.toLocaleString()} B / TX {totalTxBytes.toLocaleString()} B
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isConnected ? (
            <button
              type="button"
              onClick={onStartMonitor}
              disabled={isBusy}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start UART Monitor</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onStopMonitor}
              disabled={isBusy}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop UART Monitor</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClear}
            className="p-1.5 rounded-lg bg-[#141a25] border border-[#232d40] text-slate-300 hover:text-white shrink-0"
            title="Clear UART Console"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleExportLog}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#141a25] border border-[#232d40] text-xs font-semibold text-slate-200 hover:border-blue-500 whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Export .log</span>
          </button>

          <button
            type="button"
            onClick={handleExportJsonl}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#141a25] border border-[#232d40] text-xs font-semibold text-slate-200 hover:border-blue-500 whitespace-nowrap shrink-0"
            title="Export structured JSONL for analysis or reports"
          >
            <FileJson className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export .jsonl</span>
          </button>
        </div>
      </div>

      {/* Real Hardware Marker Summary Strip (derived strictly from live RX bytes) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-[#1b2332] bg-[#090d14] border-b border-[#1b2332] text-xs">
        <div className="px-4 py-2 flex items-center justify-between gap-2">
          <span className="text-slate-500 whitespace-nowrap">Last 0xE Fatal</span>
          <span className="font-mono tabular-nums text-amber-300 truncate">
            {realStats.lastFatalCode || '—'}
          </span>
        </div>
        <div className="px-4 py-2 flex items-center justify-between gap-2">
          <span className="text-slate-500 whitespace-nowrap">Last Boot Marker</span>
          <span className="font-mono tabular-nums text-blue-300 truncate">
            {realStats.lastBootMarker || '—'}
          </span>
        </div>
        <div className="px-4 py-2 flex items-center justify-between gap-2">
          <span className="text-slate-500 whitespace-nowrap">Matched Alerts</span>
          <span className="font-mono tabular-nums text-slate-200">
            {realStats.matchedAlerts.toLocaleString()}
          </span>
        </div>
        <div className="px-4 py-2 flex items-center justify-between gap-2">
          <span className="text-slate-500 whitespace-nowrap">Frames Buffered</span>
          <span className="font-mono tabular-nums text-slate-200">
            {entries.length.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Filter & View Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-[#0b0f17] border-b border-[#1b2332]">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-[#07090e] border border-[#232d40] rounded-lg p-0.5 text-[11px] font-mono">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'fatal', label: 'Fatal / 0xE' },
                { id: 'boot', label: 'POST / Stage' },
                { id: 'tx', label: 'TX Only' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStageFilter(f.id)}
                className={`px-2 py-0.5 rounded whitespace-nowrap shrink-0 ${
                  stageFilter === f.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex bg-[#07090e] border border-[#232d40] rounded-lg p-0.5 text-[11px] font-mono">
            {(['ascii', 'split', 'hex'] as const).map((vm) => (
              <button
                key={vm}
                type="button"
                onClick={() => setViewMode(vm)}
                className={`px-2 py-0.5 rounded uppercase whitespace-nowrap shrink-0 ${
                  viewMode === vm ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {vm}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filter RX..."
              className="bg-[#07090e] border border-[#232d40] rounded-lg pl-6 pr-2 py-1 text-xs font-mono text-white w-36 focus:outline-none focus:border-blue-500"
            />
          </div>

          <input
            type="text"
            value={highlightKeyword}
            onChange={(e) => setHighlightKeyword(e.target.value)}
            placeholder="Highlight regex..."
            className="bg-[#07090e] border border-[#232d40] rounded-lg px-2 py-1 text-xs font-mono text-amber-300 w-44 focus:outline-none focus:border-amber-500"
          />

          <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded bg-[#07090e] border-slate-700"
            />
            <span>Auto-scroll</span>
          </label>
        </div>
      </div>

      {/* Live Stream Viewport */}
      <div
        ref={logContainerRef}
        className="h-[380px] overflow-y-auto p-3 font-mono text-xs space-y-1 select-text"
      >
        {filteredEntries.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center px-6">
            <Cable className="w-8 h-8 text-slate-700 mb-2" />
            <p className="text-slate-300 font-medium">
              {isConnected
                ? 'Listening on hardware UART — awaiting incoming frames from console.'
                : 'Real-time UART stream is idle.'}
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-lg">
              {isConnected
                ? 'Power or reset the console to capture early boot POST / SMC / KER_DBG output.'
                : 'Select your Waveshare CH347 (/dev/ttyACM*) or Mini2040 port above and click Start UART Monitor.'}
            </p>
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const isMatch = highlightRe ? highlightRe.test(entry.ascii) : false;
            return (
              <div
                key={entry.id}
                className={`flex items-start gap-2 px-2 py-0.5 rounded ${
                  entry.direction === 'TX'
                    ? 'bg-blue-950/25 text-blue-300'
                    : entry.direction === 'SYS'
                      ? 'text-slate-400 italic'
                      : isMatch
                        ? 'bg-amber-950/30 text-amber-200'
                        : 'text-emerald-300/95 hover:bg-[#0e1420]'
                }`}
              >
                <span className="text-slate-600 tabular-nums shrink-0">{entry.ts}</span>
                <span
                  className={`shrink-0 font-bold text-[10px] px-1 rounded ${
                    entry.direction === 'TX'
                      ? 'bg-blue-900/60 text-blue-200'
                      : entry.direction === 'SYS'
                        ? 'bg-slate-800 text-slate-300'
                        : 'bg-emerald-900/50 text-emerald-200'
                  }`}
                >
                  {entry.direction}
                </span>
                <div className="flex-1 min-w-0 break-all">
                  {viewMode !== 'hex' && (
                    <span className="whitespace-pre-wrap">
                      {entry.ascii.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '.')}
                    </span>
                  )}
                  {viewMode === 'split' && entry.hex && (
                    <span className="ml-3 text-[11px] text-slate-500">
                      [{formatHexSpacing(entry.hex)}]
                    </span>
                  )}
                  {viewMode === 'hex' && (
                    <span>{entry.hex ? formatHexSpacing(entry.hex) : entry.ascii}</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* TX Command Input Bar */}
      <form
        onSubmit={handleSubmitTx}
        className="flex flex-wrap items-center gap-2 p-3 border-t border-[#1b2332] bg-[#0b0f17]"
      >
        <select
          value={txMode}
          onChange={(e) => setTxMode(e.target.value as 'ascii' | 'hex')}
          className="bg-[#07090e] border border-[#232d40] rounded-lg px-2 py-1.5 text-xs font-mono text-white"
        >
          <option value="ascii">ASCII</option>
          <option value="hex">HEX</option>
        </select>

        {txMode === 'ascii' && (
          <select
            value={lineEnding}
            onChange={(e) => setLineEnding(e.target.value as 'crlf' | 'lf' | 'cr' | 'none')}
            className="bg-[#07090e] border border-[#232d40] rounded-lg px-2 py-1.5 text-xs font-mono text-slate-300"
          >
            <option value="crlf">\r\n (CRLF)</option>
            <option value="lf">\n (LF)</option>
            <option value="cr">\r (CR)</option>
            <option value="none">None</option>
          </select>
        )}

        <input
          type="text"
          value={txInput}
          onChange={(e) => setTxInput(e.target.value)}
          placeholder={
            txMode === 'hex' ? 'Send raw hex bytes (e.g. AA 55 01)...' : 'Send UART TX payload...'
          }
          className="flex-1 min-w-[200px] bg-[#07090e] border border-[#232d40] rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
        />

        <button
          type="submit"
          disabled={!isConnected}
          className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 disabled:opacity-40"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send TX</span>
        </button>
      </form>
    </div>
  );
};
