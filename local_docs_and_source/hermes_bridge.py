import ctypes
from ctypes import wintypes
import os
import socket
import struct
import subprocess
import sys
import threading
import time

# Prepend Native Linux CLI Suite (BusyBox-w32 + TCC + Python) to PATH
_EXTRA_PATHS = [
    r"D:\DevelopmentFiles\linux_bin",
    r"D:\DevelopmentFiles\linux_bin\tcc",
    r"D:\DevelopmentFiles\python",
]
os.environ["PATH"] = ";".join(_EXTRA_PATHS) + ";" + os.environ.get("PATH", "")

print("[Bridge] Initializing Hermes Native Bridge (Se* Privileges + XRO + VMM + XPAL + Local Llama)...", flush=True)

# ---------------------------------------------------------------------------
# 0. Enable all available Se* token privileges
# ---------------------------------------------------------------------------
SE_PRIVILEGE_NAMES = [
    "SeDebugPrivilege",
    "SeBackupPrivilege",
    "SeRestorePrivilege",
    "SeTakeOwnershipPrivilege",
    "SeSecurityPrivilege",
    "SeSystemEnvironmentPrivilege",
    "SeManageVolumePrivilege",
    "SeImpersonatePrivilege",
    "SeAssignPrimaryTokenPrivilege",
    "SeLoadDriverPrivilege",
    "SeShutdownPrivilege",
    "SeIncreaseQuotaPrivilege",
]


def enable_all_se_privileges():
    """Enable all available Se* privileges on the current process token."""
    enabled = []
    try:
        kernel32 = ctypes.windll.kernel32
        advapi32 = ctypes.windll.advapi32
        kernel32.GetCurrentProcess.restype = wintypes.HANDLE

        class LUID(ctypes.Structure):
            _fields_ = [("LowPart", wintypes.DWORD), ("HighPart", wintypes.LONG)]

        class LUID_AND_ATTRIBUTES(ctypes.Structure):
            _fields_ = [("Luid", LUID), ("Attributes", wintypes.DWORD)]

        class TOKEN_PRIVILEGES(ctypes.Structure):
            _fields_ = [("PrivilegeCount", wintypes.DWORD), ("Privileges", LUID_AND_ATTRIBUTES * 1)]

        advapi32.OpenProcessToken.argtypes = [wintypes.HANDLE, wintypes.DWORD, ctypes.POINTER(wintypes.HANDLE)]
        advapi32.OpenProcessToken.restype = wintypes.BOOL
        advapi32.LookupPrivilegeValueW.argtypes = [wintypes.LPCWSTR, wintypes.LPCWSTR, ctypes.POINTER(LUID)]
        advapi32.LookupPrivilegeValueW.restype = wintypes.BOOL
        advapi32.AdjustTokenPrivileges.argtypes = [
            wintypes.HANDLE, wintypes.BOOL, ctypes.POINTER(TOKEN_PRIVILEGES),
            wintypes.DWORD, ctypes.c_void_p, ctypes.c_void_p,
        ]
        advapi32.AdjustTokenPrivileges.restype = wintypes.BOOL

        h_tok = wintypes.HANDLE()
        if not advapi32.OpenProcessToken(kernel32.GetCurrentProcess(), 0x0028, ctypes.byref(h_tok)):
            print(f"[Se*] OpenProcessToken failed: ERR={kernel32.GetLastError()}", flush=True)
            return enabled

        try:
            for priv_name in SE_PRIVILEGE_NAMES:
                luid = LUID()
                if not advapi32.LookupPrivilegeValueW(None, priv_name, ctypes.byref(luid)):
                    continue
                tp = TOKEN_PRIVILEGES()
                tp.PrivilegeCount = 1
                tp.Privileges[0].Luid = luid
                tp.Privileges[0].Attributes = 0x00000002  # SE_PRIVILEGE_ENABLED
                kernel32.SetLastError(0)
                ok = advapi32.AdjustTokenPrivileges(h_tok, False, ctypes.byref(tp), ctypes.sizeof(tp), None, None)
                err = kernel32.GetLastError()
                if ok and err == 0:
                    enabled.append(priv_name)
        finally:
            kernel32.CloseHandle(h_tok)
    except Exception as e_se:
        print(f"[Se*] Init note: {e_se}", flush=True)
    print(f"[Se*] Enabled privileges ({len(enabled)}): {enabled}", flush=True)
    return enabled


enable_all_se_privileges()

# ---------------------------------------------------------------------------
# 1. Unlock XRO filter for C:\ and M:\ drive access
# ---------------------------------------------------------------------------
_xro_mgr = None
try:
    xro_path = r"J:\tools\xrofilter.dll" if os.path.exists(r"J:\tools\xrofilter.dll") else r"D:\DevelopmentFiles\xrofilter.dll"
    if os.path.exists(xro_path):
        xro = ctypes.WinDLL(xro_path)
        ctor = xro[1]
        ctor.argtypes = [ctypes.c_void_p]
        ctor.restype = ctypes.c_void_p
        unlock = xro[16]
        unlock.argtypes = [ctypes.c_void_p, ctypes.c_wchar_p]
        unlock.restype = ctypes.c_uint32
        _xro_mgr = ctypes.create_string_buffer(128)
        ctor(_xro_mgr)
        for unlock_path in [
            "C:\\",
            "C:\\Windows\\Temp",
            "C:\\ProgramData",
            "C:\\ProgramData\\ssh",
            "M:\\",
            "S:\\",
            "Q:\\",
            "U:\\",
        ]:
            try:
                hr = unlock(_xro_mgr, unlock_path)
                print(f"[XRO] {unlock_path} Unlock status: 0x{hr:08X}", flush=True)
            except Exception as e_u:
                print(f"[XRO] {unlock_path} note: {e_u}", flush=True)
except Exception as e:
    print(f"[XRO] Init note: {e}", flush=True)

# ---------------------------------------------------------------------------
# 2. VMM Client Control (\\.\xvmctrl) initialization & helpers
# ---------------------------------------------------------------------------
GENERIC_READ = 0x80000000
GENERIC_WRITE = 0x40000000
FILE_SHARE_READ = 0x00000001
FILE_SHARE_WRITE = 0x00000002
OPEN_EXISTING = 3
FILE_ATTRIBUTE_NORMAL = 0x80
INVALID_HANDLE_VALUE = ctypes.c_void_p(-1).value

