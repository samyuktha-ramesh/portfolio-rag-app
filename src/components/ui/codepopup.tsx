// components/CodePopup.tsx
"use client";

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
            showLineNumbers={false}
            customStyle={{ borderRadius: "0.5rem", padding: "1rem" }}
          >
            {code}
          </SyntaxHighlighter>

          {/* Download Button */}
          <Button onClick={copyFile} className="mt-2 mr-4" variant="secondary">
            Copy code
          </Button>
          <Button onClick={downloadFile} className="mt-2" variant="secondary">
            Download code
          </Button>
    </div>
  );
}
