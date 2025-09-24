// components/CodePopup.tsx
"use client";

import { useState } from "react";
// import { Prism as SyntaxHighlighter }
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";


type CodePopupProps = {
  code: string;
  filename?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export default function CodePopup({ code, filename = "snippet.py", open: openProp, onOpenChange }: CodePopupProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = openProp !== undefined;
  const isOpen = isControlled ? openProp : internalOpen;

  const setOpen = (val: boolean) => {
    if (isControlled) {
      onOpenChange?.(val);
    } else {
      setInternalOpen(val);
    }
  };

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
    <>
      {/* Only render default trigger when used uncontrolled */}
      {openProp === undefined && (
        <button
          onClick={() => setOpen(true)}
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
        >
          Show Code
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="relative w-11/12 max-w-3xl bg-gray-900 rounded-xl shadow-lg p-4">
            {/* Close Button */}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-white"
            >
              ✕
            </button>

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
            <div className="mt-3 flex justify-end">
              <button
                onClick={downloadFile}
                className="px-4 py-2 bg-green-600 rounded text-white hover:bg-green-700"
              >
                Download .py
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
