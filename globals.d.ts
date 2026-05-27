
// This file contains type declarations for global libraries loaded via CDN in index.html.

declare global {
 interface Window {
 Plotly: any;
 jspdf: any;
 JSZip: any;
 mammoth: any;
 pdfjsLib: any;
 }
}

// This export statement is required to make this file a module and allow the `declare global` to work.
export {};
