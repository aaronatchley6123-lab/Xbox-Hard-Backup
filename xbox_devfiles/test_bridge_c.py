import socket, json

s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.connect(('127.0.0.1', 1984))
s.sendall(b"FS_LIST|C:\\\n")
s.shutdown(socket.SHUT_WR)
chunks = []
while True:
    c = s.recv(4096)
    if not c: break
    chunks.append(c)
s.close()
res = json.loads(b"".join(chunks).decode('utf-8'))
print(f"[Bridge FS_LIST C:\\] OK: {res.get('ok')} | Entries: {len(res.get('entries', []))}")
for e in res.get('entries', [])[:6]:
    print(f"  {'[DIR]' if e.get('isDir') else '[FILE]'} {e.get('name')}")
