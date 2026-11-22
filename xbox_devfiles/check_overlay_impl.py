import re

with open("J:\\tools\\wdapp.exe", "rb") as f:
    data = f.read()

# search for overlayfolder references
matches = [m.start() for m in re.finditer(b"overlay", data, re.IGNORECASE)]
for m in matches:
    start = max(0, m - 50)
    end = min(len(data), m + 150)
    print("wdapp.exe match:", data[start:end])

with open("J:\\tools\\wdbase.dll", "rb") as f:
    data2 = f.read()

matches2 = [m.start() for m in re.finditer(b"overlay", data2, re.IGNORECASE)]
for m in matches2:
    start = max(0, m - 50)
    end = min(len(data2), m + 150)
    print("wdbase.dll match:", data2[start:end])
