import os
import random
import subprocess

random.seed()
folderName = str(random.randint(0,1000000000000000000000000000))
os.mkdir("../../" + folderName)
try:
    os.remove("../../currpath.txt")
except:
    print("don't need to delete currpath")
pathFile = open("../../currpath.txt", "w+")
pathFile.write(folderName + "\\CACCC_Resource_Database\\Resource_Database\\")
pathFile.close()

try:
    os.remove("create.bat")
except:
    print("don't need to delete create")
batchFile = open("create.bat", "w+")
batchFile.write("cd ../../" + folderName + "\n")
batchFile.write("git clone --single-branch --branch master https://github.com/jim-m80/CACCC_Resource_Database")
batchFile.close()
subprocess.call("create.bat")

