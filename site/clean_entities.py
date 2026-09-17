import os
import glob

docs_dir = r"D:\csf website\site\docs\oop"
files = glob.glob(os.path.join(docs_dir, "*.md"))

replacements = {
    "&mdash;": " - ",
    "&quot;": '"',
    "&#39;": "'"
}

files_modified = 0

for filepath in files:
    # Use utf-8-sig to correctly handle files with or without BOM
    with open(filepath, 'r', encoding='utf-8-sig') as f:
        lines = f.readlines()
    
    in_frontmatter = False
    frontmatter_dashes_count = 0
    modified = False
    
    new_lines = []
    for line in lines:
        original_line = line
        stripped = line.strip()
        
        # Check frontmatter boundaries (now BOM is stripped by python)
        if stripped == "---":
            frontmatter_dashes_count += 1
            if frontmatter_dashes_count == 1:
                in_frontmatter = True
            elif frontmatter_dashes_count == 2:
                in_frontmatter = False
            new_lines.append(line)
            continue
        
        is_heading = stripped.startswith("# ") or stripped.startswith("## ")
        
        if in_frontmatter or is_heading:
            for old_val, new_val in replacements.items():
                line = line.replace(old_val, new_val)
        
        if line != original_line:
            modified = True
            
        new_lines.append(line)
        
    if modified:
        # Write back with standard utf-8 (or utf-8-sig if you want to keep BOM, but utf-8 is preferred for web)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.writelines(new_lines)
        files_modified += 1
        
print(f"Processed {len(files)} files. Modified frontmatter/headings in {files_modified} files.")
