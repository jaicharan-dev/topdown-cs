import os
import glob
import re

docs_dir = r"D:\csf website\site\docs\oop"
files = glob.glob(os.path.join(docs_dir, "*.md"))

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    parts = content.split("---")
    if len(parts) >= 3:
        body = parts[2].strip()
        
        # Look for the first heading or blockquote
        lines = body.split('\n')
        for line in lines:
            if line.startswith('#'):
                if 'Follow-up' in line or 'Follow up' in line:
                    print(f"ERROR - Suspicious first heading in {os.path.basename(filepath)}: {line}")
                break
            if line.startswith('> **Interview Question'):
                break
                
        # Also let's check if the file is extremely short
        if len(body) < 500:
            print(f"WARNING - Very short file: {os.path.basename(filepath)} ({len(body)} chars)")
