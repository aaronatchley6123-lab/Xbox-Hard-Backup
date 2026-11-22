import socket

s = socket.socket()
s.settimeout(2)
try:
    s.connect(("127.0.0.1", 1984))
    print("[+] Bridge on 1984 is ACTIVE after reboot!")
    s.sendall(b"D:\\DevelopmentFiles\nwhoami\n---HERMES_END---\n")
    data = s.recv(1024)
    print("Bridge reply:", repr(data.decode(errors='replace')))
except Exception as e:
    print("[-] Bridge connection error:", e)
finally:
    s.close()
