#include <windows.h>
#include <stdio.h>

int main(int argc, char* argv[]) {
    const char* dll_name = (argc > 1) ? argv[1] : "D:\\DevelopmentFiles\\llama\\llama.dll";
    printf("Testing LoadLibraryA on: %s\n", dll_name);
    
    // Set DLL directory
    SetDllDirectoryA("D:\\DevelopmentFiles\\llama");
    
    HMODULE hMod = LoadLibraryA(dll_name);
    if (!hMod) {
        DWORD err = GetLastError();
        printf("FAILED! GetLastError = 0x%08lX (%lu)\n", err, err);
        
        LPVOID lpMsgBuf;
        FormatMessageA(
            FORMAT_MESSAGE_ALLOCATE_BUFFER | FORMAT_MESSAGE_FROM_SYSTEM | FORMAT_MESSAGE_IGNORE_INSERTS,
            NULL, err, MAKELANGID(LANG_NEUTRAL, SUBLANG_DEFAULT),
            (LPSTR)&lpMsgBuf, 0, NULL);
        if (lpMsgBuf) {
            printf("Message: %s\n", (char*)lpMsgBuf);
            LocalFree(lpMsgBuf);
        }
    } else {
        printf("SUCCESS! Module loaded at base: %p\n", hMod);
        FreeLibrary(hMod);
    }
    return 0;
}
