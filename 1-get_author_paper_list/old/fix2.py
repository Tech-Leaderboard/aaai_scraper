import csv
import pdftotext

with open("aaai.csv", 'r') as my_file:
    reader = csv.reader(my_file, delimiter=',')
    my_list = list(reader)

    for i, row in enumerate(my_list):
        row = map(lambda x: x.decode('utf-8'), row)
        for j in range(3):
            if i != 0 and len(row[j]) > 0:
                content = row[j]
                content = content.strip().strip('and ').replace('"', '""')
                row[j] = '"' + content + '"'
        row = [x.encode('utf-8') for x in row]
        print(','.encode('utf-8').join(row))
