import ctypes
import os
import struct

print("==================================================", flush=True)
print("[*] Initiating Full VMM Partition Control Sequence", flush=True)
print("==================================================", flush=True)

# 1. Step One: XRO Filter unlock with TheArchitect cert context
xro_dll = r"J:\tools\xrofilter.dll" if os.path.exists(r"J:\tools\xrofilter.dll") else r"D:\DevelopmentFiles\xrofilter.dll"
if os.path.exists(xro_dll):
    try:
        xro = ctypes.WinDLL(xro_dll)
        ctor = xro[1]
        ctor.argtypes = [ctypes.c_void_p]
        ctor.restype = ctypes.c_void_p
        unlock = xro[16]
        unlock.argtypes = [ctypes.c_void_p, ctypes.c_wchar_p]
        unlock.restype = ctypes.c_uint32

        mgr = ctypes.create_string_buffer(64)
        ctor(mgr)
        
        res_c = unlock(mgr, "C:\\")
        print(f"[XRO] Unlock C:\\ -> 0x{res_c:08X}", flush=True)
        try:
            res_m = unlock(mgr, "M:\\")
            print(f"[XRO] Unlock M:\\ -> 0x{res_m:08X}", flush=True)
        except Exception as e:
            print(f"[XRO] M:\\ note: {e}", flush=True)
    except Exception as e:
        print(f"[-] XRO unlock exception: {e}", flush=True)
else:
    print("[-] XRO DLL not found in expected paths", flush=True)

# 2. Step Two: VMM Controller IOCTL sequences
GENERIC_READ = 0x80000000
GENERIC_WRITE = 0x40000000
FILE_SHARE_READ = 1
FILE_SHARE_WRITE = 2
OPEN_EXISTING = 3
FILE_ATTRIBUTE_NORMAL = 0x80

h = ctypes.windll.kernel32.CreateFileW(
    r"\\.\xvmctrl",
    GENERIC_READ | GENERIC_WRITE,
    FILE_SHARE_READ | FILE_SHARE_WRITE,
    None,
    OPEN_EXISTING,
    FILE_ATTRIBUTE_NORMAL,
    None
)

if h == -1:
    print("[-] Failed to open \\\\.\\xvmctrl", flush=True)
else:
    print("[+] Successfully opened \\\\.\\xvmctrl", flush=True)

    # Sequence of state & boundary signals
    # Target VmId 1 (SRA), 0 (Host), 2 (ERA)
    for vmid in [1, 0, 2]:
        in_buf = ctypes.create_string_buffer(512)
        struct.pack_into("<I", in_buf, 0, vmid)
        out_buf = ctypes.create_string_buffer(512)
        bytes_ret = ctypes.c_ulong(0)

        # 0x0015010C: IOCTL_XVM_STATE_SIGNAL
        ok = ctypes.windll.kernel32.DeviceIoControl(
            h, 0x0015010C, in_buf, ctypes.sizeof(in_buf), out_buf, ctypes.sizeof(out_buf), ctypes.byref(bytes_ret), None
        )
        if ok:
            print(f"[VMM] STATE_SIGNAL for VmId {vmid} -> SUCCESS", flush=True)

        # 0x00150178: IOCTL_XVM_RESOURCE_BOUNDARY
        ok = ctypes.windll.kernel32.DeviceIoControl(
            h, 0x00150178, in_buf, ctypes.sizeof(in_buf), out_buf, ctypes.sizeof(out_buf), ctypes.byref(bytes_ret), None
        )
        if ok:
            print(f"[VMM] RESOURCE_BOUNDARY for VmId {vmid} -> SUCCESS", flush=True)

        # 0x00150280: IOCTL_XVM_HOLDING_PARTITION
        ok = ctypes.windll.kernel32.DeviceIoControl(
            h, 0x00150280, in_buf, ctypes.sizeof(in_buf), out_buf, ctypes.sizeof(out_buf), ctypes.byref(bytes_ret), None
        )
        if ok:
            print(f"[VMM] HOLDING_PARTITION for VmId {vmid} -> SUCCESS", flush=True)

    # Step 2b: Release Holding Partition latch (in=0) to yield execution & give full control
    in_release = ctypes.create_string_buffer(512)
    struct.pack_into("<I", in_release, 0, 0)
    ok_rel = ctypes.windll.kernel32.DeviceIoControl(
        h, 0x00150280, in_release, ctypes.sizeof(in_release), out_buf, ctypes.sizeof(out_buf), ctypes.byref(bytes_ret), None
    )
    if ok_rel:
        print("[VMM] HOLDING_PARTITION Release (in=0) -> SUCCESS (Partition control released)", flush=True)

    ctypes.windll.kernel32.CloseHandle(h)
    print("[+] VMM IOCTL sequence complete.", flush=True)

# 3. Step Three: Drive Read/Write Probe Test
print("[*] Probing Write Permissions across drives...", flush=True)
for letter in ["C", "D", "M", "Q", "S", "T", "U", "V", "X", "Y"]:
    drive = f"{letter}:\\"
    if os.path.exists(drive):
        can_read = False
        can_write = False
        err = ""
        try:
            os.listdir(drive)
            can_read = True
        except Exception as e:
            err = str(e)

        test_file = os.path.join(drive, "vmm_write_test.tmp")
        try:
            with open(test_file, "w") as f:
                f.write("PERSISTENT_CONTROL_OK")
            os.remove(test_file)
            can_write = True
        except Exception as e:
            err = str(e)

        w_str = "WRITE: ENABLED" if can_write else f"WRITE: RESTRICTED ({err})"
        print(f"  Drive {drive} -> Read: {'OK' if can_read else 'NO'} | {w_str}", flush=True)

print("==================================================", flush=True)
