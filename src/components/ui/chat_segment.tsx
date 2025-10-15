import { useState } from "react";
import ReactMarkdown from "react-markdown";
type SegmentKind = "user" | "bot" | "bot_tool";
import { ChevronRight, ChevronDown } from "lucide-react";
import CodePopup from "@/components/ui/codepopup";

export type Segment = { id: string; kind: SegmentKind; content: string; input: string; output: string; };

function mapTypeToKind(type: string): SegmentKind {
    switch (type) {
        case "on_reasoning":
            return "bot_tool";
        case "on_tool_start":
            return "bot_tool";
        case "on_tool_args":
            return "bot_tool";
        case "on_tool_output":
            return "bot_tool";
        default:
            return "bot";
    }
}

function updateSegment(type: string, segment: Segment, chunk: string): Segment | null {
    switch (type) {
        case "on_reasoning":
            return null; // new segment
        case "on_tool_start":
            return null; // new segment
        case "on_tool_args":
            return { ...segment, input: segment.input + chunk };
        case "on_tool_request":
            return segment; // no change
        case "on_tool_output":
            return { ...segment, output: segment.output + chunk };
        default:
            if (mapTypeToKind(type) !== segment.kind) {
                return null; // new segment
            }
            return { ...segment, content: segment.content + chunk };
    }
}

function ChatSegment({ segment, isLast, children }: { segment: Segment; isLast: boolean; children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    switch (segment.kind) {
        case "user":
            return <div className="prose px-3 py-2 w-fit bg-accent ml-auto mb-6 rounded-sm"><span>{children}</span>{segment.content}</div>;
        case "bot_tool":
            let tool_message = segment.content;
            if (tool_message.includes("|")) {
                const parts = tool_message.split("|");
                if (parts.length === 2) {
                    tool_message = isLast ? parts[0] : parts[1];
                }
            }
            switch (tool_message) {
                case "top_headlines":
                    if (!isLast) {
                        tool_message = "Fetched top headlines";
                    } else {
                        tool_message = "Fetching top headlines...";
                    }
                    break;
                case "web_search":
                    if (!isLast) {
                        tool_message = "Searched the web for query";
                    } else {
                        tool_message = "Performing web search for query...";
                    }
                    break;
                case "query_portfolio_analyst":
                    if (!isLast) {
                        tool_message = "Queried portfolio analyst with";
                    } else {
                        tool_message = "Querying portfolio analyst with";
                    }
                    break;
                case "finance_qa":
                    if (!isLast) {
                        tool_message = "Queried finance Q&A agent with";
                    }
                    else {
                        tool_message = "Querying finance Q&A agent with";
                    }
                    break;
                case "stress_test":
                    if (!isLast) {
                        tool_message = "Ran stress test on scenario:";
                    }
                    else {
                        tool_message = "Running stress test on scenario:";
                    }
                    break;
            }

            let code = null;
            let tool_output = segment.output;
            if (tool_output) {
                const codeBlockRegex = /```(.*?)\n([\s\S]*?)```/;
                const match = tool_output.match(codeBlockRegex);

                if (match) {
                    tool_output = tool_output.replace(codeBlockRegex, "").trim();
                    code = match[2];
                }
            }

            return (
                <>
                <div className="prose px-3 w-fit py-2 border-2 border-blue-100 rounded-sm">
                    <span>
                        {tool_message}
                        {segment.input && segment.input !== "{}" && (
                            <span className="font-light">
                                {` ${segment.input.startsWith('"') ? segment.input : `"${segment.input}"`}...`}
                            </span>
                        )}
                        { 
                            segment.output && (
                                <button
                                    onClick={() => setOpen(!open)}
                                    className="inline-flex items-center text-xs ml-3 text-gray-500 mr-1"
                                >
                                    {open ? "Hide Details" : "View Details"}
                                    {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                </button>
                            )
                        }
                        {(!segment.output || !open) && children}
                    </span>
                    {segment.output && open && (
                        <div className="prose px-3 pb-2 w-fit text-sm">
                            <ReactMarkdown>
                            {tool_output}
                            </ReactMarkdown>
                            {code && (<CodePopup code={code} />)}
                            {children}
                        </div>
                    )}
                </div>
                {!isLast && (<div className="w-1 h-4 ml-6 bg-blue-100" />)}
                </>
            );
        default:
            return (segment.content.trim() === "" ? <></> :
                <div className={`prose px-3 py-2 w-fit border-2 border-blue-100 rounded-sm mb-6`}>
                    <ReactMarkdown>
                    {segment.content}
                    </ReactMarkdown> 
                    {children}
                </div>
            );
    }
}

export { ChatSegment, updateSegment, mapTypeToKind };