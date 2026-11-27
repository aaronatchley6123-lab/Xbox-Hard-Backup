import os, subprocess

drives = {
    'Drive_C': 'C:\\',
    'Drive_M': 'M:\\',
    'Drive_S': 'S:\\',
    'Drive_Q': 'Q:\\',
    'Drive_J': 'J:\\',
    'Drive_X': 'X:\\',
    'Drive_Y': 'Y:\\',
    'Drive_E': 'E:\\',
    'Drive_G': 'G:\\',
    'Drive_N': 'N:\\',
    'Drive_U': 'U:\\'
}

base = r'D:\DevelopmentFiles\AllDrives'
os.makedirs(base, exist_ok=True)

for name, target in drives.items():
    link_path = os.path.join(base, name)
    # Check if target drive exists
    if not os.path.exists(target):
        continue
    # If it is a normal directory and not a junction, remove it
    if os.path.exists(link_path):
        try:
            # try removing empty dir
            os.rmdir(link_path)
        except Exception:
            pass
    # Create junction if not present
    if not os.path.exists(link_path):
        res = subprocess.getoutput(f'cmd /c mklink /J "{link_path}" "{target}"')
        print(f"[*] {name} ({target}) -> {res}")
    else:
        print(f"[+] {name} already linked.")

print("[*] Junction setup complete.")
