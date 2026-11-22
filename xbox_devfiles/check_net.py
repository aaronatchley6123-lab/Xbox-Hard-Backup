
import socket, struct, ctypes
from ctypes import wintypes
iphlp = ctypes.windll.iphlpapi
size = wintypes.DWORD(0)
iphlp.GetExtendedTcpTable(None, ctypes.byref(size), True, 2, 5, 0)
buf = (ctypes.c_byte * size.value)()
if iphlp.GetExtendedTcpTable(buf, ctypes.byref(size), True, 2, 5, 0) == 0:
    num = struct.unpack_from('<I', buf, 0)[0]
    offset = 4
    for i in range(num):
        state, laddr, lport, raddr, rport, pid = struct.unpack_from('<IIIIII', buf, offset)
        offset += 24
        lport = socket.ntohs(lport)
        rport = socket.ntohs(rport)
        l_ip = socket.inet_ntoa(struct.pack('<I', laddr))
        r_ip = socket.inet_ntoa(struct.pack('<I', raddr))
        st = {2:'LISTEN', 5:'ESTABLISHED'}.get(state, '')
        if st:
            print(f'{st:<12} {l_ip}:{lport:<5} -> {r_ip}:{rport:<5} (PID {pid})')
