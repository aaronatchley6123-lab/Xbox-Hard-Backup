import os

paths = [
    "D:/boot",
    "D:/xbdiag",
    "D:/Titles",
    "D:/Temp",
    "D:/Clips",
    "J:/tools",
    "Q:/Models",
    "C:/Windows",
    "C:/Windows/System32",
    "C:/Windows/System32/drivers",
    "C:/Xbox",
]

for p in paths:
    try:
        items = os.listdir(p)
        print(f"[+] {p} ({len(items)} items): {items[:15]}")
    except Exception as e:
        print(f"[-] {p}: {e}")
