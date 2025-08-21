#!/usr/bin/env python3
"""
Quick script to open API documentation in the browser
"""

import webbrowser
import sys
import time
import httpx

def check_server():
    """Check if the FastAPI server is running"""
    try:
        response = httpx.get("http://localhost:8000/health", timeout=5)
        return response.status_code == 200
    except:
        return False

def main():
    """Main function to open documentation"""
    print("🔍 Checking if server is running...")
    
    if not check_server():
        print("❌ Server is not running!")
        print("Please start the server first:")
        print("  cd backend && python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
        sys.exit(1)
    
    print("✅ Server is running!")
    
    # URLs to open
    urls = [
        ("Swagger UI", "http://localhost:8000/docs"),
        ("ReDoc", "http://localhost:8000/redoc"),
        ("OpenAPI JSON", "http://localhost:8000/openapi.json")
    ]
    
    print("\n🌐 Opening API documentation...")
    
    for name, url in urls:
        print(f"📖 Opening {name}: {url}")
        webbrowser.open(url)
        time.sleep(1)  # Small delay between opens
    
    print("\n✨ Documentation opened in your browser!")
    print("\nQuick links:")
    for name, url in urls:
        print(f"   • {name}: {url}")

if __name__ == "__main__":
    main()