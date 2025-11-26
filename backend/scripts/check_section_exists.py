import requests

# Change these as needed
token = "YOUR_JWT_TOKEN_HERE"  # Replace with your actual JWT token
base_url = "http://localhost:8000/sections/"
section_id = 361  # Replace with the section ID you want to check

headers = {
    "Authorization": f"Bearer {token}"
}

response = requests.get(f"{base_url}{section_id}", headers=headers)

print(f"Status code: {response.status_code}")
try:
    print("Response:", response.json())
except Exception:
    print("Raw response:", response.text)
