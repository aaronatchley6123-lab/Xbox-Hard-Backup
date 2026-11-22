import os

def check_dir(d):
    if not os.path.exists(d): return
    try:
        entries = os.listdir(d)
        for e in entries:
            full = os.path.join(d, e)
            if 'fileexplorer' in e.lower() or e.endswith('.msix') or e.endswith('.appx'):
                print(f"[FOUND] {full}")
            if os.path.isdir(full):
                try:
                    for sub in os.listdir(full):
                        if 'fileexplorer' in sub.lower() or sub.endswith('.msix') or sub.endswith('.appx'):
                            print(f"[FOUND SUB] {os.path.join(full, sub)}")
                except: pass
    except Exception as ex:
        print(f"[ERR] {d}: {ex}")

targets = [
    r"C:\Program Files\WindowsApps",
    r"C:\Windows\SystemApps",
    r"M:\windows\SystemApps",
    r"D:\DevelopmentFiles",
    r"D:\Windows11",
    r"T:\Update",
    r"T:\ProgramData",
    r"Q:\Program Files\WindowsApps"
]

for t in targets:
    check_dir(t)
