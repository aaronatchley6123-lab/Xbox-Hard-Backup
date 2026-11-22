import socket

def query_bridge(cmd):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(3.0)
    s.connect(('127.0.0.1', 1984))
    s.sendall((cmd + "\n").encode('utf-8'))
    data = b""
    while True:
        try:
            chunk = s.recv(4096)
            if not chunk: break
            data += chunk
            if b"\n" in chunk: break
        except socket.timeout:
            break
    s.close()
    return data.decode('utf-8', errors='ignore').strip()

print("C:\\:", query_bridge("FS_LIST|C:\\"))
print("Q:\\Users\\DefaultAccount:", query_bridge("FS_LIST|Q:\\Users\\DefaultAccount"))
