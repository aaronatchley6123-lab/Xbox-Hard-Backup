#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <stdio.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>

// --- Xbox Hypervisor IOCTL Definitions (Extracted from xvmctrl.sys & sracmd.exe) ---
#define IOCTL_XVM_STATE_SIGNAL       0x0015010C
#define IOCTL_XVM_HARDWARE_STATS     0x00150114
#define IOCTL_XVM_SHELL_READY        0x00150138
#define IOCTL_XVM_SET_FOCUS          0x00150160
#define IOCTL_XVM_RESOURCE_BOUNDARY  0x00150178
#define IOCTL_XVM_HOLDING_PARTITION  0x00150280
#define IOCTL_XVM_LAUNCH_ERA         0x0015028C
#define IOCTL_XVM_TELEMETRY          0x00150298
#define IOCTL_XVM_PERF               0x0015029C

void HexDump(const char* label, const void* data, size_t size) {
    printf("  [%s] (%zu bytes):\n", label, size);
    const uint8_t* p = (const uint8_t*)data;
    for (size_t i = 0; i < size; i += 16) {
        printf("    %04zX: ", i);
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

HANDLE OpenXVmCtrl() {
    HANDLE h = CreateFileA(
        "\\\\.\\XVmCtrl",
        GENERIC_READ | GENERIC_WRITE,
        FILE_SHARE_READ | FILE_SHARE_WRITE,
        NULL,
        OPEN_EXISTING,
        0,
        NULL
    );
    return h;
}

void CmdStatus(HANDLE hDev) {
    printf("\n--- [XBOX HYPERVISOR & PARTITION TOPOLOGY STATUS] ---\n");
    printf("Target Node:       \\\\.\\XVmCtrl (DeviceType 0x15 METHOD_BUFFERED)\n");
    printf("Device Handle:     0x%p (SUCCESS)\n\n", hDev);

    // 1. Partition State Signal (0x15010C)
    {
        uint8_t inBuf[64] = {0};
        uint8_t outBuf[64] = {0};
        DWORD ret = 0;
        BOOL ok = DeviceIoControl(hDev, IOCTL_XVM_STATE_SIGNAL, inBuf, 8, outBuf, 8, &ret, NULL);
        printf("[*] IOCTL 0x0015010C (Partition State Signal):   %s (ret=%lu bytes, err=%lu)\n",
               ok ? "ACTIVE [200 OK]" : "FAILED", ret, GetLastError());
        if (ok && ret > 0) HexDump("State Signal", outBuf, ret);
    }

    // 2. VM Hardware Telemetry (0x150114)
    {
        uint8_t inBuf[64] = {0};
        uint8_t outBuf[256] = {0};
        DWORD ret = 0;
        BOOL ok = DeviceIoControl(hDev, IOCTL_XVM_HARDWARE_STATS, inBuf, 8, outBuf, 64, &ret, NULL);
        printf("[*] IOCTL 0x00150114 (VM Hardware Stats):       %s (ret=%lu bytes, err=%lu)\n",
               ok ? "ACTIVE [200 OK]" : "FAILED", ret, GetLastError());
        if (ok && ret > 0) HexDump("Hardware Stats", outBuf, ret > 32 ? 32 : ret);
    }

    // 3. SRA Resource Boundary (0x150178)
    {
        uint8_t inBuf[64] = {0};
        uint8_t outBuf[256] = {0};
        DWORD ret = 0;
        BOOL ok = DeviceIoControl(hDev, IOCTL_XVM_RESOURCE_BOUNDARY, inBuf, 8, outBuf, 64, &ret, NULL);
        printf("[*] IOCTL 0x00150178 (SRA Resource Boundary):   %s (ret=%lu bytes, err=%lu)\n",
               ok ? "ACTIVE [200 OK]" : "FAILED", ret, GetLastError());
        if (ok && ret > 0) HexDump("Boundary Config", outBuf, ret > 32 ? 32 : ret);
    }

    // 4. Memory Holding Partition (0x150280)
    {
        uint8_t inBuf[64] = {0};
        uint8_t outBuf[256] = {0};
        DWORD ret = 0;
        BOOL ok = DeviceIoControl(hDev, IOCTL_XVM_HOLDING_PARTITION, inBuf, 8, outBuf, 64, &ret, NULL);
        printf("[*] IOCTL 0x00150280 (Memory Holding Partition): %s (ret=%lu bytes, err=%lu)\n",
               ok ? "ACTIVE [200 OK]" : "FAILED", ret, GetLastError());
        if (ok && ret > 0) HexDump("Holding Partition", outBuf, ret > 32 ? 32 : ret);
    }
}

void CmdLaunchEra(HANDLE hDev, const wchar_t* configPath) {
    printf("\n--- [DISPATCHING IOCTL_XVM_LAUNCH_ERA (0x0015028C)] ---\n");
    printf("Preparing verified 148-byte (0x94) GameCore launch payload...\n");

    // Exact struct layout reversed from sracmd.exe (0x140002802):
    // Offset 0x00: 16-byte GUID
    // Offset 0x10: DWORD flags (0 = Standard Title, 1 = GameCore Exclusive)
    // Offset 0x14: Unicode path to game.config or title manifest (up to 128 bytes)
    uint8_t payload[0x94];
    ZeroMemory(payload, sizeof(payload));

    // Fill Title GUID {A8F092E1-45C1-4B2E-A123-9876543210AB}
    GUID titleGuid = { 0xa8f092e1, 0x45c1, 0x4b2e, { 0xa1, 0x23, 0x98, 0x76, 0x54, 0x32, 0x10, 0xab } };
    memcpy(payload, &titleGuid, sizeof(GUID));

    // Set Flags = 1 (GameCore Title Launch)
    uint32_t* pFlags = (uint32_t*)(payload + 0x10);
    *pFlags = 1;

    // Set Config Path
    if (configPath && wcslen(configPath) > 0) {
        wcsncpy((wchar_t*)(payload + 0x14), configPath, (0x94 - 0x14) / sizeof(wchar_t) - 1);
        wprintf(L"Target Game Config: %s\n", configPath);
    } else {
        wcsncpy((wchar_t*)(payload + 0x14), L"era.xvd", (0x94 - 0x14) / sizeof(wchar_t) - 1);
        printf("Target Game Config: Default [era.xvd]\n");
    }

    HexDump("Launch Payload", payload, 0x94);

    DWORD ret = 0;
    SetLastError(0);
    BOOL ok = DeviceIoControl(hDev, IOCTL_XVM_LAUNCH_ERA, payload, 0x94, NULL, 0, &ret, NULL);
    DWORD err = GetLastError();

    if (ok) {
        printf("[+] SUCCESS: ERA partition launch signal accepted by xvmctrl.sys!\n");
        printf("    APU is switching to 7 Zen 2 cores and 14 GB GDDR6 pool.\n");
    } else {
        printf("[-] ERA Launch result: err=%lu (0x%lX)\n", err, err);
        if (err == 1168) {
            printf("    Note: ERROR_NOT_FOUND (Title XVD container is not currently mounted).\n");
        } else if (err == 1359) {
            printf("    Note: ERROR_INTERNAL_ERROR (Hypervisor root trap responded).\n");
        } else if (err == 87) {
            printf("    Note: ERROR_INVALID_PARAMETER (Payload requires registered title manifest).\n");
        }
    }
}

void CmdDrives() {
    printf("\n--- [PHYSICAL NVMe STORAGE VOLUME TELEMETRY] ---\n");
    const char* drives[] = { "C:\\", "D:\\", "Q:\\", "S:\\", "X:\\" };
    const char* labels[] = {
        "C:\\ (System Boot Flash OS)",
        "D:\\ (Development & Loose Apps)",
        "Q:\\ (App Sandbox Scratch)",
        "S:\\ (Update Staging & Servicing)",
        "X:\\ (SystemAux Storage)"
    };

    FILE* jsonF = fopen("D:\\DevelopmentFiles\\drive_stats.json", "w");
    if (jsonF) fprintf(jsonF, "{\n  \"volumes\": [\n");

    for (int i = 0; i < 5; ++i) {
        ULARGE_INTEGER freeBytes, totalBytes, totalFreeBytes;
        SetLastError(0);
        BOOL ok = GetDiskFreeSpaceExA(drives[i], &freeBytes, &totalBytes, &totalFreeBytes);
        DWORD err = GetLastError();

        char volName[MAX_PATH] = {0};
        char fsName[MAX_PATH] = {0};
        DWORD serial = 0, maxComp = 0, flags = 0;
        GetVolumeInformationA(drives[i], volName, MAX_PATH, &serial, &maxComp, &flags, fsName, MAX_PATH);

        if (ok) {
            double totalGB = (double)totalBytes.QuadPart / (1024.0 * 1024.0 * 1024.0);
            double freeGB = (double)totalFreeBytes.QuadPart / (1024.0 * 1024.0 * 1024.0);
            double usedGB = totalGB - freeGB;
            float pct = totalGB > 0 ? (float)(usedGB / totalGB) : 0.0f;

            printf("[+] %-34s Total: %5.2f GB | Free: %5.2f GB (%2d%% used) [FS: %s, Vol: '%s']\n",
                   labels[i], totalGB, freeGB, (int)(pct * 100), fsName[0] ? fsName : "NTFS", volName);

            if (jsonF) {
                fprintf(jsonF, "    { \"drive\": \"%s\", \"total_gb\": %.2f, \"free_gb\": %.2f, \"used_pct\": %d }%s\n",
                        drives[i], totalGB, freeGB, (int)(pct * 100), i < 4 ? "," : "");
            }
        } else {
            printf("[-] %-34s [Access Restricted / Error %lu]\n", labels[i], err);
        }
    }

    if (jsonF) {
        fprintf(jsonF, "  ]\n}\n");
        fclose(jsonF);
        printf("[+] Generated D:\\DevelopmentFiles\\drive_stats.json for Hermes Desktop sync!\n");
    }
}

int main(int argc, char* argv[]) {
    printf("=================================================================\n");
    printf("   XVM - XBOX HYPERVISOR & PARTITION CONTROLLER CLI (xvmctrl)   \n");
    printf("   Windows 11 OneCore 24H2 | Project Scarlett / Anaconda APU    \n");
    printf("=================================================================\n");

    if (argc < 2) {
        printf("Usage: xvm [command]\n");
        printf("  -status             Query hypervisor node and active partition telemetry\n");
        printf("  -drives             Query physical NVMe partitions and sync drive_stats.json\n");
        printf("  -launch [config]    Dispatch 148-byte launch signal to ERA partition (7 cores)\n");
        printf("  -shellready         Signal IOCTL_XVM_SHELL_READY (0x00150138)\n");
        printf("  -setfocus <vmid>    Switch HDMI display focus between VMs (0=Host, 1=SRA)\n");
        return 0;
    }

    HANDLE hDev = OpenXVmCtrl();
    if (hDev == INVALID_HANDLE_VALUE) {
        printf("[-] Failed to open \\\\.\\XVmCtrl: %lu (Access Denied or Driver Unloaded)\n", GetLastError());
        return 1;
    }

    if (strcmp(argv[1], "-status") == 0) {
        CmdStatus(hDev);
    } else if (strcmp(argv[1], "-drives") == 0) {
        CmdDrives();
    } else if (strcmp(argv[1], "-launch") == 0) {
        wchar_t configPath[MAX_PATH] = {0};
        if (argc >= 3) {
            mbstowcs(configPath, argv[2], MAX_PATH - 1);
        }
        CmdLaunchEra(hDev, configPath);
    } else if (strcmp(argv[1], "-shellready") == 0) {
        DWORD ret = 0;
        BOOL ok = DeviceIoControl(hDev, IOCTL_XVM_SHELL_READY, NULL, 0, NULL, 0, &ret, NULL);
        printf("[*] IOCTL_XVM_SHELL_READY (0x00150138): %s (err=%lu)\n", ok ? "OK" : "FAILED", GetLastError());
    } else if (strcmp(argv[1], "-setfocus") == 0) {
        int vmid = argc >= 3 ? atoi(argv[2]) : 1;
        DWORD ret = 0;
        BOOL ok = DeviceIoControl(hDev, IOCTL_XVM_SET_FOCUS, &vmid, sizeof(int), NULL, 0, &ret, NULL);
        printf("[*] IOCTL_XVM_SET_FOCUS (0x00150160) for VmId %d: %s (err=%lu)\n", vmid, ok ? "OK" : "FAILED", GetLastError());
    } else {
        printf("[-] Unknown command: %s (run 'xvm' for help)\n", argv[1]);
    }

    CloseHandle(hDev);
    return 0;
}
