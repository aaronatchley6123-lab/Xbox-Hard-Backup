import ctypes

xpal = ctypes.WinDLL("xpal.dll")
print("[*] Probing XpalGetVmType and related VM classification exports...")

if hasattr(xpal, "XpalGetVmType"):
    try:
        vm_type = xpal.XpalGetVmType()
        print(f"[+] XpalGetVmType() = {vm_type} (hex: {vm_type:#x})")
    except Exception as e:
        print(f"[-] XpalGetVmType error: {e}")

# Check any other VM query functions in xpal
for exp in dir(xpal):
    if "vm" in exp.lower() or "type" in exp.lower() or "partition" in exp.lower():
        fn = getattr(xpal, exp)
        try:
            res = fn()
            print(f"    {exp}() = {res} ({hex(res) if isinstance(res, int) else res})")
        except Exception:
            pass

