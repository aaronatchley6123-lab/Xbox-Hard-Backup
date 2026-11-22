import glob  
for p in glob.glob(r"D:\DevelopmentFiles\*.py"):  
  try:  
    with open(p, errors="ignore") as f: c = f.read()  
    if "evict" in c.lower(): print(p)  
  except: pass  
