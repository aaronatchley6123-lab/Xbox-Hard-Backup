import ctypes
from ctypes import wintypes

wtsapi32 = ctypes.windll.wtsapi32

class WTS_SESSION_INFO(ctypes.Structure):
    _fields_ = [
        ('SessionId', wintypes.DWORD),
        ('pWinStationName', wintypes.LPWSTR),
        ('State', wintypes.DWORD)
    ]

pSessions = ctypes.POINTER(WTS_SESSION_INFO)()
count = wintypes.DWORD()

if wtsapi32.WTSEnumerateSessionsW(0, 0, 1, ctypes.byref(pSessions), ctypes.byref(count)):
    print(f"Total sessions: {count.value}")
    for i in range(count.value):
        sess = pSessions[i]
        sid = sess.SessionId
        name = sess.pWinStationName
        state = sess.State
        
        # Get username
        pBuf = wintypes.LPWSTR()
        bytes_ret = wintypes.DWORD()
        user = "<none>"
        if wtsapi32.WTSQuerySessionInformationW(0, sid, 5, ctypes.byref(pBuf), ctypes.byref(bytes_ret)):
            user = ctypes.wstring_at(pBuf)
            wtsapi32.WTSFreeMemory(pBuf)
            
        domain = "<none>"
        if wtsapi32.WTSQuerySessionInformationW(0, sid, 7, ctypes.byref(pBuf), ctypes.byref(bytes_ret)):
            domain = ctypes.wstring_at(pBuf)
            wtsapi32.WTSFreeMemory(pBuf)

        print(f"  Session {sid}: Name='{name}', State={state}, User='{domain}\\{user}'")
        
    wtsapi32.WTSFreeMemory(pSessions)
else:
    print("WTSEnumerateSessions failed")

