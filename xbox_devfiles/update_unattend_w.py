import os

unattend_path = r"D:\unattend.cmd"
with open(unattend_path, "r") as f:
    content = f.read()

# Add persistent W: drive registration to unattend.cmd if not present
w_cmd = r'reg add "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\DOS Devices" /v W: /t REG_SZ /d "\??\D:\Windows11" /f'
if 'DOS Devices" /v W:' not in content:
    lines = content.splitlines()
    # Insert right before step 1
    new_lines = []
    for line in lines:
        if ":: 1. Execute Full Hardware Chain" in line:
            new_lines.append(r':: 0. Register Persistent 256GB Windows 11 Drive (W:)')
            new_lines.append(r'if not exist "D:\Windows11" mkdir "D:\Windows11"')
            new_lines.append(w_cmd)
            new_lines.append("")
        new_lines.append(line)
    new_content = "\r\n".join(new_lines)
    with open(unattend_path, "w") as f:
        f.write(new_content)
    print("[+] Successfully updated D:\\unattend.cmd with persistent W: drive mapping")
else:
    print("[*] D:\\unattend.cmd already has W: drive mapping")
