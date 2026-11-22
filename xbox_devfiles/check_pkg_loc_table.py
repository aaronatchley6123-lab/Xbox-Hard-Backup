import sqlite3

db_path = r"S:\ProgramData\Microsoft\Windows\AppRepository\StateRepository-Machine.srd"
conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
c = conn.cursor()

c.execute("PRAGMA table_info(PackageLocation)")
print("PackageLocation columns:", [col[1] for col in c.fetchall()])

c.execute("SELECT * FROM PackageLocation WHERE Package IN (1, 2, 3)")
for row in c.fetchall():
    print("PackageLocation row:", row)

conn.close()
