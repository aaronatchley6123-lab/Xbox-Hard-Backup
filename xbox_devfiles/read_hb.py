
with open(r"D:\DevelopmentFiles\hermes_bridge.py") as f:
    text = f.read()

pos = text.find("1984")
while pos != -1:
    print(text[max(0, pos-100):pos+300])
    print("="*40)
    pos = text.find("1984", pos+1)
