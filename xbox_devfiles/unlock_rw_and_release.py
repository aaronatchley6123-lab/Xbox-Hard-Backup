import ctypes, struct, os  
from ctypes import wintypes  
k32 = ctypes.windll.kernel32  
print("[1] Releasing Hypervisor Holding Partition to State 0...")  
xpal = ctypes.WinDLL("xpal.dll")  
buf0 = (ctypes.c_ubyte * 4)(0,0,0,0)  
buf1 = (ctypes.c_ubyte * 1)(0)  
res27 = xpal.XpalSetXConfig(0x27, buf0, 4)  
res39 = xpal.XpalSetXConfig(0x39, buf1, 1)  
print(f"    Slot 0x27: {res27:#x}, Slot 0x39: {res39:#x}")  
h_vmm = k32.CreateFileW(r"\\.\xvmctrl", 0xC0000000, 3, None, 3, 0x80, None)  
if h_vmm != -1:  
  in_b = ctypes.create_string_buffer(512)  
  out_b = ctypes.create_string_buffer(512)  
  ret_b = wintypes.DWORD(0)  
  ok = k32.DeviceIoControl(h_vmm, 0x00150280, in_b, 512, out_b, 512, ctypes.byref(ret_b), None)  
  print(f"    IOCTL Holding Partition Release: {ok}")  
  k32.CloseHandle(h_vmm)  
print("[2] Unlocking XRO filter across all drives...")  
xro_dll = r"J:\tools\xrofilter.dll"  
if os.path.exists(xro_dll):  
  xro = ctypes.WinDLL(xro_dll)  
  mgr = ctypes.create_string_buffer(128)  
  xro[1](mgr)  
  for drv in ["C:\\", "M:\\", "S:\\", "Q:\\", "U:\\", "C:\\Windows\\Temp", "C:\\ProgramData"]:  
    try:  
      hr = xro[16](mgr, drv)  
      print(f"    Unlocked {drv}: 0x{hr:08X}")  
    except Exception as ex: print(f"    {drv} note: {ex}")  
print("[3] Clearing all file attribute locks (0x80 NORMAL)...")  
for f in [r"D:\unattend.cmd", r"D:\unattend.bat"]:  
  if os.path.exists(f):  
    k32.SetFileAttributesW(f, 0x80)  
    print(f"    File {f}: Attributes={hex(k32.GetFileAttributesW(f))}")  
print("[4] Complete. RW locks dropped.")  
