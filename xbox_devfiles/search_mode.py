import os  
for r in [r"J:\tools", r"C:\Windows\System32"]:  
  for f in os.listdir(r):  
    if "trans" in f.lower() or "mode" in f.lower(): print(os.path.join(r, f))  
