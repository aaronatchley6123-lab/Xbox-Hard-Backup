import ctypes  
xro = ctypes.WinDLL(r"J:\tools\xrofilter.dll")  
mgr = ctypes.create_string_buffer(128)  
xro[1](mgr)  
for drv in ["C:\\", "M:\\", "S:\\", "Q:\\", "U:\\", "J:\\", "C:\\Windows\\Temp"]:  
  hr = xro[16](mgr, drv)  
  print(f"XRoDirectoryManager::Unlock({drv}) -> 0x{hr:08X}")  
