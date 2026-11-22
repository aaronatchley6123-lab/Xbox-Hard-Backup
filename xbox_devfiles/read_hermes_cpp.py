with open(r"D:\DevelopmentFiles\LooseApps\Hermes_Xbox_Native\hermes_uwp_main.cpp", "r", errors="ignore") as f:
    for i in range(40):
        line = f.readline()
        if not line: break
        print(line, end="")
