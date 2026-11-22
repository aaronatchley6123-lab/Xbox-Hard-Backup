import socket

s = socket.socket()
s.settimeout(5.0)
try:
    s.connect(("127.0.0.1", 1984))
    print("[+] Successfully connected to Hermes Bridge on 127.0.0.1:1984!")
    s.sendall(b"VMM_CTRL\n---HERMES_END---\n")
    data = b""
    while True:
        try:
            chunk = s.recv(4096)
            if not chunk:
                break
            data += chunk
        except socket.timeout:
            break
    print("[+] Response from VMM_CTRL:\n" + data.decode("utf-8", errors="ignore"))
except Exception as e:
    print("[-] Bridge connection error:", e)
