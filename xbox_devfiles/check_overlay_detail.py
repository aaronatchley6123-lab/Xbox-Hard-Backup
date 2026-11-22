fw = r"D:\DevelopmentFiles\DevHomeOverlay\framework\js\framework.js"
lines = open(fw, "r", encoding="utf-8", errors="ignore").read().splitlines()
for i in range(4545, 4740):
    if i < len(lines):
        print(f"{i+1}: {lines[i]}")
