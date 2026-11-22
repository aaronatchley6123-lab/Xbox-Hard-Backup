import os, sys

print("=== C:\\Windows\\DefaultApp contents ===")
for root, dirs, files in os.walk(r"C:\Windows\DefaultApp"):
    for f in files:
        fp = os.path.join(root, f)
        print(f"  {fp} ({os.path.getsize(fp)} bytes)")

print("\n=== S:\\ProgramData\\Microsoft\\Windows\\AppRepository\\DefaultApp_1.0.0.0_neutral__cw5n1h2txyewy.xml ===")
xml_path = r"S:\ProgramData\Microsoft\Windows\AppRepository\DefaultApp_1.0.0.0_neutral__cw5n1h2txyewy.xml"
if os.path.exists(xml_path):
    with open(xml_path, "r", encoding="utf-8", errors="ignore") as f:
        print(f.read())
else:
    print("XML not found")

print("\n=== X:\\Apps\\DevHome\\toolwindows\\defaultApp\\defaultapp.js ===")
js_path = r"X:\Apps\DevHome\toolwindows\defaultApp\defaultapp.js"
if os.path.exists(js_path):
    with open(js_path, "r", encoding="utf-8", errors="ignore") as f:
        print(f.read()[:2000])

