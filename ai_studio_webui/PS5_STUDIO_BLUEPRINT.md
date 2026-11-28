# PlayStation 5 (Prospero) DevKit, Research & Linux Studio (`PS5Owned`) — Project Starter Blueprint

> **Purpose**: A drop-in starter specification to spin up a sister application to **XBXOwned** tailored specifically for **PlayStation 5 (Prospero / CFI-10xx–CFI-20xx / Pro / DevKit & TestKit)** hardware research, live console telemetry, full filesystem exploration, memory peek/poke, ELF/PKG/FSELF tooling, UART/SPI/RP2040 hardware benching, and offline LLM training corpus generation.

---

## 1. Tech Stack & Runtime Architecture

- **Frontend**: React 19 + TypeScript + Vite 8 + Tailwind CSS v4 (`@import "tailwindcss";`) + `lucide-react` + `recharts` + `motion`
- **Backend (`server.ts`)**: Node.js + Express (`tsx server.ts` on **Port `3000`** with `vite.middlewares` mounted in dev, serving production `dist/` on `npm start`)
- **AI & Offline LLM Support**:
  - Local Ollama / `llama.cpp` / OpenAI-compatible LAN inference (`/api/local-llm/*`)
  - Optional server-side `@google/genai` assistant drawer (`/api/chat`)
- **Host / Kali Hardware & Network Utilities** (invoked via Node `child_process` when running locally on Linux/Kali):
  - `curl` / native `net` / `tls` sockets for PS5 RPC, FTP (`:2121` / `:1337`), Klog (`:9081`), PS5-Debug / etaHEN DPI (`:9090`), Neighborhood/Prospero Target Manager ports (`:9200`–`:9230`, `:9339`), SSH/Telnet (`:22` / `:23`)
  - `openocd`, `esptool`, `picotool`, `flashrom`, `ch347`, `stty` / `/dev/ttyUSB*` / `/dev/ttyACM*` for UART, SPI NOR (`MX25L`/`W25Q` BIOS/EMC/Syscon dumps), and RP2040/ESP32-S3 glitch/serial probes

---

## 2. Core Operating Modes & Hardware Profiles

Just like XBXOwned's Profile Manager + Simulation Toggle, support **real hardware LAN mode** (`isSimulated: false`) AND **safe sandbox simulator mode** (`isSimulated: true`), plus explicit honest detection when running inside a cloud container (`isCloudContainer()`) vs. on the user's local Kali/Linux workstation.

### PS5 Target Hardware Models (`ConsoleModel`)
- `PS5 Standard (CFI-10xx / EDM-010)`
- `PS5 Digital / B-Chassis (CFI-11xx / EDM-020)`
- `PS5 C-Chassis (CFI-12xx / EDM-030)`
- `PS5 Slim (CFI-20xx / EDM-040)`
- `PS5 Pro (CFI-70xx / Viola)`
- `PS5 DevKit (DFI-D1000AA)`
- `PS5 TestKit (DFI-T1000AA)`

### PS5 Target / Firmware Modes (`Ps5HardwareMode` & Mode Hex Badges)
| Mode | Tag | Hex / ID | Capabilities & Notes |
|---|---|---|---|
| **Retail / CEX** | `CEX` | `0x0001` | Standard encrypted retail FreeBSD kernel, strict sandbox jails, signed SELF/PKG only |
| **TestKit / DEX** | `DEX` | `0x0082` | QA/Debug settings unlocked, `NP` dev environment selectable, Neighborhood target IPC |
| **DevKit / Tool** | `TOOL` | `0x0081` | Full ProDG / Neighborhood debugging, unencrypted dev ELF/SELF, extra GDDR6 memory pool (`3.5 GB+` flex) |
| **Debug / etaHEN / Kstuff** | `HEN` | `0x8001` | Homebrew FSELF/FPKG enabled, FTP + Klog + DPI + Debug Settings + PS5Debug daemon active |
| **Safe / Recovery / UART** | `SAFE` | `0x0000` | Minimal recovery environment, UART EMC/Syscon error-code readout, PUP flash/reinstall |

