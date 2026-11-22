with open(r"X:\Apps\DevHome\framework\js\framework.js", "r", encoding="utf-8", errors="ignore") as f:
    text = f.read()

pos = text.find("uwaDevkit")
if pos != -1:
    print(text[pos-600:pos])

