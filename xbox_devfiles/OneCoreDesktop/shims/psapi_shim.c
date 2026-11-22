#include <windows.h>

__declspec(dllexport) BOOL WINAPI EnumProcessModules(HANDLE hProcess, HMODULE *lphModule, DWORD cb, LPDWORD lpcbNeeded) {
    typedef BOOL (WINAPI *pfn)(HANDLE, HMODULE*, DWORD, LPDWORD);
    HMODULE h = GetModuleHandleA("kernelbase.dll");
    if (!h) h = LoadLibraryA("kernelbase.dll");
    if (h) {
        pfn f = (pfn)GetProcAddress(h, "K32EnumProcessModules");
        if (!f) f = (pfn)GetProcAddress(h, "EnumProcessModules");
        if (f) return f(hProcess, lphModule, cb, lpcbNeeded);
    }
    return FALSE;
}

__declspec(dllexport) BOOL WINAPI EnumProcessModulesEx(HANDLE hProcess, HMODULE *lphModule, DWORD cb, LPDWORD lpcbNeeded, DWORD dwFilterFlag) {
    typedef BOOL (WINAPI *pfn)(HANDLE, HMODULE*, DWORD, LPDWORD, DWORD);
    HMODULE h = GetModuleHandleA("kernelbase.dll");
    if (!h) h = LoadLibraryA("kernelbase.dll");
    if (h) {
        pfn f = (pfn)GetProcAddress(h, "K32EnumProcessModulesEx");
        if (!f) f = (pfn)GetProcAddress(h, "EnumProcessModulesEx");
        if (f) return f(hProcess, lphModule, cb, lpcbNeeded, dwFilterFlag);
    }
    return FALSE;
}

BOOL WINAPI DllMain(HINSTANCE hinstDLL, DWORD fdwReason, LPVOID lpvReserved) {
    return TRUE;
}
