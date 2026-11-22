with open(r"D:\DevelopmentFiles\LooseApps\Hermes_Xbox_Native\hermes_uwp_main.cpp", errors="ignore") as f:  
  lines = f.readlines()  
for i, l in enumerate(lines):  
  if "std::string RunNativeCommand(" in l and "{" in l:  
    print("".join(lines[i:i+40]))  
    break  
