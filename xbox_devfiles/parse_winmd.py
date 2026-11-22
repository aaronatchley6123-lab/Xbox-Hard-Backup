import pefile, struct

pe = pefile.PE(r'X:\Apps\DevHome\microsoft.xbox.development.winmd')
# Get CLI header
net_dir = pe.OPTIONAL_HEADER.DATA_DIRECTORY[14]
cli_header = pe.get_data(net_dir.VirtualAddress, net_dir.Size)
meta_rva, meta_size = struct.unpack_from('<II', cli_header, 8)
meta_data = pe.get_data(meta_rva, meta_size)

# Find strings in #Strings stream
strings_off = meta_data.find(b'#Strings')
print("Metadata parsed.")

# Simply find all strings starting with Run, get_, put_, Retrieve near Unattended
import re
print("Methods:")
for m in re.finditer(b'(?:get_|put_|Run|Retrieve|Check|Do)[a-zA-Z0-9_]+', meta_data):
    s = m.group().decode()
    if any(k in s.lower() for k in ['script', 'usb', 'oobe', 'unattend']):
        print("  ", s)
