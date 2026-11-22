
import ctypes
# CPUID leaf 0x40000000:
# push rbx; push rdi; mov rdi, rcx; mov eax, 0x40000000; cpuid; mov [rdi], eax; mov [rdi+4], ebx; mov [rdi+8], ecx; mov [rdi+12], edx; pop rdi; pop rbx; ret
mc = bytes([0x53, 0x57, 0x48, 0x89, 0xCF, 0xB8, 0x00, 0x00, 0x00, 0x40, 0x0F, 0xA2, 0x89, 0x07, 0x89, 0x5F, 0x04, 0x89, 0x4F, 0x08, 0x89, 0x57, 0x0C, 0x5F, 0x5B, 0xC3])

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
sig_bytes = bytes([
    ebx & 0xff, (ebx >> 8) & 0xff, (ebx >> 16) & 0xff, (ebx >> 24) & 0xff,
    ecx & 0xff, (ecx >> 8) & 0xff, (ecx >> 16) & 0xff, (ecx >> 24) & 0xff,
    edx & 0xff, (edx >> 8) & 0xff, (edx >> 16) & 0xff, (edx >> 24) & 0xff
])
sig_str = sig_bytes.decode('ascii', errors='replace')
print(f'CPUID(0x40000000): EAX={hex(eax)} EBX={hex(ebx)} ECX={hex(ecx)} EDX={hex(edx)}')
print(f'Hypervisor Signature String: "{sig_str}"')
