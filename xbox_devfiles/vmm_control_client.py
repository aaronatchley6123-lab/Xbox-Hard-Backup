import ctypes
import sys

# Define constants for Windows Device I/O Control
GENERIC_READ = 0x80000000
GENERIC_WRITE = 0x40000000
OPEN_EXISTING = 3
FILE_ATTRIBUTE_NORMAL = 0x80

# Constants matching your target control definitions
IOCTL_XVMCtrl_Register = 0x222000  # Example custom IOCTL code communicating with the driver

def send_vmm_control_request(action_code):
    # Open a handle to the custom kernel-mode driver exposing the interface
    # (Requires Administrator privileges and a loaded companion driver)
    driver_symbolic_link = r"\\.\XVMCtrlDevice"
    
    print(f"[*] Opening handle to driver: {driver_symbolic_link}")
    h_device = ctypes.windll.kernel32.CreateFileW(
        driver_symbolic_link,
        GENERIC_READ | GENERIC_WRITE,
        0,
        None,
        OPEN_EXISTING,
        FILE_ATTRIBUTE_NORMAL,
        None
    )

    if h_device == -1:
        print("[-] Failed to open device handle. Ensure you are running as Administrator and the driver is loaded.")
        return False

    # Prepare input buffer (e.g., passing the action or registration control flags)
    in_buffer = ctypes.c_ulong(action_code)
    bytes_returned = ctypes.c_ulong(0)
    out_buffer = ctypes.c_buffer(256)

    print(f"[*] Sending control request with action: {action_code}")
    
    success = ctypes.windll.kernel32.DeviceIoControl(
        h_device,
        IOCTL_XVMCtrl_Register,
        ctypes.byref(in_buffer),
        ctypes.sizeof(in_buffer),
        ctypes.byref(out_buffer),
        ctypes.sizeof(out_buffer),
        ctypes.byref(bytes_returned),
        None
    )

    ctypes.windll.kernel32.CloseHandle(h_device)

    if not success:
        print(f"[-] DeviceIoControl failed with error code: {ctypes.windll.kernel32.GetLastError()}")
        return False

    print("[+] VMM control request processed successfully.")
    return True

if __name__ == "__main__":
    if ctypes.windll.shell32.IsUserAnAdmin() == 0:
        print("[-] This script must be run with Administrator privileges.")
        sys.exit(1)

    # Example: Triggering registration control action (e.g., WMIREG_ACTION_REGISTER = 1)
    WMIREG_ACTION_REGISTER = 1
    send_vmm_control_request(WMIREG_ACTION_REGISTER)
