"""OCR service using EasyOCR for text extraction from images"""

import io
import tempfile
import os
import ssl
import urllib.request
from typing import List, Optional

# Try to import optional dependencies
try:
    import easyocr
    from PIL import Image
    EASYOCR_AVAILABLE = True
    # Disable SSL verification for EasyOCR model downloads (macOS fix)
    ssl._create_default_https_context = ssl._create_unverified_context
except ImportError:
    easyocr = None
    Image = None
    EASYOCR_AVAILABLE = False


class OCRService:
    def __init__(self):
        """Initialize EasyOCR reader with Chinese and English support"""
        self.reader = None
    
    def _get_reader(self):
        """Lazy loading of EasyOCR reader to avoid loading at startup"""
        if not EASYOCR_AVAILABLE:
            raise ValueError("EasyOCR is not available. Please install with: pip install easyocr pillow")
        
        if self.reader is None:
            # Initialize with Chinese Simplified and English support
            self.reader = easyocr.Reader(['ch_sim', 'en'], gpu=False)
        return self.reader
    
    async def extract_text_from_image(self, image_bytes: bytes) -> str:
        """
        Extract text from image bytes using EasyOCR
        
        Args:
            image_bytes: Raw image bytes
            
        Returns:
            Extracted text as a single string
        """
        try:
            # Create a temporary file to save the image
            with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_file:
                temp_file.write(image_bytes)
                temp_file_path = temp_file.name
            
            try:
                # Get EasyOCR reader
                reader = self._get_reader()
                
                # Extract text from image
                # detail=0 returns only text strings without bounding boxes
                results = reader.readtext(temp_file_path, detail=0)
                
                # Join all detected text with spaces
                extracted_text = ' '.join(results) if results else ""
                
                return extracted_text.strip()
                
            finally:
                # Clean up temporary file
                if os.path.exists(temp_file_path):
                    os.unlink(temp_file_path)
                    
        except Exception as e:
            raise ValueError(f"Failed to extract text from image: {str(e)}")
    
    async def extract_text_with_details(self, image_bytes: bytes) -> List[dict]:
        """
        Extract text from image with bounding boxes and confidence scores
        
        Args:
            image_bytes: Raw image bytes
            
        Returns:
            List of dictionaries containing text, bounding box, and confidence
        """
        try:
            # Create a temporary file to save the image
            with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_file:
                temp_file.write(image_bytes)
                temp_file_path = temp_file.name
            
            try:
                # Get EasyOCR reader
                reader = self._get_reader()
                
                # Extract text with details (bounding boxes and confidence)
                results = reader.readtext(temp_file_path, detail=1)
                
                # Format results
                formatted_results = []
                for result in results:
                    bbox, text, confidence = result
                    formatted_results.append({
                        "text": text,
                        "confidence": confidence,
                        "bounding_box": bbox
                    })
                
                return formatted_results
                
            finally:
                # Clean up temporary file
                if os.path.exists(temp_file_path):
                    os.unlink(temp_file_path)
                    
        except Exception as e:
            raise ValueError(f"Failed to extract text from image: {str(e)}")


# Global OCR service instance
ocr_service = OCRService()