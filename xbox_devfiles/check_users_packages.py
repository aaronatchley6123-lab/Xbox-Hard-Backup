import sqlite3

db_path = r"S:\ProgramData\Microsoft\Windows\AppRepository\StateRepository-Machine.srd"
conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
c = conn.cursor()

print("--- USERS in StateRepository ---")
c.execute("SELECT _UserID, UserSid FROM User")
for uid, sid in c.fetchall():
    print(f"User ID {uid}: SID {sid}")

print("\n--- PACKAGES in StateRepository ---")
c.execute("SELECT _PackageID, PackageFullName, IsInbox FROM Package")
packages = {pid: (name, inbox) for pid, name, inbox in c.fetchall()}
print(f"Total packages in DB: {len(packages)}")

print("\n--- Check if FileExplorer is in DB ---")
for pid, (name, inbox) in packages.items():
    if "explorer" in name.lower() or "file" in name.lower() or "default" in name.lower():
        print(f"Match [{pid}]: {name} (Inbox: {inbox})")
        c.execute("SELECT User, DeploymentState FROM PackageUser WHERE Package = ?", (pid,))
        reg_users = c.fetchall()
        print(f"  Registered for Users: {reg_users}")

conn.close()
