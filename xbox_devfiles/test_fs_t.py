import socket, json

s = socket.socket()
s.connect(("127.0.0.1", 1984))
s.sendall(b"D:\\DevelopmentFiles\nFS_LIST|T:\\\n---HERMES_END---\n")
resp = b""
while True:
    chunk = s.recv(4096)
    if not chunk: break
    resp += chunk
s.close()
data = json.loads(resp.decode())
print("Bridge FS_LIST T:\\ result:")
print(f"ok: {data.get('ok')}")
for e in data.get("entries", []):
    print(" ", "[DIR]" if e.get("isDir") else "     ", e.get("name"), e.get("size"))
