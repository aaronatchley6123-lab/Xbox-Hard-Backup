import ctypes, pefile, re

path = r"C:\Windows\System32\dsreg.dll"
pe = pefile.PE(path)

print("=== dsreg.dll Exports ===")
if hasattr(pe, 'DIRECTORY_ENTRY_EXPORT'):
    for exp in pe.DIRECTORY_ENTRY_EXPORT.symbols:
        name = exp.name.decode('utf-8', errors='ignore') if exp.name else f"ord_{exp.ordinal}"
        print(f"  [{exp.ordinal}] {name} (RVA: 0x{exp.address:X})")

# Read strings matching authority / key / ek / prt
with open(path, "rb") as f:
    data = f.read()

# Find ascii strings
ascii_strings = re.findall(b"[A-Za-z0-9_]{4,}", data)
interesting = [s.decode('ascii') for s in ascii_strings if any(k in s.lower().decode('ascii') for k in ['authority', 'getkey', 'ekcli', 'endorsement', 'prt', 'join'])]
print("\n=== Matching Strings in dsreg.dll ===")
for s in sorted(set(interesting))[:40]:
    print(" ", s)