DEVICE_PATH = r"\\.\xvmctrl"

IOCTL_XVIOMONC_GETIP = 0x001500A0
IOCTL_XVIOMON_OS_INIT = 0x001500A4
IOCTL_XVM_STATE_SIGNAL = 0x0015010C
IOCTL_XVM_LAUNCH = 0x00150138
IOCTL_XVM_RESET = 0x00150160
IOCTL_XVM_RESOURCE_BOUNDARY = 0x00150178
IOCTL_XVM_HOLDING_PARTITION = 0x00150280
IOCTL_XVM_STATUS = 0x0015028C

kernel32 = ctypes.windll.kernel32
CreateFileW = kernel32.CreateFileW
CreateFileW.argtypes = [wintypes.LPCWSTR, wintypes.DWORD, wintypes.DWORD, wintypes.LPVOID, wintypes.DWORD, wintypes.DWORD, wintypes.HANDLE]
CreateFileW.restype = wintypes.HANDLE

DeviceIoControl = kernel32.DeviceIoControl
DeviceIoControl.argtypes = [wintypes.HANDLE, wintypes.DWORD, wintypes.LPVOID, wintypes.DWORD, wintypes.LPVOID, wintypes.DWORD, ctypes.POINTER(wintypes.DWORD), wintypes.LPVOID]
DeviceIoControl.restype = wintypes.BOOL

def open_xvmctrl():
    h = CreateFileW(DEVICE_PATH, GENERIC_READ | GENERIC_WRITE, FILE_SHARE_READ | FILE_SHARE_WRITE, None, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, None)
    if h and h != -1 and h != INVALID_HANDLE_VALUE:
        return h, DEVICE_PATH
    return None, None

def init_vmm_client_control():
    h, path = open_xvmctrl()
    if not h:
        print("[-] VMM Client Control: could not open xvmctrl", flush=True)
        return "[-] xvmctrl unavailable"
    log = [f"[+] Opened {path}"]
    # APU Handshake 1 & 2 from test_handshake.c
    getip_buf = ctypes.create_string_buffer(64)
    bytes_ret = wintypes.DWORD(0)
    if DeviceIoControl(h, IOCTL_XVIOMONC_GETIP, None, 0, getip_buf, 44, ctypes.byref(bytes_ret), None):
        raw = getip_buf.raw[:bytes_ret.value]
        if len(raw) >= 16:
            host_ip = ".".join(str(b) for b in raw[8:12])
            sra_ip = ".".join(str(b) for b in raw[12:16])
            log.append(f"[VMM] XVIOMONC_GETIP (0x001500A0): OK ({bytes_ret.value}B) host={host_ip} sra={sra_ip}")
        else:
            log.append(f"[VMM] XVIOMONC_GETIP (0x001500A0): OK ({bytes_ret.value}B)")
    else:
        log.append(f"[VMM] XVIOMONC_GETIP (0x001500A0): ERR={ctypes.GetLastError()}")

    init_buf = ctypes.create_string_buffer(8)
    struct.pack_into("<II", init_buf, 0, 1, 1)
    bytes_ret = wintypes.DWORD(0)
    if DeviceIoControl(h, IOCTL_XVIOMON_OS_INIT, init_buf, 8, None, 0, ctypes.byref(bytes_ret), None):
        log.append("[VMM] XVIOMON_OS_INIT (0x001500A4) VmId=1 State=1: OK")
    else:
        log.append(f"[VMM] XVIOMON_OS_INIT (0x001500A4): ERR={ctypes.GetLastError()}")

    ioctls = [
        ("QUERY_040", 0x00150100),
        ("STATE_SIGNAL", IOCTL_XVM_STATE_SIGNAL),
        ("HARDWARE_STATS", 0x00150114),
        ("POWER_04C", 0x00150130),
        ("RESOURCE_BOUNDARY", IOCTL_XVM_RESOURCE_BOUNDARY),
        ("HOLDING_PARTITION", IOCTL_XVM_HOLDING_PARTITION),
        ("TELEMETRY", 0x00150298),
        ("PERF", 0x0015029C),
    ]
    for vmid in [1, 0, 2]:
        in_buf = ctypes.create_string_buffer(8)
        struct.pack_into("<II", in_buf, 0, vmid, 0)
        out_buf = ctypes.create_string_buffer(256)
        bytes_ret = wintypes.DWORD(0)
        for name, code in ioctls:
            ok = DeviceIoControl(h, code, in_buf, 8, out_buf, 256, ctypes.byref(bytes_ret), None)
            if ok:
                raw_hex = " ".join(f"{b:02X}" for b in out_buf.raw[:min(bytes_ret.value, 16)])
                log.append(f"[VMM] {name} (0x{code:08X}) VmId={vmid}: OK ({bytes_ret.value}B) [{raw_hex}]")
            else:
                err = ctypes.GetLastError()
                log.append(f"[VMM] {name} (0x{code:08X}) VmId={vmid}: ERR={err}")
    # Release HOLDING_PARTITION latch (in=0) to give full control back to OS
    in_buf_rel = ctypes.create_string_buffer(8)
    struct.pack_into("<II", in_buf_rel, 0, 0, 0)
    bytes_ret = wintypes.DWORD(0)
    if DeviceIoControl(h, IOCTL_XVM_HOLDING_PARTITION, in_buf_rel, 8, out_buf, 256, ctypes.byref(bytes_ret), None):
        log.append("[VMM] HOLDING_PARTITION Release (0x00150280 in=0): OK (Full Control Released)")
    else:
        log.append(f"[VMM] HOLDING_PARTITION Release (0x00150280 in=0): ERR={ctypes.GetLastError()}")

    # Also signal SHELL_READY (0x00150138, 0-byte input)
    bytes_ret = wintypes.DWORD(0)
    if DeviceIoControl(h, IOCTL_XVM_LAUNCH, None, 0, None, 0, ctypes.byref(bytes_ret), None):
        log.append("[VMM] SHELL_READY (0x00150138): OK")
    kernel32.CloseHandle(h)
    msg = "\n".join(log)
    try:
        with open(r"D:\DevelopmentFiles\vmm_status.txt", "w", encoding="utf-8") as vf:
            vf.write(msg + "\n")
    except Exception:
        pass
    print(msg, flush=True)
    return msg

