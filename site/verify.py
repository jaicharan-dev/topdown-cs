import os, re, glob
directory = r'D:\csf website\site\docs\oop'
files = glob.glob(os.path.join(directory, '*.md'))

results = []
for filepath in files:
    filename = os.path.basename(filepath)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    match_pos = re.search(r'sidebar_position:\s*([\d\.]+)', content)
    pos = float(match_pos.group(1)) if match_pos else 999
    match_title = re.search(r'title:\s*"(.*?)"', content)
    title = match_title.group(1) if match_title else 'Unknown'
    match_diff = re.search(r'sidebar_class_name:\s*sidebar-(\w+)', content)
    diff = match_diff.group(1).capitalize() if match_diff else '?'
    emoji = {'Easy': 'G', 'Medium': 'Y', 'Hard': 'R'}.get(diff, '?')
    results.append((pos, title, diff))

results.sort()
missing = [i for i in range(1, 54) if i not in [int(r[0]) for r in results if r[0] == int(r[0])]]

for pos, title, diff in results:
    pos_str = str(int(pos)) if pos == int(pos) else str(pos)
    print(f'{pos_str}. {title} [{diff}]')

print(f'\nTotal files: {len(results)}')
print(f'Missing positions (1-53): {missing}')
