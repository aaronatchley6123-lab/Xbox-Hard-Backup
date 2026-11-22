
import ctypes
kernel32 = ctypes.windll.kernel32
kernel32.VirtualAlloc.restype = ctypes.c_void_p
kernel32.VirtualAlloc.argtypes = [ctypes.c_void_p, ctypes.c_size_t, ctypes.c_uint32, ctypes.c_uint32]
kernel32.VirtualFree.argtypes = [ctypes.c_void_p, ctypes.c_size_t, ctypes.c_uint32]

def cpuid(leaf):
    mc = bytes([0x53, 0x57, 0x48, 0x89, 0xCF, 0xB8, leaf & 0xff, (leaf >> 8) & 0xff, (leaf >> 16) & 0xff, (leaf >> 24) & 0xff, 0x0F, 0xA2, 0x89, 0x07, 0x89, 0x5F, 0x04, 0x89, 0x4F, 0x08, 0x89, 0x57, 0x0C, 0x5F, 0x5B, 0xC3])
    addr = kernel32.VirtualAlloc(None, len(mc), 0x1000, 0x40)
    ctypes.memmove(addr, mc, len(mc))
    buf = (ctypes.c_uint32 * 4)()
    ctypes.CFUNCTYPE(None, ctypes.c_void_p)(addr)(ctypes.byref(buf))
    kernel32.VirtualFree(addr, 0, 0x8000)
    return buf[0], buf[1], buf[2], buf[3]

for l in range(0x40000000, 0x40000005):
    eax, ebx, ecx, edx = cpuid(l)
    print(f'Leaf {hex(l)}: EAX={hex(eax)} EBX={hex(ebx)} ECX={hex(ecx)} EDX={hex(edx)}')
    if l == 0x40000001:
        sig = bytes([eax & 0xff, (eax >> 8) & 0xff, (eax >> 16) & 0xff, (eax >> 24) & 0xff]).decode('ascii', errors='replace')
        print(f'  Interface: {sig}')
