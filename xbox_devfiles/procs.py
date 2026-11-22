import ctypes, ctypes.wintypes  
psapi = ctypes.windll.psapi  
kernel32 = ctypes.windll.kernel32  
arr = (ctypes.wintypes.DWORD * 1024)()  
cb = ctypes.wintypes.DWORD()  
psapi.EnumProcesses(arr, ctypes.sizeof(arr), ctypes.byref(cb))  
for pid in arr[:cb.value // 4]:  
  if pid == 0: continue  
  h = kernel32.OpenProcess(0x1000, False, pid)  
  if h:  
    buf = ctypes.create_unicode_buffer(260)  
    psapi.GetProcessImageFileNameW(h, buf, 260)  
    kernel32.CloseHandle(h)  
    print(f"{pid:5d}  {buf.value.split(chr(92))[-1]}")  
