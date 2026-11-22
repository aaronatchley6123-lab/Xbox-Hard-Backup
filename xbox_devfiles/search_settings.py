with open(r"D:\DevelopmentFiles\all_settings.txt", "r", errors="ignore") as f:
    for line in f:
        l = line.lower()
        if any(k in l for k in ["display", "resolution", "color", "hdmi", "video"]):
            print(line.strip())
