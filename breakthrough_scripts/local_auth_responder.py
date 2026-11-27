import socket
import struct
import threading
import sys
import os
from http.server import HTTPServer, BaseHTTPRequestHandler

DNS_IP = os.environ.get("CONSOLE_IP", "127.0.0.1")
DNS_PORT = 53
HTTP_PORT = 80

def build_dns_response(data, ip):
    # Parse basic DNS query
    tid = data[:2]
    flags = b"\x81\x80"  # Standard response, no error
    qdcount = data[4:6]
    ancount = qdcount
    nscount = b"\x00\x00"
    arcount = b"\x00\x00"
    
    header = tid + flags + qdcount + ancount + nscount + arcount
    
    # Extract query section
    idx = 12
    domain_parts = []
    while idx < len(data):
        length = data[idx]
        if length == 0:
            idx += 1
            break
        idx += 1
        domain_parts.append(data[idx:idx+length].decode('latin1', errors='ignore'))
        idx += length
    
    domain_name = ".".join(domain_parts)
    qtype = data[idx:idx+2]
    qclass = data[idx+2:idx+4]
    idx += 4
    question_section = data[12:idx]
    
    # Build Answer (Type A = 1, Class IN = 1, TTL = 60s)
    name_pointer = b"\xc0\x0c"  # pointer to question name
    rtype = b"\x00\x01"        # A record
    rclass = b"\x00\x01"       # IN
    ttl = struct.pack(">I", 60)
    rdlength = b"\x00\x04"
    rdata = socket.inet_aton(ip)
    
    answer = name_pointer + rtype + rclass + ttl + rdlength + rdata
    return header + question_section + answer, domain_name

def run_dns_server():
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind(("0.0.0.0", DNS_PORT))
    print(f"[*] Local DNS Responder active on 0.0.0.0:{DNS_PORT} -> resolving to {DNS_IP}", flush=True)
    while True:
        try:
            data, addr = sock.recvfrom(1024)
            if len(data) >= 12:
                resp, domain = build_dns_response(data, DNS_IP)
                sock.sendto(resp, addr)
                print(f"[DNS] Queried: {domain} -> Resolved {DNS_IP} for {addr[0]}", flush=True)
        except Exception as e:
            print(f"[-] DNS error: {e}", flush=True)

class CaptivePortalHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        print(f"[HTTP] GET {self.path} from {self.client_address[0]} (Host: {self.headers.get('Host')})", flush=True)
        self.send_response(200)
        
        # Check if standard Windows network connectivity test
        if "connecttest.txt" in self.path:
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(b"Microsoft Connect Test\n")
            return
            
        # Default success response ("Yes, proceed")
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        html = """<!DOCTYPE html>
<html>
<head><title>System Portal: Authorized</title></head>
<body style="background:#0d1117;color:#58a6ff;font-family:sans-serif;padding:40px;text-align:center;">
    <h1>&#10004; Gateway Authorized</h1>
    <p style="color:#8b949e;font-size:1.2rem;">Status: <strong>PROCEED (Local Auth Granted)</strong></p>
    <div style="margin-top:30px;padding:20px;background:#161b22;border-radius:8px;display:inline-block;color:#c9d1d9;">
        Host: <code>&lt;HOST_IP&gt; (minwinpc)</code><br>
        SRA: <code>&lt;CONSOLE_IP&gt; (XBOX)</code><br>
        Mode: <code>Dev Mode Hybrid (0x64)</code>
    </div>
</body>
</html>"""
        self.wfile.write(html.encode('utf-8'))

    def log_message(self, format, *args):
        pass  # Suppress default noisy stderr log

def run_http_server():
    server = HTTPServer(("0.0.0.0", HTTP_PORT), CaptivePortalHandler)
    print(f"[*] Captive / Auth Responder active on 0.0.0.0:{HTTP_PORT} (HTTP 200 PROCEED)", flush=True)
    server.serve_forever()

if __name__ == '__main__':
    t_dns = threading.Thread(target=run_dns_server, daemon=True)
    t_dns.start()
    run_http_server()
