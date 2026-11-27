with open(r'D:\DevelopmentFiles\DevHomeOverlay\toolwindows\wdp\wdp.html', 'w', encoding='utf-8') as f:
    f.write('''<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <title>Windows Device Portal</title>
    <link href="wdp.css" rel="stylesheet" />
    <script src="wdp.js"></script>
</head>
<body>
    <div id="xbdh-wdp" class="xbdh-form">
        <p id="xbdh-wdp-enableddescription" data-win-res='{ "textContent": "wdpToolDescriptionAlreadyEnabled" }' style="display: none;"></p>
        <p id="xbdh-wdp-disableddescription" data-win-res='{ "textContent": "wdpToolDescription" }'></p>
        <p id="xbdh-wdp-enabledadditionaldescription" class="xbdh-wdp-enabledadditionaldescription" style="display: none;"></p>
        <button id="xbdh-wdp-configurewdp" data-win-res='{ "textContent": "wdpToolConfigureWdp" }'></button>

        <div style="margin-top: 16px; padding: 14px; background: rgba(0, 120, 212, 0.18); border: 1px solid #0078d4; border-radius: 6px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                <span style="font-size: 15px; font-weight: 600; color: #00ff88;">AI Studio Linux Controller</span>
                <span style="font-size: 11px; padding: 2px 8px; background: #107c10; color: #fff; border-radius: 3px; font-weight: bold;">PORT 3000 ACTIVE</span>
            </div>
            <p style="font-size: 12px; color: #ddd; margin-bottom: 8px; line-height: 1.4;">
                Full Xbox GDK & XDK Management Suite (Process Monitor, Package Deployer, Live ETW Debugger, All-Drive Explorer).
            </p>
            <div style="font-family: Consolas, monospace; font-size: 12px; background: #08080a; padding: 8px 12px; border-radius: 4px; color: #00ff88; border: 1px solid #333; margin-bottom: 10px;">
                Endpoint: http://10.42.0.1:3000
            </div>
            <div style="font-size: 11px; color: #aaa; line-height: 1.4;">
                <b>WDP AllDrives Root:</b> D:\DevelopmentFiles\AllDrives\<br/>
                All partitions (C:, M:, S:, Q:, J:, X:, Y:) now unlocked & browsable in WDP File Explorer.
            </div>
        </div>
    </div>
</body>
</html>
''')
print("Patched wdp.html successfully")
