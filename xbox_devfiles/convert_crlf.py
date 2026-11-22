with open(r"E:\setup.xboxunattend", "rb") as f:
    content = f.read()

# Replace all unix \n with windows \r\n
clean = content.replace(b"\r\n", b"\n").replace(b"\n", b"\r\n")

with open(r"E:\setup.xboxunattend", "wb") as f:
    f.write(clean)

print("Rewritten E:\setup.xboxunattend with pure DOS CRLF: " + str(len(clean)) + " bytes")
