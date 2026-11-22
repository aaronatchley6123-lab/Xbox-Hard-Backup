import os, re

for path in [
    r"C:\Windows\SystemApps\Microsoft.Windows.FileExplorer_cw5n1h2txyewy\FileExplorer.exe",
    r"C:\Windows\SystemApps\Microsoft.Windows.FileExplorer_cw5n1h2txyewy\resources.pri",
    r"C:\Windows\SystemApps\Microsoft.Windows.FileExplorer_cw5n1h2txyewy\pris\resources.en-US.pri",
]:
    if os.path.exists(path):
        data = open(path, "rb").read()
        print("=== FILE:", path, len(data))
        for pat in [b"n\x00o\x00 \x00l\x00o\x00n\x00g\x00e\x00r\x00", b"no longer", b"s\x00u\x00p\x00p\x00o\x00r\x00t\x00e\x00d\x00", b"supported"]:
            for m in re.finditer(re.escape(pat), data, re.IGNORECASE):
                start = max(0, m.start() - 60)
                end = min(len(data), m.end() + 100)
                chunk = data[start:end]
                try:
                    print("  UTF16:", chunk.decode("utf-16le", errors="ignore"))
                except Exception:
                    pass
                print("  ASCII:", chunk.decode("latin1", errors="ignore"))
