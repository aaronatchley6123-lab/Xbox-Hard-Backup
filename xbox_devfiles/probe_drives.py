import os, string

for letter in string.ascii_uppercase:
    drive = f"{letter}:\\"
    if os.path.exists(drive):
        can_read = False
        can_write = False
        err = ""
        try:
            os.listdir(drive)
            can_read = True
        except Exception as e:
            err = str(e)
        test_file = os.path.join(drive, "test_write_probe.tmp")
        try:
            with open(test_file, "w") as f:
                f.write("test")
            os.remove(test_file)
            can_write = True
        except Exception as e:
            err = str(e)
        status = []
        if can_read: status.append("READ: OK")
        else: status.append("READ: DENIED")
        if can_write: status.append("WRITE: OK")
        else: status.append("WRITE: READ-ONLY (" + err.split("]")[-1].strip() + ")")
        print(f"Drive {letter}: -> {', '.join(status)}", flush=True)
