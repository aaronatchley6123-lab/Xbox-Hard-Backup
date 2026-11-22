import glob  
for p in glob.glob(r"D:\DevelopmentFiles\*.py"):  
  try:  
    with open(p, errors="ignore") as f: c = f.read()  
    if any(w in c for w in ["schtasks", "TaskCache", "SYSTEM", "evict", "release"]):  
      print(f"Match in {p}")  
  except: pass  
