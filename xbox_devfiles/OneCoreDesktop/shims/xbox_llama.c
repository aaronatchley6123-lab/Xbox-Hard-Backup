#include <windows.h>
#include <stdio.h>

typedef DLL_DIRECTORY_COOKIE (WINAPI *pfn_add_dll_dir)(PCWSTR);
typedef BOOL (WINAPI *pfn_set_def_dll_dir)(DWORD);

int main(int argc, char* argv[]) {
    // 1. Configure DLL search directories
    HMODULE hKernel = GetModuleHandleA("kernel32.dll");
    if (!hKernel) hKernel = LoadLibraryA("kernelbase.dll");
    
    pfn_set_def_dll_dir set_def = (pfn_set_def_dll_dir)GetProcAddress(hKernel, "SetDefaultDllDirectories");
    pfn_add_dll_dir add_dir = (pfn_add_dll_dir)GetProcAddress(hKernel, "AddDllDirectory");
    
    if (set_def) set_def(0x00001000 | 0x00000400 | 0x00000800); // DEFAULT_DIRS | SYSTEM32 | USER_DIRS
    if (add_dir) add_dir(L"D:\\DevelopmentFiles\\llama");
    SetDllDirectoryA("D:\\DevelopmentFiles\\llama");

    // 2. Pre-load base dependencies
    LoadLibraryA("D:\\DevelopmentFiles\\llama\\vcruntime140.dll");
    LoadLibraryA("D:\\DevelopmentFiles\\llama\\msvcp140.dll");
    LoadLibraryA("D:\\DevelopmentFiles\\llama\\libomp.dll");
    LoadLibraryA("D:\\DevelopmentFiles\\llama\\ggml-base.dll");

    // 3. Load ggml.dll
    HMODULE hGgml = LoadLibraryA("D:\\DevelopmentFiles\\llama\\ggml.dll");
    if (!hGgml) {
        printf("[XboxLlama] Failed to load ggml.dll: %lu\n", GetLastError());
        return 1;
    }

    // 4. Explicitly register Haswell (AVX2 + FMA) CPU backend into GGML registry
    typedef void* (*pfn_load)(const char*);
    pfn_load load_backend = (pfn_load)GetProcAddress(hGgml, "ggml_backend_load");
    if (load_backend) {
        void* b = load_backend("D:/DevelopmentFiles/llama/ggml-cpu-haswell.dll");
        if (!b) {
            printf("[XboxLlama] Warning: haswell backend NULL, trying x64...\n");
            b = load_backend("D:/DevelopmentFiles/llama/ggml-cpu-x64.dll");
        }
        printf("[XboxLlama] GGML CPU Backend registered: %p\n", b);
    }

    // 5. Load llama-cli-impl.dll
    HMODULE hCli = LoadLibraryA("D:\\DevelopmentFiles\\llama\\llama-cli-impl.dll");
    if (!hCli) {
        printf("[XboxLlama] Failed to load llama-cli-impl.dll: %lu\n", GetLastError());
        return 1;
    }

    // 6. Invoke native llama_cli entrypoint
    typedef int (*pfn_main)(int, char**);
    pfn_main pMain = (pfn_main)GetProcAddress(hCli, "?llama_cli@@YAHHPEAPEAD@Z");
    if (!pMain) {
        printf("[XboxLlama] Failed to find llama_cli export: %lu\n", GetLastError());
        return 1;
    }

    return pMain(argc, argv);
}
