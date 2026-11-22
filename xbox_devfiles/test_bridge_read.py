import socket

def call_bridge(cmd):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.connect(('127.0.0.1', 1984))
    s.sendall(cmd.encode('utf-8'))
    # shutdown write so server knows request is done
    s.shutdown(socket.SHUT_WR)
    data = []
    while True:
        chunk = s.recv(4096)
        if not chunk: break
        data.append(chunk)
    s.close()
    return b"".join(data).decode('utf-8', errors='ignore')

print("FS_LIST C:\\:", call_bridge("FS_LIST|C:\\")[:300])
print("\nFS_LIST Q:\\Users\\DefaultAccount:", call_bridge("FS_LIST|Q:\\Users\\DefaultAccount"))
