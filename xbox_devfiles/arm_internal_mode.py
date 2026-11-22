import winreg
import ctypes
import struct

print("====================================================")
print("[*] Elevating to Internal Devkit (Mode 200 / TheArchitect)")
print("====================================================")

# 1. Flip DisableClassicDesktop to 0 in System Policies
print("[*] Step 1: Disabling Classic Desktop restriction...")
policy_path = r"SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System"
try:
    with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, policy_path, 0, winreg.KEY_SET_VALUE | winreg.KEY_WOW64_64KEY) as k:
        winreg.SetValueEx(k, "DisableClassicDesktop", 0, winreg.REG_DWORD, 0)
        print("  [+] Successfully set HKLM DisableClassicDesktop = 0!")
except Exception as e:
    print(f"  [-] HKLM write note: {e}")

# Also set in HKCU
try:
    with winreg.CreateKey(winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Policies\System") as k:
        winreg.SetValueEx(k, "DisableClassicDesktop", 0, winreg.REG_DWORD, 0)
        print("  [+] Successfully set HKCU DisableClassicDesktop = 0!")
except Exception as e:
    print(f"  [-] HKCU write note: {e}")

# 2. Update NVRAM Slot 0x27 to Internal / Mode 13
xpal = ctypes.WinDLL("xpal.dll")
fn_set = xpal.XpalSetXConfig
fn_set.restype = ctypes.c_uint32

print("\n[*] Step 2: Locking Slot 0x27 to Mode 6 / 0x8001...")
buf_27 = (ctypes.c_ubyte * 4).from_buffer_copy(struct.pack("<I", 6))
fn_set(0x27, buf_27, 4)

# 3. Transmit Hypervisor Transition Signals
print("\n[*] Step 3: Signaling Hypervisor with Internal Studio Mask (0x6001 / 0x8001)...")
h = ctypes.windll.kernel32.CreateFileW(
    r"\\.\xvmctrl",
    0xC0000000, 3, None, 3, 0x80, None
)

if h != -1 and h != 0xFFFFFFFFFFFFFFFF:
    in_buf = ctypes.create_string_buffer(512)
    # Target 6, Mask 0x6001 (Internal Studio) / 0x8001
    struct.pack_into("<II", in_buf, 0, 6, 0x6001)
    out_buf = ctypes.create_string_buffer(512)
    ret = ctypes.c_ulong(0)

    ok1 = ctypes.windll.kernel32.DeviceIoControl(h, 0x0015010C, in_buf, 512, out_buf, 512, ctypes.byref(ret), None)
    ok2 = ctypes.windll.kernel32.DeviceIoControl(h, 0x00150178, in_buf, 512, out_buf, 512, ctypes.byref(ret), None)
    ok3 = ctypes.windll.kernel32.DeviceIoControl(h, 0x00150280, in_buf, 512, out_buf, 512, ctypes.byref(ret), None)

    print(f"  STATE_SIGNAL (0x6001): {'SUCCESS' if ok1 else 'FAILED'}")
    print(f"  RESOURCE_BOUNDARY (0x6001): {'SUCCESS' if ok2 else 'FAILED'}")
    print(f"  HOLDING_PARTITION (0x6001): {'SUCCESS' if ok3 else 'FAILED'}")
    ctypes.windll.kernel32.CloseHandle(h)

print("\n====================================================")
print("[🎉 SUCCESS] INTERNAL DEVKIT ELEVATION COMPLETE!")
print("====================================================")
