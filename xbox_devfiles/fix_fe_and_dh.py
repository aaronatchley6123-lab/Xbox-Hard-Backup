import os, shutil, subprocess

# 1. Copy Microsoft.VCLibs.140.00 DLLs into XBXOwned.FileExplorer folder
vc_dir = r"S:\Program Files\WindowsApps\Microsoft.VCLibs.140.00_14.0.33519.0_x64__8wekyb3d8bbwe"
fe_dir = r"D:\DevelopmentFiles\WindowsApps\XBXOwned.FileExplorer_1.0.0.0_x64__czgs116rtv2ap"
if os.path.exists(vc_dir):
    for f in os.listdir(vc_dir):
        if f.lower().endswith(".dll"):
            shutil.copy2(os.path.join(vc_dir, f), os.path.join(fe_dir, f))
            print("[VCLibs] Copied", f)
print("[ACL]:", subprocess.getoutput(f'icacls "{fe_dir}" /grant "*S-1-15-2-1:(OI)(CI)(RX)" /T').splitlines()[-1])

# 2. Check DevHome state and overlay
print("[DevHome query]:", subprocess.getoutput(r"J:\tools\wdapp.exe query Microsoft.Xbox.DevHome_1.0.2607.19001_x64__8wekyb3d8bbwe").strip())
print("[DevHome terminate]:", subprocess.getoutput(r"J:\tools\wdapp.exe terminate Microsoft.Xbox.DevHome_1.0.2607.19001_x64__8wekyb3d8bbwe").strip())
# Also grant DevHome's exact AppContainer SID RX on DevHomeOverlay
dh_sid = "*S-1-15-2-2210049041-2770507692-3844607569-2774303569-1419251484-2751511628-4203538959"
print("[DevHomeOverlay ACL]:", subprocess.getoutput(f'icacls "D:\\DevelopmentFiles\\DevHomeOverlay" /grant "{dh_sid}:(OI)(CI)(RX)" /T').splitlines()[-1])
print("[DevHome overlayfolder]:", subprocess.getoutput(r'J:\tools\wdapp.exe overlayfolder Microsoft.Xbox.DevHome_1.0.2607.19001_x64__8wekyb3d8bbwe D:\DevelopmentFiles\DevHomeOverlay').strip())
