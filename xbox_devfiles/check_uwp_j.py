import subprocess
print(subprocess.getoutput('icacls "J:\\."'))
print(subprocess.getoutput('icacls "J:\\tools"'))
print(subprocess.getoutput('icacls "J:\\tools\\xrolock.exe"'))
print(subprocess.getoutput('icacls "J:\\tools\\wdapp.exe"'))
