import os, re, glob

docs_dir = r'D:\csf website\site\docs\oop'
raw_dir = r'D:\csf website\raw'
output_file = os.path.join(raw_dir, 'oop.txt')

# 1. Read all .md files and sort by numeric prefix
files = glob.glob(os.path.join(docs_dir, '*.md'))

def sort_key(filepath):
    match = re.match(r'^(\d+(?:\.\d+)?)', os.path.basename(filepath))
    return float(match.group(1)) if match else float('inf')

files.sort(key=sort_key)

# 2. Concatenate with separators
separator = '\n\n' + '=' * 72 + '\n\n'
chunks = []
for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read().strip()
    chunks.append(content)

merged = separator.join(chunks)

# 3. Write to oop.txt
with open(output_file, 'w', encoding='utf-8') as f:
    f.write(merged)

print(f'Created {output_file}')
print(f'Merged {len(files)} files, total size: {len(merged):,} bytes')

# 4. Clean up old files
old_files = [
    'oop_2.txt',
    'opp.txt',
    'opp_part1.txt', 'opp_part2.txt', 'opp_part3.txt',
    'opp_part4.txt', 'opp_part5.txt', 'opp_part6.txt',
    'oop_missing_questions.txt',
]

removed = 0
for name in old_files:
    path = os.path.join(raw_dir, name)
    if os.path.exists(path):
        os.remove(path)
        print(f'Deleted: {name}')
        removed += 1
    else:
        print(f'Not found (skipped): {name}')

print(f'\nDone. Removed {removed} old files.')
