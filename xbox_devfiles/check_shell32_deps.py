import ctypes
import os

kernel32 = ctypes.windll.kernel32

# Find case-insensitive shell32 imports using objdump output on Kali or manual test
# Let's test the direct dependencies of Windows 11 24H2 shell32.dll:
deps = [
    "msvcp_win.dll",
    "api-ms-win-core-sysinfo-l1-1-0.dll",
    "api-ms-win-core-errorhandling-l1-1-0.dll",
    "api-ms-win-core-processthreads-l1-1-0.dll",
    "api-ms-win-core-processthreads-l1-1-1.dll",
    "api-ms-win-core-profile-l1-1-0.dll",
    "api-ms-win-core-interlocked-l1-1-0.dll",
    "api-ms-win-core-debug-l1-1-0.dll",
    "api-ms-win-core-libraryloader-l1-2-0.dll",
    "api-ms-win-core-heap-l1-1-0.dll",
    "api-ms-win-core-synch-l1-1-0.dll",
    "api-ms-win-core-synch-l1-2-0.dll",
    "api-ms-win-core-threadpool-l1-2-0.dll",
    "api-ms-win-core-handle-l1-1-0.dll",
    "api-ms-win-core-registry-l1-1-0.dll",
    "api-ms-win-core-com-l1-1-0.dll",
    "api-ms-win-core-winrt-string-l1-1-0.dll",
    "api-ms-win-core-winrt-l1-1-0.dll",
    "api-ms-win-core-localization-l1-2-0.dll",
    "api-ms-win-core-string-l1-1-0.dll",
    "api-ms-win-core-file-l1-1-0.dll",
    "api-ms-win-core-file-l1-2-0.dll",
    "api-ms-win-core-io-l1-1-0.dll",
    "api-ms-win-core-memory-l1-1-0.dll",
    "api-ms-win-core-timezone-l1-1-0.dll",
    "api-ms-win-core-path-l1-1-0.dll",
    "api-ms-win-core-shlwapi-legacy-l1-1-0.dll",
    "api-ms-win-shcore-scaling-l1-1-1.dll",
    "api-ms-win-security-base-l1-1-0.dll",
    "api-ms-win-security-sddl-l1-1-0.dll",
    "api-ms-win-eventing-provider-l1-1-0.dll",
    "ntdll.dll",
    "KernelBase.dll",
    "ucrtbase.dll",
    "GDI32.dll",
    "USER32.dll",
    "SHCore.dll",
    "shlwapi.dll",
    "windows.storage.dll",
    "propsys.dll",
    "uxtheme.dll",
    "dcomp.dll",
    "twinui.dll"
]

print("Testing individual dependencies:")
for d in deps:
    p = os.path.join(r"D:\Windows\System32", d)
    if not os.path.exists(p):
        p = d
    h = kernel32.LoadLibraryW(p)
    err = kernel32.GetLastError()
    if not h or err != 0:
        print(f"  FAILED: {d:35s} -> Handle={hex(h if h else 0)} Error={err}")
    else:
        print(f"  OK:     {d:35s} -> Handle={hex(h)}")
