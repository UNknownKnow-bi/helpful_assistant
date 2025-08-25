"""OCR service using EasyOCR for text extraction from images"""

import io
import tempfile
import os
import ssl
import urllib.request
from typing import List, Optional
import logging

# Configure logging
logger = logging.getLogger(__name__)

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
            logger.error("EasyOCR is not available. Missing dependencies: easyocr, pillow")
            raise ValueError("EasyOCR is not available. Please install with: pip install easyocr pillow")
        
        if self.reader is None:
            logger.info("Initializing EasyOCR reader with Chinese Simplified and English support...")
            # Initialize with Chinese Simplified and English support
            self.reader = easyocr.Reader(['ch_sim', 'en'], gpu=False)
            logger.info("EasyOCR reader initialized successfully")
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
            logger.info(f"Starting EasyOCR text extraction from {len(image_bytes)} bytes")
            
            # Create a temporary file to save the image
            with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_file:
                temp_file.write(image_bytes)
                temp_file_path = temp_file.name
                logger.info(f"Created temporary file: {temp_file_path}")
            
            try:
                # Get EasyOCR reader
                logger.info("Getting EasyOCR reader...")
                reader = self._get_reader()
                
                # Extract text from image
                # detail=0 returns only text strings without bounding boxes
                logger.info("Running EasyOCR text extraction...")
                results = reader.readtext(temp_file_path, detail=0)
                logger.info(f"EasyOCR found {len(results)} text elements")
                
                # Join all detected text with spaces
                extracted_text = ' '.join(results) if results else ""
                logger.info(f"Extracted text length: {len(extracted_text)}")
                logger.debug(f"Extracted text preview: {extracted_text[:200]}...")
                
                return extracted_text.strip()
                
            finally:
                # Clean up temporary file
                if os.path.exists(temp_file_path):
                    os.unlink(temp_file_path)
                    logger.info(f"Cleaned up temporary file: {temp_file_path}")
                    
        except Exception as e:
            logger.error(f"EasyOCR extraction failed: {str(e)}")
            logger.exception("Full EasyOCR error traceback:")
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
            logger.info(f"Starting EasyOCR detailed extraction from {len(image_bytes)} bytes")
            
            # Create a temporary file to save the image
            with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_file:
                temp_file.write(image_bytes)
                temp_file_path = temp_file.name
                logger.info(f"Created temporary file: {temp_file_path}")
            
            try:
                # Get EasyOCR reader
                logger.info("Getting EasyOCR reader...")
                reader = self._get_reader()
                
                # Extract text with details (bounding boxes and confidence)
                logger.info("Running EasyOCR detailed extraction...")
                results = reader.readtext(temp_file_path, detail=1)
                logger.info(f"EasyOCR found {len(results)} text elements with details")
                
                # Format results
                formatted_results = []
                for result in results:
                    bbox, text, confidence = result
                    logger.debug(f"Text element: '{text}' (confidence: {confidence:.3f})")
                    formatted_results.append({
                        "text": text,
                        "confidence": confidence,
                        "bounding_box": bbox
                    })
                
                logger.info(f"Formatted {len(formatted_results)} text elements")
                return formatted_results
                
            finally:
                # Clean up temporary file
                if os.path.exists(temp_file_path):
                    os.unlink(temp_file_path)
                    logger.info(f"Cleaned up temporary file: {temp_file_path}")
                    
        except Exception as e:
            logger.error(f"EasyOCR detailed extraction failed: {str(e)}")
            logger.exception("Full EasyOCR error traceback:")
            raise ValueError(f"Failed to extract text from image: {str(e)}")


# Global OCR service instance
ocr_service = OCRService()