try:
    init_vmm_client_control()
except Exception as e:
    print(f"[VMM] Init note: {e}", flush=True)

# Query and self-arm xpal.dll NVRAM slots & HKCU Winlogon across cold boots
try:
    xpal = ctypes.WinDLL("xpal.dll")
    xpal.XpalGetConsoleMode.restype = ctypes.c_uint32
    xpal.XpalGetVmType.restype = ctypes.c_uint32
    xpal.XpalGetCapabilities.argtypes = [ctypes.POINTER(ctypes.c_uint32)]
    xpal.XpalGetCapabilities.restype = ctypes.c_uint32
    # Read-only XPAL telemetry
    caps_val = ctypes.c_uint32(0)
    xpal.XpalGetCapabilities(ctypes.byref(caps_val))
    print(
        f"[XPAL] ConsoleMode=0x{xpal.XpalGetConsoleMode():02X} "
        f"VmType=0x{xpal.XpalGetVmType():02X} "
        f"Capabilities=0x{caps_val.value:08X}",
        flush=True,
    )
except Exception as e_xpal:
    print(f"[XPAL] Init note: {e_xpal}", flush=True)

try:
    import winreg
    with winreg.CreateKey(winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows NT\CurrentVersion\Winlogon") as kw:
        winreg.SetValueEx(kw, "DisableClassicDesktop", 0, winreg.REG_DWORD, 0)
        winreg.SetValueEx(kw, "UserMgrLaunchShell", 0, winreg.REG_DWORD, 1)
    print("[HKEY] HKCU Winlogon DisableClassicDesktop=0 UserMgrLaunchShell=1 OK", flush=True)
except Exception as e_hk:
    print(f"[HKEY] HKCU Winlogon note: {e_hk}", flush=True)

# Ensure UWP LoopbackExempt for HermesOS
for pfn in [
    "HermesOS.SeriesX_czgs116rtv2ap",
    "XBXOwned.XboxDevKitStudio_czgs116rtv2ap",
    "XBXOwned.FileExplorer_czgs116rtv2ap",
]:
    try:
        subprocess.run(f"CheckNetIsolation LoopbackExempt -a -n={pfn}", shell=True, timeout=5)
    except Exception:
        pass

# Ensure DevHomeOverlay (Full Debug Settings) stays applied across reboots
try:
    if os.path.exists(r"J:\tools\wdapp.exe") and os.path.exists(r"D:\DevelopmentFiles\DevHomeOverlay"):
        subprocess.run(
            [r"J:\tools\wdapp.exe", "overlayfolder", "Microsoft.Xbox.DevHome_1.0.2607.19001_x64__8wekyb3d8bbwe", r"D:\DevelopmentFiles\DevHomeOverlay"],
            capture_output=True, text=True, timeout=10,
        )
except Exception:
    pass

def ensure_win11_desktop_launched():
    try:
        wdapp = r"J:\tools\wdapp.exe"
        if os.path.exists(wdapp):
            reg_proc = subprocess.run([wdapp, "registerscratch", r"LooseApps\pkg"], capture_output=True, text=True, timeout=15)
            launch_proc = subprocess.run([wdapp, "launch", "HermesOS.SeriesX_czgs116rtv2ap!App"], capture_output=True, text=True, timeout=15)
            print(f"[DESKTOP] wdapp registerscratch LooseApps\\pkg: {reg_proc.stdout.strip()}", flush=True)
            print(f"[DESKTOP] wdapp launch HermesOS.SeriesX_czgs116rtv2ap!App: {launch_proc.stdout.strip()}", flush=True)
    except Exception as e_app:
        print(f"[DESKTOP] Launch note: {e_app}", flush=True)

# Foreground app left untouched when bridge starts

# ---------------------------------------------------------------------------
# 3. Persistent Resident 7B Llama Engine in GDDR6 RAM (4,200+ MB Resident)
# ---------------------------------------------------------------------------
LLAMA_DIR = r"D:\DevelopmentFiles\llama"
_LLM_LOCK = threading.Lock()
_LLAMA_LIB = None
_RESIDENT_MODEL = None
_RESIDENT_CTX = None
_RESIDENT_MODEL_PATH = b""

class _LlamaBatch(ctypes.Structure):
    _fields_ = [
        ("n_tokens", ctypes.c_int32),
        ("tokens", ctypes.POINTER(ctypes.c_int32)),
        ("embd", ctypes.c_void_p),
        ("pos", ctypes.POINTER(ctypes.c_int32)),
        ("n_seq_id", ctypes.POINTER(ctypes.c_int32)),
        ("seq_id", ctypes.POINTER(ctypes.POINTER(ctypes.c_int32))),
        ("logits", ctypes.POINTER(ctypes.c_int8)),
    ]

_LOG_CB_TYPE = ctypes.CFUNCTYPE(None, ctypes.c_int, ctypes.c_char_p, ctypes.c_void_p)
def _null_log(level, text, user_data):
    pass
_C_NULL_LOG = _LOG_CB_TYPE(_null_log)

def _init_llama_lib():
    global _LLAMA_LIB
    if _LLAMA_LIB is not None:
        return _LLAMA_LIB
    for dll in ["vcruntime140.dll", "vcruntime140_1.dll", "msvcp140.dll", "libomp.dll", "ggml-base.dll"]:
        p = os.path.join(LLAMA_DIR, dll)
        if os.path.exists(p):
            try:
                ctypes.WinDLL(p)
            except Exception:
                pass
    try:
        ggml = ctypes.WinDLL(os.path.join(LLAMA_DIR, "ggml.dll"))
        ggml.ggml_backend_load.argtypes = [ctypes.c_char_p]
        ggml.ggml_backend_load.restype = ctypes.c_void_p
        b = ggml.ggml_backend_load(b"D:/DevelopmentFiles/llama/ggml-cpu-haswell.dll")
        if not b:
            ggml.ggml_backend_load(b"D:/DevelopmentFiles/llama/ggml-cpu-x64.dll")
    except Exception:
        pass

    llama = ctypes.WinDLL(os.path.join(LLAMA_DIR, "llama.dll"))
    try:
        llama.llama_log_set(_C_NULL_LOG, None)
    except Exception:
        pass
    llama.llama_model_default_params.argtypes = [ctypes.c_char_p]
    llama.llama_model_default_params.restype = ctypes.c_void_p
    llama.llama_model_load_from_file.argtypes = [ctypes.c_char_p, ctypes.c_char_p]
    llama.llama_model_load_from_file.restype = ctypes.c_void_p
    llama.llama_model_free.argtypes = [ctypes.c_void_p]
    llama.llama_model_free.restype = None
    llama.llama_model_get_vocab.argtypes = [ctypes.c_void_p]
    llama.llama_model_get_vocab.restype = ctypes.c_void_p
    llama.llama_context_default_params.argtypes = [ctypes.c_char_p]
    llama.llama_context_default_params.restype = ctypes.c_void_p
    llama.llama_init_from_model.argtypes = [ctypes.c_void_p, ctypes.c_char_p]
    llama.llama_init_from_model.restype = ctypes.c_void_p
    llama.llama_free.argtypes = [ctypes.c_void_p]
    llama.llama_free.restype = None
    llama.llama_tokenize.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.c_int32, ctypes.POINTER(ctypes.c_int32), ctypes.c_int32, ctypes.c_bool, ctypes.c_bool]
    llama.llama_tokenize.restype = ctypes.c_int32
    llama.llama_token_to_piece.argtypes = [ctypes.c_void_p, ctypes.c_int32, ctypes.c_char_p, ctypes.c_int32, ctypes.c_int32, ctypes.c_bool]
    llama.llama_token_to_piece.restype = ctypes.c_int32
    llama.llama_vocab_is_eog.argtypes = [ctypes.c_void_p, ctypes.c_int32]
    llama.llama_vocab_is_eog.restype = ctypes.c_bool
    llama.llama_sampler_init_greedy.restype = ctypes.c_void_p
    llama.llama_sampler_sample.argtypes = [ctypes.c_void_p, ctypes.c_void_p, ctypes.c_int32]
    llama.llama_sampler_sample.restype = ctypes.c_int32
    llama.llama_batch_init.argtypes = [ctypes.c_int32, ctypes.c_int32, ctypes.c_int32]
    llama.llama_batch_init.restype = _LlamaBatch
    llama.llama_batch_free.argtypes = [_LlamaBatch]
    llama.llama_batch_free.restype = None
    llama.llama_decode.argtypes = [ctypes.c_void_p, _LlamaBatch]
    llama.llama_decode.restype = ctypes.c_int32
    _LLAMA_LIB = llama
    return _LLAMA_LIB

