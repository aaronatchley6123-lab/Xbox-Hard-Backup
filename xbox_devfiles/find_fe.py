with open(r"D:\DevelopmentFiles\LooseApps\Hermes_Xbox_Native\hermes_uwp_main.cpp", errors="ignore") as f:  
  lines = f.readlines()  
for i, l in enumerate(lines):  
  if "Explorer" in l or "File" in l and "This PC" in l:  
    print(f"Line {i}: {l.strip()}")  
