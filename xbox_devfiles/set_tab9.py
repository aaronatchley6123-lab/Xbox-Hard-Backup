
import json
p = r"D:\DevelopmentFiles\xbxowned_native_config.json"
with open(p, "r") as f: cfg = json.load(f)
cfg["activeTab"] = 9
with open(p, "w") as f: json.dump(cfg, f, indent=2)
print("Config activeTab set to 9")
