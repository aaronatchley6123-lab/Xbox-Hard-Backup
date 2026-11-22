import os, subprocess

def check_pe(path):
    print("=== PE:", path)
    data = open(path, "rb").read()
    for dll in [b"DWrite.dll", b"wincorlib.DLL", b"Windows.UI.Xaml.dll", b"SDL2_uwp.dll", b"FileExplorer", b"XboxFileExplorer", b"No longer supported", b"no longer supported"]:
        print(f"  contains {dll!r}: {dll in data}")
    for s in [b"no longer", b"supported", b"Classic", b"Desktop"]:
        idx = data.lower().find(s.lower())
        if idx != -1:
            print(f"  match {s!r} at {idx}: {data[max(0,idx-20):idx+60]!r}")

check_pe(r"C:\Windows\SystemApps\Microsoft.Windows.FileExplorer_cw5n1h2txyewy\FileExplorer.exe")
check_pe(r"D:\DevelopmentFiles\LooseApps\FileExplorer\XboxFileExplorer.exe")
