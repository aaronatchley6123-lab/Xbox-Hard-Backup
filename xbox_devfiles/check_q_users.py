import os

path = r"Q:\Users\DefaultAccount"
try:
    entries = os.listdir(path)
    print(f"Contents of {path}:", entries)
except Exception as e:
    print(f"Error reading {path}: {e}")
