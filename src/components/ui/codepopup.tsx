// components/CodePopup.tsx
"use client";

import { PaperAirplaneIcon } from "@heroicons/react/24/solid";
import { copyFile } from "fs";
import { Button } from "./button";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";


type CodePopupProps = {
  code: string;
  filename?: string;
};

export default function CodePopup({ code, filename = "snippet.py" }: CodePopupProps) {

  const copyFile = () => {
    navigator.clipboard.writeText(code);
  }

  const downloadFile = () => {
    const blob = new Blob([code], { type: "text/x-python" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (

        <div className="max-w-3xl">
          {/* Code Display */}
          <SyntaxHighlighter
            language="python"
            style={vscDarkPlus}
            showLineNumbers
            customStyle={{ borderRadius: "0.5rem", padding: "1rem" }}
          >
            {code}
          </SyntaxHighlighter>

          {/* Download Button */}
            <Button onClick={copyFile} className="mt-2 mr-4" variant="secondary" aria-label="Copy code">
              {/* ClipboardIcon from Heroicons */}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V4a1 1 0 011-1h6a1 1 0 011 1v3m-8 0h8m-8 0a1 1 0 00-1 1v12a1 1 0 001 1h8a1 1 0 001-1V8a1 1 0 00-1-1m-8 0V4a1 1 0 011-1h6a1 1 0 011 1v3" />
              </svg>
              Copy
            </Button>
            <Button onClick={downloadFile} className="mt-2" variant="secondary" aria-label="Download code">
              {/* ArrowDownTrayIcon from Heroicons */}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
              </svg>
              Download
            </Button>
    </div>
  );
}