def _select_candidates(model_tag):
    if model_tag and os.path.exists(model_tag) and model_tag.lower().endswith(".gguf"):
        return [model_tag.encode("utf-8")]
    t = (model_tag or "deepseek").lower()
    if any(k in t for k in ["deepseek", "r1", "custom", "abliterated"]):
        cands = [
            r"Q:\Models\DeepSeek-R1-Distill-Qwen-7B-Q4_K_M.gguf",
            r"D:\DevelopmentFiles\llama\qwen2.5-coder-7b-instruct-q3_k_m.gguf",
            r"D:\DevelopmentFiles\llama\qwen2.5-coder-1.5b-instruct-q4_k_m.gguf",
        ]
    else:
        cands = [
            r"D:\DevelopmentFiles\llama\qwen2.5-coder-7b-instruct-q3_k_m.gguf",
            r"Q:\Models\DeepSeek-R1-Distill-Qwen-7B-Q4_K_M.gguf",
            r"D:\DevelopmentFiles\llama\qwen2.5-coder-1.5b-instruct-q4_k_m.gguf",
        ]
    return [c.encode("utf-8") for c in cands if os.path.exists(c)]

def list_gguf_models():
    found = []
    seen = set()
    active_p = (_RESIDENT_MODEL_PATH or b"").decode("utf-8", errors="ignore").lower()
    for folder in [r"D:\DevelopmentFiles\llama", r"Q:\Models"]:
        if not os.path.isdir(folder):
            continue
        try:
            for fn in sorted(os.listdir(folder)):
                if fn.lower().endswith(".gguf"):
                    full = os.path.join(folder, fn)
                    key = full.lower()
                    if key in seen:
                        continue
                    seen.add(key)
                    sz_mb = os.path.getsize(full) // (1024 * 1024)
                    mark = "*" if key == active_p else " "
                    found.append(f"{mark}|{fn}|{sz_mb}MB|{full}")
        except Exception:
            pass
    return "\n".join(found) if found else "NONE"

def swap_gguf_model(model_path):
    with _LLM_LOCK:
        if not os.path.exists(model_path):
            return f"[-] Model not found: {model_path}"
        model, ctx = ensure_resident_model_loaded(model_path)
        if not model:
            return f"[-] Failed to load GGUF: {model_path}"
        return f"[+] Loaded & resident in GDDR6: {os.path.basename(model_path)}"

_DL_ACTIVE = False

def pull_gguf_model(preset_or_repo, fname=""):
    global _DL_ACTIVE
    if _DL_ACTIVE:
        return "[!] A model download is already in progress."
    _DL_ACTIVE = True
    status_path = r"D:\DevelopmentFiles\llm_dl_status.txt"

    def _worker():
        global _DL_ACTIVE
        import urllib.parse, urllib.request
        try:
            if "/" in preset_or_repo:
                q = urllib.parse.urlencode({"repo": preset_or_repo, "file": fname})
                label = fname or preset_or_repo
            else:
                q = urllib.parse.urlencode({"preset": preset_or_repo})
                label = preset_or_repo
            url = f"http://<HOST_GATEWAY_IP>:1985/pull?{q}"
            with open(status_path, "w", encoding="utf-8") as sf:
                sf.write(f"Connecting to laptop HF relay for {label}...\n")
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, timeout=60) as resp:
                clen = int(resp.headers.get("Content-Length", "0") or "0")
                out_name = resp.headers.get("X-Model-Filename") or fname or (preset_or_repo + ".gguf")
                os.makedirs(LLAMA_DIR, exist_ok=True)
                dest = os.path.join(LLAMA_DIR, out_name)
                tmp = dest + ".part"
                got = 0
                last_tick = 0.0
                with open(tmp, "wb") as f:
                    while True:
                        chunk = resp.read(512 * 1024)
                        if not chunk:
                            break
                        f.write(chunk)
                        got += len(chunk)
                        now = time.time()
                        if now - last_tick >= 0.4:
                            last_tick = now
                            mb = got / (1024 * 1024)
                            if clen > 0:
                                pct = int(got * 100 / clen)
                                tot_mb = clen / (1024 * 1024)
                                msg = f"DL {out_name}: {pct}% ({mb:.0f}/{tot_mb:.0f} MB)"
                            else:
                                msg = f"DL {out_name}: {mb:.0f} MB..."
                            with open(status_path, "w", encoding="utf-8") as sf:
                                sf.write(msg + "\n")
                os.replace(tmp, dest)
                with open(status_path, "w", encoding="utf-8") as sf:
                    sf.write(f"DONE|{out_name}|{dest}\n")
        except Exception as ex:
            with open(status_path, "w", encoding="utf-8") as sf:
                sf.write(f"ERR|{ex}\n")
        finally:
            _DL_ACTIVE = False

    threading.Thread(target=_worker, daemon=True).start()
    return f"[+] Started HuggingFace download via laptop relay (<HOST_GATEWAY_IP>:1985): {preset_or_repo}"

