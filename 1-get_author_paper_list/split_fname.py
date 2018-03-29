import csv
import sys

# main
if len(sys.argv) < 2:
    print('usage: %s input' % sys.argv[0], file=sys.stderr)
    sys.exit(1)
infile = sys.argv[1]

print('full_name,f_name,affiliation,paper_title,paper_url,year')
with open(infile) as csvfile:
    reader = csv.reader(csvfile)
    writer = csv.writer(sys.stdout)
    for row in reader:
        if len(row) != 5:
            print('line error? %s' % row[-2], file=sys.stderr)

        for i in range(len(row)):
            row[i] = row[i].strip()

        f_name = row[0].split(' ')[0].strip('.').strip('/')
        writer.writerow([row[0], f_name.lower()] + row[1:])
