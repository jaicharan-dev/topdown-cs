import os, re, glob
directory = r'D:\csf website\site\docs\oop'
files = glob.glob(os.path.join(directory, '*.md'))

results = []
for filepath in files:
    filename = os.path.basename(filepath)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    match_pos = re.search(r'(?m)^sidebar_position:\s*([\d\.]+)', content)
    pos = float(match_pos.group(1)) if match_pos else float('inf')
    
    match_title = re.search(r'(?m)^title:\s*\"?(.*?)\"?\s*$', content)
    title = match_title.group(1) if match_title else 'Unknown Title'
    title = title.replace('\\\"', '\"')
    
    results.append((pos, title))

results.sort()

for pos, title in results:
    pos_str = str(int(pos)) if pos.is_integer() else str(pos)
    print(f'{pos_str}. {title}')
