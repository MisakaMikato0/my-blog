
from pathlib import Path
import re
root = Path(r'G:/ccode/my-blog/src/content/posts')
for f in sorted(root.rglob('*.md')):
    raw = f.read_text(encoding='utf-8')
    m = re.match(r'^---\n(.*?)\n---\r?\n(.*)$', raw, re.S)
    body = m.group(2) if m else None
    keys = []
    if m:
        keys = [ln.split(':',1)[0] for ln in m.group(1).splitlines() if ':' in ln]
    print(f'{f.relative_to(root)} match={bool(m)} body_len={len(body) if body is not None else None} body_empty={not (body or "").strip() if body is not None else None} fm_keys={keys}')

