import os

filepath = 'pioveapp/views.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "ip_address=request.META.get('REMOTE_ADDR')",
    "ip_address=request.META.get('REMOTE_ADDR'),\n                user_agent=request.META.get('HTTP_USER_AGENT')"
)

content = content.replace(
    "ip_address=self.request.META.get('REMOTE_ADDR')",
    "ip_address=self.request.META.get('REMOTE_ADDR'),\n                user_agent=self.request.META.get('HTTP_USER_AGENT')"
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
