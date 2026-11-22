import psutil

print("All active GUI / App processes:")
for p in psutil.process_iter(['pid', 'name', 'exe']):
    try:
        name = p.info['name'].lower()
        if any(k in name for k in ['wwa', 'dev', 'xbox', 'app', 'studio', 'hermes']):
            print(f"PID: {p.info['pid']}, Name: {p.info['name']}, Exe: {p.info['exe']}")
    except:
        pass
