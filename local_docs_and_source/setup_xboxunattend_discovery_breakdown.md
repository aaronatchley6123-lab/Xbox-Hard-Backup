# Technical Breakdown: Discovery and Mechanism of `setup.xboxunattend`

## 1. Discovery Methodology
During analysis of background service execution on Xbox OneCore (build 10.0.26100.9445), runtime tools and service binaries were investigated to understand boot-time automation:

1. **Inspection of `toolsautoexec.exe` (`J:\tools\toolsautoexec.exe`):**
   - Analysis of binary strings revealed references to an internal setup automation interface:
     - `Checking for Unattended Setup script.`
     - `CheckForUnattendedSetupScript(configMask)`
     - `Microsoft.Xbox.Development.UnattendedUtilities`

2. **WinRT Activation Query:**
   - Querying the Windows Runtime class registry confirmed the backing service:
     ```cmd
     reg query "HKLM\SOFTWARE\Microsoft\WindowsRuntime\ActivatableClassId\Microsoft.Xbox.Development.UnattendedUtilities" /s
     ```
   - Returned:
     - `ActivationType = 0x1` (Out-of-process system service)
     - `Server = XboxDevService` (`M:\windows\system32\XboxDevService.exe`)
     - Service execution identity: `NT AUTHORITY\SYSTEM`.

3. **Binary Analysis of `XboxDevService.exe`:**
   - Cross-referencing strings in `XboxDevService.exe` at offset `0x285900` identified source reference:
     `xbox\devex\devservice\xboxdevelopmentlib\unattendedutilities.cpp`
   - In function `GetUnattendedScript`, the search pattern was identified at offset `0x2859F6`:
     - Pattern: `\*.xboxunattend` (UTF-16 LE)
   - Volume interface enumeration:
     - Calls `DevGetObjects(DevObjectTypeDeviceInterface, ..., &cDevObjects, &pDevObjects)` to scan all accessible volume interfaces on system boot.
   - Execution handler:
     - When a matching file (`\*.xboxunattend`) is located on the root of an attached drive (such as `D:\` or USB mass storage), the service invokes `DoCreateProcessForUnattendedScript` to execute the file in `SYSTEM` context.

4. **NVRAM Control Flag:**
   - The trigger condition is guarded by the NVRAM setting `XCONFIG_SETTING_RUN_DEV_OOBE_SCRIPT_ON_BOOT`, exposed via the `UnattendedUtilities` WinRT methods:
     - `put_ShouldRunOobeScript(1)`
     - `put_ShouldBlockUsb(0)`
     - `put_ShouldSkipAbortToast(1)`

## 2. Execution Flow
```
[ System Boot / OOBE Trigger ]
              │
              ▼
[ XboxDevService.exe (SYSTEM) ]
              │
              ▼
[ Query NVRAM: XCONFIG_SETTING_RUN_DEV_OOBE_SCRIPT_ON_BOOT == 1 ]
              │
              ▼
[ DevGetObjects: Enumerate Device Interfaces ]
              │
              ▼
[ File Search Mask: \*.xboxunattend ]
              │
              ├──> Found: D:\setup.xboxunattend (or E:\setup.xboxunattend)
              │
              ▼
[ DoCreateProcessForUnattendedScript ]
              │
              ▼
[ Executes Batch Payload as NT AUTHORITY\SYSTEM ]
```
