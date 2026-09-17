import os, re, glob

directory = r'D:\csf website\site\docs\oop'
files = glob.glob(os.path.join(directory, '*.md'))

fixed_count = 0
for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    def replacer(match):
        title_text = match.group(1).strip()
        if not (title_text.startswith('"') and title_text.endswith('"')) and not (title_text.startswith("'") and title_text.endswith("'")):
            escaped_title = title_text.replace('"', '\\"')
            return f'title: "{escaped_title}"'
        return match.group(0)

    new_content = re.sub(r'(?m)^title:\s*(.*)$', replacer, content)
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'Fixed frontmatter in {os.path.basename(filepath)}')
        fixed_count += 1

print(f'\nTotal files fixed: {fixed_count}')
