import os, glob

target = "Windows.Xbox.System.Internal.DevelopmentKit".encode('utf-16le')

for p in glob.glob(r"C:\Windows\System32\*.dll") + glob.glob(r"M:\windows\system32\*.dll"):
    try:
        with open(p, 'rb') as f:
            data = f.read()
            if target in data:
                print("FOUND IN:", p)
    except:
        pass