---

## 3. Global Header Ribbon & Persistent Profile Storage (`localStorage`)

- **Top Status Bar (`HeaderBar.tsx`)**:
  - Live connection dot + Machine Name (`PS5-PROSPERO-DEV` or `DISCONNECTED`)
  - Pulsing Hardware Mode badge (`[0x0081] TOOL` / `[0x8001] HEN` / `[0x0082] DEX`)
  - One-click Copy **PSID / Console ID / OpenPSID / Target IP**
  - Profile selector dropdown (`Create`, `Duplicate`, `Delete`, `Save`) persisted in `localStorage`
  - **Live Hardware vs. Simulator** toggle + **Reconnect/Probe** trigger
  - Quick **BusyBox / Local Shell** floating modal + **Hardware Assistant Drawer** button

- **Settings & Access Control Modal (`SettingsModal.tsx`)**:
  - Connection settings: Target IP, Debug/PS5Debug port (`9090`), FTP port (`2121` / `1337`), Klog TCP port (`9081`), DPI/PKG port (`9090`/`12800`), SSH port (`22`), Firmware Version (`1.xx`–`10.xx`), Target Title ID (`CUSA`/`PPSA`), NP Environment (`np` / `sp-int` / `prod-qa`).
  - **BSD UID / GID / FreeBSD Jail & Capability Manager** (replaces Windows SIDs/LAPS):
    - Manage console accounts & jail identities (`root (UID 0)`, `webcore`, `shellui`, `user1 (UID 1000)`, `debug_rpc`, `ftp_daemon`)
    - Manage **PS5 Auth IDs / Program Auth IDs / FreeBSD Group IDs (`GID`) & Kernel Capabilities**:
      - e.g. `GID 0 (wheel)`, `GID 1000 (user)`, `AuthID 0x4800000000000001 (ShellCore/Dev)`, `AuthID 0x4800000000000019 (SysCore/Mount)`, `DEBUG_CAP`, `JAIL_ESCAPE`, `SELF_DECRYPT`, `PT_ATTACH`
    - Synchronize both `groups` (names) AND `groupIds` (GID/AuthID hex values) case-insensitively across `SettingsModal` and `SystemToolsTab` quick toggles with immediate auto-save and custom GID/AuthID entry.
  - Custom Port Matrix (enable/disable + live TCP probe).

---

## 4. Navigation Tabs & Feature Modules (11 Core Workspaces)

### Tab 1: `Dashboard` (`DashboardTab.tsx`)
- Real-time Oberon / Viola **8-Core Zen 2 CPU load**, **RDNA 2/3 GPU frequency & utilization**, **SoC / Memory / VRM thermal gauges** (read via PS5Debug/Syscon/EMC telemetry or simulated ticks).
- **16 GB GDDR6 Unified Memory Pool** breakdown (OS Kernel, Game/App, Tool/Dev Extra Pool, VDec/Audio).
- **Live Target Snapshot / Remote Framebuffer** preview + quick **Power Actions** (Reboot, Rest Mode, Shutdown, Reload ShellUI).
- Quick port status matrix & recent Klog warnings.

### Tab 2: `App & PKG Manager` (`AppManagerTab.tsx`)
- List installed **PS5 (`PPSAxxxxx`)** & **PS4 backward-compat (`CUSAxxxxx`)** titles, homebrew `.pkg` / `.elf` payloads, and system apps (`NPXS40xxx`).
- Parse & inspect `param.json` / `param.sfo` metadata (Title ID, Content ID, App Version, Required System Version, Category, Self/FSELF status).
- **One-click Actions**:
  - Launch Title / Kill App (`sceSystemService` / IPC)
  - Deploy `.pkg` via **Direct Package Installer (DPI)** / HTTP stream or FTP upload
  - Inject `.elf` / `.bin` payload via TCP payload loader (`:9020` / `:9021`)
  - Extract / Dump decrypted game `eboot.bin` + `.sprx` modules (for authorized DevKit/research analysis)

