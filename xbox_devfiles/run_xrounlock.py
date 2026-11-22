import ctypes
from ctypes import wintypes

# Load xrofilter.dll
xro = ctypes.WinDLL("J:\\tools\\xrofilter.dll")

# ??0XRoDirectoryManager@@QEAA@XZ (Constructor)
# ??1XRoDirectoryManager@@QEAA@XZ (Destructor)
# ?Unlock@XRoDirectoryManager@@QEAAJPEBG@Z (HRESULT Unlock(const wchar_t* pszPath))
# ?PersistUnlock@XRoDirectoryManager@@QEAAJPEBG@Z (HRESULT PersistUnlock(const wchar_t* pszPath))
# ?LockAll@XRoDirectoryManager@@QEAAJXZ (HRESULT LockAll())

mgr_ctor = getattr(xro, "??0XRoDirectoryManager@@QEAA@XZ")
mgr_dtor = getattr(xro, "??1XRoDirectoryManager@@QEAA@XZ")
mgr_unlock = getattr(xro, "?Unlock@XRoDirectoryManager@@QEAAJPEBG@Z")
mgr_persist_unlock = getattr(xro, "?PersistUnlock@XRoDirectoryManager@@QEAAJPEBG@Z")
mgr_lockall = getattr(xro, "?LockAll@XRoDirectoryManager@@QEAAJXZ")

mgr_ctor.argtypes = [ctypes.c_void_p]
mgr_ctor.restype = ctypes.c_void_p

mgr_unlock.argtypes = [ctypes.c_void_p, wintypes.LPCWSTR]
mgr_unlock.restype = wintypes.LONG # HRESULT

mgr_persist_unlock.argtypes = [ctypes.c_void_p, wintypes.LPCWSTR]
mgr_persist_unlock.restype = wintypes.LONG

# Allocate buffer for XRoDirectoryManager object (e.g. 512 bytes)
mgr_obj = (ctypes.c_byte * 512)()
mgr_ptr = ctypes.byref(mgr_obj)

print("Calling XRoDirectoryManager constructor...")
mgr_ctor(mgr_ptr)
print("Constructor succeeded!")

target_paths = [
    "X:\\Apps\\DevHome",
    "X:\\Apps",
    "S:\\Program Files\\WindowsApps",
    "C:\\Windows"
]

for p in target_paths:
    print(f"\n--- Testing Unlock on: {p} ---")
    hr = mgr_unlock(mgr_ptr, p)
    print(f"  Unlock result: 0x{hr & 0xFFFFFFFF:08X}")
    
    print(f"--- Testing PersistUnlock on: {p} ---")
    hr_p = mgr_persist_unlock(mgr_ptr, p)
    print(f"  PersistUnlock result: 0x{hr_p & 0xFFFFFFFF:08X}")

print("\nCleaning up...")
# dtor if needed