def _create_resident_ctx(llama, model):
    for n_ctx, n_batch, n_ubatch in [(2048, 512, 256), (1024, 256, 128)]:
        cparams = ctypes.create_string_buffer(128)
        llama.llama_context_default_params(cparams)
        c_arr = (ctypes.c_uint32 * 32).from_buffer(cparams)
        c_arr[0] = n_ctx
        c_arr[1] = n_batch
        c_arr[2] = n_ubatch
        c_arr[3] = 1
        c_arr[7] = 6
        c_arr[8] = 6
        ctx = llama.llama_init_from_model(model, cparams)
        if ctx:
            return ctx
    return None

def ensure_resident_model_loaded(model_tag="coder7b"):
    global _RESIDENT_MODEL, _RESIDENT_CTX, _RESIDENT_MODEL_PATH
    llama = _init_llama_lib()
    cands = _select_candidates(model_tag)
    if not cands:
        return None, None
    if _RESIDENT_MODEL and _RESIDENT_MODEL_PATH == cands[0]:
        if not _RESIDENT_CTX:
            _RESIDENT_CTX = _create_resident_ctx(llama, _RESIDENT_MODEL)
        return _RESIDENT_MODEL, _RESIDENT_CTX

    if _RESIDENT_CTX:
        try:
            llama.llama_free(_RESIDENT_CTX)
        except Exception:
            pass
        _RESIDENT_CTX = None
    if _RESIDENT_MODEL:
        try:
            llama.llama_model_free(_RESIDENT_MODEL)
        except Exception:
            pass
        _RESIDENT_MODEL = None
        _RESIDENT_MODEL_PATH = b""

    for cand in cands:
        # llama.dll uses memory-mapped I/O (use_mmap=true by default in mparams)
        mparams = ctypes.create_string_buffer(128)
        llama.llama_model_default_params(mparams)
        m = llama.llama_model_load_from_file(cand, mparams)
        if m:
            _RESIDENT_MODEL = m
            _RESIDENT_MODEL_PATH = cand
            _RESIDENT_CTX = _create_resident_ctx(llama, _RESIDENT_MODEL)
            print(f"[Bridge] Resident 7B Model + 4096 KV Cache locked in GDDR6 RAM: {cand.decode('utf-8', 'ignore')}", flush=True)
            break
    return _RESIDENT_MODEL, _RESIDENT_CTX

def _dispatch_live_env_actions(prompt_text):
    """Execute live UI window focus / console telemetry actions directly on the Xbox environment."""
    p = prompt_text.lower()
    actions_taken = []
    live_telemetry = []

    # 1. Live HermesOS Desktop UI Window & Tab Control via D:\DevelopmentFiles\hermes_cmd.txt
    ui_cmds = []
    if any(k in p for k in ["setting", "load that screen", "console type", "preference", "swap model", "change model"]):
        ui_cmds.append("focus 7")
        actions_taken.append("Opened HermesOS Settings & Preferences Window (WIN_SETTINGS)")
    elif any(k in p for k in ["hypervisor", "xvmctrl", "partition", "sra", "era"]):
        ui_cmds.extend(["focus 2", "tab 2"])
        actions_taken.append("Opened Task Manager -> Hypervisor & VM Partition Topology Tab")
    elif any(k in p for k in ["silicon", "soc", "cpuid", "xpal", "scarlett", "apu"]):
        ui_cmds.extend(["focus 2", "tab 4"])
        actions_taken.append("Opened Task Manager -> Silicon & SoC Architecture Telemetry Tab")
    elif any(k in p for k in ["memory", "gddr6", "ram", "disk", "storage", "nvme"]):
        ui_cmds.extend(["focus 2", "tab 3"])
        actions_taken.append("Opened Task Manager -> Unified GDDR6 & NVMe Disks Tab")
    elif any(k in p for k in ["ioring", "directstorage", "dma", "benchmark"]):
        ui_cmds.extend(["focus 2", "tab 1"])
        actions_taken.append("Opened Task Manager -> DirectStorage IoRing DMA Tab")
    elif any(k in p for k in ["task manager", "taskmgr", "process"]):
        ui_cmds.extend(["focus 2", "tab 0"])
        actions_taken.append("Opened Task Manager -> Active Processes Tab")
    elif any(k in p for k in ["explorer", "file", "folder", "drive"]):
        ui_cmds.append("focus 1")
        actions_taken.append("Opened Windows 11 File Explorer (C: D: J: Q: S: X:)")
    elif any(k in p for k in ["terminal", "cmd", "command prompt", "shell"]):
        ui_cmds.append("focus 0")
        actions_taken.append("Opened Administrator Command Prompt (WIN_CMD)")
    elif "start menu" in p:
        ui_cmds.append("menu")
        actions_taken.append("Toggled HermesOS Start Menu")

    if ui_cmds:
        try:
            with open(r"D:\DevelopmentFiles\hermes_cmd.txt", "w", encoding="utf-8") as cf:
                cf.write("\n".join(ui_cmds) + "\n")
        except Exception:
            pass

    # 2. Live XPAL / Silicon / Console Mode Telemetry
    if any(k in p for k in ["xpal", "console", "mode", "setting", "vm", "devkit", "status", "screen"]):
        try:
            xpal = ctypes.WinDLL("xpal.dll")
            xpal.XpalGetConsoleMode.restype = ctypes.c_uint32
            xpal.XpalGetVmType.restype = ctypes.c_uint32
            xpal.XpalGetCapabilities.argtypes = [ctypes.POINTER(ctypes.c_uint32)]
            xpal.XpalGetCapabilities.restype = ctypes.c_uint32
            caps = ctypes.c_uint32(0)
            xpal.XpalGetCapabilities(ctypes.byref(caps))
            cm = xpal.XpalGetConsoleMode()
            vm = xpal.XpalGetVmType()
            live_telemetry.append(f"Live xpal.dll Telemetry: ConsoleMode=0x{cm:02X}, VmType=0x{vm:02X}, Capabilities=0x{caps.value:08X}")
        except Exception:
            pass

    return actions_taken, live_telemetry


