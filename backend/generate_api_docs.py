#!/usr/bin/env python3
"""
API Documentation Generator for Cortex Assistant

This script generates comprehensive API documentation from the FastAPI application,
including OpenAPI JSON schema and formatted documentation files.
"""

import json
import httpx
import asyncio
import sys
from pathlib import Path

async def fetch_openapi_spec():
    """Fetch the OpenAPI specification from the running server"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get("http://localhost:8000/openapi.json")
            if response.status_code == 200:
                return response.json()
            else:
                print(f"Error fetching OpenAPI spec: HTTP {response.status_code}")
                return None
    except httpx.ConnectError:
        print("Error: Could not connect to server at http://localhost:8000")
        print("Please make sure the FastAPI server is running with:")
        print("  cd backend && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
        return None
    except Exception as e:
        print(f"Unexpected error: {e}")
        return None

def generate_endpoint_documentation(spec):
    """Generate formatted endpoint documentation from OpenAPI spec"""
    
    if not spec or "paths" not in spec:
        return "No API paths found in specification"
    
    doc = []
    doc.append("# API Endpoints Reference\n")
    doc.append("Generated from OpenAPI specification\n")
    
    # Group endpoints by tags
    endpoints_by_tag = {}
    
    for path, methods in spec["paths"].items():
        for method, details in methods.items():
            if method.upper() in ["GET", "POST", "PUT", "DELETE", "PATCH"]:
                tags = details.get("tags", ["Untagged"])
                tag = tags[0] if tags else "Untagged"
                
                if tag not in endpoints_by_tag:
                    endpoints_by_tag[tag] = []
                
                endpoints_by_tag[tag].append({
                    "path": path,
                    "method": method.upper(),
                    "summary": details.get("summary", ""),
                    "description": details.get("description", ""),
                    "parameters": details.get("parameters", []),
                    "requestBody": details.get("requestBody", {}),
                    "responses": details.get("responses", {}),
                    "security": details.get("security", [])
                })
    
    # Generate documentation for each tag
    for tag, endpoints in endpoints_by_tag.items():
        doc.append(f"## {tag}\n")
        
        for endpoint in endpoints:
            doc.append(f"### {endpoint['method']} {endpoint['path']}\n")
            
            if endpoint['summary']:
                doc.append(f"**Summary:** {endpoint['summary']}\n")
            
            if endpoint['description']:
                doc.append(f"**Description:** {endpoint['description']}\n")
            
            # Security requirements
            if endpoint['security']:
                doc.append("**Authentication:** Required (JWT Bearer Token)\n")
            
            # Parameters
            if endpoint['parameters']:
                doc.append("**Parameters:**\n")
                for param in endpoint['parameters']:
                    param_type = param.get('schema', {}).get('type', 'string')
                    required = " (required)" if param.get('required', False) else " (optional)"
                    doc.append(f"- `{param['name']}` ({param['in']}) - {param_type}{required}: {param.get('description', '')}\n")
            
            # Request body
            if endpoint['requestBody']:
                doc.append("**Request Body:**\n")
                content = endpoint['requestBody'].get('content', {})
                if 'application/json' in content:
                    schema_ref = content['application/json'].get('schema', {}).get('$ref', '')
                    if schema_ref:
                        schema_name = schema_ref.split('/')[-1]
                        doc.append(f"- Content-Type: application/json\n")
                        doc.append(f"- Schema: {schema_name}\n")
                elif 'multipart/form-data' in content:
                    doc.append(f"- Content-Type: multipart/form-data (file upload)\n")
            
            # Responses
            doc.append("**Responses:**\n")
            for status_code, response_details in endpoint['responses'].items():
                doc.append(f"- `{status_code}`: {response_details.get('description', '')}\n")
            
            doc.append("\n---\n\n")
    
    return "".join(doc)

def generate_schema_documentation(spec):
    """Generate documentation for data schemas/models"""
    
    if not spec or "components" not in spec or "schemas" not in spec["components"]:
        return "No schemas found in specification"
    
    doc = []
    doc.append("# Data Models Reference\n")
    doc.append("Generated from OpenAPI specification\n")
    
    schemas = spec["components"]["schemas"]
    
    for schema_name, schema_details in schemas.items():
        doc.append(f"## {schema_name}\n")
        
        if schema_details.get("description"):
            doc.append(f"{schema_details['description']}\n")
        
        if "properties" in schema_details:
            doc.append("**Properties:**\n")
            
            required_fields = schema_details.get("required", [])
            
            for prop_name, prop_details in schema_details["properties"].items():
                prop_type = prop_details.get("type", "unknown")
                is_required = prop_name in required_fields
                required_text = " (required)" if is_required else " (optional)"
                
                # Handle different property types
                if prop_type == "array":
                    items_type = prop_details.get("items", {}).get("type", "unknown")
                    prop_type = f"array of {items_type}"
                elif "$ref" in prop_details:
                    ref_name = prop_details["$ref"].split("/")[-1]
                    prop_type = f"reference to {ref_name}"
                
                description = prop_details.get("description", "")
                doc.append(f"- `{prop_name}` ({prop_type}){required_text}: {description}\n")
        
        doc.append("\n")
    
    return "".join(doc)

async def main():
    """Main function to generate all documentation"""
    
    print("🚀 Generating API Documentation for Cortex Assistant...")
    print("📡 Fetching OpenAPI specification from server...")
    
    # Fetch OpenAPI spec
    spec = await fetch_openapi_spec()
    
    if not spec:
        sys.exit(1)
    
    print("✅ OpenAPI specification fetched successfully")
    
    # Generate output directory
    output_dir = Path("docs/api")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Save raw OpenAPI JSON
    openapi_file = output_dir / "openapi.json"
    with open(openapi_file, "w", encoding="utf-8") as f:
        json.dump(spec, f, indent=2, ensure_ascii=False)
    print(f"📄 OpenAPI JSON saved to: {openapi_file}")
    
    # Generate endpoint documentation
    endpoint_docs = generate_endpoint_documentation(spec)
    endpoints_file = output_dir / "endpoints.md"
    with open(endpoints_file, "w", encoding="utf-8") as f:
        f.write(endpoint_docs)
    print(f"📋 Endpoint documentation saved to: {endpoints_file}")
    
    # Generate schema documentation
    schema_docs = generate_schema_documentation(spec)
    schemas_file = output_dir / "schemas.md"
    with open(schemas_file, "w", encoding="utf-8") as f:
        f.write(schema_docs)
    print(f"🗂️  Schema documentation saved to: {schemas_file}")
    
    # Generate summary
    total_paths = len(spec.get("paths", {}))
    total_schemas = len(spec.get("components", {}).get("schemas", {}))
    
    print("\n📊 Documentation Summary:")
    print(f"   • Total API endpoints: {total_paths}")
    print(f"   • Total data models: {total_schemas}")
    print(f"   • API version: {spec.get('info', {}).get('version', 'unknown')}")
    print(f"   • API title: {spec.get('info', {}).get('title', 'unknown')}")
    
    print("\n🌐 Access interactive documentation at:")
    print("   • Swagger UI: http://localhost:8000/docs")
    print("   • ReDoc: http://localhost:8000/redoc")
    print("   • OpenAPI JSON: http://localhost:8000/openapi.json")
    
    print("\n✨ API documentation generation completed!")

if __name__ == "__main__":
    asyncio.run(main())