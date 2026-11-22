#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <stdio.h>
#include <stdint.h>

void HexDump(const char* label, const void* data, size_t size) {
    printf("    [%s] (%zu bytes):\n", label, size);
    const uint8_t* p = (const uint8_t*)data;
    for (size_t i = 0; i < size; i += 16) {
        printf("      %04zX: ", i);
        for (size_t j = 0; j < 16; j++) {
            if (i + j < size) printf("%02X ", p[i + j]);
            else printf("   ");
        }
        printf(" |");
        for (size_t j = 0; j < 16; j++) {
            if (i + j < size) {
                char c = (p[i + j] >= 32 && p[i + j] <= 126) ? (char)p[i + j] : '.';
                printf("%c", c);
            } else printf(" ");
        }
        printf("|\n");
    }
}

int main() {
    printf("=================================================================\n");
    printf("   XBOX SERIES X - HYPERVISOR & XVMCTRL REVERSING PROBE         \n");
    printf("   xvmctrl.sys | SRA/ERA Memory Partitioning | APU Telemetry    \n");
    printf("=================================================================\n\n");

    const char* devName = "\\\\.\\XVmCtrl";
    printf("[*] Opening raw hypervisor communication device: %s...\n", devName);

    HANDLE hDev = CreateFileA(
        devName,
        GENERIC_READ | GENERIC_WRITE,
        FILE_SHARE_READ | FILE_SHARE_WRITE,
        NULL,
        OPEN_EXISTING,
        0,
        NULL
    );

    if (hDev == INVALID_HANDLE_VALUE) {
        printf("[-] Failed to open %s: %lu\n", devName, GetLastError());
        return 1;
    }

    printf("[+] SUCCESS! Device opened. Handle: 0x%p\n\n", hDev);

    // List of key IOCTLs extracted from xvmctrl.sys and SRAcmd.exe
    struct IoctlCandidate {
        DWORD code;
        const char* name;
        size_t inSize;
        size_t outSize;
    } ioctls[] = {
        { 0x0015028C, "IOCTL_XVM_GET_ERA_STATUS / LAUNCH", 0x94, 0x94 },
        { 0x00150138, "IOCTL_XVM_SHELL_READY",             0,    0 },
        { 0x00150160, "IOCTL_XVM_SET_FOCUS",               0,    0 },
        { 0x00150100, "IOCTL_XVM_FUNC_040_QUERY",          64,   256 },
        { 0x00150114, "IOCTL_XVM_FUNC_045_STATS",          64,   256 },
        { 0x0015012C, "IOCTL_XVM_FUNC_04B",                64,   256 },
        { 0x00150130, "IOCTL_XVM_FUNC_04C_POWER",          64,   256 },
        { 0x00150164, "IOCTL_XVM_FUNC_059_MEM_STATS",      64,   256 },
        { 0x00150178, "IOCTL_XVM_FUNC_05E_PARTITION",      64,   256 },
        { 0x00150190, "IOCTL_XVM_FUNC_064_HV_MEM",         64,   256 },
        { 0x00150200, "IOCTL_XVM_FUNC_080_THERMAL",        64,   256 },
        { 0x0015021C, "IOCTL_XVM_FUNC_087_EXT_RESOURCE",   64,   256 },
        { 0x00150250, "IOCTL_XVM_FUNC_094_TITLE_VM",       64,   256 },
        { 0x00150280, "IOCTL_XVM_FUNC_0A0_HOLDING_PART",   64,   256 },
        { 0x00150298, "IOCTL_XVM_FUNC_0A6_TELEMETRY",      64,   256 },
        { 0x0015029C, "IOCTL_XVM_FUNC_0A7_PERF",           64,   256 }
    };

    size_t numIoctls = sizeof(ioctls) / sizeof(ioctls[0]);

    for (size_t i = 0; i < numIoctls; i++) {
        DWORD code = ioctls[i].code;
        const char* name = ioctls[i].name;

        uint8_t inBuf[512] = {0};
        uint8_t outBuf[512] = {0};
        DWORD bytesReturned = 0;

        // Populate inBuf with common VmId/PartitionId query pattern
        // VmId 0 = Host, VmId 1 = SRA, VmId 2 = ERA
        uint32_t* pIn32 = (uint32_t*)inBuf;
        pIn32[0] = 1; // SRA VmId

        printf("[*] Probing IOCTL 0x%08lX [%s]...\n", code, name);

        BOOL ok = DeviceIoControl(
            hDev,
            code,
            ioctls[i].inSize > 0 ? inBuf : NULL,
            (DWORD)ioctls[i].inSize,
            ioctls[i].outSize > 0 ? outBuf : NULL,
            (DWORD)ioctls[i].outSize,
            &bytesReturned,
            NULL
        );

        if (ok) {
            printf("    [+] SUCCESS! Bytes returned: %lu\n", bytesReturned);
            if (bytesReturned > 0) {
                HexDump("Returned Payload", outBuf, bytesReturned > 128 ? 128 : bytesReturned);
            }
        } else {
            DWORD err = GetLastError();
            printf("    [-] Failed: Error %lu ", err);
            switch (err) {
                case ERROR_INVALID_FUNCTION:       printf("(INVALID_FUNCTION / NOT_SUPPORTED)\n"); break;
                case ERROR_INVALID_PARAMETER:      printf("(INVALID_PARAMETER - Valid IOCTL Code! Expected different struct)\n"); break;
                case ERROR_INSUFFICIENT_BUFFER:    printf("(INSUFFICIENT_BUFFER - Valid IOCTL! Needs larger buffer)\n"); break;
                case ERROR_MORE_DATA:              printf("(MORE_DATA - Valid IOCTL!)\n"); break;
                case ERROR_ACCESS_DENIED:          printf("(ACCESS_DENIED)\n"); break;
                case 1168: /* ERROR_NOT_FOUND */   printf("(ERROR_NOT_FOUND / VM not active)\n"); break;
                default:                           printf("(NTSTATUS / Win32 Err %lu)\n", err); break;
            }
        }
        printf("\n");
    }

    CloseHandle(hDev);
    printf("[+] Probe execution complete.\n");
    return 0;
}
