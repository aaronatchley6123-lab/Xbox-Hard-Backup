import os
import ctypes

def main():
    llama_dir = r"D:\DevelopmentFiles\llama"
    print(f"[*] Testing DLLs with LOAD_WITH_ALTERED_SEARCH_PATH in {llama_dir}...", flush=True)
    
    # 0x00000008 = LOAD_WITH_ALTERED_SEARCH_PATH
    load_ex = ctypes.windll.kernel32.LoadLibraryExW
    load_ex.restype = ctypes.c_void_p
    load_ex.argtypes = [ctypes.c_wchar_p, ctypes.c_void_p, ctypes.c_uint32]
    
    order = [
        'vcruntime140.dll',
        'vcruntime140_1.dll',
        'msvcp140.dll',
        'msvcp140_codecvt_ids.dll',
        'libomp.dll',
        'ggml-base.dll',
        'ggml.dll',
        'ggml-cpu-x64.dll',
        'llama.dll',
        'llama-cli-impl.dll',
        'llama-server-impl.dll'
    ]
    
    for f in order:
        full = os.path.join(llama_dir, f)
        if os.path.exists(full):
            h = load_ex(full, None, 0x00000008)
            err = ctypes.GetLastError()
            status = f"SUCCESS ({hex(h)})" if h else f"FAILED (err {err})"
            print(f"  {f:<26}: {status}", flush=True)
        else:
            print(f"  {f:<26}: NOT FOUND ON DISK", flush=True)

if __name__ == '__main__':
    main()
