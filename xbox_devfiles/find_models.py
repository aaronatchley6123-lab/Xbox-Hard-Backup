import os
for root_dir in ["D:/", "D:/DevelopmentFiles", "D:/DevelopmentFiles/models", "D:/DevelopmentFiles/llama", "E:/", "E:/Models", "Q:/Models"]:
    try:
        items = [x for x in os.listdir(root_dir) if x.endswith(".gguf") or "model" in x.lower() or "llama" in x.lower() or len(os.listdir(root_dir)) < 25]
        print(root_dir, "->", items[:30])
    except Exception as e:
        print(root_dir, "ERR:", e)
