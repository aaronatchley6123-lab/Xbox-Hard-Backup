import React, { useState, useEffect, useMemo } from 'react';
import {
  Binary,
  Cpu,
  HardDrive,
  Search,
  RefreshCw,
  ArrowUpRight,
  Bookmark,
  Trash2,
  Download,
  Terminal,
  Undo2,
  AlertTriangle,
  Wifi,
  Play,
  Copy,
  Check,
  Shield,
} from 'lucide-react';
import { XboxConnectionConfig, XboxProcess } from '../types/xbox';

interface PeekPokeTabProps {
  config: XboxConnectionConfig;
  processes: XboxProcess[];
  onLog?: (msg: string, level?: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG') => void;
}

type PeekTargetMode = 'file' | 'xbdm' | 'wdp' | 'scratch';
type DataKind = 'hex' | 'u8' | 'u16' | 'u32' | 'u64' | 'f32' | 'ascii' | 'utf16le';

interface WatchEntry {
  id: string;
  label: string;
  mode: PeekTargetMode;
  target: string;
  address: string;
  kind: DataKind;
  endian: 'le' | 'be';
  lastHex: string;
  decoded: string;
  updatedAt: string;
}

interface ScanHit {
  offset: number;
  offsetHex: string;
  contextHex: string;
}

interface UndoItem {
  mode: PeekTargetMode;
  target: string;
  address: string;
  previousHex: string;
  timestamp: string;
}

const WATCH_STORAGE_KEY = 'xbxowned_peekpoke_watch_v1';

// Deterministic 512-byte local test buffer containing realistic PE/Minidump header + structured values for instant browser scratch testing
function createInitialScratchBuffer(): Uint8Array {
  const buf = new Uint8Array(512);
  const sig = 'MDMPXboxDevScratch\0';
  for (let i = 0; i < sig.length; i++) buf[i] = sig.charCodeAt(i);
  const view = new DataView(buf.buffer);
  view.setUint32(0x20, 0x20014001, true); // Hardware mode tag
  view.setUint32(0x24, 1000, true); // e.g. health / score / tick
  view.setFloat32(0x28, 60.0, true); // FPS / float param
  view.setUint32(0x2c, 0xdeadbeef, true);
  // 0x00007ff7a1b20000 written as lo/hi 32-bit words (EdgeHTML-safe)
  view.setUint32(0x30, 0xa1b20000, true);
  view.setUint32(0x34, 0x00007ff7, true);
  const devStr = 'DevUser@192.168.1.100:11443\0';
  for (let i = 0; i < devStr.length; i++) buf[0x60 + i] = devStr.charCodeAt(i);
  const tokenStr = 'Sandbox=XDKS.1|Mode=0x4001|Fuses=0x0003\0';
  for (let i = 0; i < tokenStr.length; i++) buf[0xa0 + i] = tokenStr.charCodeAt(i);
  return buf;
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/[^0-9a-fA-F]/g, '');
  const len = Math.floor(clean.length / 2);
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16) || 0;
  }
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
    .join('');
}

function parseHexOrDec(input: string): number {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return 0;
  if (trimmed.startsWith('0x')) return Math.max(0, parseInt(trimmed, 16) || 0);
  if (/^[0-9a-f]+$/.test(trimmed) && /[a-f]/.test(trimmed)) {
    return Math.max(0, parseInt(trimmed, 16) || 0);
  }
  return Math.max(0, Number(trimmed) || 0);
}

function encodeValueToHex(kind: DataKind, value: string, endian: 'le' | 'be'): { hex: string; error?: string } {
  const v = value.trim();
  if (!v) return { hex: '', error: 'Value cannot be empty.' };
  const le = endian === 'le';
  try {
    if (kind === 'hex') {
      const clean = v.replace(/[^0-9a-fA-F]/g, '').toUpperCase();
      if (!clean || clean.length % 2 !== 0) {
        return { hex: '', error: 'Hex bytes must have an even count of hex digits (e.g. 90 90 or DEADBEEF).' };
      }
      return { hex: clean };
    }
    if (kind === 'ascii') {
      const bytes = Array.from(value).map((c) => c.charCodeAt(0) & 0xff);
      return { hex: bytesToHex(new Uint8Array(bytes)) };
    }
    if (kind === 'utf16le') {
      const buf = new Uint8Array(value.length * 2);
      const dv = new DataView(buf.buffer);
      for (let i = 0; i < value.length; i++) dv.setUint16(i * 2, value.charCodeAt(i), true);
      return { hex: bytesToHex(buf) };
    }
    if (kind === 'u8') {
      const n = v.startsWith('0x') ? parseInt(v, 16) : Number(v);
      if (Number.isNaN(n)) return { hex: '', error: 'Invalid u8 number' };
      return { hex: (n & 0xff).toString(16).padStart(2, '0').toUpperCase() };
    }
    if (kind === 'u16') {
      const n = v.startsWith('0x') ? parseInt(v, 16) : Number(v);
      if (Number.isNaN(n)) return { hex: '', error: 'Invalid u16 number' };
      const buf = new Uint8Array(2);
      new DataView(buf.buffer).setUint16(0, n & 0xffff, le);
      return { hex: bytesToHex(buf) };
    }
    if (kind === 'u32') {
      const n = v.startsWith('0x') ? parseInt(v, 16) : Number(v);
      if (Number.isNaN(n)) return { hex: '', error: 'Invalid u32 number' };
      const buf = new Uint8Array(4);
      new DataView(buf.buffer).setUint32(0, n >>> 0, le);
      return { hex: bytesToHex(buf) };
    }
    if (kind === 'u64') {
      const buf = new Uint8Array(8);
      const dv = new DataView(buf.buffer);
      if (typeof BigInt === 'function' && typeof dv.setBigUint64 === 'function') {
        dv.setBigUint64(0, BigInt(v), le);
      } else {
        const cleanHex = v.startsWith('0x') ? v.slice(2).padStart(16, '0') : Number(v).toString(16).padStart(16, '0');
        const hi = parseInt(cleanHex.slice(0, 8), 16) >>> 0;
        const lo = parseInt(cleanHex.slice(8, 16), 16) >>> 0;
        dv.setUint32(le ? 0 : 4, lo, le);
        dv.setUint32(le ? 4 : 0, hi, le);
      }
      return { hex: bytesToHex(buf) };
    }
    if (kind === 'f32') {
      const f = Number(v);
      if (Number.isNaN(f)) return { hex: '', error: 'Invalid float32 number' };
      const buf = new Uint8Array(4);
      new DataView(buf.buffer).setFloat32(0, f, le);
      return { hex: bytesToHex(buf) };
    }
    return { hex: '', error: 'Unsupported type' };
  } catch (e: any) {
    return { hex: '', error: e?.message || 'Encoding failed' };
  }
}

