with open("D:\\DevelopmentFiles\\hermes_bridge.py", "r", encoding="utf-8", errors="ignore") as f:
    text = f.read()

idx = text.find("init_vmm_client_control")
if idx != -1:
    print(text[idx:idx+1500])
else:
    print("Not found")