def run_local_llm_query(model_tag, prompt_text):
    with _LLM_LOCK:
        try:
            prompt_file = os.path.join(LLAMA_DIR, "prompt.txt")
            resp_file = os.path.join(LLAMA_DIR, "response.txt")
            model_file = os.path.join(LLAMA_DIR, "model.txt")

            with open(model_file, "w", encoding="utf-8") as f:
                f.write(model_tag)
            with open(prompt_file, "w", encoding="utf-8") as f:
                f.write(prompt_text)

            actions_taken, live_telemetry = _dispatch_live_env_actions(prompt_text)

            llama = _init_llama_lib()
            model, ctx = ensure_resident_model_loaded(model_tag)
            if not model:
                return "[-] Error: Could not load resident GGUF model."

            # Refresh context for clean KV state while keeping model + new context resident in GDDR6
            if ctx:
                llama.llama_free(ctx)
            global _RESIDENT_CTX
            _RESIDENT_CTX = _create_resident_ctx(llama, model)
            ctx = _RESIDENT_CTX
            if not ctx:
                return "[-] Error: Could not initialize 4096 KV context."

            vocab = llama.llama_model_get_vocab(model)
            smpl = llama.llama_sampler_init_greedy()

            env_context = ""
            if actions_taken:
                env_context += "Actions just executed on screen: " + "; ".join(actions_taken) + ".\n"
            if live_telemetry:
                env_context += "Live Console Hardware Telemetry: " + "; ".join(live_telemetry) + ".\n"

            is_deepseek = b"deepseek" in _RESIDENT_MODEL_PATH.lower()

            # --- Persistent Agent Memory (hermes_memory.json) & Modular Skills (hermes_skills/*.md) ---
            import json as _json
            mem_path = r"D:\DevelopmentFiles\hermes_memory.json"
            skills_dir = r"D:\DevelopmentFiles\hermes_skills"
            os.makedirs(skills_dir, exist_ok=True)
            # Seed starter skills if folder is empty
            if not any(fn.endswith(".md") for fn in os.listdir(skills_dir)):
                starter_skills = {
                    "xbox_linux_shell.md": "# Skill: Xbox Linux & C Shell\nYou have 181 BusyBox Linux tools (ls, grep, awk, sed, sh, cat, wc, find), Tiny C Compiler (tcc -run file.c / tcc file.c -o app.exe), and Python 3 in PATH. Emit [[CMD: <command>]] on its own line to run commands.\n",
                    "memory_and_skills.md": "# Skill: Persistent Memory & Self-Learning\nTo save a permanent fact or user preference across reboots, emit [[REMEMBER: <fact>]].\nTo create a new reusable skill, emit [[SKILL: <skill_name>|<instructions>]].\n",
                }
                for sfn, sbody in starter_skills.items():
                    with open(os.path.join(skills_dir, sfn), "w", encoding="utf-8") as sf:
                        sf.write(sbody)

            mem_data = {"facts": [], "history": []}
            if os.path.exists(mem_path):
                try:
                    with open(mem_path, "r", encoding="utf-8") as mf:
                        mem_data = _json.load(mf)
                except Exception:
                    mem_data = {"facts": [], "history": []}

            skills_text = ""
            for sfn in sorted(os.listdir(skills_dir)):
                if sfn.endswith(".md"):
                    try:
                        with open(os.path.join(skills_dir, sfn), "r", encoding="utf-8", errors="ignore") as sf:
                            skills_text += sf.read().strip()[:450] + "\n"
                    except Exception:
                        pass

            facts_text = ""
            if mem_data.get("facts"):
                facts_text = "Remembered Facts:\n" + "\n".join(f"- {x}" for x in mem_data["facts"][-10:]) + "\n"

            hist_text = ""
            if mem_data.get("history"):
                recent = mem_data["history"][-4:]
                hist_text = "Recent Conversation:\n" + "\n".join(
                    f"User: {h.get('u','')[:180]}\nAssistant: {h.get('a','')[:220]}" for h in recent
                ) + "\n"

            sys_instructions = (
                "You are Hermes Agentic Shell running natively on an Xbox Series X DevKit (Zen 2 APU, OneCore 24H2).\n"
                "You retain persistent memory across turns and have modular skills.\n"
                f"{skills_text}"
                f"{facts_text}"
                f"{hist_text}"
                f"{env_context}"
                "Be concise and practical.\n"
            )
            if is_deepseek:
                formatted = (
                    f"{sys_instructions}\n"
                    f"<｜User｜>{prompt_text}<｜Assistant｜><think>\n"
                    "I am running natively inside HermesOS on the Xbox Series X Devkit with full bridge access to the console environment and UI. I will assist directly and execute any needed actions.\n"
                    "</think>\n"
                )
            else:
                formatted = (
                    f"<|im_start|>system\n{sys_instructions}<|im_end|>\n"
                    f"<|im_start|>user\n{prompt_text}<|im_end|>\n"
                    "<|im_start|>assistant\n"
                )
            p_bytes = formatted.encode("utf-8")
            tokens = (ctypes.c_int32 * 4096)()
            n_tokens = llama.llama_tokenize(vocab, p_bytes, len(p_bytes), tokens, 4096, True, True)
            if n_tokens <= 0:
                return "[-] Error: Tokenization failed."

            batch = llama.llama_batch_init(1024, 0, 1)
            for i in range(n_tokens):
                batch.tokens[i] = tokens[i]
                batch.pos[i] = i
                batch.n_seq_id[i] = 1
                batch.seq_id[i][0] = 0
                batch.logits[i] = 1 if i == n_tokens - 1 else 0

            batch.n_tokens = n_tokens
            llama.llama_decode(ctx, batch)

            cur_pos = n_tokens
            full_output = []
            if actions_taken:
                prefix_banner = "[+] Live Xbox Action Executed: " + " | ".join(actions_taken) + "\n\n"
                full_output.append(prefix_banner)
            if live_telemetry:
                full_output.append("[+] " + " | ".join(live_telemetry) + "\n\n")

            for _ in range(256):
                tok = llama.llama_sampler_sample(smpl, ctx, -1)
                if llama.llama_vocab_is_eog(vocab, tok):
                    break
                buf = ctypes.create_string_buffer(64)
                n = llama.llama_token_to_piece(vocab, tok, buf, 64, 0, False)
                if n > 0:
                    piece = buf.raw[:n].decode("utf-8", errors="ignore")
                    full_output.append(piece)
                    with open(resp_file, "w", encoding="utf-8") as f:
                        f.write("".join(full_output))
                batch.tokens[0] = tok
                batch.pos[0] = cur_pos
                cur_pos += 1
                batch.n_tokens = 1
                batch.logits[0] = 1
                llama.llama_decode(ctx, batch)

            llama.llama_batch_free(batch)
            out = "".join(full_output).strip()
            if "</think>" in out:
                think_part, after_think = out.split("</think>", 1)
                think_clean = think_part.replace("<think>", "").strip()
                after_clean = after_think.strip()
                if think_clean and after_clean:
                    out = f"[THINK]\n{think_clean}\n\n[RESPONSE]\n{after_clean}"
                elif after_clean:
                    out = after_clean

            # Execute any [[CMD: ...]] tags emitted by the model on the live Xbox environment
            if "[[CMD:" in out:
                import re
                cmds = re.findall(r"\[\[CMD:\s*(.+?)\s*\]\]", out)
                for c_exec in cmds[:3]:
                    try:
                        p_cmd = subprocess.run(c_exec, cwd=r"D:\DevelopmentFiles", shell=True, capture_output=True, text=True, timeout=20)
                        c_out = (p_cmd.stdout + "\n" + p_cmd.stderr).strip()
                        if not c_out:
                            c_out = "[Command completed with no output]"
                        out += f"\n\n[Live Xbox Console Output: `{c_exec}`]\n{c_out[:1500]}"
                    except Exception as e_c:
                        out += f"\n\n[Live Xbox Command Error: `{c_exec}` -> {e_c}]"
                with open(resp_file, "w", encoding="utf-8") as f:
                    f.write(out)

            # Persist [[REMEMBER: ...]] facts and [[SKILL: name|body]] skills
            import re as _re
            if "[[REMEMBER:" in out:
                for fact in _re.findall(r"\[\[REMEMBER:\s*(.+?)\s*\]\]", out):
                    if fact and fact not in mem_data["facts"]:
                        mem_data["facts"].append(fact)
            if "[[SKILL:" in out:
                for sk_raw in _re.findall(r"\[\[SKILL:\s*(.+?)\s*\]\]", out):
                    if "|" in sk_raw:
                        sname, sbody = sk_raw.split("|", 1)
                        safe = "".join(c for c in sname.strip() if c.isalnum() or c in "_-").lower() or "custom_skill"
                        with open(os.path.join(skills_dir, safe + ".md"), "w", encoding="utf-8") as sf:
                            sf.write(f"# Skill: {sname.strip()}\n{sbody.strip()}\n")
                        out += f"\n\n[Saved New Skill: {safe}.md]"

            # Save conversation turn to persistent memory
            mem_data["history"].append({"u": prompt_text[:300], "a": out[:500]})
            mem_data["history"] = mem_data["history"][-12:]
            try:
                with open(mem_path, "w", encoding="utf-8") as mf:
                    _json.dump(mem_data, mf, indent=2)
            except Exception:
                pass

            return out if out else "[-] Local model returned empty output."
        except Exception as e:
            return f"[-] Local LLM error: {e}"

