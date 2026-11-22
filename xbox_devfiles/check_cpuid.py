
import ctypes
mc = bytes([0x53, 0x57, 0x48, 0x89, 0xCF, 0xB8, 0x01, 0x00, 0x00, 0x00, 0x0F, 0xA2, 0x89, 0x07, 0x89, 0x5F, 0x04, 0x89, 0x4F, 0x08, 0x89, 0x57, 0x0C, 0x5F, 0x5B, 0xC3])

kernel32 = ctypes.windll.kernel32
MEM_COMMIT = 0x1000
PAGE_EXECUTE_READWRITE = 0x40

kernel32.VirtualAlloc.restype = ctypes.c_void_p
addr = kernel32.VirtualAlloc(None, len(mc), MEM_COMMIT, PAGE_EXECUTE_READWRITE)
ctypes.memmove(addr, mc, len(mc))

buf = (ctypes.c_uint32 * 4)()
func = ctypes.CFUNCTYPE(None, ctypes.c_void_p)(addr)
func(ctypes.byref(buf))

eax, ebx, ecx, edx = buf[0], buf[1], buf[2], buf[3]
hv_bit = (ecx >> 31) & 1
print(f'CPUID(1): EAX={hex(eax)} EBX={hex(ebx)} ECX={hex(ecx)} EDX={hex(edx)}')
print(f'Hypervisor Present Bit (ECX[31]): {hv_bit} -> {"TRUE (Virtual Machine)" if hv_bit else "FALSE (Bare Metal Native)"}')
