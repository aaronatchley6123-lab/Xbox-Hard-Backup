import sqlite3, os, glob

srd_paths = glob.glob(r"S:\ProgramData\Microsoft\Windows\AppRepository\StateRepository-*.srd") + glob.glob(r"C:\ProgramData\Microsoft\Windows\AppRepository\StateRepository-*.srd")
print("Found StateRepository DBs:", srd_paths)

for db_path in srd_paths:
    print(f"\n--- Checking DB: {db_path} ---")
    try:
        conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
        cursor = conn.cursor()
        
        # Check tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [r[0] for r in cursor.fetchall()]
        print("Tables:", tables[:10])
        
        # Look for FileExplorer and DefaultApp
        print("\nQuerying Package table:")
        cursor.execute("SELECT _PackageID, PackageFullName FROM Package WHERE PackageFullName LIKE '%FileExplorer%' OR PackageFullName LIKE '%DefaultApp%'")
        packages = cursor.fetchall()
        for pid, name in packages:
            print(f"  Package [{pid}]: {name}")
            
            # Check PackageUser table to see which users have this package registered/enabled
            if 'PackageUser' in tables:
                cursor.execute("SELECT * FROM PackageUser WHERE _Package = ?", (pid,))
                pu = cursor.fetchall()
                print(f"    PackageUser records for {pid}: {pu}")
                
            if 'PackageArchitecture' in tables:
                cursor.execute("SELECT * FROM PackageArchitecture WHERE _Package = ?", (pid,))
                pa = cursor.fetchall()
                print(f"    PackageArchitecture: {pa}")

        # Let's check User table in SRD
        if 'User' in tables:
            print("\nUsers in StateRepository:")
            cursor.execute("SELECT * FROM User")
            for u in cursor.fetchall():
                print("  User:", u)
                
        conn.close()
    except Exception as e:
        print(f"Error querying {db_path}: {e}")

