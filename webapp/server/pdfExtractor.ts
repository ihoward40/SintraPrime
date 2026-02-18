/**
 * Document Text Extraction Utility
 * Extracts text content from PDF files and images for OCR processing
 * Supports: PDF, JPEG, PNG, WEBP
 */

// Helper to load pdf-parse dynamically
let PDFParse: any = null;
async function getPdfParse() {
  if (!PDFParse) {
    const mod = await import('pdf-parse');
    PDFParse = (mod as any).PDFParse;
  }
  return PDFParse;
}

// Helper to load Tesseract dynamically
let Tesseract: any = null;
async function getTesseract() {
  if (!Tesseract) {
    const mod = await import('tesseract.js');
    Tesseract = mod;
  }
  return Tesseract;
}

/**
 * Extract text from PDF buffer
 * @param buffer PDF file buffer
 * @returns Extracted text content
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const pdf = await getPdfParse();
    const data = await pdf(buffer);
    return data.text;
  } catch (error) {
    console.error('[PDF Extractor] Error extracting text:', error);
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract text from PDF URL
 * @param url S3 URL or public URL to PDF file
 * @returns Extracted text content
 */
export async function extractTextFromPDFUrl(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    return await extractTextFromPDF(buffer);
  } catch (error) {
    console.error('[PDF Extractor] Error extracting text from URL:', error);
    throw new Error(`Failed to extract text from PDF URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate if file is a PDF
 * @param mimeType File M/**
 * Check if MIME type is PDF
 */
export function isPDF(mimeType: string): boolean {
  return mimeType === 'application/pdf';
}

/**
 * Check if MIME type is an image
 */
export function isImage(mimeType: string): boolean {
  return [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
  ].includes(mimeType);
}

/**
 * Extract text from image buffer using Tesseract OCR
 * @param buffer Image file buffer
 * @returns Extracted text content
 */
export async function extractTextFromImage(buffer: Buffer): Promise<string> {
  try {
    const Tesseract = await getTesseract();
    const worker = await Tesseract.createWorker('eng');
    
    const { data: { text } } = await worker.recognize(buffer);
    await worker.terminate();
    
    return text;
  } catch (error) {
    console.error('[Image OCR] Error extracting text:', error);
    throw new Error(`Failed to extract text from image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract text from image URL
 * @param url S3 URL or public URL to image file
 * @returns Extracted text content
 */
export async function extractTextFromImageUrl(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    return await extractTextFromImage(buffer);
  } catch (error) {
    console.error('[Image OCR] Error fetching/extracting from URL:', error);
    throw new Error(`Failed to extract text from image URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Clean extracted text (remove excessive whitespace, normalize line breaks)
 * @param text Raw extracted text
 * @returns Cleaned text
 */
export function cleanExtractedText(text: string): string {
  return text
    .replace(/\r\n/g, '\n') // Normalize line breaks
    .replace(/\n{3,}/g, '\n\n') // Remove excessive line breaks
    .replace(/[ \t]{2,}/g, ' ') // Remove excessive spaces
    .trim();
}