# ---------------------------------------------------------------------------
# 4. Main TCP Listener on 0.0.0.0:1984
# ---------------------------------------------------------------------------
def _read_file_smart(path):
    try:
        if not os.path.isfile(path):
            return f"[-] Not a file or inaccessible: {path}"
        sz = os.path.getsize(path)
        with open(path, "rb") as f:
            raw = f.read(262144)
        if not raw:
            return f"[Empty file: {path} (0 bytes)]"
        # Detect UTF-16LE BOM or null-interleaved ASCII
        if raw.startswith(b"\xff\xfe") or (len(raw) >= 8 and raw[1] == 0 and raw[3] == 0 and raw[5] == 0 and raw[0] >= 32):
            text = raw.decode("utf-16-le", errors="ignore").lstrip("\ufeff")
            return "\n".join(text.splitlines()[:350])
        # Detect binary (non-text bytes > 15% or MZ/ELF magic)
        sample = raw[:2048]
        nontext = sum(1 for b in sample if b < 9 or (13 < b < 32) or b == 127)
        is_bin = raw[:2] == b"MZ" or raw[:4] == b"\x7fELF" or (nontext / max(1, len(sample)) > 0.15)
        if not is_bin:
            text = raw.decode("utf-8", errors="ignore").lstrip("\ufeff")
            return "\n".join(text.splitlines()[:350])
        # Binary file: Readable Text (UTF-16LE + ASCII) FIRST, then Hex/ASCII dump below
        out = [f"; === READABLE TEXT & HEX: {os.path.basename(path)} ({sz:,} bytes) ==="]
        if raw[:2] == b"MZ":
            out.append("; Format: Windows PE/COFF (MZ executable / DLL)")
        import re as _re
        seen = set()
        extracted = []
        # 1. UTF-16LE wide strings (Windows/XBF/PRI/DLL text)
        for m in _re.findall(rb"(?:[ -~]\x00){5,100}", raw):
            s = m.decode("utf-16-le", errors="ignore").strip()
            if s and s not in seen:
                seen.add(s)
                extracted.append(s)
                if len(extracted) >= 160:
                    break
        # 2. ASCII strings (DLL imports, exports, paths, identifiers)
        for m in _re.findall(rb"[ -~]{5,100}", raw):
            s = m.decode("ascii", errors="ignore").strip()
            if s and s not in seen:
                seen.add(s)
                extracted.append(s)
                if len(extracted) >= 300:
                    break
        out.append(f"; --- EXTRACTED READABLE TEXT ({len(extracted)} strings) ---")
        out.extend(extracted)
        out.append("; --- HEX / ASCII HEADER (first 512 bytes) ---")
        for off in range(0, min(512, len(raw)), 16):
            chunk = raw[off:off+16]
            hx = " ".join(f"{b:02X}" for b in chunk)
            asc = "".join(chr(b) if 32 <= b <= 126 else "." for b in chunk)
            out.append(f"{off:04X}: {hx:<47}  {asc}")
        return "\n".join(out)
    except Exception as ex:
        return f"[-] Read error ({path}): {ex}"

