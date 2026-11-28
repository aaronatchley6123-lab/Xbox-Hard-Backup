import React, { useState, useEffect, useRef } from 'react';
import {
  Cable,
  Play,
  Square,
  RefreshCw,
  AlertTriangle,
  Copy,
  Check,
  Cpu,
  Terminal,
  Usb,
  CircuitBoard,
  Layers,
  Zap,
  Upload,
  HardDrive,
} from 'lucide-react';
import { UartLiveMonitor, SerialRxEntry } from './UartLiveMonitor';
import { WiringPinoutGuide } from './WiringPinoutGuide';

interface SerialDebugTabProps {
  onLog?: (msg: string, level?: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG') => void;
}

interface HostSerialPort {
  device: string;
  label: string;
  kind: string;
  isOpen: boolean;
}

interface UsbAdapterInfo {
  vid: string;
  pid: string;
  product: string;
  role: string;
}

interface InstalledToolsMap {
  openocd?: boolean;
  flashrom?: boolean;
  i2cdetect?: boolean;
  picotool?: boolean;
  picocom?: boolean;
  armGcc?: boolean;
  cmake?: boolean;
}

interface BootselMountInfo {
  path: string;
  infoUf2: string;
}

interface Uf2Metadata {
  valid: boolean;
  blockCount: number;
  payloadBytes: number;
  targetAddrHex: string;
  familyIdHex: string | null;
  isRp2040: boolean;
  error?: string;
}

const BAUD_RATES = [9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600, 1500000, 3000000];

const UDEV_RULES = `# Waveshare CH347 (Mode 0/1/2/3: UART/SPI/I2C/JTAG) & Mini2040 RP2040 / Pico
SUBSYSTEM=="usb", ATTR{idVendor}=="1a86", ATTR{idProduct}=="55db", MODE="0666", GROUP="plugdev"
SUBSYSTEM=="usb", ATTR{idVendor}=="1a86", ATTR{idProduct}=="55dc", MODE="0666", GROUP="plugdev"
SUBSYSTEM=="usb", ATTR{idVendor}=="1a86", ATTR{idProduct}=="55dd", MODE="0666", GROUP="plugdev"
SUBSYSTEM=="usb", ATTR{idVendor}=="1a86", ATTR{idProduct}=="55de", MODE="0666", GROUP="plugdev"
SUBSYSTEM=="hidraw", ATTRS{idVendor}=="1a86", MODE="0666", GROUP="plugdev"
SUBSYSTEM=="usb", ATTR{idVendor}=="2e8a", MODE="0666", GROUP="plugdev"`;

function bytesToAsciiAndHex(u8: Uint8Array): { ascii: string; hex: string } {
  let ascii = '';
  let hex = '';
  for (let i = 0; i < u8.length; i++) {
    const b = u8[i];
    ascii += String.fromCharCode(b);
    hex += b.toString(16).padStart(2, '0').toUpperCase();
  }
  return { ascii, hex };
}

function parseUf2Metadata(u8: Uint8Array): Uf2Metadata {
  if (u8.length < 512 || u8.length % 512 !== 0) {
    return {
      valid: false,
      blockCount: 0,
      payloadBytes: 0,
      targetAddrHex: '0x00000000',
      familyIdHex: null,
      isRp2040: false,
      error: `Invalid length (${u8.length} bytes; UF2 must be a multiple of 512 bytes)`,
    };
  }
  const view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const blocks = u8.length / 512;
  let totalPayload = 0;
  let firstAddr = 0;
  let familyIdHex: string | null = null;
  let isRp2040 = false;

  for (let i = 0; i < blocks; i++) {
    const off = i * 512;
    const m0 = view.getUint32(off, true);
    const m1 = view.getUint32(off + 4, true);
    const flags = view.getUint32(off + 8, true);
    const targetAddr = view.getUint32(off + 12, true);
    const payloadSize = view.getUint32(off + 16, true);
    const fam = view.getUint32(off + 28, true);
    const mEnd = view.getUint32(off + 508, true);
    if (m0 !== 0x0a324655 || m1 !== 0x9e5d5157 || mEnd !== 0x0ab16f30) {
      return {
        valid: false,
        blockCount: blocks,
        payloadBytes: 0,
        targetAddrHex: '0x00000000',
        familyIdHex: null,
        isRp2040: false,
        error: `UF2 magic mismatch at block ${i}`,
      };
    }
    if (i === 0) {
      firstAddr = targetAddr;
      if ((flags & 0x00002000) !== 0) {
        familyIdHex = `0x${fam.toString(16).toUpperCase().padStart(8, '0')}`;
        isRp2040 = fam === 0xe48bff56;
      }
    }
    totalPayload += Math.min(476, payloadSize);
  }

  return {
    valid: true,
    blockCount: blocks,
    payloadBytes: totalPayload,
    targetAddrHex: `0x${firstAddr.toString(16).toUpperCase().padStart(8, '0')}`,
    familyIdHex,
    isRp2040,
  };
}

export const SerialDebugTab: React.FC<SerialDebugTabProps> = ({ onLog }) => {
  const [subPanel, setSubPanel] = useState<'uart' | 'ch347' | 'mini2040' | 'safety'>('uart');
  const [transport, setTransport] = useState<'host' | 'webserial'>('host');
  const [hostPorts, setHostPorts] = useState<HostSerialPort[]>([]);
  const [usbAdapters, setUsbAdapters] = useState<UsbAdapterInfo[]>([]);
  const [i2cBuses, setI2cBuses] = useState<string[]>([]);
  const [bootselMounts, setBootselMounts] = useState<BootselMountInfo[]>([]);
  const [installedTools, setInstalledTools] = useState<InstalledToolsMap>({});
  const [selectedDevice, setSelectedDevice] = useState<string>('/dev/ttyACM0');
  const [baudRate, setBaudRate] = useState<number>(115200);
  const [dataBits, setDataBits] = useState<7 | 8>(8);
  const [parity, setParity] = useState<'none' | 'even' | 'odd'>('none');
  const [stopBits, setStopBits] = useState<1 | 2>(1);

  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [streamState, setStreamState] = useState<'sse-live' | 'webserial-live' | 'disconnected' | 'error'>('disconnected');
  const [runningInCloud, setRunningInCloud] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // CH347 / Mini2040 Hardware Tool Runner state
  const [jtagKhz, setJtagKhz] = useState<number>(1000);
  const [i2cBusInput, setI2cBusInput] = useState<string>('0');
  const [hwToolBusy, setHwToolBusy] = useState<boolean>(false);
  const [hwToolOutput, setHwToolOutput] = useState<string>('');
  const [hwToolCommand, setHwToolCommand] = useState<string>('');
  const [hwDumpPath, setHwDumpPath] = useState<string | null>(null);

  // Pico 2040 / Mini2040 Firmware Flasher state
  const [fwFileName, setFwFileName] = useState<string>('');
  const [fwBase64, setFwBase64] = useState<string>('');
  const [fwFileBytesLen, setFwFileBytesLen] = useState<number>(0);
  const [fwLocalPath, setFwLocalPath] = useState<string>('');
  const [fwUf2Meta, setFwUf2Meta] = useState<Uf2Metadata | null>(null);
  const [fwMethod, setFwMethod] = useState<'auto' | 'picotool' | 'bootsel-mount' | 'openocd-swd'>('auto');
  const [fwVerify, setFwVerify] = useState<boolean>(true);
  const [fwResetAfter, setFwResetAfter] = useState<boolean>(true);
  const [fwFlashing, setFwFlashing] = useState<boolean>(false);
  const [fwFlashResult, setFwFlashResult] = useState<{
    ok: boolean;
    command?: string;
    output?: string;
    error?: string | null;
  } | null>(null);

  // Stream & UI state
  const [entries, setEntries] = useState<SerialRxEntry[]>([]);
  const [totalRxBytes, setTotalRxBytes] = useState<number>(0);
  const [totalTxBytes, setTotalTxBytes] = useState<number>(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const lastSeqRef = useRef<number>(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const webSerialPortRef = useRef<any>(null);
  const webSerialReaderRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  const webSerialSupported = typeof navigator !== 'undefined' && 'serial' in navigator;

  const pushEntry = (direction: SerialRxEntry['direction'], ascii: string, hex: string, byteCount: number, ts?: string) => {
    const entryTs = ts || new Date().toISOString().split('T')[1].slice(0, 12);
    setEntries((prev) => [
      ...prev.slice(-1200),
      {
        id: `ser-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ts: entryTs,
        direction,
        ascii,
        hex,
        byteCount,
      },
    ]);
  };

  const handleScanHostPorts = async () => {
    setErrorMsg(null);
    try {
      const res = await fetch('/api/xbox/serial/ports');
      const data = await res.json();
      setRunningInCloud(Boolean(data.runningInCloud));
      const list: HostSerialPort[] = Array.isArray(data.ports) ? data.ports : [];
      setHostPorts(list);
      setUsbAdapters(Array.isArray(data.usbAdapters) ? data.usbAdapters : []);
      setI2cBuses(Array.isArray(data.i2cBuses) ? data.i2cBuses : []);
      setBootselMounts(Array.isArray(data.bootselMounts) ? data.bootselMounts : []);
      setInstalledTools(data.installedTools || {});
      if (list.length > 0 && !list.some((p) => p.device === selectedDevice)) {
        setSelectedDevice(list[0].device);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to enumerate host serial & USB hardware');
    }
  };

  useEffect(() => {
    handleScanHostPorts();
  }, []);

  // Real-time Server-Sent Events (SSE) push listener when Host /dev/tty* Bridge is active
  useEffect(() => {
    if (!isConnected || transport !== 'host') {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    const url = `/api/xbox/serial/stream?device=${encodeURIComponent(selectedDevice)}&sinceSeq=${lastSeqRef.current}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.addEventListener('status', (ev: MessageEvent) => {
      try {
        const st = JSON.parse(ev.data);
        if (st.isOpen) {
          setStreamState('sse-live');
        } else {
          setIsConnected(false);
          setStreamState(st.error ? 'error' : 'disconnected');
          if (st.error) setErrorMsg(st.error);
          es.close();
        }
      } catch {
        // ignore parse error
      }
    });

    es.addEventListener('chunk', (ev: MessageEvent) => {
      try {
        const ch = JSON.parse(ev.data);
        if (typeof ch.seq === 'number') {
          lastSeqRef.current = Math.max(lastSeqRef.current, ch.seq);
        }
        setTotalRxBytes((n) => n + (ch.byteCount || 0));
        pushEntry('RX', ch.ascii || '', ch.hex || '', ch.byteCount || 0, ch.ts);
      } catch {
        // ignore chunk parse error
      }
    });

    es.onerror = () => {
      setStreamState('error');
    };

    return () => {
      es.close();
      if (eventSourceRef.current === es) {
        eventSourceRef.current = null;
      }
    };
  }, [isConnected, transport, selectedDevice]);

  const handleConnect = async () => {
    setErrorMsg(null);
    setIsConnecting(true);
    try {
      if (transport === 'webserial') {
        if (!webSerialSupported) {
          setErrorMsg('Browser Web Serial API is unavailable in this browser/iframe. Use Kali /dev/tty* Bridge.');
          return;
        }
        try {
          const serialObj = (navigator as any).serial;
          const port = await serialObj.requestPort();
          await port.open({ baudRate, dataBits, parity, stopBits });
          webSerialPortRef.current = port;
          setIsConnected(true);
          setStreamState('webserial-live');
          pushEntry('SYS', `Started Web Serial monitor @ ${baudRate} ${dataBits}${parity[0].toUpperCase()}${stopBits}`, '', 0);
          onLog?.(`Opened Browser Web Serial @ ${baudRate}`, 'INFO');

          const reader = port.readable?.getReader();
          if (reader) {
            webSerialReaderRef.current = reader;
            (async () => {
              try {
                while (true) {
                  const { value, done } = await reader.read();
                  if (done) break;
                  if (value && value.length > 0) {
                    const { ascii, hex } = bytesToAsciiAndHex(value);
                    setTotalRxBytes((n) => n + value.length);
                    pushEntry('RX', ascii, hex, value.length);
                  }
                }
              } catch (err: any) {
                setErrorMsg(err?.message || 'Web Serial read error');
                setStreamState('error');
              } finally {
                setIsConnected(false);
                setStreamState('disconnected');
              }
            })();
          }
        } catch (err: any) {
          setErrorMsg(err?.message || 'Web Serial connection failed');
          setStreamState('error');
        }
        return;
      }

      const res = await fetch('/api/xbox/serial/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device: selectedDevice.trim(),
          baudRate,
          dataBits,
          parity,
          stopBits,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setErrorMsg(data.error || 'Failed to open serial port');
        setStreamState('error');
        return;
      }
      lastSeqRef.current = 0;
      setIsConnected(true);
      setStreamState('sse-live');
      pushEntry('SYS', `Started real-time UART monitor on ${data.device} @ ${data.baudRate} ${dataBits}${parity[0].toUpperCase()}${stopBits}`, '', 0);
      onLog?.(`Started UART Monitor on ${data.device} @ ${data.baudRate}`, 'INFO');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to open host serial port');
      setStreamState('error');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setErrorMsg(null);
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (transport === 'webserial') {
      try { await webSerialReaderRef.current?.cancel(); } catch {}
      try { await webSerialPortRef.current?.close(); } catch {}
      webSerialReaderRef.current = null;
      webSerialPortRef.current = null;
      setIsConnected(false);
      setStreamState('disconnected');
      pushEntry('SYS', 'Stopped Browser Web Serial monitor.', '', 0);
      return;
    }
    try {
      await fetch('/api/xbox/serial/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device: selectedDevice.trim() }),
      });
    } catch {}
    setIsConnected(false);
    setStreamState('disconnected');
    pushEntry('SYS', `Stopped UART monitor on ${selectedDevice}.`, '', 0);
  };

  const handleSendTx = async (
    raw: string,
    mode: 'ascii' | 'hex',
    lineEnding: 'crlf' | 'lf' | 'cr' | 'none'
  ): Promise<boolean> => {
    setErrorMsg(null);
    if (!isConnected) {
      setErrorMsg('Serial port is not connected.');
      return false;
    }

    if (transport === 'webserial' && webSerialPortRef.current?.writable) {
      try {
        let bytes: Uint8Array;
        if (mode === 'hex') {
          const clean = raw.replace(/[^0-9a-fA-F]/g, '');
          if (!clean || clean.length % 2 !== 0) {
            setErrorMsg('Hex TX payload must have even hex digits.');
            return false;
          }
          bytes = new Uint8Array(clean.length / 2);
          for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
        } else {
          const suffix =
            lineEnding === 'crlf' ? '\r\n' : lineEnding === 'lf' ? '\n' : lineEnding === 'cr' ? '\r' : '';
          bytes = new TextEncoder().encode(`${raw}${suffix}`);
        }
        const writer = webSerialPortRef.current.writable.getWriter();
        await writer.write(bytes);
        writer.releaseLock();
        const { ascii, hex } = bytesToAsciiAndHex(bytes);
        setTotalTxBytes((n) => n + bytes.length);
        pushEntry('TX', ascii, hex, bytes.length);
        return true;
      } catch (err: any) {
        setErrorMsg(err?.message || 'Web Serial write failed');
        return false;
      }
    }

    try {
      const res = await fetch('/api/xbox/serial/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device: selectedDevice.trim(),
          payload: raw,
          mode,
          lineEnding,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setErrorMsg(data.error || 'Serial TX write failed');
        return false;
      }
      setTotalTxBytes((n) => n + (data.bytesWritten || 0));
      pushEntry('TX', raw, mode === 'hex' ? raw.toUpperCase() : '', data.bytesWritten || raw.length);
      return true;
    } catch (err: any) {
      setErrorMsg(err?.message || 'Serial TX error');
      return false;
    }
  };

  const handleRunHwTool = async (
    tool: 'ch347_jtag_probe' | 'flashrom_probe' | 'flashrom_dump' | 'cmsis_dap_probe' | 'rp2040_info' | 'i2c_detect',
    spiProgrammer: 'ch347_spi' | 'serprog' = 'ch347_spi'
  ) => {
    setHwToolBusy(true);
    setHwToolOutput('');
    setHwToolCommand('');
    setHwDumpPath(null);
    try {
      const res = await fetch('/api/xbox/hw/run-tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool,
          serialDevice: selectedDevice,
          spiProgrammer,
          i2cBus: i2cBusInput,
          jtagKhz,
        }),
      });
      const data = await res.json();
      setHwToolCommand(data.command || tool);
      setHwDumpPath(data.dumpPath || null);
      if (data.error) {
        setHwToolOutput(`${data.error}${data.output ? `\n\n${data.output}` : ''}`);
      } else {
        setHwToolOutput(data.output || '(Command completed with empty output)');
      }
    } catch (err: any) {
      setHwToolOutput(err?.message || 'Hardware tool execution failed');
    } finally {
      setHwToolBusy(false);
    }
  };

  const handleSelectFirmwareFile = (file: File | null) => {
    if (!file) return;
    setFwFlashResult(null);
    setFwFileName(file.name);
    setFwLocalPath('');
    setFwFileBytesLen(file.size);

    const reader = new FileReader();
    reader.onload = () => {
      const buf = reader.result as ArrayBuffer;
      const u8 = new Uint8Array(buf);
      if (file.name.toLowerCase().endsWith('.uf2')) {
        setFwUf2Meta(parseUf2Metadata(u8));
      } else {
        setFwUf2Meta(null);
      }
      let bin = '';
      const chunk = 0x8000;
      for (let i = 0; i < u8.length; i += chunk) {
        bin += String.fromCharCode(...u8.subarray(i, i + chunk));
      }
      setFwBase64(btoa(bin));
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFlashPicoFirmware = async () => {
    if (!fwBase64 && !fwLocalPath.trim()) {
      setFwFlashResult({ ok: false, error: 'Select a .uf2 / .elf / .bin firmware file or enter a Kali file path first.' });
      return;
    }
    setFwFlashing(true);
    setFwFlashResult(null);
    try {
      const res = await fetch('/api/xbox/hw/flash-pico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: fwFileName || fwLocalPath.split('/').pop() || 'firmware.uf2',
          fileBase64: fwBase64,
          localFirmwarePath: fwBase64 ? '' : fwLocalPath.trim(),
          method: fwMethod,
          verify: fwVerify,
          resetAfter: fwResetAfter,
        }),
      });
      const data = await res.json();
      setFwFlashResult({
        ok: Boolean(data.ok),
        command: data.command,
        output: data.output || '',
        error: data.error || null,
      });
      if (data.ok) {
        onLog?.(`Flashed RP2040 / Mini2040 firmware via ${data.methodUsed || fwMethod}`, 'INFO');
        handleScanHostPorts();
      } else {
        onLog?.(`Pico firmware flash failed: ${data.error}`, 'ERROR');
      }
    } catch (err: any) {
      setFwFlashResult({ ok: false, error: err?.message || 'Failed calling /api/xbox/hw/flash-pico' });
    } finally {
      setFwFlashing(false);
    }
  };

  const handlePicotoolBootsel = async () => {
    setFwFlashing(true);
    setFwFlashResult(null);
    try {
      const res = await fetch('/api/xbox/hw/pico-bootsel', { method: 'POST' });
      const data = await res.json();
      setFwFlashResult({
        ok: Boolean(data.ok),
        command: data.command,
        output: data.output || '',
        error: data.error || null,
      });
      setTimeout(handleScanHostPorts, 1000);
    } catch (err: any) {
      setFwFlashResult({ ok: false, error: err?.message || 'BOOTSEL reboot failed' });
    } finally {
      setFwFlashing(false);
    }
  };

  const handleWebSerial1200Bootsel = async () => {
    if (!webSerialSupported) {
      setFwFlashResult({ ok: false, error: 'Browser Web Serial is unavailable here. Use Host picotool BOOTSEL or hold BOOTSEL button.' });
      return;
    }
    try {
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: 1200 });
      await new Promise((r) => setTimeout(r, 150));
      await port.close();
      setFwFlashResult({
        ok: true,
        command: 'WebSerial 1200-baud DTR BOOTSEL touch',
        output: 'Sent 1200-baud BOOTSEL signal. Check Rescan USB for RPI-RP2 mount.',
      });
      setTimeout(handleScanHostPorts, 1200);
    } catch (err: any) {
      setFwFlashResult({ ok: false, error: err?.message || '1200-baud Web Serial BOOTSEL touch failed' });
    }
  };

  const copyCmd = (cmd: string, id: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="space-y-5">
      {/* Hardware Adapter Header & Sub-Navigation */}
      <div className="bg-[#0d1117] border border-[#1b2332] rounded-xl p-4 space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <CircuitBoard className="w-5 h-5 text-blue-400" />
              <span>Hardware Bench: Waveshare CH347 (JTAG/SPI/I2C/UART) &amp; Mini2040 RP2040</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Built around the <strong className="text-slate-200">Waveshare CH347</strong> multi-protocol USB adapter (<code className="font-mono text-blue-300">1A86:55DB–55DE</code>) and <strong className="text-slate-200">Mini2040 / RP2040</strong> (<code className="font-mono text-emerald-300">2E8A:*</code>), with <strong className="text-amber-300">Mini2040 Pico Bliss</strong> support queued for kiosk rollout.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 bg-[#07090e] p-1 rounded-lg border border-[#1b2332]">
            {[
              { id: 'uart' as const, label: 'UART Console', icon: Cable },
              { id: 'ch347' as const, label: 'CH347 JTAG / SPI / I2C', icon: Cpu },
              { id: 'mini2040' as const, label: 'Mini2040 & Pico Bliss', icon: Zap },
              { id: 'safety' as const, label: 'Wiring, Pinouts & Docs', icon: AlertTriangle },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setSubPanel(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    subPanel === t.id ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.35)]' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live USB & CLI Detection Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-[#07090e] border border-[#1a2234] rounded-lg px-3 py-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-slate-400">USB Adapters:</span>
            {usbAdapters.length === 0 ? (
              <span className="font-mono text-slate-500">
                {runningInCloud ? 'Cloud container (plug hardware into local Kali host)' : 'None matching CH347 / RP2040 / FTDI / CP210x right now'}
              </span>
            ) : (
              usbAdapters.map((u, idx) => (
                <span key={`${u.vid}-${u.pid}-${idx}`} className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-700/50 text-emerald-300 font-mono text-[11px]">
                  {u.vid}:{u.pid} ({u.role})
                </span>
              ))
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
            {(['openocd', 'flashrom', 'i2cdetect', 'picotool', 'picocom'] as const).map((tool) => {
              const ok = Boolean(installedTools[tool]);
              return (
                <span
                  key={tool}
                  className={`px-1.5 py-0.5 rounded border ${
                    ok ? 'bg-blue-950/50 border-blue-700/50 text-blue-300' : 'bg-[#0d1117] border-[#21293a] text-slate-500'
                  }`}
                >
                  {tool}:{ok ? 'ok' : 'missing'}
                </span>
              );
            })}
            <button
              onClick={handleScanHostPorts}
              className="ml-1 px-2 py-0.5 rounded bg-[#141a25] border border-[#232d40] text-slate-300 hover:text-white flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Rescan USB</span>
            </button>
          </div>
        </div>
      </div>

      {/* PANEL 1: UART CONSOLE */}
      {subPanel === 'uart' && (
        <>
          <div className="bg-[#0d1117] border border-[#1b2332] rounded-xl p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 bg-[#07090e] p-1 rounded-lg border border-[#1b2332]">
                <button
                  onClick={() => !isConnected && setTransport('host')}
                  disabled={isConnected}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold ${
                    transport === 'host' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Kali /dev/tty* Bridge</span>
                </button>
                <button
                  onClick={() => !isConnected && setTransport('webserial')}
                  disabled={isConnected}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold ${
                    transport === 'webserial' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Usb className="w-3.5 h-3.5" />
                  <span>Browser Web Serial</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
                <button
                  onClick={() => {
                    if (!isConnected) {
                      setSelectedDevice('/dev/ttyACM0');
                      setBaudRate(115200);
                    }
                  }}
                  className="px-2 py-1 rounded bg-[#07090e] border border-[#232d40] text-blue-300 hover:border-blue-500"
                >
                  Preset: CH347 UART (ttyACM0 · 115200)
                </button>
                <button
                  onClick={() => {
                    if (!isConnected) {
                      setSelectedDevice('/dev/ttyACM1');
                      setBaudRate(115200);
                    }
                  }}
                  className="px-2 py-1 rounded bg-[#07090e] border border-[#232d40] text-emerald-300 hover:border-emerald-500"
                >
                  Preset: Mini2040 CDC (ttyACM1 · 115200)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-end">
              {transport === 'host' && (
                <div className="lg:col-span-4">
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Serial Device (/dev/ttyACM* / /dev/ttyUSB*)</label>
                  <div className="flex gap-1.5">
                    {hostPorts.length > 0 ? (
                      <select
                        value={selectedDevice}
                        onChange={(e) => setSelectedDevice(e.target.value)}
                        disabled={isConnected}
                        className="flex-1 bg-[#07090e] border border-[#232d40] rounded-lg px-2.5 py-1.5 text-xs font-mono text-white"
                      >
                        {hostPorts.map((p) => (
                          <option key={p.device} value={p.device}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={selectedDevice}
                        onChange={(e) => setSelectedDevice(e.target.value)}
                        disabled={isConnected}
                        placeholder="/dev/ttyACM0"
                        className="flex-1 bg-[#07090e] border border-[#232d40] rounded-lg px-3 py-1.5 text-xs font-mono text-white"
                      />
                    )}
                    <button
                      onClick={handleScanHostPorts}
                      disabled={isConnected}
                      className="px-2.5 py-1.5 rounded-lg bg-[#141a25] border border-[#232d40] text-slate-300 hover:text-white disabled:opacity-50"
                      title="Rescan ports"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              <div className={transport === 'host' ? 'lg:col-span-2' : 'lg:col-span-3'}>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Baud (CH347 up to 9M)</label>
                <select
                  value={baudRate}
                  onChange={(e) => setBaudRate(Number(e.target.value))}
                  disabled={isConnected}
                  className="w-full bg-[#07090e] border border-[#232d40] rounded-lg px-2.5 py-1.5 text-xs font-mono text-blue-300"
                >
                  {BAUD_RATES.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-3 flex gap-1.5">
                <div className="flex-1">
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Data</label>
                  <select
                    value={dataBits}
                    onChange={(e) => setDataBits(Number(e.target.value) as 7 | 8)}
                    disabled={isConnected}
                    className="w-full bg-[#07090e] border border-[#232d40] rounded-lg px-2 py-1.5 text-xs font-mono text-white"
                  >
                    <option value={8}>8</option>
                    <option value={7}>7</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Parity</label>
                  <select
                    value={parity}
                    onChange={(e) => setParity(e.target.value as 'none' | 'even' | 'odd')}
                    disabled={isConnected}
                    className="w-full bg-[#07090e] border border-[#232d40] rounded-lg px-2 py-1.5 text-xs font-mono text-white"
                  >
                    <option value="none">N</option>
                    <option value="even">E</option>
                    <option value="odd">O</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Stop</label>
                  <select
                    value={stopBits}
                    onChange={(e) => setStopBits(Number(e.target.value) as 1 | 2)}
                    disabled={isConnected}
                    className="w-full bg-[#07090e] border border-[#232d40] rounded-lg px-2 py-1.5 text-xs font-mono text-white"
                  >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                  </select>
                </div>
              </div>

              <div className={transport === 'host' ? 'lg:col-span-3 flex gap-2' : 'lg:col-span-6 flex gap-2'}>
                {!isConnected ? (
                  <button
                    onClick={handleConnect}
                    disabled={isConnecting}
                    className="flex-1 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{transport === 'webserial' ? 'Start UART Monitor (Web Serial)' : 'Start UART Monitor'}</span>
                  </button>
                ) : (
                  <button
                    onClick={handleDisconnect}
                    className="flex-1 px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Stop UART Monitor</span>
                  </button>
                )}
              </div>
            </div>

            {errorMsg && (
              <div className="px-3 py-2 rounded-lg bg-rose-950/40 border border-rose-700/60 text-xs font-mono text-rose-300">
                {errorMsg}
              </div>
            )}
          </div>

          <UartLiveMonitor
            isConnected={isConnected}
            isBusy={isConnecting}
            transport={transport}
            selectedDevice={selectedDevice}
            baudRate={baudRate}
            dataBits={dataBits}
            parity={parity}
            stopBits={stopBits}
            streamState={streamState}
            entries={entries}
            totalRxBytes={totalRxBytes}
            totalTxBytes={totalTxBytes}
            onStartMonitor={handleConnect}
            onStopMonitor={handleDisconnect}
            onSendTx={handleSendTx}
            onClear={() => {
              setEntries([]);
              setTotalRxBytes(0);
              setTotalTxBytes(0);
            }}
          />
        </>
      )}

      {/* PANEL 2: WAVESHARE CH347 (JTAG / SPI / I2C / UART) */}
      {subPanel === 'ch347' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* CH347 USB Modes Matrix */}
            <div className="bg-[#0d1117] border border-[#1b2332] rounded-xl p-4 space-y-3 text-xs">
              <h3 className="font-bold text-white flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-400" />
                <span>Waveshare CH347 Hardware Modes &amp; USB IDs</span>
              </h3>
              <div className="space-y-2 font-mono text-[11px]">
                {[
                  { mode: 'Mode 0', pid: '1A86:55DA', desc: 'Dual High-Speed UART0 + UART1 (/dev/ttyACM0, ttyACM1)' },
                  { mode: 'Mode 1', pid: '1A86:55DB', desc: 'SPI + I2C + 1x UART (VCP / Vendor)' },
                  { mode: 'Mode 2', pid: '1A86:55DC', desc: 'HID UART + SPI + I2C (driverless HID)' },
                  { mode: 'Mode 3', pid: '1A86:55DD / 55DE', desc: 'JTAG + I2C + UART (OpenOCD ch347 & flashrom ch347_spi)' },
                ].map((m) => (
                  <div key={m.mode} className="bg-[#07090e] border border-[#1a2234] rounded-lg px-3 py-2 flex items-start justify-between gap-2">
                    <div>
                      <span className="text-blue-400 font-bold">{m.mode}</span>
                      <span className="text-slate-500 mx-1.5">·</span>
                      <span className="text-amber-300">{m.pid}</span>
                      <div className="text-slate-300 mt-0.5 font-sans">{m.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Real CH347 Hardware Actions */}
            <div className="bg-[#0d1117] border border-[#1b2332] rounded-xl p-4 space-y-3 text-xs">
              <h3 className="font-bold text-white flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-emerald-400" />
                <span>Live CH347 Probes (Kali Local Host)</span>
              </h3>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">JTAG Clock (kHz)</label>
                  <input
                    type="number"
                    value={jtagKhz}
                    onChange={(e) => setJtagKhz(Number(e.target.value) || 1000)}
                    className="w-full bg-[#07090e] border border-[#232d40] rounded-lg px-2.5 py-1.5 text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">
                    I2C Bus ({i2cBuses.length > 0 ? i2cBuses.join(', ') : '/dev/i2c-0'})
                  </label>
                  <input
                    type="text"
                    value={i2cBusInput}
                    onChange={(e) => setI2cBusInput(e.target.value)}
                    className="w-full bg-[#07090e] border border-[#232d40] rounded-lg px-2.5 py-1.5 text-xs font-mono text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={() => handleRunHwTool('ch347_jtag_probe')}
                  disabled={hwToolBusy}
                  className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold disabled:opacity-50"
                >
                  OpenOCD CH347 JTAG scan_chain
                </button>
                <button
                  onClick={() => handleRunHwTool('flashrom_probe', 'ch347_spi')}
                  disabled={hwToolBusy}
                  className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold disabled:opacity-50"
                >
                  Flashrom SPI Probe (ch347_spi)
                </button>
                <button
                  onClick={() => handleRunHwTool('flashrom_dump', 'ch347_spi')}
                  disabled={hwToolBusy}
                  className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold disabled:opacity-50"
                >
                  Dump SPI NOR -&gt; /tmp .bin
                </button>
                <button
                  onClick={() => handleRunHwTool('i2c_detect')}
                  disabled={hwToolBusy}
                  className="px-3 py-2 rounded-lg bg-[#141a25] border border-[#232d40] hover:border-blue-500 text-slate-200 font-semibold disabled:opacity-50"
                >
                  I2C Scan (i2cdetect -y {i2cBusInput})
                </button>
              </div>
            </div>
          </div>

          {/* Command Output + udev Rules */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-[#07090e] border border-[#1b2332] rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-blue-400 font-bold">Hardware Probe Output</span>
                {hwToolCommand && <span className="text-slate-500 truncate max-w-[320px]">{hwToolCommand}</span>}
              </div>
              {hwDumpPath && (
                <div className="px-2.5 py-1.5 rounded bg-emerald-950/40 border border-emerald-700/50 text-xs font-mono text-emerald-300">
                  Saved SPI Flash image: <strong>{hwDumpPath}</strong> — open this path in <strong>Peek / Poke</strong> or <strong>File Explorer Grep</strong>!
                </div>
              )}
              <pre className="h-44 overflow-auto font-mono text-[11px] text-slate-300 whitespace-pre-wrap">
                {hwToolOutput || '// Click any probe button above to run OpenOCD / Flashrom / I2C on Kali.'}
              </pre>
            </div>

            <div className="bg-[#0d1117] border border-[#1b2332] rounded-xl p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200">Kali udev Rules (`/etc/udev/rules.d/99-ch347-rp2040.rules`)</span>
                <button
                  onClick={() => copyCmd(UDEV_RULES, 'udev')}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-[#141a25] border border-[#232d40] text-slate-300 hover:text-white"
                >
                  {copiedId === 'udev' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy Rules</span>
                </button>
              </div>
              <pre className="bg-[#07090e] border border-[#192131] rounded-lg p-3 font-mono text-[11px] text-emerald-300 overflow-x-auto">
                {UDEV_RULES}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* PANEL 3: MINI2040 RP2040 & PICO BLISS (KIOSK TARGET + REAL FIRMWARE FLASHER) */}
      {subPanel === 'mini2040' && (
        <div className="space-y-4">
          <div className="bg-[#0d1117] border border-blue-700/40 rounded-xl p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Mini2040 RP2040 &amp; Pico Bliss Firmware Bench</h3>
              </div>
              <span className="text-xs font-mono text-amber-300">
                RP2040 / Mini2040 · Pico Bliss Kiosk Target
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Real RP2040 firmware flashing (<code className="font-mono text-emerald-300">.uf2</code>, <code className="font-mono text-emerald-300">.elf</code>, <code className="font-mono text-emerald-300">.bin</code>) over <code className="font-mono">picotool</code>, <code className="font-mono">RPI-RP2</code> BOOTSEL mass-storage, or OpenOCD CMSIS-DAP SWD — plus <code className="font-mono">serprog</code> SPI probing and dual CDC UART logging.
            </p>

            {/* Real RP2040 Firmware Flasher */}
            <div className="bg-[#07090e] border border-[#1b2332] rounded-xl p-4 space-y-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-blue-400" />
                  <span>Flash Pico 2040 / Mini2040 Firmware</span>
                </span>
                <span className="font-mono text-[11px] text-slate-400">
                  {bootselMounts.length > 0
                    ? `BOOTSEL Mounted: ${bootselMounts.map((m) => m.path).join(', ')}`
                    : 'No RPI-RP2 BOOTSEL mount detected'}
                </span>
              </div>

              {bootselMounts.length > 0 && (
                <div className="bg-[#0b0f17] border border-emerald-700/50 rounded-lg px-3 py-2 font-mono text-[11px] text-emerald-300 whitespace-pre-wrap">
                  {bootselMounts[0].infoUf2}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
                <div className="lg:col-span-4">
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">
                    Select Firmware (.uf2 / .elf / .bin)
                  </label>
                  <label className="flex items-center justify-between gap-2 bg-[#0b0f17] border border-[#232d40] hover:border-blue-500 rounded-lg px-3 py-1.5 cursor-pointer">
                    <span className="font-mono text-xs text-slate-200 truncate">
                      {fwFileName || 'Choose .uf2 / .elf / .bin file...'}
                    </span>
                    <span className="text-[11px] text-blue-400 font-semibold whitespace-nowrap shrink-0">Browse</span>
                    <input
                      type="file"
                      accept=".uf2,.elf,.bin"
                      className="hidden"
                      onChange={(e) => handleSelectFirmwareFile(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>

                <div className="lg:col-span-4">
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">
                    Or Kali Local Path (optional)
                  </label>
                  <input
                    type="text"
                    value={fwLocalPath}
                    onChange={(e) => {
                      setFwLocalPath(e.target.value);
                      if (e.target.value.trim()) {
                        setFwBase64('');
                        setFwFileName('');
                        setFwUf2Meta(null);
                      }
                    }}
                    placeholder="/home/kali/firmware/pico_bliss.uf2"
                    className="w-full bg-[#0b0f17] border border-[#232d40] rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="lg:col-span-4">
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">
                    Flash Transport Method
                  </label>
                  <select
                    value={fwMethod}
                    onChange={(e) => setFwMethod(e.target.value as 'auto' | 'picotool' | 'bootsel-mount' | 'openocd-swd')}
                    className="w-full bg-[#0b0f17] border border-[#232d40] rounded-lg px-2.5 py-1.5 text-xs font-mono text-blue-300"
                  >
                    <option value="auto">Auto (picotool load -f -&gt; RPI-RP2)</option>
                    <option value="picotool">picotool load -f -x (USB BOOTSEL/CDC)</option>
                    <option value="bootsel-mount">Direct Copy to RPI-RP2 Mount</option>
                    <option value="openocd-swd">OpenOCD SWD (CMSIS-DAP GP2/GP3)</option>
                  </select>
                </div>
              </div>

              {fwUf2Meta && (
                <div className={`rounded-lg px-3 py-2 font-mono text-[11px] border ${
                  fwUf2Meta.valid
                    ? 'bg-[#0b0f17] border-blue-800/50 text-slate-200'
                    : 'bg-rose-950/30 border-rose-700/50 text-rose-300'
                }`}>
                  {fwUf2Meta.valid ? (
                    <div className="flex flex-wrap items-center gap-3 tabular-nums">
                      <span>UF2 Valid</span>
                      <span className="text-slate-600">·</span>
                      <span>File: {fwFileBytesLen.toLocaleString()} B</span>
                      <span className="text-slate-600">·</span>
                      <span>Blocks: {fwUf2Meta.blockCount}</span>
                      <span className="text-slate-600">·</span>
                      <span>Payload: {fwUf2Meta.payloadBytes.toLocaleString()} B</span>
                      <span className="text-slate-600">·</span>
                      <span>Base: {fwUf2Meta.targetAddrHex}</span>
                      <span className="text-slate-600">·</span>
                      <span className={fwUf2Meta.isRp2040 ? 'text-emerald-400' : 'text-amber-300'}>
                        Family: {fwUf2Meta.familyIdHex || 'Unspecified'} {fwUf2Meta.isRp2040 ? '(RP2040)' : ''}
                      </span>
                    </div>
                  ) : (
                    <span>{fwUf2Meta.error}</span>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fwVerify}
                      onChange={(e) => setFwVerify(e.target.checked)}
                      className="rounded bg-[#0b0f17] border-slate-700"
                    />
                    <span>Verify flash (-v)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fwResetAfter}
                      onChange={(e) => setFwResetAfter(e.target.checked)}
                      className="rounded bg-[#0b0f17] border-slate-700"
                    />
                    <span>Reboot &amp; run (-x)</span>
                  </label>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleWebSerial1200Bootsel}
                    disabled={fwFlashing}
                    className="px-3 py-1.5 rounded-lg bg-[#141a25] border border-[#232d40] hover:border-blue-500 text-slate-200 font-semibold whitespace-nowrap shrink-0 disabled:opacity-50"
                  >
                    1200-baud BOOTSEL
                  </button>
                  <button
                    type="button"
                    onClick={handlePicotoolBootsel}
                    disabled={fwFlashing}
                    className="px-3 py-1.5 rounded-lg bg-[#141a25] border border-[#232d40] hover:border-amber-500 text-amber-300 font-semibold whitespace-nowrap shrink-0 disabled:opacity-50"
                  >
                    picotool reboot -u
                  </button>
                  <button
                    type="button"
                    onClick={handleFlashPicoFirmware}
                    disabled={fwFlashing || (!fwBase64 && !fwLocalPath.trim())}
                    className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 disabled:opacity-50"
                  >
                    <HardDrive className="w-3.5 h-3.5" />
                    <span>{fwFlashing ? 'Flashing RP2040...' : 'Flash Pico 2040 Firmware'}</span>
                  </button>
                </div>
              </div>

              {fwFlashResult && (
                <div className={`rounded-lg border p-3 font-mono text-[11px] space-y-1.5 ${
                  fwFlashResult.ok
                    ? 'bg-emerald-950/25 border-emerald-700/50 text-emerald-300'
                    : 'bg-rose-950/30 border-rose-700/50 text-rose-300'
                }`}>
                  {fwFlashResult.command && (
                    <div className="text-slate-400">Command: {fwFlashResult.command}</div>
                  )}
                  {fwFlashResult.error && <div>{fwFlashResult.error}</div>}
                  {fwFlashResult.output && (
                    <pre className="whitespace-pre-wrap text-slate-200 max-h-40 overflow-auto">
                      {fwFlashResult.output}
                    </pre>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
              <div className="bg-[#07090e] border border-[#1a2234] rounded-lg p-3">
                <div className="text-blue-400 font-bold mb-1">Mini2040 Pinout (3.3V Logic)</div>
                <div className="text-slate-300 space-y-0.5 text-[11px]">
                  <div>GP0 / GP1: UART0 TX / RX (CDC)</div>
                  <div>GP2 / GP3: SWCLK / SWDIO (DAP)</div>
                  <div>GP4 / GP5: I2C0 SDA / SCL</div>
                  <div>GP16–GP19: SPI0 MISO/CS/SCK/MOSI</div>
                </div>
              </div>
              <div className="bg-[#07090e] border border-[#1a2234] rounded-lg p-3">
                <div className="text-emerald-400 font-bold mb-1">Live RP2040 Actions</div>
                <div className="space-y-2 mt-2 font-sans">
                  <button
                    onClick={() => handleRunHwTool('rp2040_info')}
                    disabled={hwToolBusy}
                    className="w-full px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs disabled:opacity-50"
                  >
                    picotool info -a (BOOTSEL / Flash)
                  </button>
                  <button
                    onClick={() => handleRunHwTool('flashrom_probe', 'serprog')}
                    disabled={hwToolBusy}
                    className="w-full px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs disabled:opacity-50"
                  >
                    Flashrom Serprog Probe ({selectedDevice})
                  </button>
                  <button
                    onClick={() => handleRunHwTool('cmsis_dap_probe')}
                    disabled={hwToolBusy}
                    className="w-full px-3 py-1.5 rounded bg-[#141a25] border border-[#232d40] hover:border-blue-500 text-slate-200 font-semibold text-xs disabled:opacity-50"
                  >
                    OpenOCD CMSIS-DAP SWD Probe
                  </button>
                </div>
              </div>
              <div className="bg-[#07090e] border border-[#1a2234] rounded-lg p-3">
                <div className="text-amber-300 font-bold mb-1">Kali SDK &amp; UF2 Notes</div>
                <div className="text-slate-400 text-[11px] font-sans space-y-1.5">
                  <p>1. Hold BOOTSEL on Mini2040 &amp; plug USB-C (`2E8A:0003` mounts `RPI-RP2`).</p>
                  <p>2. Upload `.uf2` above or click `picotool reboot -u` if already running USB CDC.</p>
                  <p>
                    Toolchain: arm-gcc ({installedTools.armGcc ? 'ok' : 'missing'}) · cmake ({installedTools.cmake ? 'ok' : 'missing'}) · picotool ({installedTools.picotool ? 'ok' : 'missing'})
                  </p>
                </div>
              </div>
            </div>

            {hwToolOutput && (
              <pre className="bg-[#07090e] border border-[#192131] rounded-lg p-3 font-mono text-[11px] text-slate-300 max-h-48 overflow-auto whitespace-pre-wrap">
                {hwToolOutput}
              </pre>
            )}
          </div>
        </div>
      )}

      {/* PANEL 4: WIRING, PINOUTS, VAULT & SAFETY */}
      {subPanel === 'safety' && (
        <div className="space-y-4">
          <WiringPinoutGuide />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-[#0d1117] border border-[#1b2332] rounded-xl p-4 space-y-2.5 text-xs">
            <h3 className="font-bold text-amber-300 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>CH347 &amp; Mini2040 Voltage / Wiring Safety</span>
            </h3>
            <ul className="space-y-1.5 text-slate-300 list-disc pl-4">
              <li>
                <strong>Check Logic Voltage BEFORE connecting:</strong> Waveshare CH347 defaults to <strong>3.3V / 5V</strong> via its VCC jumper, and Mini2040 GPIOs are strictly <strong>3.3V</strong>. Xbox SoC / modern SPI NOR / JTAG pads are often <strong>1.8V or 3.3V</strong> — use a TXB0104/BSS138/74AXC level shifter for 1.8V targets.
              </li>
              <li>
                <strong>UART Wiring:</strong> <code className="font-mono">GND &harr; GND</code> first, then <code className="font-mono">Console TX &rarr; RXD</code> and <code className="font-mono">Console RX &larr; TXD</code>.
              </li>
              <li>
                <strong>SPI In-Circuit Caution:</strong> Do not power the SPI flash chip externally with 3.3V while the console PSU rail is active unless isolation resistors / standby state are verified.
              </li>
            </ul>
          </div>

          <div className="bg-[#0d1117] border border-[#1b2332] rounded-xl p-4 space-y-2.5 text-xs">
            <h3 className="font-bold text-slate-200 flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-blue-400" />
              <span>Kali Linux Package Setup &amp; Permissions</span>
            </h3>
            {[
              { id: 'apt', label: 'Install OpenOCD, Flashrom, I2C, Picotool, Picocom', cmd: 'sudo apt update && sudo apt install -y openocd flashrom i2c-tools picocom usbutils' },
              { id: 'grp', label: 'Allow non-root USB & Serial access', cmd: 'sudo usermod -aG dialout,plugdev $USER && newgrp dialout' },
              { id: 'pico', label: 'Verify CH347 / RP2040 USB enumeration', cmd: 'lsusb | grep -iE "1a86|2e8a|0403|10c4"' },
            ].map((item) => (
              <div key={item.id} className="bg-[#07090e] border border-[#192131] rounded-lg px-3 py-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[11px] text-slate-400">{item.label}</div>
                  <code className="font-mono text-emerald-300 break-all">{item.cmd}</code>
                </div>
                <button
                  onClick={() => copyCmd(item.cmd, item.id)}
                  className="p-1.5 rounded bg-[#141a25] border border-[#232d40] text-slate-300 hover:text-white shrink-0"
                >
                  {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            ))}
          </div>
        </div>
        </div>
      )}
    </div>
  );
};
