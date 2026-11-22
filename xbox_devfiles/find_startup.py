import glob  
for p in glob.glob(r"D:\DevelopmentFiles\*.py") + glob.glob(r"D:\DevelopmentFiles\*.bat") + glob.glob(r"D:\DevelopmentFiles\*.cmd"):  
  try:  
    with open(p, errors="ignore") as f: c = f.read()  
    if any(w in c.lower() for w in ["startup", "onstart", "start tasks", "task"]):  
      print(f"Match: {p}")  
  except: pass  
