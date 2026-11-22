import socket

s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.connect(('127.0.0.1', 1984))
s.sendall(b"FS_LIST|C:\\\n")
s.shutdown(socket.SHUT_WR)
raw = s.recv(500)
print("Raw bridge response:", repr(raw))
s.close()
