import socket  
s = socket.socket()  
s.connect(("127.0.0.1", 1984))  
s.sendall(b"D:\\DevelopmentFiles\nVMM_CTRL\n---HERMES_END---\n")  
data = s.recv(4096)  
print("Response:\n" + data.decode("utf-8", errors="ignore"))  
s.close()  
