with open(r"D:\DevelopmentFiles\LooseApps\Hermes_Xbox_Native\hermes_uwp_main.cpp", errors="ignore") as f:  
  lines = f.readlines()  
for i, l in enumerate(lines):  
  if "void ScanDirectory" in l:  
    print("".join(lines[i:i+60]))  
    break  
