file1 = open('tmp.csv', 'r')

file2 = open('aaai.csv','w')
file3 = open('to_fix.csv','w')

for line in file1.readlines():
    if line.startswith(','):
        file3.write(line)
    else:
        file2.write(line)

file1.close()
file2.close()
file3.close()
