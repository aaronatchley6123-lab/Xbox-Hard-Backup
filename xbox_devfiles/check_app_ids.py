import sqlite3

db_path = r"S:\ProgramData\Microsoft\Windows\AppRepository\StateRepository-Machine.srd"
conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
c = conn.cursor()

c.execute("PRAGMA table_info(Application)")
cols = [col[1] for col in c.fetchall()]
print("Application columns:", cols)

c.execute("SELECT _ApplicationID, Package, ApplicationId, Executable, EntryPoint, DisplayName FROM Application WHERE Package IN (1, 2, 3, 4, 5, 84, 85)")
for row in c.fetchall():
    print("Application row:", row)

conn.close()
