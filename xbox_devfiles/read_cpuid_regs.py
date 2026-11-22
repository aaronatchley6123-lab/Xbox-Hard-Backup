import ctypes

# Inline shellcode or ctypes to run CPUID 0x40000007 and read EAX, EBX, ECX, EDX
shellcode = bytes([
    0x53,                               # push rbx
    0x48, 0x89, 0xCE,                   # mov rsi, rcx (output buffer)
    0xB8, 0x07, 0x00, 0x00, 0x40,       # mov eax, 0x40000007
    0x31, 0xC9,                         # xor ecx, ecx
    0x0F, 0xA2,                         # cpuid
    0x89, 0x06,                         # mov [rsi], eax
    0x89, 0x5E, 0x04,                   # mov [rsi+4], ebx
    0x89, 0x4E, 0x08,                   # mov [rsi+8], ecx
    0x89, 0x56, 0x0C,                   # mov [rsi+12], edx
    0x5B,                               # pop rbx
    0xC3                                # ret
])

# Allocate executable memory
MEM_COMMIT = 0x1000
MEM_RESERVE = 0x2000
PAGE_EXECUTE_READWRITE = 0x40

pMem = ctypes.windll.kernel32.VirtualAlloc(0, len(shellcode), MEM_COMMIT | MEM_RESERVE, PAGE_EXECUTE_READWRITE)
ctypes.memmove(pMem, shellcode, len(shellcode))

FN = ctypes.CFUNCTYPE(None, ctypes.c_void_p)
run_cpuid = FN(pMem)

out_buf = (ctypes.c_uint32 * 4)()
run_cpuid(ctypes.byref(out_buf))

print("=== RAW CPUID 0x40000007 REGISTERS ===")
print(f"  EAX = 0x{out_buf[0]:08X}")
print(f"  EBX = 0x{out_buf[1]:08X}")
print(f"  ECX = 0x{out_buf[2]:08X} (cl = 0x{out_buf[2] & 0xFF:02X} -> VmType!)")
print(f"  EDX = 0x{out_buf[3]:08X}")

ctypes.windll.kernel32.VirtualFree(pMem, 0, 0x8000)

