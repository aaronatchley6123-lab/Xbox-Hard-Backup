import ctypes, sys  
from ctypes import wintypes  
k = ctypes.windll.kernel32  
h = k.CreateFileW(r"\\.\xvmctrl", 0xC0000000, 3, None, 3, 0x80, None)  
print("Handle:", h, "Err:", k.GetLastError())  
specs = [(0x001500A0, "IOCTL_XVIOMONC_GETIP"),(0x0015010C, "IOCTL_XVM_STATE_SIGNAL"),(0x00150114, "IOCTL_XVM_HARDWARE_STATS"),(0x00150178, "IOCTL_XVM_RESOURCE_BOUNDARY"),(0x00150280, "IOCTL_XVM_HOLDING_PARTITION"),(0x00150298, "IOCTL_XVM_TELEMETRY")]  
for code, name in specs:  
  in_buf = (ctypes.c_uint8 * 64)()  
  out_buf = (ctypes.c_uint8 * 256)()  
  ret = wintypes.DWORD(0)  
  ok = k.DeviceIoControl(h, code, in_buf, 64, out_buf, 256, ctypes.byref(ret), None)  
  err = k.GetLastError()  
  hex_str = " ".join([f"{b:02X}" for b in list(out_buf)[:ret.value]])  
  print(f"{name} (0x{code:08X}): ok={ok}, retBytes={ret.value}, err={err}, bytes=[{hex_str}]")  
k.CloseHandle(h)  
