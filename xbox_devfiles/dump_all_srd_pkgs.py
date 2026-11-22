import sqlite3

db_path = r"S:\ProgramData\Microsoft\Windows\AppRepository\StateRepository-Machine.srd"
conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
c = conn.cursor()

c.execute("SELECT _PackageID, PackageFullName, IsInbox FROM Package")
pkgs = c.fetchall()
print(f"Total packages ({len(pkgs)}):")
for pid, name, inbox in pkgs:
    c.execute("SELECT User, DeploymentState FROM PackageUser WHERE Package = ?", (pid,))
    users = c.fetchall()
    print(f"  [{pid}] (Inbox={inbox}) {name} -> Users: {users}")

conn.close()
