unattend_path = r"D:\unattend.cmd"
with open(unattend_path, "r") as f:
    content = f.read()

kd_snippet = r""":: Unbind Stripped KnownDLLs so Full Windows 11 Desktop DLLs Load
reg delete "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\KnownDLLs" /v Win32u /f >> D:\DevelopmentFiles\unattend_boot_log.txt 2>&1
reg delete "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\KnownDLLs" /v user32 /f >> D:\DevelopmentFiles\unattend_boot_log.txt 2>&1
reg delete "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\KnownDLLs" /v SHELL32 /f >> D:\DevelopmentFiles\unattend_boot_log.txt 2>&1"""

if "delete \"HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\KnownDLLs\" /v Win32u" not in content:
    lines = content.splitlines()
    new_lines = []
    for line in lines:
        if ":: 1. Execute Full Hardware Chain" in line:
            new_lines.append(kd_snippet.strip())
            new_lines.append("")
        new_lines.append(line)
    new_content = "\r\n".join(new_lines)
    with open(unattend_path, "w") as f:
        f.write(new_content)
    print("[+] Successfully added KnownDLLs unbinding to D:\\unattend.cmd")
else:
    print("[*] KnownDLLs unbinding already present in D:\\unattend.cmd")
