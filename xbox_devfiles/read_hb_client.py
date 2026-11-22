
with open(r"D:\DevelopmentFiles\hermes_bridge.py") as f:
    text = f.read()

pos = text.find("def handle_client(conn):")
print(text[pos:pos+1000])
