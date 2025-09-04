#!/usr/bin/env python3
"""
Test script for Task Execution Procedures feature
Tests the 2-step AI workflow for task execution guidance
"""

import requests
import json
import sys
import time

# Configuration
BASE_URL = "http://localhost:8000/api"
TEST_USER = {"username": "testuser", "password": "testpass123"}

def create_test_user_and_login():
    """Create test user and get auth token"""
    print("🔐 Creating test user and logging in...")
    
    # Try to register (may fail if user exists)
    try:
        response = requests.post(f"{BASE_URL}/auth/register", json=TEST_USER)
        if response.status_code == 200:
            print("✅ Test user created successfully")
        else:
            print("ℹ️  Test user may already exist")
    except Exception as e:
        print(f"⚠️  Registration failed: {e}")
    
    # Login
    response = requests.post(f"{BASE_URL}/auth/login", json=TEST_USER)
    if response.status_code == 200:
        token = response.json()["access_token"]
        print("✅ Login successful")
        return {"Authorization": f"Bearer {token}"}
    else:
        print(f"❌ Login failed: {response.status_code} - {response.text}")
        return None

def test_task_creation_with_execution_procedures(headers):
    """Test manual task creation with automatic execution procedure generation"""
    print("\n📝 Testing manual task creation with execution procedures...")
    
    task_data = {
        "title": "产品需求分析报告",
        "content": "完成一个新的产品需求分析报告，需要在本周五之前提交给产品经理张三，涉及用户调研、竞品分析和技术可行性评估",
        "urgency": "high",
        "importance": "high", 
        "difficulty": 7,
        "assignee": "产品经理张三",
        "participant": "你"
    }
    
    response = requests.post(f"{BASE_URL}/tasks", json=task_data, headers=headers)
    
    if response.status_code == 200:
        task = response.json()
        task_id = task["id"]
        print(f"✅ Task created successfully (ID: {task_id})")
        print(f"📋 Title: {task['title']}")
        print(f"🚨 Urgency: {task['urgency']}, Importance: {task['importance']}")
        
        # Check if execution procedures were generated (may be async)
        if task.get("execution_procedures"):
            print(f"⚡ Execution procedures generated immediately: {len(task['execution_procedures'])} steps")
            print_execution_procedures(task["execution_procedures"])
        else:
            print("⏳ Execution procedures may be generating in background...")
            
            # Wait and check again
            for attempt in range(3):
                time.sleep(2)
                print(f"🔍 Checking execution procedures (attempt {attempt + 1}/3)...")
                procedures_response = requests.get(f"{BASE_URL}/tasks/{task_id}/execution-procedures", headers=headers)
                
                if procedures_response.status_code == 200:
                    procedures_data = procedures_response.json()
                    if procedures_data["has_procedures"]:
                        print(f"✅ Found {len(procedures_data['execution_procedures'])} execution procedures")
                        print_execution_procedures(procedures_data["execution_procedures"])
                        break
                    else:
                        print("⏳ Still generating...")
                else:
                    print(f"❌ Failed to fetch procedures: {procedures_response.status_code}")
            
        return task_id
    else:
        print(f"❌ Task creation failed: {response.status_code} - {response.text}")
        return None

def test_ai_task_generation_with_execution_procedures(headers):
    """Test AI-powered task generation with automatic execution procedure generation"""
    print("\n🤖 Testing AI task generation with execution procedures...")
    
    task_text = "下周一前完成用户调研报告，包括问卷设计、数据收集、分析总结，需要协调市场部同事配合，最终提交给产品总监"
    
    response = requests.post(f"{BASE_URL}/tasks/generate", json={"text": task_text}, headers=headers)
    
    if response.status_code == 200:
        tasks = response.json()
        print(f"✅ AI generated {len(tasks)} task(s)")
        
        for i, task in enumerate(tasks, 1):
            task_id = task["id"]
            print(f"\n📋 Task {i} (ID: {task_id}):")
            print(f"   Title: {task['title']}")
            print(f"   Content: {task['content'][:100]}...")
            print(f"   Priority: Urgency={task['urgency']}, Importance={task['importance']}")
            
            # Check execution procedures (may be async)
            if task.get("execution_procedures"):
                print(f"   ⚡ Execution procedures: {len(task['execution_procedures'])} steps")
                print_execution_procedures(task["execution_procedures"], indent="     ")
            else:
                print("   ⏳ Execution procedures generating in background...")
                
                # Wait and check
                for attempt in range(3):
                    time.sleep(2)
                    procedures_response = requests.get(f"{BASE_URL}/tasks/{task_id}/execution-procedures", headers=headers)
                    
                    if procedures_response.status_code == 200:
                        procedures_data = procedures_response.json()
                        if procedures_data["has_procedures"]:
                            print(f"   ✅ Generated {len(procedures_data['execution_procedures'])} execution procedures")
                            print_execution_procedures(procedures_data["execution_procedures"], indent="     ")
                            break
                        else:
                            print(f"   ⏳ Still generating... (attempt {attempt + 1}/3)")
                    else:
                        print(f"   ❌ Failed to fetch procedures: {procedures_response.status_code}")
                        break
                        
        return tasks[0]["id"] if tasks else None
    else:
        print(f"❌ AI task generation failed: {response.status_code} - {response.text}")
        return None

def test_manual_procedure_regeneration(task_id, headers):
    """Test manual regeneration of execution procedures"""
    print(f"\n🔄 Testing manual procedure regeneration for task {task_id}...")
    
    response = requests.post(f"{BASE_URL}/tasks/{task_id}/regenerate-execution-procedures", headers=headers)
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Successfully regenerated {len(result['execution_procedures'])} execution procedures")
        print_execution_procedures(result["execution_procedures"])
        return True
    else:
        print(f"❌ Procedure regeneration failed: {response.status_code} - {response.text}")
        return False

def print_execution_procedures(procedures, indent=""):
    """Pretty print execution procedures"""
    if not procedures:
        print(f"{indent}   (No procedures)")
        return
        
    print(f"{indent}   Execution Steps:")
    for proc in procedures:
        step_num = proc.get("procedure_number", "?")
        content = proc.get("procedure_content", "")
        key_result = proc.get("key_result", "")
        
        print(f"{indent}   {step_num}. {content}")
        if key_result:
            print(f"{indent}      → Key Result: {key_result}")

def main():
    """Main test function"""
    print("🚀 Testing Task Execution Procedures Feature")
    print("=" * 50)
    
    # Login
    headers = create_test_user_and_login()
    if not headers:
        print("❌ Cannot proceed without authentication")
        sys.exit(1)
    
    # Test 1: Manual task creation with execution procedures
    manual_task_id = test_task_creation_with_execution_procedures(headers)
    
    # Test 2: AI-powered task generation with execution procedures  
    ai_task_id = test_ai_task_generation_with_execution_procedures(headers)
    
    # Test 3: Manual procedure regeneration (if we have a task)
    test_task_id = manual_task_id or ai_task_id
    if test_task_id:
        test_manual_procedure_regeneration(test_task_id, headers)
    
    print("\n🎉 Testing completed!")
    print("=" * 50)

if __name__ == "__main__":
    main()