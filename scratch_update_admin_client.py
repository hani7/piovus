import os
import glob

admin_dir = r"c:\Users\PC\Documents\piove\frontend\src\pages\admin"

jsx_files = glob.glob(os.path.join(admin_dir, "*.jsx"))

for file_path in jsx_files:
    # Skip files already updated manually
    if os.path.basename(file_path) in ['AdminLogin.jsx', 'AdminLayout.jsx']:
        continue

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if "import client from '../../api/client'" in content:
        content = content.replace("import client from '../../api/client'", "import adminClient from '../../api/adminClient'")
        content = content.replace("client.get", "adminClient.get")
        content = content.replace("client.post", "adminClient.post")
        content = content.replace("client.put", "adminClient.put")
        content = content.replace("client.patch", "adminClient.patch")
        content = content.replace("client.delete", "adminClient.delete")
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {os.path.basename(file_path)}")
