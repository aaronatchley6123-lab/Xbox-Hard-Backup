import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Cable, Cpu, CircuitBoard, Trash2 } from 'lucide-react';
import {
  VaultItem,
  CustomConsoleTarget,
} from '../utils/localPinoutParser';
import { PinoutVaultAndLocalAI, ConsoleTargetOption } from './PinoutVaultAndLocalAI';

type BuiltInWiringTarget =
  | 'xbox1_phat'
  | 'xbox_sx'
  | 'ps5_all'
  | 'switch_std'
  | 'switch_oled'
  | 'switch_2'
  | 'ch347_headers';

type WiringTarget = BuiltInWiringTarget | string;

type Ps5Variant = 'edm010_020' | 'edm030_033' | 'edm040_slim' | 'vsm010_pro';
type SwitchStdVariant = 'v1_erista' | 'v2_mariko' | 'lite_mariko';

const BUILT_IN_TARGETS: ConsoleTargetOption[] = [
  { id: 'xbox1_phat', label: 'Xbox One Phat' },
  { id: 'xbox_sx', label: 'Xbox Series X' },
  { id: 'ps5_all', label: 'PS5 (All)' },
  { id: 'switch_std', label: 'Switch V1/V2/Lite' },
  { id: 'switch_oled', label: 'Switch OLED' },
  { id: 'switch_2', label: 'Switch 2' },
  { id: 'ch347_headers', label: 'CH347 Pinouts' },
];

const USER_EMMC_WIRES = [
  {
    color: 'Dark Blue',
    swatch: 'bg-blue-700 border-blue-400',
    signal: 'GND',
    dest: 'SD/eMMC Pin 3 & Pin 6 (and CH347 GND / Outer Ground Ring)',
    note: 'Common ground reference. Connect first.',
  },
  {
    color: 'Light Blue',
    swatch: 'bg-sky-400 border-sky-200',
    signal: 'eMMC CLK',
    dest: 'SD Adapter Pin 5 (Xbox 1) / Picofly D (Switch 47 Ω inline)',
    note: '1-bit SD/eMMC clock — goes to SD reader or RP2040, NOT CH347 SPI/UART.',
  },
  {
    color: 'Yellow',
    swatch: 'bg-amber-400 border-amber-200',
    signal: 'eMMC CMD',
    dest: 'SD Adapter Pin 2 (Xbox 1) / Picofly A (Switch 47 Ω inline)',
    note: '1-bit SD/eMMC command — goes to SD reader or RP2040, NOT CH347.',
  },
  {
    color: 'Green',
    swatch: 'bg-emerald-500 border-emerald-200',
    signal: 'eMMC DAT0',
    dest: 'SD Adapter Pin 7 (Xbox 1) / Picofly C (Switch 47 Ω inline)',
    note: '1-bit SD/eMMC DAT0 — keep lead short (<10 cm) for signal integrity.',
  },
];

const CH347_UART_HEADER = [
  { pin: 1, label: 'VCC', connectsTo: 'DO NOT CONNECT to console UART/VCC (keep switch at 3.3V)' },
  { pin: 2, label: 'CTS', connectsTo: 'Leave NC (unless target hardware flow control CTS required)' },
  { pin: 3, label: 'RTS', connectsTo: 'Leave NC (unless target hardware flow control RTS required)' },
  { pin: 4, label: 'GND', connectsTo: 'Console GND / Metal USB or HDMI Shield' },
  { pin: 5, label: 'TXD', connectsTo: 'Console RX pad (3.3V direct on PS5 / level-shift to 1.8V on Xbox & Switch)' },
  { pin: 6, label: 'RXD', connectsTo: 'Console TX pad (capture boot / errlog stream into UART Monitor)' },
];

const CH347_SPI_I2C_HEADER = [
  { pin: 1, label: 'VCC', connectsTo: 'NOR Pin 8 VCC ONLY if board is completely unpowered (Mode 1/2/3)' },
  { pin: 2, label: 'SCL', connectsTo: 'Xbox One J4E1 Pin 25 / Series X AARDVARK Pin 1 (SMBUS_CLK)' },
  { pin: 3, label: 'VCC', connectsTo: 'NOR Pin 3 (~WP) & Pin 7 (~HOLD) pull-up when dumping unpowered NOR' },
  { pin: 4, label: 'SDO', connectsTo: 'SPI NOR Pin 5 (SI / DI / IO0) — Master Out -> Flash In' },
  { pin: 5, label: 'SCK', connectsTo: 'SPI NOR Pin 6 (SCLK) / J4E1 Pin 7' },
  { pin: 6, label: 'CS1', connectsTo: 'Secondary SPI Chip Select (leave NC for single NOR chip)' },
  { pin: 7, label: 'GND', connectsTo: 'Console GND / NOR Pin 4' },
  { pin: 8, label: 'SDA', connectsTo: 'Xbox One J4E1 Pin 26 / Series X AARDVARK Pin 3 (SMBUS_DATA)' },
  { pin: 9, label: 'GND', connectsTo: 'Extra Ground reference' },
  { pin: 10, label: 'SDI', connectsTo: 'SPI NOR Pin 2 (SO / DO / IO1) — Flash Out -> Master In' },
  { pin: 11, label: 'CS0', connectsTo: 'SPI NOR Pin 1 (~CS) — Primary Chip Select' },
  { pin: 12, label: 'NC', connectsTo: 'Leave floating' },
];

