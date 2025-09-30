"use client";

import { PaperAirplaneIcon } from "@heroicons/react/24/solid";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { v4 as uuidv4 } from "uuid";

type Message = { id: string; isUser: boolean; parts: React.ReactNode[]; };


function styleMessage(event_type: string, chunk: string) {
  switch (event_type) {
    case "on_reasoning":
      return <span className="font-bold italic">Reasoning...<br/></span>;
    case "on_tool_request":
      return "\n";
    case "on_text":
      return chunk;
    case "on_tool_start":
      return (
        <span className="font-bold">Invoking tool <span className="italic whitespace-pre-wrap">{chunk}</span>...<br/></span>
      );
    case "on_tool_args":
      return <span className="font-bold">Agent Query: <span className="italic whitespace-pre-wrap">{chunk}</span><br/></span>;
    case "on_tool_output":
      return <span><span className="font-bold">Tool response: </span> <span className="italic whitespace-pre-wrap">{chunk}</span><br/></span>;
    default:
      return chunk;
  }
}


export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [waiting, setWaiting] = useState(false); // disable input while waiting for response
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sessionId = uuidv4(); // Unique session ID for each chat session
  const sourceRef = useRef<EventSource | null>(null);

  const sendMessage = () => {
    const q = input.trim();
    if (!q) return;

    setMessages((prev) => [
      ...prev,
      { id: uuidv4(), isUser: true, parts: [q] },
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

    const botId = uuidv4();
    setMessages((prev) => [
      ...prev,
      { id: botId, isUser: false, parts: [] },
    ]);

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const chunk = data?.content ?? "";

        setMessages((prev) => {
          const next = [...prev];
          const i = next.findIndex((m) => m.id === botId);
          if (i == -1) return prev;
          next[i] = { ...next[i], parts: [...next[i].parts, styleMessage(data.type, chunk)] };
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
          {messages.map(({ id, isUser, parts: msg }) => (
            <div
              key={id}
              className={`rounded-lg px-3 py-2 w-fit ${isUser ? "bg-accent ml-auto" : "mr-auto"}`}
            >
              <div className="whitespace-pre-wrap">{
                msg.map((p, i) => <span key={i}>{p}</span>)
              }</div>
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
