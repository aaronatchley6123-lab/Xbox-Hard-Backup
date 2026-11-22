unattend_path = r"D:\unattend.cmd"
with open(unattend_path, "r") as f:
    content = f.read()

old_path = r"set PATH=C:\Windows\System32;D:\DevelopmentFiles\LooseApps\pkg;D:\Win11\System32;%PATH%"
new_path = r"set PATH=W:\Windows\System32;W:\Windows\System32\WindowsPowerShell\v1.0;W:\Windows;D:\Windows11\Windows\System32;D:\DevelopmentFiles\LooseApps\pkg;C:\Windows\System32;%PATH%"

if old_path in content:
    content = content.replace(old_path, new_path)
    with open(unattend_path, "w") as f:
        f.write(content)
    print("[+] Successfully updated PATH in D:\\unattend.cmd to prioritize W: drive")
else:
    print("[*] PATH already updated or not matched")
