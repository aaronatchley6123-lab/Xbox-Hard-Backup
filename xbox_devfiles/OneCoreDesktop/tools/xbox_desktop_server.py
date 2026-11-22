import http.server, socketserver, json, subprocess, os, urllib.parse

PORT = 8080

HTML_CONTENT = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Windows 11 Native Xbox Subsystem</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; }
  body {
    width: 100vw; height: 100vh; overflow: hidden; font-family: "Segoe UI Variable", "Segoe UI", sans-serif;
    background: radial-gradient(circle at center, #1b2838 0%, #0d1117 100%);
    color: #fff; position: relative;
  }
  #desktop {
    width: 100%; height: calc(100vh - 48px); position: relative;
    padding: 24px; display: flex; flex-direction: column; flex-wrap: wrap; align-content: flex-start; gap: 24px;
  }
  .desktop-icon {
    width: 90px; height: 100px; display: flex; flex-direction: column; align-items: center; justify-content: center;
    border-radius: 8px; cursor: pointer; text-align: center; font-size: 13px; text-shadow: 0 1px 4px rgba(0,0,0,0.8);
    transition: background 0.15s;
  }
  .desktop-icon:hover, .desktop-icon.focused { background: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255,255,255,0.2); }
  .desktop-icon .icon { font-size: 42px; margin-bottom: 6px; }

  #taskbar {
    width: 100%; height: 48px; background: rgba(20, 20, 24, 0.9); backdrop-filter: blur(20px);
    border-top: 1px solid rgba(255, 255, 255, 0.1); position: absolute; bottom: 0; left: 0;
    display: flex; align-items: center; justify-content: space-between; padding: 0 16px; z-index: 9999;
  }
  .taskbar-center {
    position: absolute; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 8px;
  }
  .tb-btn {
    width: 40px; height: 40px; border-radius: 4px; display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: background 0.15s; font-size: 22px;
  }
  .tb-btn:hover { background: rgba(255, 255, 255, 0.15); }
  .tray-clock { font-size: 12px; text-align: right; line-height: 1.2; padding: 4px 8px; cursor: default; }

  .window {
    position: absolute; border-radius: 8px; background: rgba(28, 28, 34, 0.96); backdrop-filter: blur(30px);
    border: 1px solid rgba(255, 255, 255, 0.14); box-shadow: 0 16px 40px rgba(0,0,0,0.7);
    display: flex; flex-direction: column; overflow: hidden; min-width: 440px; min-height: 280px; z-index: 100;
  }
  .window-header {
    height: 36px; background: rgba(255, 255, 255, 0.05); border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    display: flex; align-items: center; justify-content: space-between; padding: 0 12px; cursor: move;
  }
  .window-title { font-size: 13px; font-weight: 500; display: flex; align-items: center; gap: 8px; }
  .win-btn {
    width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
    cursor: pointer; font-size: 14px; color: #ccc; border-radius: 4px;
  }
  .win-btn:hover { background: #e81123; color: #fff; }
  .window-body { flex: 1; overflow: auto; padding: 14px; }

  .drive-list { display: flex; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
  .drive-btn {
    padding: 8px 14px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15);
    border-radius: 6px; cursor: pointer; color:#fff; font-size: 13px;
  }
  .drive-btn:hover { background: #0078d4; border-color: #0078d4; }
  .file-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .file-table th { text-align: left; padding: 8px; color: #888; border-bottom: 1px solid rgba(255,255,255,0.1); }
  .file-table td { padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.04); cursor: pointer; }
  .file-table tr:hover td { background: rgba(255,255,255,0.1); }

  #term-output {
    width: 100%; height: 260px; background: #0a0a0c; border: 1px solid #333; border-radius: 4px;
    font-family: Consolas, monospace; font-size: 12px; padding: 10px; overflow-y: scroll; color: #00ff88; white-space: pre-wrap;
  }
  .term-input-row { display: flex; gap: 8px; margin-top: 10px; }
  #term-input {
    flex: 1; background: #18181c; border: 1px solid #444; color: #fff; padding: 8px 12px; border-radius: 4px;
    font-family: Consolas, monospace; font-size: 13px;
  }
  .quick-btn {
    padding: 6px 12px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);
    border-radius: 4px; color: #fff; cursor: pointer; font-size: 12px;
  }
  .quick-btn:hover { background: #0078d4; }
  #virtual-cursor {
    width: 22px; height: 22px; position: absolute; pointer-events: none; z-index: 100000;
    transform: translate(-2px, -2px); display: none;
  }
</style>
</head>
<body>