const CH347_JTAG_HEADER = [
  { pin: 1, label: 'VCC', connectsTo: 'Reference/Power (DO NOT power a live console rail; verify 1.8V vs 3.3V)' },
  { pin: 2, label: 'TDI', connectsTo: 'Target TDI (Xbox One J4E1 Pin 9 SB_JTAG_TDI)' },
  { pin: 3, label: 'TCK', connectsTo: 'Target TCK (Xbox One J4E1 Pin 13 SB_JTAG_TCK)' },
  { pin: 4, label: 'TRST', connectsTo: 'Target TRST# if present (leave NC if J4E1 has no dedicated TRST pin)' },
  { pin: 5, label: 'GND', connectsTo: 'Target GND (Xbox One J4E1 Pin 12 GND)' },
  { pin: 6, label: 'TDO', connectsTo: 'Target TDO (Xbox One J4E1 Pin 10 SB_JTAG_TDO)' },
  { pin: 7, label: 'TMS', connectsTo: 'Target TMS (Xbox One J4E1 Pin 11 SB_JTAG_TMS)' },
  { pin: 8, label: 'NC', connectsTo: 'Leave floating' },
];

const PS5_VARIANTS: Record<
  Ps5Variant,
  {
    label: string;
    models: string;
    uartVoltage: string;
    baud: string;
    uartLocation: string;
    norPackage: string;
    notes: string;
  }
> = {
  edm010_020: {
    label: 'EDM-010 / EDM-020 (Launch Fat)',
    models: 'CFI-10xx · CFI-11xx',
    uartVoltage: '3.3V Standby Logic',
    baud: '115200 8N1',
    uartLocation:
      'Clustered near the Southbridge / EMC region (3 micro-pads: TX, RX, GND). EMC UART is active by default on standby power (AC plugged in, console off).',
    norPackage: 'SOIC-8 (208-mil) or WSON-8 — MX25L256 / Winbond 32 MB SPI NOR',
    notes:
      'Ensure CH347 voltage switch is set to 3.3V. Leave CH347 VCC disconnected for UART (only connect TXD->RX, RXD<-TX, GND). Send "errlog 0" .. "errlog 9" for history.',
  },
  edm030_033: {
    label: 'EDM-030 / 031 / 032 / 033 (Rev Fat)',
    models: 'CFI-12xx Cost-Reduced Fat',
    uartVoltage: '3.3V Standby Logic',
    baud: '115200 8N1',
    uartLocation:
      'Shifted EMC UART micro-vias on the redesigned Southbridge/power quadrant compared to EDM-010/020. Verify pad map before soldering.',
    norPackage: 'SOIC-8 / WSON-8 — 32 MB 3.3V SPI NOR near Southbridge',
    notes:
      'Same CH347 UART protocol (115200 8N1, 3.3V) and 8-pin SPI NOR pinout (CS0->Pin1, SDI->Pin2, SDO->Pin5, SCK->Pin6, GND->Pin4). Unplug PS5 AC before clipping/reading NOR.',
  },
  edm040_slim: {
    label: 'EDM-040 / 041 / 044 / 050 (PS5 Slim)',
    models: 'CFI-20xx · CFI-21xx',
    uartVoltage: '3.3V Standby Logic',
    baud: '115200 8N1',
    uartLocation:
      'Compact Slim PCB — finer-pitch EMC UART pads routed off the Southbridge/PMIC edge. Use 30–36 AWG magnet wire and strain relief.',
    norPackage: 'WSON-8 / compact SOIC-8 32 MB 3.3V SPI NOR (micro-hooks or desolder to dump cleanly)',
    notes:
      '3.3V EMC UART remains enabled by default for errlog reads (common Slim fault codes e.g. 80801101). Do NOT connect 5V or CH347 VCC.',
  },
  vsm010_pro: {
    label: 'VSM-010 / PS5 Pro',
    models: 'CFI-70xx Series',
    uartVoltage: '3.3V Standby Logic',
    baud: '115200 8N1',
    uartLocation:
      'Pro PCB redesign moves EMC UART pads relative to Slim; confirm TX/RX/GND on your exact Pro boardview before soldering. TX idles near 3.3V in standby.',
    norPackage: 'WSON-8 / SOIC-8 3.3V SPI NOR flash (verify VCC with multimeter before attaching CH347 SPI)',
    notes:
      'Keep CH347 in 3.3V mode. Connect CH347 GND + RXD first to confirm idle/standby output before wiring CH347 TXD for "errlog 0" queries.',
  },
};

const SWITCH_STD_VARIANTS: Record<
  SwitchStdVariant,
  {
    label: string;
    soc: string;
    emmcNote: string;
    glitchNote: string;
  }
> = {
  v1_erista: {
    label: 'Switch V1 (HAC-001 · Erista)',
    soc: 'Tegra X1 (20nm Erista)',
    emmcNote: 'Removable modular eMMC board (BGA module on connector) — easiest DAT0 / CMD / CLK access.',
    glitchNote: 'RCM / software payload injection or unified Picofly RP2040 flex; check firmware version for exact GPIO map.',
  },
  v2_mariko: {
    label: 'Switch V2 (HAC-001-01 · Mariko)',
    soc: 'Tegra X1+ (16nm Mariko)',
    emmcNote: 'Modular eMMC board + CLK/CMD/DAT0/RST points on mainboard (requires 47 Ω inline resistors on DIY RP2040/Picofly DAT0, CLK, CMD).',
    glitchNote: 'Requires MOSFET or integrated flex tied to APU SP1/SP2 decoupling capacitors for voltage glitching.',
  },
  lite_mariko: {
    label: 'Switch Lite (HDH-001 · Mariko)',
    soc: 'Tegra X1+ (16nm Mariko)',
    emmcNote: 'eMMC soldered directly to mainboard — uses Lite-specific CLK, CMD, DAT0, RST points (or eMMC adapter) with 47 Ω series resistors.',
    glitchNote: 'Requires APU SP1/SP2 MOSFET flex for Mariko voltage glitching; disconnect battery & discharge rails before soldering.',
  },
};

