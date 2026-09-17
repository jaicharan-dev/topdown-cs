import os, re, glob, shutil

directory = r'D:\csf website\site\docs\oop'
temp_dir = r'D:\csf website\site\docs\oop_temp'

# Create temp directory
os.makedirs(temp_dir, exist_ok=True)

# Step 1: Copy all files to temp
files = glob.glob(os.path.join(directory, '*.md'))
for f in files:
    shutil.copy2(f, temp_dir)

# Step 2: Build the explicit old-position -> new-position mapping
# Key = (old_sidebar_position, filename_slug_fragment_to_disambiguate)
# Value = new_sidebar_position

# Mapping based on old sidebar_position (read from frontmatter) to new position
# We'll read each file, extract sidebar_position, and map it

file_data = []
for filepath in glob.glob(os.path.join(temp_dir, '*.md')):
    filename = os.path.basename(filepath)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    match_pos = re.search(r'(?m)^sidebar_position:\s*([\d\.]+)', content)
    old_pos = float(match_pos.group(1)) if match_pos else 999
    
    file_data.append({
        'filename': filename,
        'filepath': filepath,
        'content': content,
        'old_pos': old_pos,
    })

# Explicit mapping: old_pos -> new_pos
# For files that share old_pos (like the two "8" files), we disambiguate by filename
pos_map = {
    1: 1,
    2: 2,
    3: 3,
    3.5: 4,     # Packages: 3.5 -> 4
    4: 5,       # this keyword
    5: 6,       # coupling/cohesion
    6: 7,       # upcasting/downcasting
    # 7 and 8 need special handling (two files at pos 8)
    7: 8,       # interface-vs-abstract-class (was renamed from 8 to 7 earlier)
    # 8 -> 9 for java8 variant
    9: 10,
    10: 11,
    11: 12,
    12: 13,
    13: 14,
    14: 15,
    15: 16,
    16: 17,
    17: 18,
    18: 19,
    19: 20,
    20: 21,
    21: 22,
    22: 23,
    # 24 = NEW HashMap internals
    23: 25,
    24: 26,
    25: 27,
    26: 28,
    27: 29,
    28: 30,
    29: 31,
    30: 32,
    31: 33,
    32: 34,
    33: 35,
    34: 36,
    35: 37,
    36: 38,
    37: 39,
    38: 40,
    39: 41,
    40: 42,
    41: 43,
    42: 44,
    43: 45,
    44: 46,
    45: 47,     # Singleton
    46: 48,     # Factory
    50.5: 49,   # Strategy -> moved into pattern block
    47: 50,     # Builder
    48: 51,     # Decorator
    49: 52,     # Observer
    50: 53,     # DI
    52: None,   # OOP Roadmap -> DROP from numbered list
}

# Process each file
for fd in file_data:
    old_pos = fd['old_pos']
    filename = fd['filename']
    
    # Special handling for the two files at position 8
    if old_pos == 8 and 'java8' in filename:
        new_pos = 9
    elif old_pos in pos_map:
        new_pos = pos_map[old_pos]
    else:
        print(f'WARNING: No mapping for {filename} (pos {old_pos})')
        continue
    
    if new_pos is None:
        print(f'DROPPING: {filename} (was pos {old_pos})')
        continue
    
    # Update sidebar_position in content
    old_pos_str = str(int(old_pos)) if old_pos == int(old_pos) else str(old_pos)
    new_pos_str = str(int(new_pos)) if new_pos == int(new_pos) else str(new_pos)
    
    new_content = re.sub(
        r'(sidebar_position:\s*)' + re.escape(old_pos_str),
        r'\g<1>' + new_pos_str,
        fd['content']
    )
    
    # Build new filename: replace leading number
    new_filename = re.sub(r'^\d+(\.\d+)?-', f'{int(new_pos)}-', filename)
    
    new_filepath = os.path.join(directory, new_filename)
    
    # Delete old file first
    old_target = os.path.join(directory, filename)
    if os.path.exists(old_target):
        os.remove(old_target)
    
    with open(new_filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print(f'{old_pos_str} -> {new_pos_str}: {filename} -> {new_filename}')

# Cleanup temp
shutil.rmtree(temp_dir)
print('\nDone! Temp directory cleaned up.')
