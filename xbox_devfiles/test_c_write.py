import os  
for p in [r'C:\Windows\System32\test_write.tmp', r'C:\Windows\Temp\test_write.tmp']:  
    try:  
        with open(p, 'w') as f: f.write('1')  
        os.remove(p)  
        print(p, 'SUCCESS')  
    except Exception as e: print(p, 'FAILED:', e)  
