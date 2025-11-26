"""
Test script to verify sections and feedback API endpoints
Run this while the backend server is running
"""

import requests
import json

BASE_URL = "http://127.0.0.1:8000"

# You'll need to get a real JWT token first by logging in
def get_auth_token():
    """Login and get JWT token"""
    response = requests.post(f"{BASE_URL}/token", data={
        "username": "ddev54081@gmail.com",
        "password": input("Enter password: ")
    })
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        print(f"Login failed: {response.status_code} - {response.text}")
        return None

def test_sections_api(token):
    """Test sections endpoints"""
    headers = {"Authorization": f"Bearer {token}"}

    print("\n=== TESTING SECTIONS API ===\n")

    # 1. Get a project to work with
    print("1. Fetching projects...")
    response = requests.get(f"{BASE_URL}/projects/", headers=headers)
    if response.status_code == 200:
        projects = response.json()
        if not projects:
            print("❌ No projects found")
            return
        project = projects[0]
        print(f"✅ Found project: {project['title']} (ID: {project['id']})")

        if not project.get('sections'):
            print("❌ No sections in project")
            return
        section = project['sections'][0]
        section_id = section['id']
        print(f"✅ Found section: {section['title']} (ID: {section_id})")
    else:
        print(f"❌ Failed to fetch projects: {response.status_code}")
        return

    # 2. Test GET /sections/{section_id}
    print(f"\n2. Testing GET /sections/{section_id}")
    response = requests.get(f"{BASE_URL}/sections/{section_id}", headers=headers)
    if response.status_code == 200:
        data = response.json()
        print(f"✅ GET /sections/{section_id} - Status: 200")
        print(f"   Title: {data['title']}")
        print(f"   Content length: {len(data.get('content', ''))}")
    else:
        print(f"❌ GET /sections/{section_id} - Status: {response.status_code}")
        print(f"   Response: {response.text}")

    # 3. Test PATCH /sections/{section_id}
    print(f"\n3. Testing PATCH /sections/{section_id}")
    response = requests.patch(
        f"{BASE_URL}/sections/{section_id}",
        headers=headers,
        json={"content": "# Updated Content\n\nThis is a test update from the API test script."}
    )
    if response.status_code == 200:
        data = response.json()
        print(f"✅ PATCH /sections/{section_id} - Status: 200")
        print(f"   Updated content length: {len(data.get('content', ''))}")
    else:
        print(f"❌ PATCH /sections/{section_id} - Status: {response.status_code}")
        print(f"   Response: {response.text}")

    # 4. Test POST /sections/ (create new section)
    print(f"\n4. Testing POST /sections/ (create)")
    response = requests.post(
        f"{BASE_URL}/sections/",
        headers=headers,
        json={
            "projectId": project['id'],
            "title": "Test Section",
            "content": "This is test content",
            "insertAfter": section_id
        }
    )
    if response.status_code == 200:
        new_section = response.json()
        new_section_id = new_section['id']
        print(f"✅ POST /sections/ - Status: 200")
        print(f"   Created section ID: {new_section_id}")

        # 5. Test DELETE (delete the section we just created)
        print(f"\n5. Testing DELETE /sections/{new_section_id}")
        response = requests.delete(f"{BASE_URL}/sections/{new_section_id}", headers=headers)
        if response.status_code == 200:
            print(f"✅ DELETE /sections/{new_section_id} - Status: 200")
        else:
            print(f"❌ DELETE /sections/{new_section_id} - Status: {response.status_code}")
            print(f"   Response: {response.text}")
    else:
        print(f"❌ POST /sections/ - Status: {response.status_code}")
        print(f"   Response: {response.text}")

    # 6. Test PATCH /sections/{section_id}/reorder
    print(f"\n6. Testing PATCH /sections/{section_id}/reorder")
    response = requests.patch(
        f"{BASE_URL}/sections/{section_id}/reorder",
        headers=headers,
        json={"newOrderIndex": 0}
    )
    if response.status_code == 200:
        print(f"✅ PATCH /sections/{section_id}/reorder - Status: 200")
    else:
        print(f"❌ PATCH /sections/{section_id}/reorder - Status: {response.status_code}")
        print(f"   Response: {response.text}")


