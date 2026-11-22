import os, string

print("Searching all drives for any logs modified in the last 10 minutes:")
for letter in string.ascii_uppercase:
    d = f"{letter}:\\"
    if os.path.exists(d):
        try:
            for root, dirs, files in os.walk(d):
                for f in files:
                    if f.endswith(".log") or f.endswith(".txt") or "unattend" in f.lower():
                        full = os.path.join(root, f)
                        try:
                            mtime = os.path.getmtime(full)
                            import time
                            if time.time() - mtime < 600:
                                print(f"[!] RECENT LOG: {full} ({os.path.getsize(full)} bytes)")
                        except: pass
                # Don't recurse indefinitely deep into Windows
                if root.count('\\') > 3:
                    dirs.clear()
        except: pass
print("[*] Search completed.")
