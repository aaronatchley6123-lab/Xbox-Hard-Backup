import sqlite3

db_path = r"S:\ProgramData\Microsoft\Windows\AppRepository\StateRepository-Machine.srd"
conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
c = conn.cursor()

c.execute("SELECT _PackageID, PackageFullName, PackageFamily, OSMinVersion, Capabilities FROM Package WHERE _PackageID IN (1, 2, 3)")
for row in c.fetchall():
    print("Package info:", row)

# Let's find any tables with Location or Path
c.execute("SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE '%Location%' OR name LIKE '%Path%' OR name LIKE '%Volume%')")
print("Location/Volume tables:", c.fetchall())

conn.close()
