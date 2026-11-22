import socket
import os
import sys

DEST_PATH = r"Q:\Models\DeepSeek-R1-Distill-Qwen-7B-Q4_K_M.gguf"
HOST = "<HOST_GATEWAY_IP>"
PORT = 9999

def main():
    os.makedirs(r"Q:\Models", exist_ok=True)
    offset = os.path.getsize(DEST_PATH) if os.path.exists(DEST_PATH) else 0
    print(f"[*] Current model file size: {offset} bytes ({offset / (1024**2):.2f} MB)", flush=True)

    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    print(f"[*] Connecting to {HOST}:{PORT}...", flush=True)
    sock.connect((HOST, PORT))
    print("[+] Connected to host!", flush=True)

    # Send 8-byte offset
    sock.sendall(offset.to_bytes(8, 'little'))

    received = 0
    with open(DEST_PATH, "ab") as f:
        while True:
            chunk = sock.recv(2 * 1024 * 1024)
            if not chunk:
                break
            f.write(chunk)
            received += len(chunk)
            if received % (100 * 1024 * 1024) < len(chunk):
                print(f"    Received: +{received / (1024**2):.1f} MB", flush=True)

    print(f"[+] Download finished! Added {received / (1024**2):.1f} MB. Final size: {os.path.getsize(DEST_PATH)} bytes", flush=True)
    sock.close()

if __name__ == '__main__':
    main()
