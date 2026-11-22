import sqlite3

db_path = r"S:\ProgramData\Microsoft\Windows\AppRepository\StateRepository-Machine.srd"
conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
c = conn.cursor()

c.execute("SELECT _ApplicationID, Package, PackageRelativeApplicationId, ApplicationUserModelId, Executable, Entrypoint FROM Application WHERE Package IN (1, 2, 3, 4, 5, 84, 85)")
for row in c.fetchall():
    print("App:", row)

conn.close()
