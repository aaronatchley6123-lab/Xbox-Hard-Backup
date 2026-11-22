import sqlite3

db_path = r"S:\ProgramData\Microsoft\Windows\AppRepository\StateRepository-Machine.srd"
conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
c = conn.cursor()

c.execute("PRAGMA table_info(Package)")
print("Package columns:", [col[1] for col in c.fetchall()])

c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%User%'")
print("User tables:", [r[0] for r in c.fetchall()])

for tbl in [r[0] for r in c.fetchall()]:
    c.execute(f"PRAGMA table_info({tbl})")
    print(f"{tbl} columns:", [col[1] for col in c.fetchall()])

c.execute("PRAGMA table_info(PackageUser)")
print("PackageUser columns:", [col[1] for col in c.fetchall()])

c.execute("SELECT * FROM PackageUser")
print("PackageUser rows:", c.fetchall())

c.execute("SELECT _PackageID, PackageFullName, InstalledLocation FROM Package")
all_pkgs = c.fetchall()
print(f"Total packages in StateRepository-Machine: {len(all_pkgs)}")
for p in all_pkgs:
    print(" ", p)

conn.close()
