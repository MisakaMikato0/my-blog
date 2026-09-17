import pathlib
p = pathlib.Path(r'G:\\ccode\\my-blog\\public\\admin\\decap-cms.js')
t = p.read_text(encoding='utf-8', errors='ignore')

def around(needle, n=1800, occ=0):
    start = 0
    found = 0
    while True:
        i = t.find(needle, start)
        if i < 0:
            return 'NOT FOUND occ=%s needle=%s' % (occ, needle)
        if found == occ:
            a = max(0, i-n)
            b = min(len(t), i+n)
            return '--- %s occ=%s at %s ---\n%s' % (needle, occ, i, t[a:b])
        found += 1
        start = i+1

for k in ['ENTRY_REQUEST','ENTRY_SUCCESS','ENTRY_FAILURE','entryLoading','loadEntry=','function Qd(','function Zd(','function Yd(']:
    print(k, t.count(k))

needles = [
    ('"ENTRY_REQUEST"', 0),
    ('"ENTRY_SUCCESS"', 0),
    ('loadEntry=', 0),
    ('async(e,t)=>{const n=e.get("name")', 0),
    ('retrieveLocalBackup', 1),
    ('localBackup', 0),
]
print('\n\n==========\n\n'.join(around(n, 1400, occ) for n, occ in needles))
