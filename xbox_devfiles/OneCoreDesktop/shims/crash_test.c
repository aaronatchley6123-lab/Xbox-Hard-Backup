#include <windows.h>
#include <dbghelp.h>
#include <stdio.h>

LONG WINAPI CrashHandler(EXCEPTION_POINTERS* pExceptionInfo) {
    printf("[*] Unhandled Exception Caught: 0x%08lX at address %p\n",
           pExceptionInfo->ExceptionRecord->ExceptionCode,
           pExceptionInfo->ExceptionRecord->ExceptionAddress);

    const char* dumpPath = "D:\\DevelopmentFiles\\xbox_test_crash.dmp";
    HANDLE hFile = CreateFileA(dumpPath, GENERIC_WRITE, 0, NULL, CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, NULL);
    
    if (hFile != INVALID_HANDLE_VALUE) {
        MINIDUMP_EXCEPTION_INFORMATION mei;
        mei.ThreadId = GetCurrentThreadId();
        mei.ExceptionPointers = pExceptionInfo;
        mei.ClientPointers = FALSE;

        // Write minidump with normal + thread info + full memory info
        BOOL success = MiniDumpWriteDump(
            GetCurrentProcess(),
            GetCurrentProcessId(),
            hFile,
            MiniDumpWithDataSegs | MiniDumpWithHandleData | MiniDumpWithUnloadedModules | MiniDumpWithProcessThreadData,
            &mei,
            NULL,
            NULL
        );

        CloseHandle(hFile);

        if (success) {
            printf("[+] Successfully created crash dump: %s\n", dumpPath);
        } else {
            printf("[-] MiniDumpWriteDump failed: error %lu\n", GetLastError());
        }
    } else {
        printf("[-] Failed to create dump file: error %lu\n", GetLastError());
    }

    return EXCEPTION_EXECUTE_HANDLER;
}

int main(void) {
    printf("==================================================\n");
    printf("   Xbox Series X Crash Dump Diagnostic Tool       \n");
    printf("==================================================\n");
    printf("[*] Process ID: %lu\n", GetCurrentProcessId());
    printf("[*] Setting Unhandled Exception Filter...\n");

    SetUnhandledExceptionFilter(CrashHandler);

    printf("[*] Simulating null pointer dereference (clean test)...\n");
    
    // Controlled dereference to trigger clean exception handler
    volatile int* ptr = NULL;
    *ptr = 0x1337;

    printf("[*] Test completed successfully.\n");
    return 0;
}
