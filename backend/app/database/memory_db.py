from typing import Dict, List, Any, Optional
from datetime import datetime
from bson import ObjectId
import json

class MemoryCollection:
    def __init__(self):
        self.documents: List[Dict[str, Any]] = []
        self.id_counter = 0

    async def find_one(self, filter_dict: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Find a single document matching the filter"""
        for doc in self.documents:
            if self._matches_filter(doc, filter_dict):
                return doc.copy()
        return None

    async def insert_one(self, document: Dict[str, Any]) -> Dict[str, str]:
        """Insert a single document"""
        # Generate ObjectId if not provided
        if "_id" not in document:
            document["_id"] = ObjectId()
        
        # Add timestamp if not present
        if "created_at" not in document:
            document["created_at"] = datetime.utcnow()
            
        self.documents.append(document.copy())
        return {"inserted_id": str(document["_id"])}

    async def find(self, filter_dict: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """Find multiple documents matching the filter"""
        if filter_dict is None:
            return [doc.copy() for doc in self.documents]
        
        result = []
        for doc in self.documents:
            if self._matches_filter(doc, filter_dict):
                result.append(doc.copy())
        return result

    async def update_one(self, filter_dict: Dict[str, Any], update_dict: Dict[str, Any]) -> Dict[str, int]:
        """Update a single document"""
        for i, doc in enumerate(self.documents):
            if self._matches_filter(doc, filter_dict):
                if "$set" in update_dict:
                    doc.update(update_dict["$set"])
                else:
                    doc.update(update_dict)
                doc["updated_at"] = datetime.utcnow()
                return {"modified_count": 1}
        return {"modified_count": 0}

    async def delete_one(self, filter_dict: Dict[str, Any]) -> Dict[str, int]:
        """Delete a single document"""
        for i, doc in enumerate(self.documents):
            if self._matches_filter(doc, filter_dict):
                del self.documents[i]
                return {"deleted_count": 1}
        return {"deleted_count": 0}

    def _matches_filter(self, document: Dict[str, Any], filter_dict: Dict[str, Any]) -> bool:
        """Check if document matches filter criteria"""
        for key, value in filter_dict.items():
            if key not in document:
                return False
            if document[key] != value:
                return False
        return True

class MemoryDatabase:
    def __init__(self):
        self.collections: Dict[str, MemoryCollection] = {}

    def __getattr__(self, name: str) -> MemoryCollection:
        """Dynamically create collections as they're accessed"""
        if name not in self.collections:
            self.collections[name] = MemoryCollection()
        return self.collections[name]

# Global in-memory database instance
memory_db = MemoryDatabase()

def get_memory_database() -> MemoryDatabase:
    """Get the in-memory database instance"""
    return memory_db