def test_feedback_api(token):
    """Test feedback endpoints"""
    headers = {"Authorization": f"Bearer {token}"}

    print("\n\n=== TESTING FEEDBACK API ===\n")

    # Get a section to work with
    print("1. Fetching projects to get a section...")
    response = requests.get(f"{BASE_URL}/projects/", headers=headers)
    if response.status_code != 200:
        print(f"❌ Failed to fetch projects: {response.status_code}")
        return

    projects = response.json()
    if not projects or not projects[0].get('sections'):
        print("❌ No sections found")
        return

    section_id = projects[0]['sections'][0]['id']
    print(f"✅ Using section ID: {section_id}")

    # 2. Test GET /feedback/sections/{section_id}
    print(f"\n2. Testing GET /feedback/sections/{section_id}")
    response = requests.get(f"{BASE_URL}/feedback/sections/{section_id}", headers=headers)
    if response.status_code == 200:
        data = response.json()
        print(f"✅ GET /feedback/sections/{section_id} - Status: 200")
        print(f"   Likes: {data['likes']}, Dislikes: {data['dislikes']}")
        print(f"   User feedback: {data['userFeedback']}")
    else:
        print(f"❌ GET /feedback/sections/{section_id} - Status: {response.status_code}")
        print(f"   Response: {response.text}")

    # 3. Test POST /feedback/sections/{section_id} (add like)
    print(f"\n3. Testing POST /feedback/sections/{section_id} (add like)")
    response = requests.post(
        f"{BASE_URL}/feedback/sections/{section_id}",
        headers=headers,
        json={"type": "like"}
    )
    if response.status_code == 200:
        print(f"✅ POST /feedback/sections/{section_id} - Status: 200")
    else:
        print(f"❌ POST /feedback/sections/{section_id} - Status: {response.status_code}")
        print(f"   Response: {response.text}")

    # 4. Test DELETE /feedback/sections/{section_id} (remove feedback)
    print(f"\n4. Testing DELETE /feedback/sections/{section_id}")
    response = requests.delete(f"{BASE_URL}/feedback/sections/{section_id}", headers=headers)
    if response.status_code == 200:
        print(f"✅ DELETE /feedback/sections/{section_id} - Status: 200")
    else:
        print(f"❌ DELETE /feedback/sections/{section_id} - Status: {response.status_code}")
        print(f"   Response: {response.text}")

    # 5. Test POST /feedback/sections/{section_id}/comments
    print(f"\n5. Testing POST /feedback/sections/{section_id}/comments")
    response = requests.post(
        f"{BASE_URL}/feedback/sections/{section_id}/comments",
        headers=headers,
        json={"comment": "This is a test comment from the API test script"}
    )
    if response.status_code == 200:
        comment = response.json()
        comment_id = comment['id']
        print(f"✅ POST /feedback/sections/{section_id}/comments - Status: 200")
        print(f"   Comment ID: {comment_id}")

        # 6. Test GET comments
        print(f"\n6. Testing GET /feedback/sections/{section_id}/comments")
        response = requests.get(f"{BASE_URL}/feedback/sections/{section_id}/comments", headers=headers)
        if response.status_code == 200:
            comments = response.json()
            print(f"✅ GET /feedback/sections/{section_id}/comments - Status: 200")
            print(f"   Found {len(comments)} comment(s)")
        else:
            print(f"❌ GET /feedback/sections/{section_id}/comments - Status: {response.status_code}")

        # 7. Test DELETE comment
        print(f"\n7. Testing DELETE /feedback/sections/{section_id}/comments/{comment_id}")
        response = requests.delete(
            f"{BASE_URL}/feedback/sections/{section_id}/comments/{comment_id}",
            headers=headers
        )
        if response.status_code == 200:
            print(f"✅ DELETE /feedback/sections/{section_id}/comments/{comment_id} - Status: 200")
        else:
            print(f"❌ DELETE /feedback/sections/{section_id}/comments/{comment_id} - Status: {response.status_code}")
    else:
        print(f"❌ POST /feedback/sections/{section_id}/comments - Status: {response.status_code}")
        print(f"   Response: {response.text}")


if __name__ == "__main__":
    print("=" * 60)
    print("FLUX API ENDPOINT TESTER")
    print("=" * 60)
    print("\nThis script tests all sections and feedback API endpoints")
    print(f"Backend URL: {BASE_URL}\n")

    # Get auth token
    token = get_auth_token()
    if not token:
        print("\n❌ Cannot proceed without authentication token")
        exit(1)

    print(f"\n✅ Successfully authenticated")

    # Run tests
    test_sections_api(token)
    test_feedback_api(token)

    print("\n" + "=" * 60)
    print("TESTING COMPLETE")
    print("=" * 60)
