import os
for d in ["J:/", "J:/tools"]:
    try:
        print(d, "->", os.listdir(d)[:50])
    except Exception as e:
        print(d, "ERR:", e)
