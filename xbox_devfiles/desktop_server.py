import http.server, socketserver, json, subprocess, os, urllib.parse

PORT = 8080

HTML_CONTENT = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Windows 11 Native Xbox Subsystem</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 100vw; height: 100vh; overflow: hidden;
    font-family: 'Segoe UI Variable', 'Segoe UI', system-ui, -apple-system, sans-serif;
    background: radial-gradient(circle at center, #1b2838 0%, #0d1117 100%);
    color: #fff; position: relative;
  }
  #desktop {
    width: 100%; height: calc(100vh - 48px); position: relative;
    padding: 24px; display: flex; flex-direction: column; flex-wrap: wrap; align-content: flex-start; gap: 24px;
    z-index: 1;
  }
  .desktop-icon {
    width: 90px; height: 100px; display: flex; flex-direction: column; align-items: center; justify-content: center;
    border-radius: 8px; cursor: pointer; text-align: center; font-size: 13px; text-shadow: 0 1px 4px rgba(0,0,0,0.8);
    transition: background 0.15s; user-select: none;
  }
  .desktop-icon:hover { background: rgba(255, 255, 255, 0.18); border: 1px solid rgba(255,255,255,0.25); }
  .desktop-icon .icon { font-size: 42px; margin-bottom: 6px; pointer-events: none; }

  #taskbar {
    width: 100%; height: 48px; background: rgba(20, 20, 24, 0.95); backdrop-filter: blur(20px);
    border-top: 1px solid rgba(255, 255, 255, 0.15); position: absolute; bottom: 0; left: 0;
    display: flex; align-items: center; justify-content: space-between; padding: 0 16px; z-index: 99999;
  }
  .taskbar-center {
    position: absolute; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 8px;
  }
  .tb-btn {
    width: 40px; height: 40px; border-radius: 6px; display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: background 0.15s; font-size: 22px; user-select: none;
  }
  .tb-btn:hover { background: rgba(255, 255, 255, 0.2); }
  .tray-clock { font-size: 12px; text-align: right; line-height: 1.2; padding: 4px 8px; }

  .window {
    position: absolute; border-radius: 8px; background: rgba(28, 28, 34, 0.98); backdrop-filter: blur(30px);
    border: 1px solid rgba(255, 255, 255, 0.2); box-shadow: 0 16px 40px rgba(0,0,0,0.8);
    display: flex; flex-direction: column; overflow: hidden; min-width: 460px; min-height: 320px; z-index: 100;
  }
  .window-header {
    height: 38px; background: rgba(255, 255, 255, 0.08); border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    display: flex; align-items: center; justify-content: space-between; padding: 0 12px; cursor: move; user-select: none;
  }
  .window-title { font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
  .win-btn {
    width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
    cursor: pointer; font-size: 14px; color: #ccc; border-radius: 4px;
  }
  .win-btn:hover { background: #e81123; color: #fff; }
  .window-body { flex: 1; overflow: auto; padding: 14px; }

  .drive-list { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
  .drive-btn {
    padding: 8px 14px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);
    border-radius: 6px; cursor: pointer; color:#fff; font-size: 13px; font-weight: 500;
  }
  .drive-btn:hover { background: #0078d4; border-color: #0078d4; }
  .file-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .file-table th { text-align: left; padding: 8px; color: #888; border-bottom: 1px solid rgba(255,255,255,0.1); }
  .file-table td { padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.06); cursor: pointer; }
  .file-table tr:hover td { background: rgba(255,255,255,0.15); }

  #term-output {
    width: 100%; height: 260px; background: #0a0a0c; border: 1px solid #333; border-radius: 4px;
    font-family: Consolas, monospace; font-size: 12px; padding: 10px; overflow-y: scroll; color: #00ff88; white-space: pre-wrap;
  }
  .term-input-row { display: flex; gap: 8px; margin-top: 10px; }
  #term-input {
    flex: 1; background: #18181c; border: 1px solid #555; color: #fff; padding: 8px 12px; border-radius: 4px;
    font-family: Consolas, monospace; font-size: 13px;
  }
  .quick-btn {
    padding: 6px 12px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);
    border-radius: 4px; color: #fff; cursor: pointer; font-size: 12px;
  }
  .quick-btn:hover { background: #0078d4; }
</style>
</head>
<body>

<div id="desktop">
  <div class="desktop-icon" onclick="openExplorer('C:\\\\')">
    <div class="icon">📁</div>
    <span>This PC</span>
  </div>
  <div class="desktop-icon" onclick="openExplorer('M:\\\\windows\\\\system32')">
    <div class="icon">⚙️</div>
    <span>SystemOS (M:)</span>
  </div>
  <div class="desktop-icon" onclick="openExplorer('D:\\\\DevelopmentFiles')">
    <div class="icon">🛠️</div>
    <span>DevFiles (D:)</span>
  </div>
  <div class="desktop-icon" onclick="openExplorer('Q:\\\\')">
    <div class="icon">💾</div>
    <span>NVMe (Q:)</span>
  </div>
  <div class="desktop-icon" onclick="openTerminal()">
    <div class="icon">💻</div>
    <span>Terminal</span>
  </div>
  <div class="desktop-icon" onclick="openSysInfo()">
    <div class="icon">ℹ️</div>
    <span>System Specs</span>
  </div>
</div>

<div id="taskbar">
  <div style="font-size:12px; font-weight:600; color:#00ff88;">Xbox Series X (Native Desktop Subsystem)</div>
  <div class="taskbar-center">
    <div class="tb-btn" onclick="openSysInfo()" title="Start">🪟</div>
    <div class="tb-btn" onclick="openExplorer('C:\\\\')" title="File Explorer">📁</div>
    <div class="tb-btn" onclick="openTerminal()" title="Terminal">💻</div>
    <div class="tb-btn" onclick="openExplorer('M:\\\\windows\\\\system32')" title="SystemOS">⚙️</div>
  </div>
  <div class="tray-clock" id="clock">--:--</div>
</div>

<script>
function updateClock() {
  const d = new Date();
  document.getElementById("clock").innerText = d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}
setInterval(updateClock, 1000);
updateClock();

let zIndex = 100;
function bringToFront(el) {
  zIndex++;
  el.style.zIndex = zIndex;
}

function createWindow(title, contentHtml, width=740, height=480) {
  const win = document.createElement("div");
  win.className = "window";
  win.style.width = width + "px";
  win.style.height = height + "px";
  win.style.left = Math.max(20, (window.innerWidth/2 - width/2 + (Math.random()*40-20))) + "px";
  win.style.top = Math.max(20, (window.innerHeight/2 - height/2 + (Math.random()*40-20))) + "px";
  win.onmousedown = () => bringToFront(win);
  
  win.innerHTML = `
    <div class="window-header">
      <div class="window-title">${title}</div>
      <div class="window-controls">
        <div class="win-btn" onclick="this.closest('.window').remove()">✕</div>
      </div>
    </div>
    <div class="window-body">${contentHtml}</div>
  `;
  document.body.appendChild(win);
  bringToFront(win);

  const header = win.querySelector(".window-header");
  let isDragging = false, startX, startY, initX, initY;
  header.onmousedown = (e) => {
    isDragging = true; startX = e.clientX; startY = e.clientY;
    initX = parseInt(win.style.left); initY = parseInt(win.style.top);
  };
  window.onmousemove = (e) => {
    if (isDragging) {
      win.style.left = (initX + e.clientX - startX) + "px";
      win.style.top = (initY + e.clientY - startY) + "px";
    }
  };
  window.onmouseup = () => isDragging = false;
  return win;
}

function openExplorer(path="C:\\\\") {
  const content = `
    <div class="drive-list">
      <button class="drive-btn" onclick="browseFolder('C:\\\\')">💾 C: (Kernel)</button>
      <button class="drive-btn" onclick="browseFolder('M:\\\\windows\\\\system32')">💾 M: (SystemOS Misc)</button>
      <button class="drive-btn" onclick="browseFolder('D:\\\\DevelopmentFiles')">💾 D: (Development)</button>
      <button class="drive-btn" onclick="browseFolder('Q:\\\\')">💾 Q: (NVMe Storage)</button>
    </div>
    <div style="font-size:12px; margin-bottom:8px; color:#00ff88;">Current Path: <span class="exp-current-path">${path}</span></div>
    <div style="overflow-y:auto; height:calc(100% - 90px);">
      <table class="file-table">
        <thead><tr><th>Name</th><th>Size</th><th>Date</th></tr></thead>
        <tbody class="exp-file-tbody"><tr><td colspan="3">Loading...</td></tr></tbody>
      </table>
    </div>
  `;
  const win = createWindow("📁 File Explorer", content, 760, 500);
  browseFolder(path, win);
}

function browseFolder(path, winEl=null) {
  const container = winEl || document;
  fetch("/api/files?path=" + encodeURIComponent(path))
    .then(r => r.json())
    .then(data => {
      const tbody = container.querySelector(".exp-file-tbody") || document.querySelector(".exp-file-tbody");
      const pathLabel = container.querySelector(".exp-current-path") || document.querySelector(".exp-current-path");
      if (pathLabel) pathLabel.innerText = path;
      if (!tbody) return;
      tbody.innerHTML = "";
      if (data.parent) {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td colspan="3" style="color:#0078d4;">📁 .. [Up One Directory]</td>`;
        tr.onclick = () => browseFolder(data.parent);
        tbody.appendChild(tr);
      }
      data.items.forEach(item => {
        const tr = document.createElement("tr");
        const icon = item.is_dir ? "📁" : "📄";
        tr.innerHTML = `<td>${icon} ${item.name}</td><td>${item.size}</td><td>${item.date}</td>`;
        if (item.is_dir) {
          tr.onclick = () => browseFolder(item.path);
        } else {
          tr.onclick = () => viewFile(item.path);
        }
        tbody.appendChild(tr);
      });
    })
    .catch(err => {
      const tbody = container.querySelector(".exp-file-tbody");
      if (tbody) tbody.innerHTML = `<tr><td colspan="3" style="color:#ff4444;">Error: ${err}</td></tr>`;
    });
}

function viewFile(path) {
  fetch("/api/file_content?path=" + encodeURIComponent(path))
    .then(r => r.text())
    .then(text => {
      const content = `<pre style="font-family:Consolas, monospace; font-size:12px; color:#ddd; white-space:pre-wrap; user-select:text;">${text.replace(/</g,"&lt;")}</pre>`;
      createWindow("📄 " + path.split("\\\\").pop(), content, 650, 420);
    });
}

function openTerminal() {
  const content = `
    <div id="term-output">Microsoft Windows [Version 10.0.26100.9445]\n(c) Microsoft Corporation. All rights reserved.\n\nXbox Dev Mode Native Shell Connected.\n\n</div>
    <div class="term-input-row">
      <input type="text" id="term-input" placeholder="Type Windows command (e.g. dir, ver, whoami)..." onkeydown="if(event.key==='Enter') runCmd()">
      <button class="quick-btn" onclick="runCmd()">Run</button>
    </div>
    <div style="margin-top:10px; display:flex; gap:8px;">
      <button class="quick-btn" onclick="quickCmd('whoami')">whoami</button>
      <button class="quick-btn" onclick="quickCmd('dir D:\\\\DevelopmentFiles')">dir D:</button>
      <button class="quick-btn" onclick="quickCmd('python D:\\\\DevelopmentFiles\\\\query_vmm_ioctls.py')">Query VMM</button>
      <button class="quick-btn" onclick="quickCmd('python D:\\\\DevelopmentFiles\\\\xpal_probe.py')">Probe XPAL</button>
    </div>
  `;
  createWindow("💻 Windows Native Terminal", content, 720, 460);
}

function quickCmd(cmd) {
  const inp = document.getElementById("term-input");
  if (inp) { inp.value = cmd; runCmd(); }
}

function runCmd() {
  const inp = document.getElementById("term-input");
  const out = document.getElementById("term-output");
  if (!inp || !out) return;
  const cmd = inp.value.trim();
  if (!cmd) return;
  out.innerText += "\n> " + cmd + "\n";
  inp.value = "";
  fetch("/api/exec", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({command: cmd})
  })
  .then(r => r.json())
  .then(data => {
    out.innerText += data.output + "\n";
    out.scrollTop = out.scrollHeight;
  });
}

function openSysInfo() {
  const content = `
    <div style="line-height: 1.8; font-size: 13px;">
      <h3 style="color:#00ff88; margin-bottom: 12px;">Xbox Series X Hardware & Subsystem Dossier</h3>
      <p><b>APU Silicon:</b> AMD Scarlett Custom APU (Project Anaconda)</p>
      <p><b>CPU Core:</b> 8x Zen 2 Physical Cores @ 3.8 GHz (16 SMT Threads)</p>
      <p><b>GPU Architecture:</b> AMD RDNA 2 (52 CUs @ 1.825 GHz, 12 TFLOPs)</p>
      <p><b>Memory Subsystem:</b> 16 GB GDDR6 (10 GB @ 560 GB/s + 6 GB @ 336 GB/s)</p>
      <p><b>Operating Kernel:</b> Windows OneCore 24H2 (Build 10.0.26100.9445)</p>
      <p><b>Active Partition Layers:</b> HostOS / SystemOS (M:), Exclusive GameOS (ERA), Shared SRA (D:, Q:)</p>
      <p><b>Device Control:</b> \\\\.\\xvmctrl Active (Hypervisor IOCTL interface)</p>
      <p><b>Filesystem Driver:</b> xrfs.sys (Xbox Resilient File System with XRO Filter)</p>
    </div>
  `;
  createWindow("ℹ️ System Specs", content, 600, 380);
}
</script>
</body>
</html>"""

class DesktopHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path in ["/", "/index.html"]:
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(HTML_CONTENT.encode("utf-8"))
        elif parsed.path == "/api/files":
            qs = urllib.parse.parse_qs(parsed.query)
            target = qs.get("path", ["C:\\"])[0]
            items = []
            parent = os.path.dirname(target.rstrip("\\/")) if target.rstrip("\\/") else None
            try:
                for entry in os.scandir(target):
                    try:
                        stat = entry.stat()
                        sz = f"{stat.st_size / 1024:.1f} KB" if not entry.is_dir() else "<DIR>"
                        date_str = str(int(stat.st_mtime))
                    except:
                        sz = "-"
                        date_str = "-"
                    items.append({"name": entry.name, "path": entry.path, "is_dir": entry.is_dir(), "size": sz, "date": date_str})
            except Exception as e:
                items.append({"name": f"Error: {e}", "path": target, "is_dir": False, "size": "-", "date": "-"})
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"current": target, "parent": parent, "items": items}).encode("utf-8"))
        elif parsed.path == "/api/file_content":
            qs = urllib.parse.parse_qs(parsed.query)
            target = qs.get("path", [""])[0]
            try:
                with open(target, "r", encoding="utf-8", errors="replace") as f:
                    content = f.read(100000)
            except Exception as e:
                content = f"Error reading file: {e}"
            self.send_response(200)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.end_headers()
            self.wfile.write(content.encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path == "/api/exec":
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length)
            cmd = json.loads(body).get("command", "")
            try:
                res = subprocess.getoutput(cmd)
            except Exception as e:
                res = str(e)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"output": res}).encode("utf-8"))

socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("0.0.0.0", PORT), DesktopHandler) as httpd:
    print(f"[*] Windows 11 Desktop Web Engine active on port {PORT}...", flush=True)
    httpd.serve_forever()
