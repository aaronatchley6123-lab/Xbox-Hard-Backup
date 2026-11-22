import ctypes
import os

print("====================================================")
print("[*] Probing Active Windows Display Sessions & HWNDs...")
print("====================================================")

user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32

# Check GetDesktopWindow
hwnd_desktop = user32.GetDesktopWindow()
print(f"[+] GetDesktopWindow(): {hwnd_desktop:#x}")

# Check EnumWindows / visible windows
windows = []
def enum_cb(hwnd, lparam):
    if user32.IsWindowVisible(hwnd):
        length = user32.GetWindowTextLengthW(hwnd)
        buf = ctypes.create_unicode_buffer(length + 1)
        user32.GetWindowTextW(hwnd, buf, length + 1)
        windows.append((hwnd, buf.value))
    return True

WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_void_p, ctypes.c_void_p)
try:
    user32.EnumWindows(WNDENUMPROC(enum_cb), 0)
    print(f"[+] Found {len(windows)} visible windows:")
    for w in windows:
        print(f"    HWND: {w[0]:#x} -> Title: '{w[1]}'")
except Exception as e:
    print(f"[-] EnumWindows failed: {e}")

# Check DirectComposition Target
# DCompositionCreateTargetForHwnd
dcomp = ctypes.WinDLL("dcomp.dll")
print(f"[+] dcomp.dll loaded at: {dcomp._handle:#x}")