export const PeekPokeTab: React.FC<PeekPokeTabProps> = ({ config, processes, onLog }) => {
  const [targetMode, setTargetMode] = useState<PeekTargetMode>('scratch');
  const [endian, setEndian] = useState<'le' | 'be'>('le');

  // Target locations
  const [filePathInput, setFilePathInput] = useState<string>('./package.json');
  const [fileSize, setFileSize] = useState<number>(512);
  const [xbdmPort, setXbdmPort] = useState<string>('730');
  const [wdpPid, setWdpPid] = useState<number>(processes.find((p) => p.isGame)?.pid || processes[0]?.pid || 4120);
  const [xbdmCmd, setXbdmCmd] = useState<string>('modules');
  const [xbdmConsoleOut, setXbdmConsoleOut] = useState<string>('');

  // Peek state
  const [addressInput, setAddressInput] = useState<string>('0x00000000');
  const [peekLength, setPeekLength] = useState<number>(256);
  const [baseAddressNum, setBaseAddressNum] = useState<number>(0);
  const [hexBytes, setHexBytes] = useState<string>('');
  const [selectedByteRel, setSelectedByteRel] = useState<number>(0);
  const [scratchBuffer, setScratchBuffer] = useState<Uint8Array>(() => createInitialScratchBuffer());

  // Poke state
  const [pokeKind, setPokeKind] = useState<DataKind>('u32');
  const [pokeValue, setPokeValue] = useState<string>('9999');
  const [createBackup, setCreateBackup] = useState<boolean>(true);
  const [lastModifiedRange, setLastModifiedRange] = useState<{ start: number; end: number } | null>(null);
  const [undoStack, setUndoStack] = useState<UndoItem[]>([]);

  // Scanner state
  const [scanKind, setScanKind] = useState<DataKind>('ascii');
  const [scanValue, setScanValue] = useState<string>('Sandbox');
  const [scanHits, setScanHits] = useState<ScanHit[]>([]);
  const [hasFirstScan, setHasFirstScan] = useState<boolean>(false);

  // Watchlist persisted in localStorage
  const [watchLabel, setWatchLabel] = useState<string>('');
  const [watchlist, setWatchlist] = useState<WatchEntry[]>(() => {
    try {
      const raw = localStorage.getItem(WATCH_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return [];
  });

  // Status / Feedback
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusOk, setStatusOk] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(WATCH_STORAGE_KEY, JSON.stringify(watchlist));
    } catch {
      // ignore
    }
  }, [watchlist]);

  // Auto-refresh view when switching to scratch mode initially
  useEffect(() => {
    if (targetMode === 'scratch') {
      const off = Math.max(0, Math.min(scratchBuffer.length - 1, parseHexOrDec(addressInput)));
      const slice = scratchBuffer.subarray(off, Math.min(scratchBuffer.length, off + peekLength));
      setBaseAddressNum(off);
      setFileSize(scratchBuffer.length);
      setHexBytes(bytesToHex(slice));
    }
  }, [targetMode, scratchBuffer]);

  const bytes = useMemo(() => hexToBytes(hexBytes), [hexBytes]);

  const encodedPokePreview = useMemo(
    () => encodeValueToHex(pokeKind, pokeValue, endian),
    [pokeKind, pokeValue, endian]
  );

  // Live Data Inspector decoded at selectedByteRel
  const inspector = useMemo(() => {
    if (selectedByteRel < 0 || selectedByteRel >= bytes.length) return null;
    const rem = bytes.length - selectedByteRel;
    const sub = bytes.subarray(selectedByteRel, selectedByteRel + Math.min(8, rem));
    const padded = new Uint8Array(8);
    padded.set(sub);
    const dv = new DataView(padded.buffer);
    const le = endian === 'le';

    let asciiPreview = '';
    for (let i = 0; i < Math.min(16, bytes.length - selectedByteRel); i++) {
      const b = bytes[selectedByteRel + i];
      asciiPreview += b >= 32 && b <= 126 ? String.fromCharCode(b) : '.';
    }

    return {
      absAddr: '0x' + (baseAddressNum + selectedByteRel).toString(16).toUpperCase().padStart(8, '0'),
      u8: sub[0],
      i8: dv.getInt8(0),
      u16: rem >= 2 ? dv.getUint16(0, le) : null,
      i16: rem >= 2 ? dv.getInt16(0, le) : null,
      u32: rem >= 4 ? dv.getUint32(0, le) : null,
      i32: rem >= 4 ? dv.getInt32(0, le) : null,
      u64: rem >= 8 ? dv.getBigUint64(0, le).toString() : null,
      f32: rem >= 4 ? Number(dv.getFloat32(0, le).toPrecision(6)) : null,
      f64: rem >= 8 ? Number(dv.getFloat64(0, le).toPrecision(8)) : null,
      ptr32: rem >= 4 ? '0x' + dv.getUint32(0, le).toString(16).toUpperCase().padStart(8, '0') : null,
      rawHex8: bytesToHex(sub),
      asciiPreview,
    };
  }, [bytes, selectedByteRel, baseAddressNum, endian]);

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handlePeek = async (overrideAddr?: string) => {
    const targetAddrStr = overrideAddr ?? addressInput;
    if (overrideAddr !== undefined) setAddressInput(overrideAddr);
    setStatusError(null);
    setStatusOk(null);

    if (targetMode === 'scratch') {
      const off = Math.max(0, Math.min(scratchBuffer.length - 1, parseHexOrDec(targetAddrStr)));
      const slice = scratchBuffer.subarray(off, Math.min(scratchBuffer.length, off + peekLength));
      setBaseAddressNum(off);
      setHexBytes(bytesToHex(slice));
      setSelectedByteRel(0);
      setStatusOk(`Peeked ${slice.length} bytes at 0x${off.toString(16).toUpperCase().padStart(8, '0')} (Scratch Buffer).`);
      return;
    }

    setIsBusy(true);
    try {
      if (targetMode === 'file' || targetMode === 'wdp') {
        const res = await fetch('/api/xbox/peekpoke/file-peek', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filePath: filePathInput.trim(),
            offset: targetAddrStr.trim(),
            length: peekLength,
          }),
        });
        const data = await res.json();
        if (!data.ok) {
          setStatusError(data.error || 'File peek failed');
        } else {
          setFilePathInput(data.resolvedPath);
          setFileSize(data.fileSize || 0);
          setBaseAddressNum(data.offset || 0);
          setHexBytes(data.hexBytes || '');
          setSelectedByteRel(0);
          setStatusOk(`Peeked ${(data.hexBytes?.length || 0) / 2} bytes at ${data.offsetHex} from ${data.resolvedPath}`);
          onLog?.(`Peeked ${data.offsetHex} in ${data.resolvedPath}`, 'INFO');
        }
      } else if (targetMode === 'xbdm') {
        const res = await fetch('/api/xbox/peekpoke/xbdm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ip: config.ip,
            port: Number(xbdmPort) || 730,
            action: 'peek',
            address: targetAddrStr.trim(),
            length: peekLength,
          }),
        });
        const data = await res.json();
        if (!data.ok) {
          setStatusError(data.error || data.statusLine || 'XBDM getmem failed');
          if (data.rawResponse) setXbdmConsoleOut(data.rawResponse);
        } else {
          const parsedAddr = parseHexOrDec(data.address || targetAddrStr);
          setBaseAddressNum(parsedAddr);
          setHexBytes((data.hexBytes || '').replace(/\?/g, '0'));
          setSelectedByteRel(0);
          setXbdmConsoleOut(`Banner: ${data.banner}\n> ${data.command}\n${data.statusLine}`);
          setStatusOk(`XBDM Peeked ${data.address} (${(data.hexBytes?.length || 0) / 2} bytes)`);
          onLog?.(`XBDM getmem ${data.address} succeeded`, 'INFO');
        }
      }
    } catch (err: any) {
      setStatusError(err?.message || 'Peek request error');
    } finally {
      setIsBusy(false);
    }
  };

  const handlePoke = async () => {
    setStatusError(null);
    setStatusOk(null);
    if (encodedPokePreview.error || !encodedPokePreview.hex) {
      setStatusError(encodedPokePreview.error || 'Invalid poke payload');
      return;
    }

    const absTargetOffset = baseAddressNum + selectedByteRel;
    const absHexAddr = '0x' + absTargetOffset.toString(16).toUpperCase().padStart(8, '0');
    const patchBytes = hexToBytes(encodedPokePreview.hex);

    if (targetMode === 'scratch') {
      if (absTargetOffset + patchBytes.length > scratchBuffer.length) {
        setStatusError(`Poke exceeds 512-byte scratch buffer bounds.`);
        return;
      }
      const prevSlice = scratchBuffer.slice(absTargetOffset, absTargetOffset + patchBytes.length);
      const next = new Uint8Array(scratchBuffer);
      next.set(patchBytes, absTargetOffset);
      setScratchBuffer(next);
      setUndoStack((u) => [
        {
          mode: 'scratch',
          target: 'ScratchBuffer',
          address: absHexAddr,
          previousHex: bytesToHex(prevSlice),
          timestamp: new Date().toLocaleTimeString(),
        },
        ...u.slice(0, 19),
      ]);
      setLastModifiedRange({ start: selectedByteRel, end: selectedByteRel + patchBytes.length });
      setStatusOk(`Poked ${patchBytes.length} bytes (${encodedPokePreview.hex}) at ${absHexAddr}`);
      return;
    }

    setIsBusy(true);
    try {
      if (targetMode === 'file' || targetMode === 'wdp') {
        const res = await fetch('/api/xbox/peekpoke/file-poke', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filePath: filePathInput.trim(),
            offset: absHexAddr,
            hexData: encodedPokePreview.hex,
            createBackup,
          }),
        });
        const data = await res.json();
        if (!data.ok) {
          setStatusError(data.error || 'File poke failed');
        } else {
          setUndoStack((u) => [
            {
              mode: targetMode,
              target: data.resolvedPath,
              address: data.offsetHex,
              previousHex: data.previousHex,
              timestamp: new Date().toLocaleTimeString(),
            },
            ...u.slice(0, 19),
          ]);
          setLastModifiedRange({ start: selectedByteRel, end: selectedByteRel + patchBytes.length });
          setStatusOk(
            `Poked ${data.bytesWritten} bytes at ${data.offsetHex}${data.backupPath ? ` (backup: ${data.backupPath})` : ''}`
          );
          onLog?.(`Poked ${data.bytesWritten} bytes at ${data.offsetHex} in ${data.resolvedPath}`, 'WARN');
          await handlePeek();
        }
      } else if (targetMode === 'xbdm') {
        const res = await fetch('/api/xbox/peekpoke/xbdm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ip: config.ip,
            port: Number(xbdmPort) || 730,
            action: 'poke',
            address: absHexAddr,
            hexData: encodedPokePreview.hex,
          }),
        });
        const data = await res.json();
        if (!data.ok) {
          setStatusError(data.error || data.statusLine || 'XBDM setmem failed');
        } else {
          const prevSlice = bytes.subarray(selectedByteRel, selectedByteRel + patchBytes.length);
          if (prevSlice.length === patchBytes.length) {
            setUndoStack((u) => [
              {
                mode: 'xbdm',
                target: `${config.ip}:${xbdmPort}`,
                address: absHexAddr,
                previousHex: bytesToHex(prevSlice),
                timestamp: new Date().toLocaleTimeString(),
              },
              ...u.slice(0, 19),
            ]);
          }
          setLastModifiedRange({ start: selectedByteRel, end: selectedByteRel + patchBytes.length });
          setXbdmConsoleOut(`Banner: ${data.banner}\n> ${data.command}\n${data.statusLine}`);
          setStatusOk(`XBDM Poked ${patchBytes.length} bytes at ${absHexAddr}`);
          onLog?.(`XBDM setmem ${absHexAddr} (${encodedPokePreview.hex})`, 'WARN');
          await handlePeek();
        }
      }
    } catch (err: any) {
      setStatusError(err?.message || 'Poke error');
    } finally {
      setIsBusy(false);
    }
  };

  const handleUndoLastPoke = async () => {
    if (undoStack.length === 0) return;
    const [top, ...rest] = undoStack;
    setStatusError(null);
    setStatusOk(null);

    if (top.mode === 'scratch') {
      const off = parseHexOrDec(top.address);
      const restore = hexToBytes(top.previousHex);
      const next = new Uint8Array(scratchBuffer);
      next.set(restore, off);
      setScratchBuffer(next);
      setUndoStack(rest);
      setStatusOk(`Restored ${restore.length} bytes at ${top.address}`);
      return;
    }

    setIsBusy(true);
    try {
      const endpoint = top.mode === 'xbdm' ? '/api/xbox/peekpoke/xbdm' : '/api/xbox/peekpoke/file-poke';
      const body =
        top.mode === 'xbdm'
          ? { ip: config.ip, port: Number(xbdmPort) || 730, action: 'poke', address: top.address, hexData: top.previousHex }
          : { filePath: top.target, offset: top.address, hexData: top.previousHex, createBackup: false };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.ok) {
        setStatusError(data.error || 'Undo poke failed');
      } else {
        setUndoStack(rest);
        setStatusOk(`Undid poke at ${top.address} (restored ${top.previousHex})`);
        await handlePeek();
      }
    } catch (err: any) {
      setStatusError(err?.message || 'Undo failed');
    } finally {
      setIsBusy(false);
    }
  };

  const handlePullWdpDump = async () => {
    setIsBusy(true);
    setStatusError(null);
    setStatusOk(null);
    try {
      const cleanUser = config.username.replace(/^.*[\\/]/, '') || 'DevUser';
      const res = await fetch('/api/xbox/peekpoke/wdp-dump', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: config.ip,
          wdpPort: Number(config.port) || 11443,
          username: cleanUser,
          password: config.password,
          pid: wdpPid,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setStatusError(data.error || 'Failed to pull WDP live process dump');
      } else {
        setFilePathInput(data.dumpPath);
        setFileSize(data.sizeBytes || 0);
        setBaseAddressNum(0);
        setAddressInput('0x00000000');
        setHexBytes(data.headerHex || '');
        setSelectedByteRel(0);
        setStatusOk(`Saved live PID ${wdpPid} minidump (${(data.sizeBytes / 1024).toFixed(1)} KB) -> ${data.dumpPath}`);
        onLog?.(`Pulled WDP live minidump PID ${wdpPid} to ${data.dumpPath}`, 'INFO');
      }
    } catch (err: any) {
      setStatusError(err?.message || 'WDP minidump request failed');
    } finally {
      setIsBusy(false);
    }
  };

  const handleRunXbdmCommand = async (cmdOverride?: string) => {
    const cmdToSend = (cmdOverride ?? xbdmCmd).trim();
    if (!cmdToSend) return;
    setIsBusy(true);
    setStatusError(null);
    try {
      const res = await fetch('/api/xbox/peekpoke/xbdm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: config.ip,
          port: Number(xbdmPort) || 730,
          action: 'cmd',
          command: cmdToSend,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setStatusError(data.error || 'XBDM command failed');
        if (data.rawResponse) setXbdmConsoleOut(data.rawResponse);
      } else {
        setXbdmConsoleOut(`Banner: ${data.banner}\n> ${data.command}\n${data.rawResponse}`);
      }
    } catch (err: any) {
      setStatusError(err?.message || 'XBDM command error');
    } finally {
      setIsBusy(false);
    }
  };

  const handleScan = async (nextOnly: boolean) => {
    setStatusError(null);
    setStatusOk(null);
    const enc = encodeValueToHex(scanKind, scanValue, endian);
    if (enc.error || !enc.hex) {
      setStatusError(enc.error || 'Invalid scan pattern');
      return;
    }
    const needle = hexToBytes(enc.hex);

    if (targetMode === 'scratch') {
      const hits: ScanHit[] = [];
      if (nextOnly && hasFirstScan) {
        for (const prev of scanHits) {
          if (prev.offset + needle.length <= scratchBuffer.length) {
            let match = true;
            for (let j = 0; j < needle.length; j++) {
              if (scratchBuffer[prev.offset + j] !== needle[j]) {
                match = false;
                break;
              }
            }
            if (match) {
              hits.push({
                offset: prev.offset,
                offsetHex: prev.offsetHex,
                contextHex: bytesToHex(scratchBuffer.subarray(prev.offset, Math.min(scratchBuffer.length, prev.offset + 16))),
              });
            }
          }
        }
      } else {
        for (let i = 0; i <= scratchBuffer.length - needle.length; i++) {
          let match = true;
          for (let j = 0; j < needle.length; j++) {
            if (scratchBuffer[i + j] !== needle[j]) {
              match = false;
              break;
            }
          }
          if (match) {
            hits.push({
              offset: i,
              offsetHex: '0x' + i.toString(16).toUpperCase().padStart(8, '0'),
              contextHex: bytesToHex(scratchBuffer.subarray(i, Math.min(scratchBuffer.length, i + 16))),
            });
          }
        }
      }
      setScanHits(hits);
      setHasFirstScan(true);
      setStatusOk(`Scan matched ${hits.length} offset(s) for ${enc.hex} in Scratch Buffer.`);
      return;
    }

    if (targetMode === 'xbdm') {
      // Scan currently peeked XBDM window
      const hits: ScanHit[] = [];
      for (let i = 0; i <= bytes.length - needle.length; i++) {
        let match = true;
        for (let j = 0; j < needle.length; j++) {
          if (bytes[i + j] !== needle[j]) {
            match = false;
            break;
          }
        }
        if (match) {
          const abs = baseAddressNum + i;
          hits.push({
            offset: abs,
            offsetHex: '0x' + abs.toString(16).toUpperCase().padStart(8, '0'),
            contextHex: bytesToHex(bytes.subarray(i, Math.min(bytes.length, i + 16))),
          });
        }
      }
      setScanHits(hits);
      setHasFirstScan(true);
      setStatusOk(`Scanned active XBDM window (${bytes.length} bytes): ${hits.length} match(es).`);
      return;
    }

    // Real file scan via backend
    setIsBusy(true);
    try {
      const res = await fetch('/api/xbox/peekpoke/file-peek', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: filePathInput.trim(),
          scanType: scanKind,
          scanValue,
          endian,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setStatusError(data.error || 'File scan failed');
      } else {
        const allHits: ScanHit[] = Array.isArray(data.hits) ? data.hits : [];
        if (nextOnly && hasFirstScan) {
          const prevSet = new Set(scanHits.map((h) => h.offset));
          const narrowed = allHits.filter((h) => prevSet.has(h.offset));
          setScanHits(narrowed);
          setStatusOk(`Next Scan narrowed to ${narrowed.length} match(es) (from ${allHits.length} total).`);
        } else {
          setScanHits(allHits);
          setHasFirstScan(true);
          setStatusOk(
            `Scanned ${(data.scannedBytes / 1024).toFixed(1)} KB for ${data.needleHex}: ${allHits.length} match(es).`
          );
        }
      }
    } catch (err: any) {
      setStatusError(err?.message || 'Scan request failed');
    } finally {
      setIsBusy(false);
    }
  };

  const handleAddToWatchlist = () => {
    const absAddr = '0x' + (baseAddressNum + selectedByteRel).toString(16).toUpperCase().padStart(8, '0');
    const decodedStr =
      pokeKind === 'f32'
        ? String(inspector?.f32 ?? '?')
        : pokeKind === 'u32'
          ? String(inspector?.u32 ?? '?')
          : pokeKind === 'u16'
            ? String(inspector?.u16 ?? '?')
            : pokeKind === 'u8'
              ? String(inspector?.u8 ?? '?')
              : inspector?.rawHex8 || '';
    const entry: WatchEntry = {
      id: `watch-${Date.now()}`,
      label: watchLabel.trim() || `${pokeKind.toUpperCase()} @ ${absAddr}`,
      mode: targetMode,
      target: targetMode === 'xbdm' ? `${config.ip}:${xbdmPort}` : targetMode === 'scratch' ? 'ScratchBuffer' : filePathInput,
      address: absAddr,
      kind: pokeKind,
      endian,
      lastHex: inspector?.rawHex8 || '',
      decoded: decodedStr,
      updatedAt: new Date().toLocaleTimeString(),
    };
    setWatchlist((prev) => [entry, ...prev]);
    setWatchLabel('');
    setStatusOk(`Added ${entry.label} to Watchlist.`);
  };

  const handleExportWatchlist = () => {
    const blob = new Blob([JSON.stringify(watchlist, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xbxowned_peekpoke_watchlist.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Group bytes into 16-byte rows
  const hexRows = useMemo(() => {
    const rows: Array<{ rowAddr: number; rowBytes: number[] }> = [];
    for (let i = 0; i < bytes.length; i += 16) {
      const rowBytes: number[] = [];
      for (let j = 0; j < 16 && i + j < bytes.length; j++) {
        rowBytes.push(bytes[i + j]);
      }
      rows.push({ rowAddr: baseAddressNum + i, rowBytes });
    }
    return rows;
  }, [bytes, baseAddressNum]);

  return (
    <div className="space-y-5">
      {/* Top Mode & Target Bar */}
      <div className="bg-[#0d1117] border border-[#1b2332] rounded-xl p-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Binary className="w-5 h-5 text-blue-400" />
              <span>Memory & Binary Peek / Poke</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Read (Peek), patch (Poke), and scan bytes on local crash dumps / `.bin` / SMB-mounted Xbox files, live XBDM (`:730`), or WDP minidumps (`:11443`).
            </p>
          </div>

          {/* Honest Mode Selector */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#07090e] p-1 rounded-lg border border-[#1b2332]">
            {[
              { id: 'scratch' as const, label: 'Browser Scratch (512B)', icon: Cpu },
              { id: 'file' as const, label: 'Host File / .dmp / SMB', icon: HardDrive },
              { id: 'xbdm' as const, label: 'Live XBDM (:730)', icon: Wifi },
              { id: 'wdp' as const, label: 'WDP Live Dump (:11443)', icon: Shield },
            ].map((m) => {
              const Icon = m.icon;
              const active = targetMode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    setTargetMode(m.id);
                    setStatusError(null);
                    setStatusOk(null);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    active ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Target Input Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-end">
          {(targetMode === 'file' || targetMode === 'wdp') && (
            <div className="lg:col-span-5">
              <label className="block text-[11px] font-mono text-slate-400 mb-1">
                {targetMode === 'wdp' ? 'Saved Dump / Target Binary Path (on Kali host)' : 'Local File / .dmp / Mounted Xbox Share Path'}
              </label>
              <input
                type="text"
                value={filePathInput}
                onChange={(e) => setFilePathInput(e.target.value)}
                placeholder="/tmp/xbox_title.dmp or /mnt/xbox_dev/Game.exe"
                className="w-full bg-[#07090e] border border-[#232d40] rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          {targetMode === 'wdp' && (
            <div className="lg:col-span-3 flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Process PID</label>
                <select
                  value={wdpPid}
                  onChange={(e) => setWdpPid(Number(e.target.value))}
                  className="w-full bg-[#07090e] border border-[#232d40] rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                >
                  {processes.map((p) => (
                    <option key={p.pid} value={p.pid}>
                      {p.pid} — {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handlePullWdpDump}
                disabled={isBusy}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                title="GET /api/debug/dump/usermode/live?pid=... over :11443"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Pull .dmp</span>
              </button>
            </div>
          )}

          {targetMode === 'xbdm' && (
            <div className="lg:col-span-4 flex gap-2">
              <div className="flex-1">
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Console IP</label>
                <input
                  type="text"
                  value={config.ip}
                  readOnly
                  className="w-full bg-[#07090e] border border-[#232d40] rounded-lg px-3 py-1.5 text-xs font-mono text-slate-300"
                />
              </div>
              <div className="w-24">
                <label className="block text-[11px] font-mono text-slate-400 mb-1">XBDM Port</label>
                <input
                  type="text"
                  value={xbdmPort}
                  onChange={(e) => setXbdmPort(e.target.value)}
                  className="w-full bg-[#07090e] border border-[#232d40] rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {targetMode === 'scratch' && (
            <div className="lg:col-span-4 flex items-center justify-between bg-[#07090e] border border-[#1f293a] rounded-lg px-3 py-2 text-xs">
              <span className="text-slate-300 font-mono">In-browser 512B buffer (safe sandbox)</span>
              <button
                onClick={() => {
                  setScratchBuffer(createInitialScratchBuffer());
                  setLastModifiedRange(null);
                  setStatusOk('Reset 512B scratch buffer.');
                }}
                className="text-blue-400 hover:text-blue-300 font-semibold"
              >
                Reset
              </button>
            </div>
          )}

          {/* Address / Offset + Length + Endian + Peek */}
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-mono text-slate-400 mb-1">Address / Offset</label>
            <input
              type="text"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              placeholder="0x00000000"
              className="w-full bg-[#07090e] border border-[#232d40] rounded-lg px-3 py-1.5 text-xs font-mono text-blue-300 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="lg:col-span-2 flex gap-2">
            <div className="flex-1">
              <label className="block text-[11px] font-mono text-slate-400 mb-1">Bytes</label>
              <select
                value={peekLength}
                onChange={(e) => setPeekLength(Number(e.target.value))}
                className="w-full bg-[#07090e] border border-[#232d40] rounded-lg px-2 py-1.5 text-xs font-mono text-white"
              >
                <option value={64}>64</option>
                <option value={128}>128</option>
                <option value={256}>256</option>
                <option value={512}>512</option>
                <option value={1024}>1024</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">Endian</label>
              <button
                onClick={() => setEndian((e) => (e === 'le' ? 'be' : 'le'))}
                className="px-2.5 py-1.5 rounded-lg bg-[#07090e] border border-[#232d40] text-xs font-mono text-amber-300 hover:border-blue-500"
                title="Toggle Little-Endian (x86-64 Series X/One) vs Big-Endian (PowerPC 360)"
              >
                {endian.toUpperCase()}
              </button>
            </div>
          </div>

          <div className="lg:col-span-3 flex items-center gap-1.5">
            <button
              onClick={() => {
                const next = Math.max(0, baseAddressNum - peekLength);
                handlePeek('0x' + next.toString(16).toUpperCase().padStart(8, '0'));
              }}
              className="px-2.5 py-1.5 rounded-lg bg-[#141a25] border border-[#232d40] text-xs font-mono text-slate-300 hover:text-white"
            >
              Prev
            </button>
            <button
              onClick={() => handlePeek()}
              disabled={isBusy}
              className="flex-1 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(37,99,235,0.4)] disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isBusy ? 'animate-spin' : ''}`} />
              <span>Peek</span>
            </button>
            <button
              onClick={() => {
                const next = baseAddressNum + peekLength;
                handlePeek('0x' + next.toString(16).toUpperCase().padStart(8, '0'));
              }}
              className="px-2.5 py-1.5 rounded-lg bg-[#141a25] border border-[#232d40] text-xs font-mono text-slate-300 hover:text-white"
            >
              Next
            </button>
          </div>
        </div>

        {/* Honest Hardware Notice */}
        {targetMode === 'xbdm' && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-950/25 border border-amber-700/40 text-xs text-amber-200/90">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              <strong>Note:</strong> TCP port <code className="font-mono">:730</code> is the XBDM protocol (Xbox 360 / XDK debug monitor). Xbox Series X|S &amp; Xbox One Dev Mode expose WDP <code className="font-mono">:11443</code> (Minidump / WinDbg / VS remote debugger) rather than XBDM <code className="font-mono">:730</code>. Use <strong>WDP Live Dump</strong> or <strong>Host File / .dmp</strong> for Series X|S titles.
            </span>
          </div>
        )}

        {statusError && (
          <div className="px-3 py-2 rounded-lg bg-rose-950/40 border border-rose-700/60 text-xs font-mono text-rose-300">
            {statusError}
          </div>
        )}
        {statusOk && (
          <div className="px-3 py-2 rounded-lg bg-emerald-950/30 border border-emerald-700/50 text-xs font-mono text-emerald-300">
            {statusOk}
          </div>
        )}
      </div>

      {/* Main Split Workspace: Hex View (Left) + Inspector / Poke / Scanner (Right) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Hex + ASCII Dump Grid */}
        <div className="xl:col-span-7 bg-[#07090e] border border-[#1b2332] rounded-xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#0b0f17] border-b border-[#1b2332] text-xs font-mono">
            <div className="flex items-center gap-2 text-slate-300">
              <span className="text-blue-400 font-bold">HEX VIEW</span>
              <span className="text-slate-600">·</span>
              <span>Base: 0x{baseAddressNum.toString(16).toUpperCase().padStart(8, '0')}</span>
              {fileSize > 0 && targetMode !== 'xbdm' && (
                <>
                  <span className="text-slate-600">·</span>
                  <span className="text-slate-400">Size: {fileSize.toLocaleString()} B</span>
                </>
              )}
            </div>
            <div className="text-[11px] text-slate-400">
              Cursor: <span className="text-amber-300 font-bold">{inspector?.absAddr || '—'}</span>
            </div>
          </div>

          <div className="p-3 overflow-x-auto font-mono text-xs leading-6 select-text max-h-[460px] overflow-y-auto">
            {hexRows.length === 0 ? (
              <div className="py-16 text-center text-slate-500">
                Click <strong>Peek</strong> to inspect bytes at the selected address/offset.
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="text-[10px] text-slate-500 border-b border-[#161e2e]">
                    <th className="text-left pr-3 pb-1">Address</th>
                    <th className="text-left pr-3 pb-1">
                      00 01 02 03 04 05 06 07 &nbsp;08 09 0A 0B 0C 0D 0E 0F
                    </th>
                    <th className="text-left pb-1">ASCII</th>
                  </tr>
                </thead>
                <tbody>
                  {hexRows.map((row, rIdx) => {
                    const rowRelStart = rIdx * 16;
                    return (
                      <tr key={row.rowAddr} className="hover:bg-[#0e1420]/70">
                        <td className="pr-3 text-slate-500 whitespace-nowrap">
                          0x{row.rowAddr.toString(16).toUpperCase().padStart(8, '0')}
                        </td>
                        <td className="pr-3 whitespace-nowrap">
                          {row.rowBytes.map((b, cIdx) => {
                            const rel = rowRelStart + cIdx;
                            const isSelected = rel === selectedByteRel;
                            const isModified =
                              lastModifiedRange &&
                              rel >= lastModifiedRange.start &&
                              rel < lastModifiedRange.end;
                            return (
                              <React.Fragment key={cIdx}>
                                {cIdx === 8 && <span className="inline-block w-2" />}
                                <button
                                  type="button"
                                  onClick={() => setSelectedByteRel(rel)}
                                  className={`px-0.5 rounded transition-colors ${
                                    isSelected
                                      ? 'bg-blue-600 text-white font-bold'
                                      : isModified
                                        ? 'bg-emerald-900/70 text-emerald-300 font-bold'
                                        : b === 0
                                          ? 'text-slate-600 hover:bg-[#192338]'
                                          : 'text-slate-200 hover:bg-[#192338]'
                                  }`}
                                >
                                  {b.toString(16).padStart(2, '0').toUpperCase()}
                                </button>
                                <span className="inline-block w-1" />
                              </React.Fragment>
                            );
                          })}
                        </td>
                        <td className="text-emerald-300/90 whitespace-nowrap">
                          {row.rowBytes.map((b, cIdx) => {
                            const rel = rowRelStart + cIdx;
                            const isSelected = rel === selectedByteRel;
                            const ch = b >= 32 && b <= 126 ? String.fromCharCode(b) : '.';
                            return (
                              <span
                                key={cIdx}
                                onClick={() => setSelectedByteRel(rel)}
                                className={`cursor-pointer ${
                                  isSelected
                                    ? 'bg-blue-600 text-white font-bold'
                                    : b >= 32 && b <= 126
                                      ? 'text-emerald-300'
                                      : 'text-slate-600'
                                }`}
                              >
                                {ch}
                              </span>
                            );
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Column: Live Data Inspector + Poke Control + Quick XBDM */}
        <div className="xl:col-span-5 space-y-4">
          {/* Data Inspector */}
          <div className="bg-[#0d1117] border border-[#1b2332] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Data Inspector @ {inspector?.absAddr || '0x00000000'} ({endian.toUpperCase()})
              </h3>
              {inspector && (
                <button
                  onClick={() => copyText(inspector.absAddr, 'addr')}
                  className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-white"
                >
                  {copiedId === 'addr' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Copy Addr</span>
                </button>
              )}
            </div>

            {inspector ? (
              <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                {[
                  ['uint8 / int8', `${inspector.u8} / ${inspector.i8}`],
                  ['uint16 / int16', inspector.u16 !== null ? `${inspector.u16} / ${inspector.i16}` : '—'],
                  ['uint32 / int32', inspector.u32 !== null ? `${inspector.u32} / ${inspector.i32}` : '—'],
                  ['float32', inspector.f32 !== null ? `${inspector.f32}` : '—'],
                  ['uint64', inspector.u64 ?? '—'],
                  ['ptr32', inspector.ptr32 ?? '—'],
                ].map(([label, val]) => (
                  <div key={label} className="bg-[#07090e] border border-[#192131] rounded-lg px-2.5 py-1.5">
                    <div className="text-[10px] text-slate-500">{label}</div>
                    <div className="text-slate-200 truncate" title={String(val)}>{val}</div>
                  </div>
                ))}
                <div className="col-span-2 bg-[#07090e] border border-[#192131] rounded-lg px-2.5 py-1.5">
                  <div className="text-[10px] text-slate-500">ASCII Preview (16B)</div>
                  <div className="text-emerald-300 truncate">{inspector.asciiPreview}</div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500">Select any byte in the Hex View to decode values.</div>
            )}
          </div>

          {/* Poke Write Panel */}
          <div className="bg-[#0d1117] border border-[#1b2332] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-300">
                Poke Memory / File @ {inspector?.absAddr || addressInput}
              </h3>
              <button
                onClick={handleUndoLastPoke}
                disabled={undoStack.length === 0 || isBusy}
                className="flex items-center gap-1 text-[11px] font-semibold text-slate-300 hover:text-white disabled:opacity-40"
                title="Restore previous bytes from most recent Poke"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Undo ({undoStack.length})</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <select
                value={pokeKind}
                onChange={(e) => setPokeKind(e.target.value as DataKind)}
                className="bg-[#07090e] border border-[#232d40] rounded-lg px-2.5 py-1.5 text-xs font-mono text-white"
              >
                <option value="hex">Hex Bytes</option>
                <option value="u8">uint8</option>
                <option value="u16">uint16</option>
                <option value="u32">uint32</option>
                <option value="u64">uint64</option>
                <option value="f32">float32</option>
                <option value="ascii">ASCII</option>
                <option value="utf16le">UTF-16LE</option>
              </select>
              <input
                type="text"
                value={pokeValue}
                onChange={(e) => setPokeValue(e.target.value)}
                placeholder={pokeKind === 'hex' ? 'DE AD BE EF' : 'Value...'}
                className="col-span-2 bg-[#07090e] border border-[#232d40] rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono bg-[#07090e] border border-[#192131] rounded-lg px-3 py-1.5">
              <span className="text-slate-500">Wire Bytes ({endian.toUpperCase()}):</span>
              <span className={encodedPokePreview.error ? 'text-rose-400' : 'text-amber-300'}>
                {encodedPokePreview.error || encodedPokePreview.hex}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              {(targetMode === 'file' || targetMode === 'wdp') ? (
                <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createBackup}
                    onChange={(e) => setCreateBackup(e.target.checked)}
                    className="rounded bg-[#07090e] border-slate-700"
                  />
                  <span>Create <code className="font-mono">.bak</code> before write</span>
                </label>
              ) : (
                <span className="text-[11px] text-slate-500 font-mono">
                  {targetMode === 'xbdm' ? 'Sends XBDM setmem' : 'Patches local 512B buffer'}
                </span>
              )}

              <button
                onClick={handlePoke}
                disabled={isBusy || Boolean(encodedPokePreview.error)}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-40"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Poke Write</span>
              </button>
            </div>
          </div>

          {/* Add to Watchlist quick bar */}
          <div className="bg-[#0d1117] border border-[#1b2332] rounded-xl p-3 flex items-center gap-2">
            <input
              type="text"
              value={watchLabel}
              onChange={(e) => setWatchLabel(e.target.value)}
              placeholder="Bookmark/Watch label (e.g. PlayerHealth, ModeFlag)..."
              className="flex-1 bg-[#07090e] border border-[#232d40] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleAddToWatchlist}
              className="px-3 py-1.5 rounded-lg bg-[#141a25] border border-[#232d40] hover:border-blue-500 text-xs font-semibold text-blue-300 flex items-center gap-1.5 shrink-0"
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Watch</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Pattern / Value Scanner + Watchlist + XBDM Command Console */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pattern & Value Scanner */}
        <div className="bg-[#0d1117] border border-[#1b2332] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <Search className="w-4 h-4 text-blue-400" />
              <span>Value &amp; Byte Pattern Scanner</span>
            </h3>
            {hasFirstScan && (
              <button
                onClick={() => {
                  setScanHits([]);
                  setHasFirstScan(false);
                }}
                className="text-[11px] text-slate-400 hover:text-white"
              >
                Reset Scan
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={scanKind}
              onChange={(e) => setScanKind(e.target.value as DataKind)}
              className="bg-[#07090e] border border-[#232d40] rounded-lg px-2.5 py-1.5 text-xs font-mono text-white"
            >
              <option value="ascii">ASCII</option>
              <option value="utf16le">UTF-16LE</option>
              <option value="hex">Hex Bytes</option>
              <option value="u8">uint8</option>
              <option value="u16">uint16</option>
              <option value="u32">uint32</option>
              <option value="u64">uint64</option>
              <option value="f32">float32</option>
            </select>
            <input
              type="text"
              value={scanValue}
              onChange={(e) => setScanValue(e.target.value)}
              placeholder="Pattern or number..."
              className="flex-1 min-w-[140px] bg-[#07090e] border border-[#232d40] rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={() => handleScan(false)}
              disabled={isBusy}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
            >
              First Scan
            </button>
            {hasFirstScan && (
              <button
                onClick={() => handleScan(true)}
                disabled={isBusy}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold"
              >
                Next Scan
              </button>
            )}
          </div>

          <div className="bg-[#07090e] border border-[#192131] rounded-lg max-h-52 overflow-y-auto divide-y divide-[#131926] font-mono text-xs">
            {scanHits.length === 0 ? (
              <div className="p-4 text-center text-slate-500">
                {hasFirstScan ? '0 matching offsets.' : 'Run First Scan to find offsets inside file/dump or buffer.'}
              </div>
            ) : (
              scanHits.map((h) => (
                <div key={h.offset} className="flex items-center justify-between px-3 py-1.5 hover:bg-[#101624]">
                  <div>
                    <span className="text-blue-400 font-bold">{h.offsetHex}</span>
                    <span className="text-slate-500 ml-3">{h.contextHex.slice(0, 24)}</span>
                  </div>
                  <button
                    onClick={() => handlePeek(h.offsetHex)}
                    className="px-2 py-0.5 rounded bg-blue-950/70 border border-blue-700/50 text-blue-300 hover:bg-blue-600 hover:text-white text-[11px]"
                  >
                    Peek
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Saved Watchlist (or XBDM Command Console when XBDM selected) */}
        <div className="bg-[#0d1117] border border-[#1b2332] rounded-xl p-4 space-y-3">
          {targetMode === 'xbdm' ? (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span>XBDM Raw Console (:{xbdmPort})</span>
                </h3>
                <div className="flex gap-1">
                  {['dbgname', 'modules', 'threads', 'walkmem'].map((cmd) => (
                    <button
                      key={cmd}
                      onClick={() => {
                        setXbdmCmd(cmd);
                        handleRunXbdmCommand(cmd);
                      }}
                      className="px-2 py-0.5 rounded bg-[#141a25] border border-[#232d40] text-[11px] font-mono text-slate-300 hover:text-white"
                    >
                      {cmd}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={xbdmCmd}
                  onChange={(e) => setXbdmCmd(e.target.value)}
                  placeholder="XBDM command (e.g. modules, walkmem, xbeinfo running)..."
                  className="flex-1 bg-[#07090e] border border-[#232d40] rounded-lg px-3 py-1.5 text-xs font-mono text-white"
                />
                <button
                  onClick={() => handleRunXbdmCommand()}
                  disabled={isBusy}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </div>
              <pre className="bg-[#07090e] border border-[#192131] rounded-lg p-3 font-mono text-[11px] text-slate-300 h-44 overflow-auto whitespace-pre-wrap">
                {xbdmConsoleOut || '// XBDM response output will appear here.'}
              </pre>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                  <Bookmark className="w-4 h-4 text-amber-400" />
                  <span>Pinned Addresses &amp; Watchlist ({watchlist.length})</span>
                </h3>
                {watchlist.length > 0 && (
                  <button
                    onClick={handleExportWatchlist}
                    className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 font-semibold"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export JSON</span>
                  </button>
                )}
              </div>

              <div className="bg-[#07090e] border border-[#192131] rounded-lg max-h-56 overflow-y-auto divide-y divide-[#131926] text-xs">
                {watchlist.length === 0 ? (
                  <div className="p-6 text-center text-slate-500">
                    No pinned addresses yet. Select any byte and click <strong>Watch</strong> to save offsets.
                  </div>
                ) : (
                  watchlist.map((w) => (
                    <div key={w.id} className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-[#101624]">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-200 truncate">{w.label}</div>
                        <div className="font-mono text-[11px] text-slate-400 truncate">
                          {w.address} · {w.kind} ({w.endian}) · val={w.decoded}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            setTargetMode(w.mode);
                            if (w.mode === 'file' || w.mode === 'wdp') setFilePathInput(w.target);
                            setPokeKind(w.kind);
                            handlePeek(w.address);
                          }}
                          className="px-2 py-0.5 rounded bg-blue-950/70 border border-blue-700/50 text-blue-300 hover:bg-blue-600 hover:text-white text-[11px] font-mono"
                        >
                          Peek
                        </button>
                        <button
                          onClick={() => setWatchlist((prev) => prev.filter((item) => item.id !== w.id))}
                          className="p-1 text-slate-500 hover:text-rose-400"
                          title="Remove from watchlist"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
