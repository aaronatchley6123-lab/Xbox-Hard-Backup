import glob  
for p in glob.glob(r"D:\DevelopmentFiles\*.py"):  
  try:  
    with open(p, errors="ignore") as f: c = f.read()  
    if "DefaultAccount" in c or "DefaultPassword" in c:  
      for l in c.splitlines():  
        if any(k in l.lower() for k in ["pass", "cred", "winlogon", "secret", "user"]):  
          print(f"{p}: {l.strip()}")  
  except: pass  
