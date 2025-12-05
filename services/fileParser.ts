import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

export const parseFile = async (file: File): Promise<string> => {
  const fileType = file.name.split('.').pop()?.toLowerCase();

  if (fileType === 'txt' || fileType === 'md') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  }

  if (fileType === 'pdf') {
    return parsePdf(file);
  }

  if (fileType === 'docx') {
    return parseDocx(file);
  }

  throw new Error(`Unsupported file type: ${file.name}. Please use .txt, .md, .pdf, or .docx`);
};

export const parseMultipleFiles = async (files: File[]): Promise<string> => {
  const results = await Promise.all(files.map(async (file) => {
    try {
      const content = await parseFile(file);
      return `--- START OF FILE: ${file.name} ---\n\n${content}\n\n--- END OF FILE: ${file.name} ---\n`;
    } catch (e) {
      console.error(`Error parsing ${file.name}:`, e);
      return `--- ERROR PARSING FILE: ${file.name} ---\n`;
    }
  }));

  return results.join('\n');
};

const parsePdf = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  
  // Handle default export for ESM builds
  const pdfjs = (pdfjsLib as any).default || pdfjsLib;
  
  // Ensure worker is set if not already (safeguard)
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
      pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
  }

  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += pageText + "\n\n";
  }

  return fullText;
};

const parseDocx = async (file: File): Promise<string> => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value;
    } catch (e) {
        console.error("Error parsing DOCX:", e);
        throw new Error("Failed to parse Word document.");
    }
};