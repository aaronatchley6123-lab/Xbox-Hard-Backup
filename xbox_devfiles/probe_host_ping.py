import subprocess

# Test ping from SRA (<XBOX_SRA_IP>) directly to HostOS (<XBOX_HOST_IP>)
cmd = 'cmd.exe /c "ping -n 2 <XBOX_HOST_IP>"'
res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
print("Ping to <XBOX_HOST_IP>:\n", res.stdout)

# Check ARP table inside Xbox
cmd_arp = 'cmd.exe /c "arp -a"'
res_arp = subprocess.run(cmd_arp, shell=True, capture_output=True, text=True)
print("ARP table:\n", res_arp.stdout)

