import socket
import subprocess

print("====================================================")
print("[*] Probing VMM Bridge & Inter-VM IPC Network Channels...")
print("====================================================")

# 1. Check local network interfaces and route table inside Xbox
cmd = 'cmd.exe /c "ipconfig /all & route print"'
res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
print(res.stdout[:1500])

