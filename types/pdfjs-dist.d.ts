declare module 'pdfjs-dist/build/pdf' {
    export function getDocument(src: string | Uint8Array | PDFSource): PDFLoadingTask<PDFDocumentProxy>;
  
    // Add other necessary types and interfaces here
    interface PDFSource {
      data?: Uint8Array;
      url?: string;
    }
  
    interface PDFLoadingTask<T> {
      promise: Promise<T>;
    }
  
    interface PDFDocumentProxy {
      numPages: number;
      getPage(pageNumber: number): Promise<PDFPageProxy>;
    }
  
    interface PDFPageProxy {
      getTextContent(): Promise<TextContent>;
    }
  
    interface TextContent {
      items: TextItem[];
    }
  
    interface TextItem {
      str: string;
    }
  }