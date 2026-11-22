#include <windows.h>

__declspec(dllexport) LPWSTR* WINAPI CommandLineToArgvW(LPCWSTR lpCmdLine, int* pNumArgs) {
    typedef LPWSTR* (WINAPI *pfn)(LPCWSTR, int*);
    HMODULE h = GetModuleHandleA("kernelbase.dll");
    if (!h) h = LoadLibraryA("kernelbase.dll");
    if (h) {
        pfn f = (pfn)GetProcAddress(h, "CommandLineToArgvW");
        if (f) return f(lpCmdLine, pNumArgs);
    }
    return NULL;
}

BOOL WINAPI DllMain(HINSTANCE hinstDLL, DWORD fdwReason, LPVOID lpvReserved) {
    return TRUE;
}
