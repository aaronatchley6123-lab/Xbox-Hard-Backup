import pefile

pe = pefile.PE(r"C:\Windows\System32\xpal.dll")
print("xpal.dll exports:")
for exp in pe.DIRECTORY_ENTRY_EXPORT.symbols:
    name = exp.name.decode() if exp.name else f"Ordinal_{exp.ordinal}"
    print(f"  {exp.ordinal:4d}: {name}")
