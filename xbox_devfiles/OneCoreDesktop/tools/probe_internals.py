import os, ctypes, struct

print("=== PROBING XBOX LOCAL NAMED PIPES ===")
kernel32 = ctypes.windll.kernel32

try:
    pipes = os.listdir(r"\\.\pipe")
    print(f"Discovered {len(pipes)} named pipes via os.listdir:")
    for p in sorted(pipes):
        print(f"  [Named Pipe] \\\\.\\pipe\\{p}")
except Exception as e:
    print("os.listdir failed:", e)

print("\n=== PROBING ACCESSIBLE HARDWARE DEVICE HANDLES ===")
devices = [
    r"\\.\srakmd", r"\\.\PetraXC", r"\\.\pspsra", r"\\.\xrfs",
    r"\\.\xvbus", r"\\.\xvmctrl", r"\\.\PHYSICALDRIVE0",
    r"\\.\XVDD", r"\\.\XboxGIP", r"\\.\bindflt", r"\\.\UnionFS",
    r"\\.\GLOBALROOT\Device\Harddisk0\DR0",
    r"\\.\GLOBALROOT\Device\SraKmd",
    r"\\.\GLOBALROOT\Device\PetraXC",
    r"\\.\GLOBALROOT\Device\Pspsra",
    r"\\.\GLOBALROOT\Device\XrfsControl",
    r"\\.\GLOBALROOT\Device\Xvbus",
    r"\\.\GLOBALROOT\Device\Xvmctrl"
]
GENERIC_READ = 0x80000000
GENERIC_WRITE = 0x40000000
OPEN_EXISTING = 3
FILE_SHARE_READ = 1
FILE_SHARE_WRITE = 2

for dev in devices:
    h = kernel32.CreateFileW(
        dev,
        GENERIC_READ,
        FILE_SHARE_READ | FILE_SHARE_WRITE,
        None,
        OPEN_EXISTING,
        0,
        None
    )
    err = kernel32.GetLastError()
    if h != -1:
        print(f"  [OPEN SUCCESS!] {dev} -> Handle: 0x{h:X}")
        kernel32.CloseHandle(h)
    else:
        status = "ACCESS_DENIED (Driver Registered!)" if err == 5 else f"Err {err}"
        print(f"  [CHECK] {dev} -> {status}")
