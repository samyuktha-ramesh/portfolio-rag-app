"use client";

import { PaperAirplaneIcon } from "@heroicons/react/24/solid";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Message = { id: string; isUser: boolean; text: string };

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [waiting, setWaiting] = useState(false); // disable input while waiting for response
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sessionId = crypto.randomUUID(); // Unique session ID for each chat session
  const sourceRef = useRef<EventSource | null>(null);

  const sendMessage = () => {
    const q = input.trim();
    if (!q) return;

    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), isUser: true, text: q },
    ]);
    setInput("");
    setWaiting(true);
    scrollUp();
    sourceRef.current?.close();

    const params = new URLSearchParams({
      query: q,
      session_id: String(sessionId),
    });
    const source = new EventSource(`/api/query?${params.toString()}`);
    sourceRef.current = source;

    const botId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: botId, isUser: false, text: "" },
    ]);

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const chunk = data?.content ?? "";

        if (!chunk) return;

        setMessages((prev) => {
          const next = [...prev];
          const i = next.findIndex((m) => m.id === botId);
          if (i == -1) return prev;
          next[i] = { ...next[i], text: next[i].text + chunk };
          return next;
        });

      } catch (error) {
        console.error("Error parsing event data:", error);
      }
    };

    const endSource = () => {
      setWaiting(false);
      source.close();
      if (sourceRef.current === source) {
        sourceRef.current = null;
      }
    };

    source.addEventListener("end", () => {
      endSource();
    });

    source.onerror = () => {
      endSource();
    };
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (waiting) return; // Prevent sending new messages while waiting
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  };

  const scrollUp = () => {
    if (containerRef.current) {
      const el = containerRef.current.lastElementChild as HTMLElement | null;
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <main>
      {!hasMessages && (
        <h1 className="text-4xl font-bold mb-12 mt-60 text-center">
          Your portfolio insights, unlocked.
        </h1>
      )}

      {/* Messages */}
      {hasMessages && (
        <div
          className={`w-full h-full max-w-lg mx-auto overflow-y-auto space-y-2 flex-1 pb-24 mt-20`}
          ref={containerRef}
        >
          {messages.map(({ id, isUser, text: msg }) => (
            <div
              key={id}
              className={`rounded-lg px-3 py-2 w-fit ${isUser ? "bg-accent ml-auto" : "mr-auto"}`}
            >
              {msg}
            </div>
          ))}
        </div>
      )}

      {/* Input (sticky only when there are messages) */}
      <div
        className={`w-full z-10 bg-background ${hasMessages && "fixed bottom-0"}`}
      >
        <div className={"mx-auto max-w-lg flex items-center gap-2 py-2"}>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything..."
            className="flex-1 bg-white"
          />
          <Button
            onClick={sendMessage}
            aria-label="Send"
            disabled={waiting || !input.trim()}
          >
            <PaperAirplaneIcon className="h-5 w-5 rotate-315 text-white" />
          </Button>
        </div>
        <div className="text-xs text-gray-500 text-center mb-4">
          Disclaimer: This chat provides general insights and does not
          constitute financial advice.
        </div>
      </div>
    </main>
  );
}
