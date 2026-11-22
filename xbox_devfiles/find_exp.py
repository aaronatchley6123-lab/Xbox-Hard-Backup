import os
for drive in ['C', 'D', 'E', 'G', 'J', 'M', 'N', 'Q', 'S', 'T', 'U', 'V', 'X', 'Y']:
    root = drive + ':/'
    if not os.path.exists(root): continue
    try:
        for r, ds, fs in os.walk(root):
            for f in fs:
                if 'explorer' in f.lower():
                    print('FOUND:', os.path.join(r, f))
            if r.count('/') + r.count(chr(92)) > 3: del ds[:]
    except Exception: pass
