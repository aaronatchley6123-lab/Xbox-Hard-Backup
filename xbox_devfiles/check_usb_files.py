
import os
vol = r"\?\Volume{d2f60700-e074-11f1-a1ac-a88c3ecbb62c}"
try:
    files = os.listdir(vol)
    print('Files on USB volume GUID directly:', files)
except Exception as e:
    print('os.listdir error:', e)
