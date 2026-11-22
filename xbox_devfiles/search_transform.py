import glob
import os
import sys

print("[*] Searching for transform / transfor symbols in tools and System32...")

matches = []
search_terms = [b"transfor", b"transform", b"setmode"]

targets = [
    r"J:\tools",
    r"C:\Windows\System32",
    r"D:\DevelopmentFiles",
    r"D:\unattend.cmd",
    r"D:\unattend.bat"
]

for target in targets:
    if os.path.isfile(target):
        files = [target]
    elif os.path.isdir(target):
        try:
            files = [os.path.join(target, f) for f in os.listdir(target)]
        except Exception as e:
            print(f"[-] Could not list {target}: {e}")
            files = []
    else:
        files = []

    for f in files:
        if not os.path.isfile(f):
            continue
        # Filter for dll/exe/cmd/bat
        ext = os.path.splitext(f)[1].lower()
        if ext not in [".dll", ".exe", ".sys", ".cmd", ".bat", ".ps1"]:
            continue
        try:
            with open(f, "rb") as fp:
                data = fp.read()
                found = []
                for term in search_terms:
                    idx = 0
                    while True:
                        idx = data.lower().find(term, idx)
                        if idx == -1:
                            break
                        # extract snippet around term
                        start = max(0, idx - 20)
                        end = min(len(data), idx + 40)
                        snippet = data[start:end]
                        # filter ascii printable
                        clean = "".join(chr(c) if 32 <= c <= 126 else "." for c in snippet)
                        found.append(clean)
                        idx += len(term)
                        if len(found) > 3:
                            break
                if found:
                    print(f"[+] Match in {f}:")
                    for s in found[:3]:
                        print(f"    snippet: {s}")
        except Exception:
            pass

print("[*] Search finished.")
