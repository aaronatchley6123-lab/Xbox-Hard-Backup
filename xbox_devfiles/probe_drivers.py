import os
import ctypes

def probe():
    drivers_dir = r"C:\Windows\System32\drivers"
    print(f"[*] Enumerating all sys drivers in {drivers_dir}...")
    try:
        files = sorted(os.listdir(drivers_dir))
        print(f"[+] Total drivers found: {len(files)}")
        keywords = ["smc", "xsmc", "xsec", "acpi", "pci", "ser", "uart", "amd", "psp", "gpio", "i2c", "syscon", "sp", "xpal", "xbox", "m103"]
        interesting = [f for f in files if any(k in f.lower() for k in keywords)]
        print(f"[+] Interesting drivers ({len(interesting)}):")
        for f in interesting:
            print(f"    {f}")
    except Exception as e:
        print(f"[-] Error: {e}")

if __name__ == '__main__':
    probe()
