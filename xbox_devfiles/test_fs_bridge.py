import socket, json

s = socket.socket()
s.connect(("127.0.0.1", 1984))
s.sendall(b"D:\\DevelopmentFiles\nFS_LIST|C:\\\n---HERMES_END---\n")

resp = b""
while True:
    chunk = s.recv(4096)
    if not chunk: break
    resp += chunk
s.close()

data = json.loads(resp.decode())
print("Bridge FS_LIST C:\\ result:")
print(f"ok: {data.get('ok')}")
entries = data.get("entries", [])
print(f"Total entries on C:\\: {len(entries)}")
for e in entries[:10]:
    print(" ", "[DIR]" if e.get("isDir") else "     ", e.get("name"), e.get("size"))
