file1 = open('aaai.csv', 'r')
file2 = open('to_fix.csv','w')

for line in file1.readlines():
    if line.startswith(','):
        file2.write(line)

file1.close()
file2.close()
