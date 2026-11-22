#!/usr/bin/env python3
"""
Interactive SSH login & execution helper for Xbox Series X Dev Mode.
Automatically authenticates using DevTools credentials.
Usage:
    xbox             # Drops into interactive Xbox shell
    xbox bash        # Drops into interactive Linux bash shell on Xbox
    xbox <command>   # Runs a command directly on Xbox
"""
import sys
import pexpect

XBOX_IP = "<LAN_IP>"
USER = "DevToolsUser"
PASS = "<REDACTED_PASSWORD>"

def main():
    extra_cmd = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else ""
    
    if extra_cmd:
        # If command is 'bash' or 'sh', open interactive shell
        if extra_cmd.strip() in ("bash", "sh"):
            cmd = f"ssh -tt -o StrictHostKeyChecking=no {USER}@{XBOX_IP} {extra_cmd}"
            child = pexpect.spawn(cmd, timeout=10)
            idx = child.expect([r"[pP]assword:", pexpect.EOF, pexpect.TIMEOUT])
            if idx == 0:
                child.sendline(PASS)
                child.interact()
            return
        
        # Otherwise run non-interactive command
        cmd = f"ssh -o StrictHostKeyChecking=no {USER}@{XBOX_IP} {extra_cmd}"
        child = pexpect.spawn(cmd, timeout=30)
        idx = child.expect([r"[pP]assword:", pexpect.EOF, pexpect.TIMEOUT])
        if idx == 0:
            child.sendline(PASS)
            child.expect(pexpect.EOF)
            out = child.before.decode(errors="replace")
            # Strip echo of password if present
            lines = out.splitlines()
            for l in lines:
                if PASS not in l:
                    print(l)
        return

    # Default: interactive CMD shell
    print(f"[*] Connecting to Xbox Series X ({XBOX_IP}) as {USER}...")
    child = pexpect.spawn(f"ssh -o StrictHostKeyChecking=no {USER}@{XBOX_IP}", timeout=10)
    idx = child.expect([r"[pP]assword:", pexpect.EOF, pexpect.TIMEOUT])
    if idx == 0:
        child.sendline(PASS)
        print("[+] Logged into Xbox Series X! (Tip: type 'bash' for Linux shell)\n")
        child.interact()
    elif idx == 1:
        print("[-] Connection closed unexpectedly.")
    else:
        print("[-] Timeout waiting for password prompt.")

if __name__ == "__main__":
    main()
