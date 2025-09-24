"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PaperAirplaneIcon } from "@heroicons/react/24/solid";

export default function Home() {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  const sendMessage = () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, input]); 
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  };

  // Auto-scroll to the latest message
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const hasMessages = messages.length > 0;

  return (
    <main className="flex min-h-screen flex-col bg-gray-50 px-4">
      {!hasMessages && (
        <h1 className="text-4xl font-bold mb-12 mt-12 text-center text-gray-800">
          Welcome to Portfolio Chat
        </h1>
      )}

      {/* Messages */}
      <div
        className={`flex-1 w-full max-w-lg mx-auto overflow-y-auto space-y-2 ${
          hasMessages ? "pb-24" : ""
        }`}
      >
        {messages.map((msg, i) => (
          <div key={i} className="rounded-md bg-white p-3 shadow text-gray-800">
            {msg}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Input (sticky only when there are messages) */}
      <div
        className={`w-full max-w-lg mx-auto flex items-center gap-2 bg-gray-50 py-4 ${
          hasMessages ? "sticky bottom-0" : "mb-12"
        }`}
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask me anything..."
          className="flex-1 bg-white"
        />
        <Button onClick={sendMessage} aria-label="Send">
          <PaperAirplaneIcon className="h-5 w-5 rotate-315 text-white" />
        </Button>
      </div>
    </main>
  );
}