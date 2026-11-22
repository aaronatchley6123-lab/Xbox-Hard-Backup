import ctypes

def main():
    wts = ctypes.windll.wtsapi32
    class WTS_SESSION_INFOW(ctypes.Structure):
        _fields_ = [('SessionId', ctypes.c_uint32), ('pWinStationName', ctypes.c_wchar_p), ('State', ctypes.c_uint32)]
    pSessionInfo = ctypes.POINTER(WTS_SESSION_INFOW)()
    count = ctypes.c_uint32(0)
    res = wts.WTSEnumerateSessionsW(0, 0, 1, ctypes.byref(pSessionInfo), ctypes.byref(count))
    print(f"[*] WTSEnumerateSessions: res={res}, Count={count.value}", flush=True)
    states = {0: "Active", 1: "Connected", 2: "ConnectQuery", 3: "Shadow", 4: "Disconnected", 5: "Idle", 6: "Listen", 7: "Reset", 8: "Down", 9: "Init"}
    for i in range(count.value):
        s = pSessionInfo[i]
        st_name = states.get(s.State, str(s.State))
        print(f"    Session {s.SessionId}: Station={s.pWinStationName}, State={st_name}", flush=True)

if __name__ == '__main__':
    main()