### Tab 3: `SELF / PKG & Keys` (`SigningTab.tsx`)
*(PS5 equivalent of XBXOwned's `Certs & Sign`)*
- Manage **FSELF / Dev ELF**, **PKG**, and **NPDATA / RIF** keys, entitlement manifests, and test signing profiles.
- **Payloads & FSELF Builder / Inspector**:
  - Inspect ELF64 headers, `PT_SCE_PROCPARAM`, `PT_SCE_MODULE_PARAM`, `AuthID`, `ProgramCapabilities`, and `Ptype` flags.
  - Toggle capability flags (`Debug`, `Jailbreak/Root`, `DevKit Mount`, `Read/Write /data`) as clean true/false switches and generate FSELF / Fake-PKG (`gp5` / `pubtool` / `make_fself`) build scripts.

### Tab 4: `Kit File Explorer` (`FileExplorerTab.tsx`)
*(Direct port of XBXOwned's full-content "Open-Book" Kit FS + Dynamic R/W + JSONL Export)*
- **PS5 Partition Selector** + **Auto-Discovered Mounts (`/api/ps5/fs/discover`)**:
  - `/user` (Save data, screenshots, user settings — R/W)
  - `/data` (Homebrew, payloads, configs, `etaHEN`, logs — R/W)
  - `/mnt/sandbox` (Active game sandbox jails `pfsmnt` — dynamic)
  - `/mnt/usb0` .. `/mnt/usb7` (External USB drives)
  - `/system` & `/system_ex` (Core Orbis/Prospero OS libraries, ShellUI, VSH — Read-Only by default unless remounted RW)
  - `/system_data` (Registry/SQLite DBs `app.db`, `notification.db`, `addcont.db`)
  - `/preinst`, `/preinst2`, `/update` (Firmware slots & PUP staging)
  - `Local Host FS` (User's Kali/Linux project folder, SDK drops, extracted dumps)
- **Live Dual/Multi-Backend Transport (`/api/ps5/fs/*`)**:
  - Automatically routes through **FTP (`:2121` / `:1337`)**, **SSH/SFTP (`:22`)**, **HTTP/FS Daemon**, or **Local Host FS**, handling FreeBSD `EACCES`/`550 Permission denied` gracefully so basic user-readable folders never crash scans.
- **Key UX Features to Keep Identical**:
  - **Open Full FS Tree** (recursive BFS with configurable depth `1–6` and a `skippedDirs` diagnostic pill showing any kernel-locked directories bypassed cleanly)
  - **Probe R/W** button (runs live non-destructive 0-byte write/delete probe on active directory and updates `Read/Write` vs `Read-Only` badge dynamically)
  - **Dynamic Clickable Discovered Mounts** (any live mount returned by `/proc/mounts` / `df` / FTP root becomes clickable)
  - **Stream Content Inspector** (no paper book gimmick — sleek IDE/terminal full-content stream reader with 1MB byte-range pagination, PDF/SQLite/binary string extraction, search-in-file, and bookmarks)
  - **Inline Notepad Tabs** (open any kit `.ini`, `.json`, `.xml`, `.cfg`, `.sh` file, edit, and write back live)
  - **Global Regex / Hex Grep** (`/api/ps5/fs/grep`) across local or mounted dumps
  - **Export Corpus (`.jsonl`)**: Export selected/recursive kit files (`ShareGPT`, `Alpaca`, `Raw Pretrain`) directly for training a local LLM on your PS5 filesystem & logs.

### Tab 5: `Live Debug & Klog` (`LiveDebugTab.tsx`)
- Real-time TCP stream from **PS5 Kernel Log (`klog` on port `9081`)** and **stdout/stderr payload console**.
- Color-coded level filtering (`KERN`, `ERR`, `WARN`, `INFO`, `DEBUG`, `SYSCALL`), regex search, pause/resume, and one-click `.log` / `.jsonl` export.
- Crash / Kernel Panic / Core Dump analyzer & downloader.

### Tab 6: `Peek / Poke & Memory` (`PeekPokeTab.tsx`)
- **PS5Debug / Kernel RPC Memory Explorer** (`/api/ps5/peekpoke/*`):
  - Target PID selector (`eboot.bin`, `SceShellUI`, `SceSysCore`, kernel base `kbase`)
  - Live Hex + ASCII + Float32/UInt64/Pointer Inspector (`ReadMemory` / `WriteMemory`)
  - **ASLR / Kernel Base Calculator** + Pattern / AOB byte scanner (`48 89 5C 24 ?? ...`)
  - **Saved Address Watchlist / Bookmarks** (freeze/toggle patches, pointer chains)
  - Safe File Offset Peek/Poke for local `NOR` (`32MB` BIOS/EMC/UART region), `SSD Controller` dumps, or extracted `eboot.bin` / `kernel.elf`.

### Tab 7: `UART / NOR / Syscon Bench` (`SerialDebugTab.tsx` + `UartLiveMonitor.tsx` + `PinoutVaultAndLocalAI.tsx` + `WiringPinoutGuide.tsx`)
*(PS5 hardware debugging is huge here — preserve this entire hardware workbench!)*
- **Live Serial UART Terminal (`/api/ps5/serial/*`)**:
  - Scan `/dev/ttyUSB*` & `/dev/ttyACM*` (CH340/CH341/CP2102/FT232H/CH347/Pico) at `115200 8N1` for **PS5 Southbridge (`CXD90061GG` / `CXD90072GG`) & EMC (`A0x-COL` / Syscon) UART TX/RX**.
  - **PS5 EMC / UART Error Code Decoder** built right into the monitor: automatically flags and decodes 8-digit hex error codes from UART output (`8080xxxx`, `8081xxxx`, `8083xxxx`, `8087xxxx`, `C002xxxx` Southbridge/APU/GDDR6 power rail faults, `errlog` command helpers: `errlog 0`..`errlog 9`, `bringup`, `poweroff`, `version`).
- **SPI NOR Flasher & Hardware Tools (`/api/ps5/hw/*`)**:
  - Presets for **Winbond/Macronix 25Q256 / MX25L256** (PS5 NOR dump/verify/write via `flashrom` + CH347/Pico), **PS5 NOR Bit/Flag Patcher** (toggle UART enable byte `0x1C7021`/`0x1C4000` family flags cleanly in UI), **Teensy/Pico SPI/UART passthrough** (`picotool`, `esptool`, `openocd`).
- **Pinout Vault & Offline Local AI (`/api/pinout-vault/*`, `/api/local-llm/*`)**:
  - Upload PS5 motherboard schematics (`EDM-010`, `EDM-020`, `EDM-030`, `EDM-040`, `EDM-050`), UART pad photos, GDDR6 pinouts, and liquid-metal/PMIC (`DA9065` / `F75303` / `XDPE14286A`) PDFs.
  - Extract structured pinout wiring tables & training `.jsonl` corpora using your local Ollama / `llama.cpp` server.

### Tab 8: `Process & Thread Manager` (`TaskManagerTab.tsx` / `ProcessMonitorTab.tsx`)
- Live process tree via `ps5debug` `GetProcessList` / `GetProcessInfo`: PID, Title ID, App State, AuthID, Sandbox ID, RSS/VRAM usage, thread count.
- Inspect loaded `.sprx` modules & memory maps (`vm_map` base/end/protections `R/W/X`).
- Suspend, Resume, Kill, Attach Debugger, or Dump Process Memory.

### Tab 9: `Jail, AuthID & Security Map` (`KaliAuditTab.tsx`)
*(PS5 equivalent of XBXOwned's `Token Map`)*
- Visualize **FreeBSD `ucred` / `prison` (Jail) / Sony `sce_proc_param` / `AuthID` privilege boundaries**:
  - Kernel (`UID 0`, `prison0`) -> SysCore -> ShellCore -> ShellUI -> Game Sandbox (`jail` + `pfsmnt`).
  - Interactive capability & port audit checklist (`9020/9021` ELF loader, `2121` FTP, `9081` Klog, `9090` PS5Debug/DPI, `3232` UART-bridge) with authorized-research LAN scanner (`nmap` / `nc` helper scripts when run on Kali).

### Tab 10: `System Tools & Kernel Flags` (`SystemToolsTab.tsx`)
- Quick **UID / GID / AuthID Assignment Bar** synced with `SettingsModal` (click any group/AuthID chip to toggle on active user/process and persist immediately).
- **Root / System Partition Remount Helpers** (safe toggle preview + RPC command for `/system`, `/system_ex`, `/preinst` RW remount on jailbroken/DevKit targets).
- **PS5 Debug Settings & Environment Toggles**:
  - Toggleable `true/false` flag grid (NP Environment, Debug Trophy, Fake Save Mounting, Show Debug Info Overlay, Force DevKit RAM Mode, Disable ASLR for target PID, Auto-Start FTP/Klog/PS5Debug).
- Console Power & Maintenance: Reboot, Safe Mode Reboot, Clear WebBrowser Cache, Rebuild `app.db` trigger, Export System Info Snapshot.

### Tab 11: `Payload / ELF / FPKG Build` (`LinuxBuildTab.tsx`)
- Build & cross-compile **PS5 Payloads & Homebrew** directly from Kali Linux:
  - Toolchain presets for **`ps5-payload-sdk`** (`john-tornblom` LLVM/clang toolchain), **OpenOrbis PS5 (`OO_PS5_TOOLCHAIN`)**, and **Prospero ELF -> FSELF / GP5 / FPKG** scripts.
  - Project scaffolder (`Makefile`, `CMakeLists.txt`, `linker.x`, `main.c` using `libkernel` / `libc` / `sceSysmodule`).
  - One-click compile -> push payload directly to PS5 `:9020`/`:9021` or deploy `.pkg` via DPI!

---

## 5. Backend Express API Blueprint (`server.ts`)

Mirror the exact structure of XBXOwned's `server.ts` so frontend components talk cleanly to `/api/ps5/*`, `/api/pinout-vault/*`, and `/api/local-llm/*`:

```text
GET  /api/health
POST /api/ps5/test-connection        # Probe FTP (2121/1337), Klog (9081), PS5Debug (9090), DPI, SSH (22)
POST /api/ps5/probe                  # Deep port scan + firmware/mode/model fingerprint
POST /api/ps5/mode/apply             # Switch/verify CEX/DEX/TOOL/HEN profile + flags

# Full-FS ("Open Book") Routes — FTP + SSH/SFTP + HTTP FS + Local Host FS
POST /api/ps5/fs/discover            # Discover /user, /data, /mnt/usb*, /mnt/sandbox/*, /system, local mounts
POST /api/ps5/fs/list                # Directory listing + optional dynamic live R/W probe
POST /api/ps5/fs/probe-rw            # Non-destructive 0-byte write+delete test on active directory
POST /api/ps5/fs/tree                # Recursive BFS tree scanner; catches EACCES/550 in skippedDirs
POST /api/ps5/fs/read                # Byte-range chunked read + PDF/SQLite/strings extraction + multi-backend fallback
POST /api/ps5/fs/write               # Write / save edited files back to PS5 or host
POST /api/ps5/fs/mkdir
POST /api/ps5/fs/delete
POST /api/ps5/fs/grep                # Regex/Hex pattern search across files

# Process, PKG, Payload & Memory RPC (PS5Debug / etaHEN / Payload Loader)
POST /api/ps5/apps/list
POST /api/ps5/apps/launch
POST /api/ps5/apps/kill
POST /api/ps5/apps/deploy-pkg        # Direct Package Installer (DPI) HTTP/FTP push
POST /api/ps5/payload/send           # Raw TCP send ELF/BIN to :9020 / :9021
POST /api/ps5/debug/processes        # List PIDs, Title IDs, AuthIDs, RSS
POST /api/ps5/debug/vmmap            # Process virtual memory map + .sprx modules
POST /api/ps5/peekpoke/mem           # PS5Debug ReadMemory / WriteMemory / Kernel RW
POST /api/ps5/peekpoke/file-peek     # Hex peek local NOR/ELF/dump at offset
POST /api/ps5/peekpoke/file-poke     # Hex poke local NOR/ELF/dump at offset (with .bak backup)
POST /api/ps5/system/power           # Reboot / Shutdown / Rest / Reload ShellUI
POST /api/ps5/system/screenshot      # Grab frame / VSH capture

# Hardware Bench: UART / EMC / Syscon / SPI NOR / RP2040
GET  /api/ps5/serial/ports           # List /dev/ttyUSB* / /dev/ttyACM* + USB VID/PID
POST /api/ps5/serial/open            # Open UART (115200 8N1) for PS5 Southbridge/EMC
GET  /api/ps5/serial/stream          # SSE live UART + EMC error-code decoder stream
POST /api/ps5/serial/send            # Send EMC command (errlog 0, version, bringup)
POST /api/ps5/serial/close
POST /api/ps5/hw/run-tool            # flashrom / openocd / picotool / esptool runner
POST /api/ps5/hw/nor-inspect         # Parse PS5 32MB NOR header, Wi-Fi/BT MAC, board ID, UART flag offset

# Hardware Pinout Vault & Offline LLM Training Corpus (Reuse Directly)
GET/POST/PUT/DELETE /api/pinout-vault/*
GET/POST            /api/local-llm/status | /organize | /research | /export-training
POST                /api/chat        # Optional Gemini / local assistant drawer
```

---

## 6. Key Design & Engineering Guardrails (Lessons Learned from XBXOwned)

1. **Dual Truthfulness (Hardware vs. Simulator)**:
   - Never silently fake success when targeting a private LAN IP (`192.168.x.x` / `10.x.x.x`) from a cloud container — return `{ ok: false, runningInCloud: true }` with clear instructions to run locally on the Kali/Linux host (`npm run dev`).
   - Always surface real protocol errors (`FTP 550 Permission denied`, `ECONNREFUSED :9090`, `WDP/HTTP 403`) verbatim rather than generic `"Unknown error"`.
2. **Dynamic Writability & Graceful Permission Skipping**:
   - Do not hardcode partition permissions forever; probe R/W dynamically on user request (`probe-rw`) and update UI badges immediately.
   - Recursive tree scans (`/fs/tree`) and corpus exports (`/export-training`) must catch `EACCES`/`EPERM`/`550` per directory and log them into `skippedDirs` so basic user-level folders remain browsable and exportable.
3. **AuthID / GID Synchronization**:
   - Store both human-readable group/role names AND numeric/hex IDs (`groupIds`, `authIds`, `gids`), sync updates case-insensitively in one atomic state commit, auto-upsert the active user if missing from `localUsers`, and persist straight to `localStorage`.
4. **Visual Aesthetic**:
   - Dark hardware-lab console theme (`#090b0e` obsidian canvas, `#0f141d` telemetry cards, `#1c2331` hairlines, PlayStation cobalt blue `#3b82f6` / electric cyan `#06b6d4` accents, crisp `JetBrains Mono` / `monospace` for hex addresses, AuthIDs, UART logs, and filesystem paths).
   - Zero fluff, zero fake telemetry when disconnected, every control backed by a real parser or IPC route.

---

## 7. Quick-Start Prompt for Your New PS5 Project

When starting the new project, copy/paste this prompt along with this `.md` file:

> Build **PS5Owned — PlayStation 5 (Prospero) DevKit, Research & Linux Studio** following `PS5_STUDIO_BLUEPRINT.md`. Keep the full-stack React 19 + Vite 8 + Tailwind v4 + Express (`server.ts` on port 3000) architecture, obsidian/cobalt-blue hardware console UI, persistent `localStorage` profiles, Simulator vs. Live LAN mode, full-content recursive Kit File Explorer (FTP/SSH/Local Host FS + live Probe R/W + `.jsonl` training corpus export), PS5Debug memory Peek/Poke, ELF/PKG/FSELF toolchain & payload sender, FreeBSD Jail/UID/GID/AuthID manager, and the live UART/EMC error decoder + SPI NOR/CH347 hardware workbench + Pinout Vault.
