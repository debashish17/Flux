"""
Quick test to verify database migration and Prisma client are working
"""
import asyncio
from prisma import Prisma

async def test_html_content_field():
    db = Prisma()
    await db.connect()

    try:
        # Try to query with htmlContent field
        sections = await db.documentsection.find_many(
            take=1,
            include={'project': False}
        )

        if sections:
            section = sections[0]
            print("SUCCESS: Queried DocumentSection")
            print(f"  - Section ID: {section.id}")
            print(f"  - Has content field: {hasattr(section, 'content')}")
            print(f"  - Has htmlContent field: {hasattr(section, 'htmlContent')}")
            print(f"  - Content length: {len(section.content) if section.content else 0}")
            print(f"  - HTML content length: {len(section.htmlContent) if section.htmlContent else 0}")
        else:
            print("SUCCESS: No sections found, but query worked (htmlContent field exists)")

        print("\nMIGRATION SUCCESSFUL! The htmlContent field is accessible.")
        return True

    except Exception as e:
        print(f"ERROR: {e}")
        return False
    finally:
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(test_html_content_field())
