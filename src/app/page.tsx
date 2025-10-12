"use client";

import { PaperAirplaneIcon } from "@heroicons/react/24/solid";
import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { v4 as uuidv4 } from "uuid";
import { ChatSegment, updateSegment, mapTypeToKind, Segment } from "@/components/ui/chat_segment";
import { BounceLoader } from "react-spinners";
import { Skeleton } from "@/components/ui/skeleton"

export default function Home() {
  const [messages, setMessages] = useState<Segment[]>([]);
  const [input, setInput] = useState("");
  const [waiting, setWaiting] = useState(false); // disable input while waiting for response
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sourceRef = useRef<EventSource | null>(null);

  const currentBotIdRef = useRef<string | null>(null);

  function pushBotMessage(type: string, content: string) {
    const id = uuidv4();
    const segment = { id, kind: mapTypeToKind(type), content, input: "", output: "" };
    setMessages((prev) => [...prev, segment]);
    currentBotIdRef.current = id;
  }

  async function startSession() {
    const res = await fetch("/api/start_session", { method: "POST" });
    const data = await res.json();
    
    return data.session_id;
  }

  const [sessionId, setSessionId] = useState<string | null>(null);

  // Initialize sessionId on mount
  useEffect(() => {
    let isMounted = true;
    async function initSession() {
      if (!sessionId) {
        const id = await startSession();
        if (isMounted) setSessionId(id);
      }
    }
    initSession();

    window.addEventListener("beforeunload", () => {
      if (sessionId) 
        navigator.sendBeacon(`/api/end_session?session_id=${sessionId}`);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const sendMessage = () => {
    const q = input.trim();
    if (!q) return;

    setMessages((prev) => [
      ...prev,
      { id: uuidv4(), kind: "user", content: q, input: "", output: "" },
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

    pushBotMessage("bot", "");    

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const chunk = data?.content ?? "";

        setMessages((prev) => {
          const next = [...prev];
          const i = next.findIndex((m) => m.id === currentBotIdRef.current);
          if (i == -1) return prev;

          const type = data?.type ?? "bot";
          const updatedSegment = updateSegment(type, next[i], chunk);
          if (!updatedSegment) {
            const reasoning_message = [
              "Reasoning...",
              "Thinking...",
              "Pondering...",
            ][Math.floor(Math.random() * 3)];
            pushBotMessage(type, type === "on_reasoning" ? reasoning_message : chunk);
          }
          else {
            next[i] = updatedSegment;
          }
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
      {!sessionId && (
        <div className="flex flex-col items-center justify-center space-y-4 mt-60">
          <h1 className="text-4xl font-bold text-center mb-14">
            Connecting to your portfolio...
          </h1>
          <div className="flex items-center space-x-4 w-full max-w-lg">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </div>
      )}

      {sessionId && (
        <>
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
            {messages.map((segment, i) => (
              <ChatSegment key={segment.id} segment={segment}>
                {i === messages.length - 1 && (
                  <BounceLoader
                    size={15}
                    loading={waiting}
                    color="#888"
                    cssOverride={{
                      display: "inline-block",
                      marginLeft: "8px",
                      verticalAlign: "middle",
                      marginBottom: "3px",
                    }}
                  />
                )}
              </ChatSegment>
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
        </>
      )}
    </main>
  );
}
