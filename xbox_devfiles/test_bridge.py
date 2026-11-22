import socket  
s=socket.socket()  
s.connect(('127.0.0.1', 1984))  
s.sendall(b'D:\r\ndir\r\n---HERMES_END---\r\n')  
res=s.recv(4096)  
print(res.decode('utf-8', errors='ignore'))  
