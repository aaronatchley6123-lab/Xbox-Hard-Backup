import socket, json

s = socket.socket()
s.connect(("127.0.0.1", 1984))

for drive in ["C:\\Windows", "C:\\Windows\\System32", "C:\\xbdiag", "X:\\", "S:\\"]:
    s.sendall(f"D:\\DevelopmentFiles\nFS_LIST|{drive}\n---HERMES_END---\n".encode())
    resp = b""
    while True:
        chunk = s.recv(4096)
        if not chunk: break
        resp += chunk
        if b"}" in chunk:
            try:
                data = json.loads(resp.decode())
                for e in data.get("entries", []):
                    if "minshell" in e.get("name", "").lower():
                        print(f"FOUND: {drive}\\{e.get('name')}")
                break
            except Exception:
                continue
s.close()
