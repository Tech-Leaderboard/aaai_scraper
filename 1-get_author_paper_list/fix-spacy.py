import csv
import spacy
import sys
import re

comma_and = re.compile(r',|\band\b')
semicolon_and = re.compile(r';|\band\b')
parentheses = re.compile(r'\([^)]*\)')

def cleanup(lst):
    return list(filter(lambda x: len(x) > 0, map(lambda x: x.strip(), lst)))

def split_authors(s):
    t = cleanup(re.split(comma_and, s))
    # Fix Jr. and III
    res = []
    for e in t:
        if e == 'Jr.' or e == 'III':
            if len(res) > 0:
                res[-1] = res[-1] + ' ' + e
            else:
                print('Orphan name suffix: %s !!!' % e, file=sys.stderr)
                res.append(e)
        else:
            res.append(e)
    return res

def find_affili_pt_nlp(s):
    doc = nlp(s)
    for ent in doc.ents:
        if ent.label_ == 'ORG':
            return ent.start_char
    return -1

def nlp_has_label(s, label):
    doc = nlp(s)
    for ent in doc.ents:
        if ent.label_ == label:
            return True
    return False


def rsplit_skip_gpe_nlp(s, sep=','):
    s = s.strip()
    parts = e.rsplit(sep, maxsplit=1)
    if len(parts) == 1:
        print('affiliation missing? %s' % s, file=sys.stderr)
        return (s, '')
    if nlp_has_label(parts[1], 'GPE'):
        subparts = parts[0].rsplit(sep, maxsplit=1)
    else:
        subparts = [parts[0]]
    return (subparts[0], ''.join(subparts[1:]+parts[1:]))

def split_author_and_affili_parts(s):
    affili_pt = find_affili_pt_nlp(s)
    if affili_pt < 0:
        author_part, affili_part = rsplit_skip_gpe_nlp(s)
    else:
        author_part, affili_part = s[:affili_pt], s[affili_pt:]
    return (author_part.strip(), affili_part.strip())

# main
if len(sys.argv) < 2:
    print('usage: %s input' % sys.argv[0], file=sys.stderr)
    sys.exit(1)
infile = sys.argv[1]
#nlp = spacy.load('en')
nlp = spacy.load('xx')
with open(infile) as csvfile:
    reader = csv.reader(csvfile)
    writer = csv.writer(sys.stdout)
    for row in reader:
        year = int(row[3])
        if year > 2002:
            authors = split_authors(row[0])
            for author in authors:
                writer.writerow([author, ''] + row[1:])
        else:
            authors_and_affiliations = cleanup(row[0].split(';'))
            # fix the last element
            authors, affili = split_author_and_affili_parts(authors_and_affiliations[-1])
            m = re.search(r'\band\b', affili)
            if m and nlp_has_label(affili, 'PERSON'):
                affili_pos = authors_and_affiliations[-1].find(affili)
                authors_and_affiliations[-1] = authors_and_affiliations[-1][:affili_pos+m.start()]
                authors_and_affiliations.append(affili[m.end():])
            for e in authors_and_affiliations:
                authorp, affili = split_author_and_affili_parts(e)
                if '/' in affili:
                    index = affili.find('/')
                    if all([x.isdigit() or x == ' ' for x in affili[index + 1:]]):
                        affili = affili[:index].strip()
                if len(affili) > 40 and (' and ' in affili or ',' in affili):
                    print('affiliation error? %s' % affili, file=sys.stderr)

                authors = split_authors(authorp)
                for author in authors:
                    writer.writerow([author, affili] + row[1:])
