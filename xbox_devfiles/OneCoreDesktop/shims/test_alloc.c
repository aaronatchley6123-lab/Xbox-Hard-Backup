#include <windows.h>
#include <stdio.h>

int main() {
    printf("Testing VirtualAlloc on Xbox...\n");
    for (size_t mb = 256; mb <= 8192; mb += 256) {
        size_t bytes = mb * 1024 * 1024;
        void* p = VirtualAlloc(NULL, bytes, MEM_COMMIT | MEM_RESERVE, PAGE_READWRITE);
        if (p) {
            printf("Allocated %zu MB successfully at %p\n", mb, p);
            VirtualFree(p, 0, MEM_RELEASE);
        } else {
            DWORD err = GetLastError();
            printf("FAILED at %zu MB! GetLastError = %lu\n", mb, err);
            break;
        }
    }
    return 0;
}