<div id="desktop">
  <div class="desktop-icon" onclick="openExplorer('C:\\\\')">
    <div class="icon">📁</div>
    <span>This PC</span>
  </div>
  <div class="desktop-icon" onclick="openTerminal()">
    <div class="icon">💻</div>
    <span>Terminal</span>
  </div>
  <div class="desktop-icon" onclick="openTaskMgr()">
    <div class="icon">📊</div>
    <span>Task Manager</span>
  </div>
  <div class="desktop-icon" onclick="openSysInfo()">
    <div class="icon">⚙️</div>
    <span>System Specs</span>
  </div>
</div>

<div id="taskbar">
  <div style="font-size:12px; font-weight:600; color:#00ff88;">Xbox Series X (Native Desktop Subsystem)</div>
  <div class="taskbar-center">
    <div class="tb-btn" onclick="openSysInfo()" title="Start">🪟</div>
    <div class="tb-btn" onclick="openExplorer('C:\\\\')" title="File Explorer">📁</div>
    <div class="tb-btn" onclick="openTerminal()" title="Terminal">💻</div>
    <div class="tb-btn" onclick="openTaskMgr()" title="Task Manager">📊</div>
  </div>
  <div class="tray-clock" id="clock">--:--</div>
</div>

<svg id="virtual-cursor" viewBox="0 0 24 24" fill="#00ffff" stroke="#000" stroke-width="1.5">
  <path d="M4 2v18l5-5h9z"/>
</svg>

<script>
function updateClock() {
  const d = new Date();
  document.getElementById("clock").innerHTML = d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) + "<br>" + d.toLocaleDateString();
}
setInterval(updateClock, 1000);
updateClock();

let zIndex = 100;
function bringToFront(el) { el.style.zIndex = ++zIndex; }

function createWindow(title, contentHtml, width=700, height=440) {
  const win = document.createElement("div");
  win.className = "window";
  win.style.width = width + "px";
  win.style.height = height + "px";
  win.style.left = (window.innerWidth/2 - width/2 + (Math.random()*30-15)) + "px";
  win.style.top = (window.innerHeight/2 - height/2 + (Math.random()*30-15)) + "px";
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
      <button class="drive-btn" onclick="browseFolder('C:\\\\')">💾 C: (System OS)</button>
      <button class="drive-btn" onclick="browseFolder('D:\\\\')">💾 D: (Development)</button>
      <button class="drive-btn" onclick="browseFolder('E:\\\\')">💾 E: (USB Win11)</button>
      <button class="drive-btn" onclick="browseFolder('Q:\\\\')">💾 Q: (NVMe Pool 20GB)</button>
      <button class="drive-btn" onclick="browseFolder('S:\\\\')">💾 S: (OSDATA 744MB)</button>
    </div>
    <div style="font-size:12px; margin-bottom:8px; color:#00ff88;">Current Path: <span id="exp-current-path">${path}</span></div>
    <div style="overflow-y:auto; height:calc(100% - 80px);">
      <table class="file-table">
        <thead><tr><th>Name</th><th>Size</th><th>Date</th></tr></thead>
        <tbody id="exp-file-tbody"><tr><td colspan="3">Loading...</td></tr></tbody>
      </table>
    </div>
  `;
  const win = createWindow("📁 File Explorer", content, 740, 480);
  browseFolder(path, win);
}

function browseFolder(path) {
  fetch("/api/files?path=" + encodeURIComponent(path))
    .then(r => r.json())
    .then(data => {
      const tbody = document.getElementById("exp-file-tbody");
      const pathLabel = document.getElementById("exp-current-path");
      if (pathLabel) pathLabel.innerText = path;
      if (!tbody) return;
      tbody.innerHTML = "";
      if (data.parent) {
        tbody.innerHTML += `<tr onclick="browseFolder('${data.parent.replace(/\\\\/g, "\\\\\\\\")}')"><td colspan="3" style="color:#0078d4;">📁 .. [Up One Directory]</td></tr>`;
      }
      data.items.forEach(item => {
        const icon = item.is_dir ? "📁" : "📄";
        const clickHandler = item.is_dir 
          ? `browseFolder('${item.path.replace(/\\\\/g, "\\\\\\\\")}')` 
          : `viewFile('${item.path.replace(/\\\\/g, "\\\\\\\\")}')`;
        tbody.innerHTML += `
          <tr onclick="${clickHandler}">
            <td>${icon} ${item.name}</td>
            <td>${item.size}</td>
            <td>${item.date}</td>
          </tr>
        `;
      });
    });
}

function viewFile(path) {
  fetch("/api/file_content?path=" + encodeURIComponent(path))
    .then(r => r.text())
    .then(text => {
      createWindow("📄 " + path, `<pre style="font-family:Consolas; font-size:12px; white-space:pre-wrap; color:#ddd;">${text}</pre>`, 640, 420);
    });
}

function openTerminal() {
  const content = `
    <div style="margin-bottom:8px; display:flex; gap:6px; flex-wrap:wrap;">
      <button class="quick-btn" onclick="runTermCmd('dir C:\\\\')">dir C:\\</button>
      <button class="quick-btn" onclick="runTermCmd('dir D:\\\\')">dir D:\\</button>
      <button class="quick-btn" onclick="runTermCmd('dir Q:\\\\')">dir Q:\\</button>
      <button class="quick-btn" onclick="runTermCmd('dir S:\\\\')">dir S:\\</button>
      <button class="quick-btn" onclick="runTermCmd('tasklist')">tasklist</button>
      <button class="quick-btn" onclick="runTermCmd('whoami')">whoami</button>
      <button class="quick-btn" onclick="runTermCmd('ipconfig')">ipconfig</button>
    </div>
    <div id="term-output">Xbox OneCore Native Interactive Command Prompt\nType a command or click a quick shortcut above...\n</div>
    <div class="term-input-row">
      <input type="text" id="term-input" placeholder="Enter cmd command..." onkeydown="if(event.key==='Enter') runTermCmd(this.value)">
      <button class="quick-btn" onclick="runTermCmd(document.getElementById('term-input').value)">Execute</button>
    </div>
  `;
  createWindow("💻 Command Prompt", content, 700, 440);
}

function runTermCmd(cmd) {
  if (!cmd) return;
  const out = document.getElementById("term-output");
  out.innerText += "\n> " + cmd + "\n[Executing...]\n";
  out.scrollTop = out.scrollHeight;
  fetch("/api/exec", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({command: cmd})
  })
  .then(r => r.json())
  .then(res => {
    out.innerText += (res.output || "[No output]") + "\n";
    out.scrollTop = out.scrollHeight;
  });
}

function openTaskMgr() {
  fetch("/api/processes")
    .then(r => r.json())
    .then(procs => {
      let rows = procs.map(p => `<tr><td>${p.pid}</td><td>${p.name}</td><td>${p.mem || "-"}</td></tr>`).join("");
      const content = `
        <div style="overflow-y:auto; height:100%;">
          <table class="file-table">
            <thead><tr><th>PID</th><th>Process Name</th><th>Memory</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
      createWindow("📊 Task Manager", content, 580, 420);
    });
}

