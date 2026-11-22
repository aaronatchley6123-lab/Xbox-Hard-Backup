import socket

s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.settimeout(1.0)
target = "<XBOX_HOST_IP>"
print(f"[*] Testing socket connection to HostOS ({target}) from inside Xbox...")

# Check common management ports on HostOS
for port in [11443, 8080, 22, 135, 445, 80, 5000, 3074]:
    try:
        r = s.connect_ex((target, port))
        if r == 0:
            print(f"[+] PORT {port} IS OPEN ON HOSTOS!")
    except Exception as e:
        pass

print("[*] Host probe complete.")
