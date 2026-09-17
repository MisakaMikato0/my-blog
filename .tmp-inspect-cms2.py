import pathlib
p = pathlib.Path(r'G:\\ccode\\my-blog\\public\\admin\\decap-cms.js')
t = p.read_text(encoding='utf-8', errors='ignore')
# extract z4 function region around value usage
i = t.find('function z4(e){')
print('z4 at', i)
chunk = t[i:i+8000]
# find value usages in first 8000 chars
idx = 0
count = 0
while count < 15:
    j = chunk.find('value', idx)
    if j < 0: break
    print('--- value at', j, '---')
    print(chunk[max(0,j-120):j+180])
    print()
    idx = j+1
    count += 1