function openSysInfo() {
  const content = `
    <div style="font-size:13px; line-height:1.8;">
      <h3 style="color:#00ff88; margin-bottom:12px;">Xbox Series X (ScarlettOther)</h3>
      <p><b>Hardware:</b> AMD Zen 2 (8-Core / 16-Thread Custom APU) + RDNA 2 GPU</p>
      <p><b>Operating System:</b> Windows 11 OneCore (Build 10.0.26100.9445)</p>
      <p><b>Storage:</b> 1 TB PCIe 4.0 NVMe Solid State Drive</p>
      <p><b>Mounts:</b> C: (System Boot), D: (Scratch), Q: (Pool - 20.29 GB Free), S: (OSDATA - 744 MB Free)</p>
      <p><b>Display Compositor:</b> Desktop Window Manager (dwm.exe) Session 0 DirectComposition</p>
    </div>
  `;
  createWindow("⚙️ System Specifications", content, 520, 320);
}

let cursorX = window.innerWidth / 2, cursorY = window.innerHeight / 2;
const cursorEl = document.getElementById("virtual-cursor");
window.addEventListener("gamepadconnected", () => { cursorEl.style.display = "block"; });

function pollGamepad() {
  const gamepads = navigator.getGamepads();
  if (gamepads && gamepads[0]) {
    const gp = gamepads[0];
    const lx = gp.axes[0], ly = gp.axes[1];
    if (Math.abs(lx) > 0.15 || Math.abs(ly) > 0.15) {
      cursorX = Math.max(10, Math.min(window.innerWidth - 10, cursorX + lx * 14));
      cursorY = Math.max(10, Math.min(window.innerHeight - 10, cursorY + ly * 14));
      cursorEl.style.left = cursorX + "px";
      cursorEl.style.top = cursorY + "px";
      cursorEl.style.display = "block";
    }
    if (gp.buttons[0].pressed) {
      const target = document.elementFromPoint(cursorX, cursorY);
      if (target) target.click();
    }
  }
  requestAnimationFrame(pollGamepad);
}
requestAnimationFrame(pollGamepad);
window.onload = () => {
  openExplorer("C:\\");
  setTimeout(openTerminal, 300);
};
</script>
</body>
</html>"""

class DesktopHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/" or parsed.path == "/index.html":
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
        elif parsed.path == "/api/processes":
            res = subprocess.getoutput("tasklist /fo csv /nh")
            procs = []
            for line in res.splitlines():
                parts = [p.strip('"') for p in line.split('","')]
                if len(parts) >= 5:
                    procs.append({"name": parts[0], "pid": parts[1], "mem": parts[4]})
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(procs).encode("utf-8"))
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
    print(f"[*] Native Windows 11 Desktop Web Engine active on port {PORT}...", flush=True)
    httpd.serve_forever()
