import os
import subprocess

# Look for BCD files across all drives
drives = ["C:", "D:", "E:", "F:", "G:", "H:", "I:", "J:", "K:", "L:", "M:", "N:", "O:", "P:", "Q:", "R:", "S:", "T:", "U:", "V:", "W:", "X:", "Y:", "Z:"]

print("Scanning drives for BCD stores...")
for d in drives:
    if os.path.exists(d + "\\"):
        for bcd_path in [
            d + r"\EFI\Microsoft\Boot\BCD",
            d + r"\Boot\BCD",
            d + r"\bootmgr"
        ]:
            if os.path.exists(bcd_path):
                print(f"  [+] Found: {bcd_path} (size: {os.path.getsize(bcd_path)})")