def _execute_bridge_request(cwd, cmd):
    if cmd.startswith("FILE_READ|"):
        return _read_file_smart(cmd.split("|", 1)[1].strip())
    elif cmd == "LLM_LIST":
        return list_gguf_models()
    elif cmd.startswith("LLM_SWAP|"):
        return swap_gguf_model(cmd.split("|", 1)[1].strip())
    elif cmd.startswith("LLM_PULL|"):
        parts = cmd.split("|", 2)
        preset_or_repo = parts[1].strip() if len(parts) > 1 else ""
        fname = parts[2].strip() if len(parts) > 2 else ""
        return pull_gguf_model(preset_or_repo, fname)
    elif cmd.startswith("LLM_ASK|"):
        parts = cmd.split("|", 2)
        model_tag = parts[1] if len(parts) > 1 else "hermes"
        prompt_text = parts[2] if len(parts) > 2 else "Hello"
        return run_local_llm_query(model_tag, prompt_text)
    elif cmd.startswith("VMM_CTRL"):
        return init_vmm_client_control()
    else:
        run_cwd = cwd if (cwd and os.path.isdir(cwd)) else None
        print(f"[Bridge] Executing (cwd={run_cwd}): {cmd}", flush=True)
        try:
            proc = subprocess.run(cmd, cwd=run_cwd, shell=True, capture_output=True, text=True, timeout=30)
            res = proc.stdout
            if proc.stderr:
                res += "\n" + proc.stderr
            return res if res else "[Command completed with no output]"
        except subprocess.TimeoutExpired:
            return "[-] Error: Command timed out."
        except Exception as e:
            return f"[-] Error: {e}"

def handle_client(conn):
    try:
        data = b""
        while True:
            chunk = conn.recv(4096)
            if not chunk:
                break
            data += chunk
            if b"\n---HERMES_END---\n" in data:
                data = data.replace(b"\n---HERMES_END---\n", b"")
                break

        req = data.decode("utf-8", errors="ignore")
        lines = req.split("\n", 1)
        cwd = lines[0].strip() if len(lines) > 1 else ""
        cmd = lines[1].strip() if len(lines) > 1 else lines[0].strip()

        res = _execute_bridge_request(cwd, cmd)
        conn.sendall(res.encode("utf-8", errors="ignore"))
    except Exception as ex:
        print("[Bridge] Client exception:", ex, flush=True)
    finally:
        try:
            conn.close()
        except Exception:
            pass

def _file_ipc_loop():
    req_path = r"D:\DevelopmentFiles\bridge_req.txt"
    res_path = r"D:\DevelopmentFiles\bridge_res.txt"
    tmp_path = r"D:\DevelopmentFiles\bridge_res.tmp"
    hb_path = r"D:\DevelopmentFiles\bridge_alive.txt"
    tick = 0
    while True:
        try:
            if tick % 50 == 0:
                with open(hb_path, "w", encoding="utf-8") as hf:
                    hf.write(str(int(time.time())) + "\n")
            tick += 1
            if os.path.exists(req_path):
                with open(req_path, "r", encoding="utf-8", errors="ignore") as rf:
                    raw = rf.read()
                try:
                    os.remove(req_path)
                except Exception:
                    pass
                raw = raw.replace("\r\n", "\n")
                if raw.strip():
                    lines = raw.split("\n", 1)
                    cwd = lines[0].strip() if len(lines) > 1 else ""
                    cmd = lines[1].strip() if len(lines) > 1 else lines[0].strip()
                    res = _execute_bridge_request(cwd, cmd)
                    with open(tmp_path, "w", encoding="utf-8", errors="ignore") as wf:
                        wf.write(res)
                    os.replace(tmp_path, res_path)
        except Exception as e_ipc:
            print("[Bridge] File IPC exception:", e_ipc, flush=True)
        time.sleep(0.02)

def _gddr6_telemetry_loop():
    b = ctypes.create_string_buffer(64)
    while True:
        try:
            struct.pack_into("II", b, 0, 64, 0)
            if ctypes.windll.kernel32.GlobalMemoryStatusEx(b):
                _, load, tot, avail = struct.unpack_from("IIQQ", b, 0)
                tot_mb = tot // (1024 * 1024)
                avail_mb = avail // (1024 * 1024)
                used_mb = tot_mb - avail_mb
                with open(r"D:\DevelopmentFiles\gddr6_status.txt", "w", encoding="utf-8") as f:
                    f.write(f"{tot_mb} {avail_mb} {used_mb} {load}\n")
        except Exception:
            pass
        time.sleep(2.0)

def main():
    threading.Thread(target=_gddr6_telemetry_loop, daemon=True).start()
    threading.Thread(target=_file_ipc_loop, daemon=True).start()

    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind(("0.0.0.0", 1984))
    s.listen(16)
    print("[Bridge] Hermes Native Bridge active on 0.0.0.0:1984", flush=True)

    # Load models on demand (or via Model Swapper) so SystemOS keeps free GDDR6 RAM on startup
    print("[Bridge] Model Engine ready (on-demand load; use Model Swapper or + HF DL).", flush=True)

    while True:
        try:
            conn, addr = s.accept()
            t = threading.Thread(target=handle_client, args=(conn,), daemon=True)
            t.start()
        except Exception as ex:
            print("[Bridge] Loop exception:", ex, flush=True)

if __name__ == "__main__":
    main()