export const WiringPinoutGuide: React.FC = () => {
  const [target, setTarget] = useState<WiringTarget>('xbox1_phat');
  const [ps5Variant, setPs5Variant] = useState<Ps5Variant>('edm010_020');
  const [switchStdVariant, setSwitchStdVariant] = useState<SwitchStdVariant>('v1_erista');
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);
  const [customTargets, setCustomTargets] = useState<CustomConsoleTarget[]>([]);
  const [vaultLoading, setVaultLoading] = useState<boolean>(true);

  const fetchVault = useCallback(async () => {
    setVaultLoading(true);
    try {
      const resp = await fetch('/api/pinout-vault/items');
      const data = await resp.json();
      if (resp.ok && data.ok) {
        setVaultItems(Array.isArray(data.items) ? data.items : []);
        setCustomTargets(Array.isArray(data.customTargets) ? data.customTargets : []);
      }
    } catch {
      // Keep current state cleanly if offline
    } finally {
      setVaultLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVault();
  }, [fetchVault]);

  const handleDeleteCustomTarget = async (id: string) => {
    await fetch(`/api/pinout-vault/targets/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (target === id) setTarget('xbox1_phat');
    await fetchVault();
  };

  const activePs5 = PS5_VARIANTS[ps5Variant];
  const activeSwitchStd = SWITCH_STD_VARIANTS[switchStdVariant];
  const activeCustomTarget = customTargets.find((c) => c.id === target);
  const pinnedForTarget = vaultItems.filter(
    (it) => it.pinnedToGuide && it.consoleTarget === target
  );

  return (
    <div className="bg-[#0d1117] border border-[#1b2332] rounded-xl p-4 space-y-5 text-xs">
      {/* Header + Target Selector */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-3 border-b border-[#1b2332]">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <CircuitBoard className="w-4 h-4 text-blue-400" />
            <span>Console &amp; Waveshare CH347 Pinout Reference</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Maps your wire colors, Waveshare CH347 headers, Xbox One / Series X, PS5 variants, Switch / OLED / Switch 2, plus uploaded board photos &amp; docs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 bg-[#07090e] p-1 rounded-lg border border-[#1b2332]">
          {BUILT_IN_TARGETS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTarget(item.id)}
              className={`px-2.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                target === item.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
          {customTargets.map((ct) => (
            <button
              key={ct.id}
              type="button"
              onClick={() => setTarget(ct.id)}
              className={`px-2.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                target === ct.id
                  ? 'bg-emerald-600 text-white'
                  : 'text-emerald-300/80 hover:text-white'
              }`}
            >
              {ct.label}
            </button>
          ))}
        </div>
      </div>

      {/* Persistent User Wire Legend */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-semibold text-slate-200">
            Your Harness Wire Legend (1-Bit eMMC / SD Bus)
          </span>
          <span className="font-mono text-[11px] text-amber-300">
            Note: CLK / CMD / DAT0 goes to an SD Card Reader or RP2040 — NOT CH347 SPI/UART
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2.5">
          {USER_EMMC_WIRES.map((w) => (
            <div
              key={w.color}
              className="bg-[#07090e] border border-[#1b2332] rounded-lg p-3 space-y-1"
            >
              <div className="flex items-center gap-2">
                <span className={`inline-block w-3 h-3 rounded-sm border shrink-0 ${w.swatch}`} />
                <span className="font-bold text-white">{w.color}</span>
                <span className="text-slate-600" aria-hidden="true">
                  ·
                </span>
                <span className="font-mono text-blue-300 font-semibold">{w.signal}</span>
              </div>
              <div className="font-mono text-[11px] text-emerald-300">{w.dest}</div>
              <div className="text-[11px] text-slate-400">{w.note}</div>
            </div>
          ))}
        </div>
      </div>

      {/* TARGET 1: XBOX ONE PHAT */}
      {target === 'xbox1_phat' && (
        <div className="space-y-4 pt-2 border-t border-[#1b2332]">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
            <span className="font-bold text-white">Xbox One Phat (Durango)</span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span>FACET Header J4E1 (2x13 2.0mm)</span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span>eMMC Dump Mod: SMC_RST_N + U3C3</span>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="bg-[#07090e] border border-[#1b2332] rounded-lg p-3.5 space-y-2">
              <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                <Cable className="w-3.5 h-3.5" />
                <span>1. eMMC Dump Wiring (Your Colored Wires -&gt; SD Card Reader)</span>
              </div>
              <table className="w-full text-left font-mono text-[11px] border-collapse">
                <thead>
                  <tr className="border-b border-[#1b2332] text-slate-400">
                    <th className="py-1.5 pr-2">Wire / Point</th>
                    <th className="py-1.5 pr-2">Board Signal</th>
                    <th className="py-1.5">Destination</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#141b28] text-slate-200 tabular-nums">
                  <tr>
                    <td className="py-1.5 pr-2 text-blue-300">Dark Blue</td>
                    <td className="py-1.5 pr-2">GND</td>
                    <td className="py-1.5">SD Reader Pin 3 / Pin 6 (GND)</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-2 text-sky-300">Light Blue</td>
                    <td className="py-1.5 pr-2">eMMC CLK</td>
                    <td className="py-1.5">SD Reader Pin 5 (CLK)</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-2 text-amber-300">Yellow</td>
                    <td className="py-1.5 pr-2">eMMC CMD</td>
                    <td className="py-1.5">SD Reader Pin 2 (CMD)</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-2 text-emerald-300">Green</td>
                    <td className="py-1.5 pr-2">eMMC DAT0</td>
                    <td className="py-1.5">SD Reader Pin 7 (DAT0)</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-2 text-slate-300">220 Ω</td>
                    <td className="py-1.5 pr-2">J4E1 Pin 1 (SMC_RST_N)</td>
                    <td className="py-1.5">Board GND (holds SMC in reset)</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-2 text-slate-300">660–750 Ω</td>
                    <td className="py-1.5 pr-2">U3C3 Pin 1 (CAT6243 ADJ)</td>
                    <td className="py-1.5">Outer Ground Ring (check Pin 2 VOUT ~3.2–3.3V)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-[#07090e] border border-[#1b2332] rounded-lg p-3.5 space-y-2">
              <div className="font-bold text-blue-300 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" />
                <span>2. Waveshare CH347 -&gt; Xbox One J4E1 (Remove SMC Reset First)</span>
              </div>
              <table className="w-full text-left font-mono text-[11px] border-collapse">
                <thead>
                  <tr className="border-b border-[#1b2332] text-slate-400">
                    <th className="py-1.5 pr-2">CH347 Header / Pin</th>
                    <th className="py-1.5 pr-2">J4E1 Pin</th>
                    <th className="py-1.5">Voltage &amp; Safety</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#141b28] text-slate-200 tabular-nums">
                  <tr>
                    <td className="py-1.5 pr-2">UART GND (Pin 4)</td>
                    <td className="py-1.5 pr-2">Pin 2 / 6 / 8 / 12 (GND)</td>
                    <td className="py-1.5">0V common ground first</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-2">UART RXD (Pin 6)</td>
                    <td className="py-1.5 pr-2">Pin 17 (KER_DBG_TXD)</td>
                    <td className="py-1.5 text-amber-300">1.8V logic (read-only safe)</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-2">UART TXD (Pin 5)</td>
                    <td className="py-1.5 pr-2">Pin 19 (KER_DBG_RXD)</td>
                    <td className="py-1.5 text-rose-300">Shift 3.3V -&gt; 1.8V (never raw 3.3V)</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-2">SPI/I2C SCL / SDA</td>
                    <td className="py-1.5 pr-2">Pin 25 CLK / Pin 26 DATA</td>
                    <td className="py-1.5">SMBUS POST bus (check idle V)</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-2">JTAG TDI/TDO/TMS/TCK</td>
                    <td className="py-1.5 pr-2">Pins 9 / 10 / 11 / 13</td>
                    <td className="py-1.5 text-amber-300">Southbridge JTAG (level-shift 1.8V)</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-2 text-rose-300">CH347 VCC</td>
                    <td className="py-1.5 pr-2">DO NOT CONNECT</td>
                    <td className="py-1.5">J4E1 Pins 14 &amp; 24 carry 3.3V STBY</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TARGET 2: XBOX SERIES X */}
      {target === 'xbox_sx' && (
        <div className="space-y-4 pt-2 border-t border-[#1b2332]">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
            <span className="font-bold text-white">Xbox Series X (Scarlett / Anaconda)</span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span>UART 1.8V (115200 8N1)</span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span>AARDVARK SMBUS I2C POST Header</span>
          </div>

          <div className="bg-[#07090e] border border-[#1b2332] rounded-lg p-3.5 space-y-2.5">
            <table className="w-full text-left font-mono text-[11px] border-collapse">
              <thead>
                <tr className="border-b border-[#1b2332] text-slate-400">
                  <th className="py-1.5 pr-3">Waveshare CH347 Pin</th>
                  <th className="py-1.5 pr-3">Xbox Series X Point</th>
                  <th className="py-1.5">Logic Level / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141b28] text-slate-200 tabular-nums">
                <tr>
                  <td className="py-1.5 pr-3">UART GND (Pin 4) / SPI GND</td>
                  <td className="py-1.5 pr-3">Motherboard GND / USB-HDMI Shield</td>
                  <td className="py-1.5">Always tie GND before probing or powering brick</td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-3">SPI/I2C SCL (Pin 2)</td>
                  <td className="py-1.5 pr-3">AARDVARK Pin 1 (SMBUS_CLK)</td>
                  <td className="py-1.5">SMBus POST code clock (also PicoDurangoPOST GP1)</td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-3">SPI/I2C SDA (Pin 8)</td>
                  <td className="py-1.5 pr-3">AARDVARK Pin 3 (SMBUS_DATA)</td>
                  <td className="py-1.5">SMBus POST code data (also PicoDurangoPOST GP0)</td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-3">UART RXD (Pin 6)</td>
                  <td className="py-1.5 pr-3">Southbridge UART TX test point</td>
                  <td className="py-1.5 text-amber-300">Strictly 1.8V logic — use 1.8V shifter if 3.3V RX drops frames</td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-3">UART TXD (Pin 5)</td>
                  <td className="py-1.5 pr-3">Southbridge UART RX test point</td>
                  <td className="py-1.5 text-rose-300">DO NOT drive with raw 3.3V — use TXB0104/74AXC or 1k/1k divider (1.65V)</td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-3 text-rose-300">CH347 VCC</td>
                  <td className="py-1.5 pr-3">Leave Unconnected</td>
                  <td className="py-1.5">Standby rails (5V / 3.3V / 1.8V / 1.1V) power from internal PSU</td>
                </tr>
              </tbody>
            </table>
            <p className="text-[11px] text-slate-400">
              Note: Retail Xbox Series X fuses external JTAG and boots from its CFexpress/NVMe M.2 SSD rather than an 8-pin BIOS NOR. Verify exact AARDVARK / UART test pads against your board revision silkscreen before soldering.
            </p>
          </div>
        </div>
      )}

      {/* TARGET 3: PS5 ALL VARIANTS */}
      {target === 'ps5_all' && (
        <div className="space-y-4 pt-2 border-t border-[#1b2332]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-bold text-white">
              PlayStation 5 Variants (CH347 UART @ 3.3V &amp; 8-Pin SPI NOR)
            </span>
            <div className="flex flex-wrap items-center gap-1 bg-[#07090e] p-1 rounded-lg border border-[#1b2332]">
              {(Object.keys(PS5_VARIANTS) as Ps5Variant[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPs5Variant(key)}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold whitespace-nowrap shrink-0 ${
                    ps5Variant === key
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {PS5_VARIANTS[key].label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#07090e] border border-[#1b2332] rounded-lg p-3.5 space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <span className="text-blue-300 font-bold">{activePs5.label}</span>
              <span className="text-slate-600" aria-hidden="true">·</span>
              <span className="text-slate-300">{activePs5.models}</span>
              <span className="text-slate-600" aria-hidden="true">·</span>
              <span className="text-emerald-300">{activePs5.uartVoltage}</span>
              <span className="text-slate-600" aria-hidden="true">·</span>
              <span className="text-amber-300">{activePs5.baud}</span>
            </div>
            <p className="text-slate-300 leading-relaxed">{activePs5.uartLocation}</p>
            <p className="text-slate-400">
              <strong className="text-slate-200">SPI NOR:</strong> {activePs5.norPackage}
            </p>
            <p className="text-slate-400">{activePs5.notes}</p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="bg-[#07090e] border border-[#1b2332] rounded-lg p-3.5 space-y-2">
              <div className="font-bold text-emerald-300">
                CH347 UART Header -&gt; PS5 EMC UART (3.3V · 115200 8N1)
              </div>
              <table className="w-full text-left font-mono text-[11px] border-collapse">
                <thead>
                  <tr className="border-b border-[#1b2332] text-slate-400">
                    <th className="py-1.5 pr-2">CH347 UART Pin</th>
                    <th className="py-1.5 pr-2">PS5 UART Pad</th>
                    <th className="py-1.5">Requirement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#141b28] text-slate-200 tabular-nums">
                  <tr>
                    <td className="py-1.5 pr-2">Pin 4 (GND)</td>
                    <td className="py-1.5 pr-2">UART GND / Shield</td>
                    <td className="py-1.5">AC plugged in (Standby 3.3V)</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-2">Pin 6 (RXD)</td>
                    <td className="py-1.5 pr-2">PS5 UART TX</td>
                    <td className="py-1.5">3.3V direct (CH347 VCC switch = 3.3V)</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-2">Pin 5 (TXD)</td>
                    <td className="py-1.5 pr-2">PS5 UART RX</td>
                    <td className="py-1.5">Send errlog 0 / errlog 1..N commands</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-2 text-rose-300">Pin 1 (VCC)</td>
                    <td className="py-1.5 pr-2">DO NOT CONNECT</td>
                    <td className="py-1.5">Never feed CH347 VCC into live PS5</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-[#07090e] border border-[#1b2332] rounded-lg p-3.5 space-y-2">
              <div className="font-bold text-blue-300">
                CH347 SPI Header -&gt; PS5 8-Pin SPI NOR (Mode 1/2/3 · flashrom -p ch347_spi)
              </div>
              <table className="w-full text-left font-mono text-[11px] border-collapse">
                <thead>
                  <tr className="border-b border-[#1b2332] text-slate-400">
                    <th className="py-1.5 pr-2">CH347 SPI Pin</th>
                    <th className="py-1.5 pr-2">NOR Pin</th>
                    <th className="py-1.5">Signal / Direction</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#141b28] text-slate-200 tabular-nums">
                  <tr>
                    <td className="py-1.5 pr-2">Pin 11 (CS0)</td>
                    <td className="py-1.5 pr-2">Pin 1 (~CS)</td>
                    <td className="py-1.5">Chip Select (Active Low)</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-2">Pin 10 (SDI / MISO)</td>
                    <td className="py-1.5 pr-2">Pin 2 (SO / IO1)</td>
                    <td className="py-1.5">Flash Out -&gt; CH347 In</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-2">Pin 7 / 9 (GND)</td>
                    <td className="py-1.5 pr-2">Pin 4 (GND)</td>
                    <td className="py-1.5">Common Ground</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-2">Pin 4 (SDO / MOSI)</td>
                    <td className="py-1.5 pr-2">Pin 5 (SI / IO0)</td>
                    <td className="py-1.5">CH347 Out -&gt; Flash In</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-2">Pin 5 (SCK)</td>
                    <td className="py-1.5 pr-2">Pin 6 (SCLK)</td>
                    <td className="py-1.5">SPI Clock</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-2 text-amber-300">Pin 1 / 3 (VCC 3.3V)</td>
                    <td className="py-1.5 pr-2">Pin 8 (VCC) + Pins 3 &amp; 7</td>
                    <td className="py-1.5">Tie ~WP (Pin 3) &amp; ~HOLD (Pin 7) to 3.3V (AC unplugged)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TARGET 4: NINTENDO SWITCH V1 / V2 / LITE */}
      {target === 'switch_std' && (
        <div className="space-y-4 pt-2 border-t border-[#1b2332]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-bold text-white">
              Nintendo Switch V1 / V2 / Lite (Picofly RP2040 &amp; 1.8V UART)
            </span>
            <div className="flex flex-wrap items-center gap-1 bg-[#07090e] p-1 rounded-lg border border-[#1b2332]">
              {(Object.keys(SWITCH_STD_VARIANTS) as SwitchStdVariant[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSwitchStdVariant(key)}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold whitespace-nowrap shrink-0 ${
                    switchStdVariant === key
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {SWITCH_STD_VARIANTS[key].label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#07090e] border border-[#1b2332] rounded-lg p-3.5 space-y-1.5">
            <div className="font-mono text-xs text-blue-300 font-bold">
              {activeSwitchStd.label} · {activeSwitchStd.soc}
            </div>
            <p className="text-slate-300">{activeSwitchStd.emmcNote}</p>
            <p className="text-slate-400">{activeSwitchStd.glitchNote}</p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="bg-[#07090e] border border-[#1b2332] rounded-lg p-3.5 space-y-2">
              <div className="font-bold text-emerald-300">
                eMMC / Glitch Harness (RP2040 / Picofly · 1.8V eMMC Domain)
              </div>
              <table className="w-full text-left font-mono text-[11px] border-collapse">
                <thead>
                  <tr className="border-b border-[#1b2332] text-slate-400">
                    <th className="py-1.5 pr-2">Wire / Point</th>
                    <th className="py-1.5 pr-2">Signal</th>
                    <th className="py-1.5">Inline Resistor / Requirement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#141b28] text-slate-200 tabular-nums">
                  <tr>
                    <td className="py-1.5 pr-2 text-blue-300">Dark Blue / GND</td>
                    <td className="py-1.5 pr-2">GND</td>
                    <td className="py-1.5">Shielding / screw ground; disconnect battery first</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-2 text-amber-300">Yellow / A</td>
                    <td className="py-1.5 pr-2">eMMC CMD</td>
                    <td className="py-1.5">47 Ω series resistor on DIY RP2040 builds</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-2 text-emerald-300">Green / C</td>
                    <td className="py-1.5 pr-2">eMMC DAT0</td>
                    <td className="py-1.5">47 Ω series resistor on DIY RP2040 builds</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-2 text-sky-300">Light Blue / D</td>
                    <td className="py-1.5 pr-2">SoC CLK</td>
                    <td className="py-1.5">47 Ω series resistor; scrape only tiny trace if unexposed</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-2 text-slate-300">B Point</td>
                    <td className="py-1.5 pr-2">CPU RST</td>
                    <td className="py-1.5">Direct to CPU reset point (keep free of flux residue)</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-2 text-slate-300">SP1 / SP2 + 3.3V</td>
                    <td className="py-1.5 pr-2">CPU Caps + 3.3V</td>
                    <td className="py-1.5">MOSFET flex on V2/Lite; verify diode readings before power</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-[#07090e] border border-[#1b2332] rounded-lg p-3.5 space-y-2">
              <div className="font-bold text-amber-300">
                Waveshare CH347 UART -&gt; Switch 1.8V UART (Joy-Con Rail / UART-A)
              </div>
              <table className="w-full text-left font-mono text-[11px] border-collapse">
                <thead>
                  <tr className="border-b border-[#1b2332] text-slate-400">
                    <th className="py-1.5 pr-2">CH347 UART Pin</th>
                    <th className="py-1.5 pr-2">Switch Target</th>
                    <th className="py-1.5">Logic Level (Strictly 1.8V)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#141b28] text-slate-200 tabular-nums">
                  <tr>
                    <td className="py-1.5 pr-2">Pin 4 (GND)</td>
                    <td className="py-1.5 pr-2">Right Joy-Con Pin 1 / Board GND</td>
                    <td className="py-1.5">Common Ground (115200 8N1)</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-2">Pin 6 (RXD)</td>
                    <td className="py-1.5 pr-2">Rail Pin 5 (SERIAL+) or Cluster C TX</td>
                    <td className="py-1.5 text-amber-300">1.8V Tegra TX (use 1.8V shifter if garbled)</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-2">Pin 5 (TXD)</td>
                    <td className="py-1.5 pr-2">Rail Pin 8 (Flow) or Cluster C RX</td>
                    <td className="py-1.5 text-rose-300">MUST shift 3.3V -&gt; 1.8V (never direct 3.3V)</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-2 text-rose-300">Pin 1 (VCC)</td>
                    <td className="py-1.5 pr-2">Leave NC (avoid Rail Pin 2 = 5V)</td>
                    <td className="py-1.5">Atmosphere exosphere.ini: log_port = 0 (UART-A) / 1 (UART-B)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TARGET 5: NINTENDO SWITCH OLED */}
      {target === 'switch_oled' && (
        <div className="space-y-4 pt-2 border-t border-[#1b2332]">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
            <span className="font-bold text-white">Nintendo Switch OLED (HEG-001 · Mariko)</span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span>eMMC 1.8V (DAT0 Interposer / Kamikaze)</span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span>Tegra UART 1.8V @ 115200</span>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="bg-[#07090e] border border-[#1b2332] rounded-lg p-3.5 space-y-2">
              <div className="font-bold text-emerald-300">
                Switch OLED Modchip / eMMC Points (Disconnect Battery First)
              </div>
              <table className="w-full text-left font-mono text-[11px] border-collapse">
                <thead>
                  <tr className="border-b border-[#1b2332] text-slate-400">
                    <th className="py-1.5 pr-2">Point / Wire</th>
                    <th className="py-1.5 pr-2">Signal</th>
                    <th className="py-1.5">OLED-Specific Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#141b28] text-slate-200 tabular-nums">
                  <tr>
                    <td className="py-1.5 pr-2 text-blue-300">Dark Blue / GND</td>
                    <td className="py-1.5 pr-2">GND</td>
                    <td className="py-1.5">APU shield / board ground frame</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-2 text-emerald-300">Green / C (DAT0)</td>
                    <td className="py-1.5 pr-2">eMMC DAT0</td>
                    <td className="py-1.5 text-amber-300">No top test pad — requires BGA DAT0 adapter flex under eMMC or Kamikaze trace</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-2 text-amber-300">Yellow / A (CMD)</td>
                    <td className="py-1.5 pr-2">eMMC CMD</td>
                    <td className="py-1.5">Top-side CMD resistor/pad near eMMC (47 Ω inline on DIY RP2040)</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-2 text-sky-300">Light Blue / D (CLK)</td>
                    <td className="py-1.5 pr-2">SoC CLK</td>
                    <td className="py-1.5">Microscopic trace via near APU (mask scrape + tiny solder anchor + 47 Ω)</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-2 text-slate-300">B Point (RST)</td>
                    <td className="py-1.5 pr-2">CPU_RST</td>
                    <td className="py-1.5">Dedicated OLED RST point on back/APU area</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-2 text-slate-300">CPU / 1.8V / 3.3V</td>
                    <td className="py-1.5 pr-2">Glitch &amp; Rails</td>
                    <td className="py-1.5">MOSFET flex on APU caps + 3.3V cap near eMMC/PMIC</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-[#07090e] border border-[#1b2332] rounded-lg p-3.5 space-y-2.5 text-slate-300">
              <div className="font-bold text-amber-300">
                Mandatory Switch OLED Pre-Power Diode Checks &amp; UART
              </div>
              <ul className="space-y-1.5 list-disc pl-4 leading-relaxed">
                <li>
                  <strong className="text-white">Diode Mode (Red probe on GND, Black on pad):</strong> Verify <code className="font-mono text-emerald-300">DAT0 / CMD / CLK / RST</code> show finite forward voltage (~0.45–0.85V) — never <code className="font-mono text-rose-300">0.00V</code> (short to GND) or <code className="font-mono text-rose-300">0L</code> (disconnected adapter pin).
                </li>
                <li>
                  <strong className="text-white">No eMMC CMD1 Request Error:</strong> Almost always indicates <code className="font-mono">DAT0</code> adapter shifted, missing <code className="font-mono">47 Ω</code> series resistor, or cold joint on <code className="font-mono">CMD</code>.
                </li>
                <li>
                  <strong className="text-white">OLED UART Logging (CH347):</strong> Same <strong className="text-amber-300">1.8V Tegra UART</strong> (<code className="font-mono">115200 8N1</code> via Right Joy-Con Rail Pin 1 GND / Pin 5 SERIAL+ / Pin 8 Flow or internal UART-A). Use a <strong className="text-white">1.8V level shifter</strong> on CH347 TXD/RXD.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TARGET 6: NINTENDO SWITCH 2 */}
      {target === 'switch_2' && (
        <div className="space-y-4 pt-2 border-t border-[#1b2332]">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
            <span className="font-bold text-white">Nintendo Switch 2 (T239 · LPDDR5X · UFS 3.1)</span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span className="text-amber-300">Honest Hardware Status: No eMMC / No Public Boot-Mod Map</span>
          </div>

          <div className="bg-[#07090e] border border-[#1b2332] rounded-lg p-4 space-y-3 text-slate-300 leading-relaxed">
            <div className="font-bold text-white">
              Architectural Differences vs. Switch V1 / V2 / Lite / OLED
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="border border-[#1b2332] rounded-lg p-3 space-y-1">
                <div className="font-mono font-bold text-rose-300">1. Storage is UFS 3.1 (NOT eMMC)</div>
                <p className="text-slate-400">
                  Switch 2 replaces 1-bit/8-bit parallel eMMC (<code className="font-mono">CLK / CMD / DAT0</code>) with high-speed differential <strong className="text-slate-200">UFS 3.1 (M-PHY TX/RX diff pairs)</strong>. Standard SD card readers, Picofly eMMC adapters, and CH347 SPI cannot read or glitch Switch 2 UFS flash in-circuit.
                </p>
              </div>
              <div className="border border-[#1b2332] rounded-lg p-3 space-y-1">
                <div className="font-mono font-bold text-amber-300">2. UART / JTAG / Test Vias</div>
                <p className="text-slate-400">
                  Consumer production boards lock down JTAG and secure boot; verified public pad coordinates for <code className="font-mono">T239</code> UART TX/RX/GND on retail Switch 2 boards are not yet standardized. Do not solder CH347 3.3V TXD onto unverified test vias around Renesas/TI PMIC rails — probe idle voltage and continuity first.
                </p>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              Bench tip: Before probing any unlabelled micro-via near the SoC or PMIC on Switch 2, meter it in DC Volts while on standby/boot (expect 1.8V or 1.1V domain logic) and only connect CH347 RXD through a 1.8V buffer/level-shifter with GND shared first.
            </p>
          </div>
        </div>
      )}

      {/* TARGET 7: WAVESHARE CH347 EXACT HEADER PINOUTS */}
      {target === 'ch347_headers' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-2 border-t border-[#1b2332]">
          <div className="bg-[#07090e] border border-[#1b2332] rounded-lg p-3.5 space-y-2">
            <div className="font-bold text-emerald-300">UART Header (6-Pin)</div>
            <table className="w-full text-left font-mono text-[11px] border-collapse">
              <thead>
                <tr className="border-b border-[#1b2332] text-slate-400">
                  <th className="py-1 pr-2">#</th>
                  <th className="py-1 pr-2">Pin</th>
                  <th className="py-1">Usage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141b28] text-slate-200 tabular-nums">
                {CH347_UART_HEADER.map((row) => (
                  <tr key={row.pin}>
                    <td className="py-1.5 pr-2 text-slate-500">{row.pin}</td>
                    <td className="py-1.5 pr-2 font-bold text-blue-300">{row.label}</td>
                    <td className="py-1.5 text-slate-300 font-sans">{row.connectsTo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-[#07090e] border border-[#1b2332] rounded-lg p-3.5 space-y-2">
            <div className="font-bold text-blue-300">SPI / I2C Header (12-Pin)</div>
            <table className="w-full text-left font-mono text-[11px] border-collapse">
              <thead>
                <tr className="border-b border-[#1b2332] text-slate-400">
                  <th className="py-1 pr-2">#</th>
                  <th className="py-1 pr-2">Pin</th>
                  <th className="py-1">Mapping</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141b28] text-slate-200 tabular-nums">
                {CH347_SPI_I2C_HEADER.map((row) => (
                  <tr key={row.pin}>
                    <td className="py-1 pr-2 text-slate-500">{row.pin}</td>
                    <td className="py-1 pr-2 font-bold text-amber-300">{row.label}</td>
                    <td className="py-1 text-slate-300 font-sans">{row.connectsTo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-[#07090e] border border-[#1b2332] rounded-lg p-3.5 space-y-2">
            <div className="font-bold text-amber-300">JTAG Header (8-Pin)</div>
            <table className="w-full text-left font-mono text-[11px] border-collapse">
              <thead>
                <tr className="border-b border-[#1b2332] text-slate-400">
                  <th className="py-1 pr-2">#</th>
                  <th className="py-1 pr-2">Pin</th>
                  <th className="py-1">Usage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141b28] text-slate-200 tabular-nums">
                {CH347_JTAG_HEADER.map((row) => (
                  <tr key={row.pin}>
                    <td className="py-1.5 pr-2 text-slate-500">{row.pin}</td>
                    <td className="py-1.5 pr-2 font-bold text-emerald-300">{row.label}</td>
                    <td className="py-1.5 text-slate-300 font-sans">{row.connectsTo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CUSTOM CONSOLE TARGET VIEW */}
      {activeCustomTarget && (
        <div className="space-y-3 pt-2 border-t border-[#1b2332]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
              <span className="font-bold text-white">{activeCustomTarget.label}</span>
              <span className="text-slate-600" aria-hidden="true">·</span>
              <span className="font-mono text-amber-300">{activeCustomTarget.logicVoltage}</span>
              {activeCustomTarget.busNotes && (
                <>
                  <span className="text-slate-600" aria-hidden="true">·</span>
                  <span className="text-slate-400">{activeCustomTarget.busNotes}</span>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => handleDeleteCustomTarget(activeCustomTarget.id)}
              className="px-2.5 py-1 rounded bg-[#07090e] border border-[#232d40] hover:border-rose-500 text-rose-300 text-[11px] font-semibold flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <Trash2 className="w-3 h-3" />
              <span>Remove Target</span>
            </button>
          </div>
          {pinnedForTarget.length === 0 && (
            <div className="bg-[#07090e] border border-[#1b2332] rounded-lg p-3.5 text-slate-400">
              No pinned photos or extracted pinout docs for <strong className="text-slate-200">{activeCustomTarget.label}</strong> yet. Use <strong className="text-blue-300">Add Photo / Doc</strong> below to attach diagrams and organize pin rows here.
            </div>
          )}
        </div>
      )}

      {/* PINNED BENCH ADDITIONS FOR CURRENT CONSOLE TAB */}
      {pinnedForTarget.length > 0 && (
        <div className="space-y-2.5 pt-2 border-t border-[#1b2332]">
          <div className="font-bold text-blue-300">
            Pinned Bench Photos &amp; Extracted Pinouts for this Target ({pinnedForTarget.length})
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {pinnedForTarget.map((pinItem) => (
              <div
                key={pinItem.id}
                className="bg-[#07090e] border border-[#1b2332] rounded-lg p-3 space-y-2"
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-white truncate">{pinItem.title}</span>
                  <span className="font-mono text-[11px] text-emerald-300 shrink-0">
                    {pinItem.boardRev || pinItem.kind}
                  </span>
                </div>
                {pinItem.mimeType?.startsWith('image/') && pinItem.assetUrl && (
                  <img
                    src={pinItem.assetUrl}
                    alt={pinItem.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-36 object-cover rounded border border-[#1b2332]"
                  />
                )}
                {pinItem.organized?.summary && (
                  <p className="text-slate-300 leading-relaxed">{pinItem.organized.summary}</p>
                )}
                {pinItem.organized?.extractedPins && pinItem.organized.extractedPins.length > 0 && (
                  <table className="w-full text-left font-mono text-[11px] border-collapse">
                    <thead>
                      <tr className="border-b border-[#1b2332] text-slate-400">
                        <th className="py-1 pr-2">Signal</th>
                        <th className="py-1 pr-2">Board Point</th>
                        <th className="py-1">Adapter Pin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#141b28] text-slate-200 tabular-nums">
                      {pinItem.organized.extractedPins.map((row, rIdx) => (
                        <tr key={rIdx}>
                          <td className="py-1 pr-2 text-blue-300 font-semibold">{row.signal}</td>
                          <td className="py-1 pr-2">{row.boardPoint}</td>
                          <td className="py-1">{row.adapterPin}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BENCH PHOTO/DOC VAULT & LOCAL SMALL MODEL */}
      <PinoutVaultAndLocalAI
        activeTarget={target}
        builtInTargets={BUILT_IN_TARGETS}
        customTargets={customTargets}
        items={vaultItems}
        loading={vaultLoading}
        onRefreshVault={fetchVault}
        onSelectTarget={(id) => setTarget(id)}
      />

      {/* Critical In-Circuit Safety Footer */}
      <div className="bg-[#07090e] border border-amber-700/40 rounded-lg px-3.5 py-2.5 flex items-start gap-2.5 text-slate-300">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-amber-300">Voltage &amp; Power Rule:</strong> Flip Waveshare CH347 VCC switch to{' '}
          <strong className="text-white">3.3V</strong> (never 5V). Leave CH347 <code className="font-mono">VCC</code>{' '}
          unconnected on live/standby consoles (UART &amp; I2C). Use a <strong className="text-white">1.8V level shifter</strong> for Xbox SoC (`KER_DBG`) &amp; Nintendo Switch 1.8V UART lines; PS5 EMC UART runs directly at <strong className="text-white">3.3V</strong>.
        </div>
      </div>
    </div>
  );
};
