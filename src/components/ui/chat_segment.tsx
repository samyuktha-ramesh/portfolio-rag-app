import { useState } from "react";
import ReactMarkdown from "react-markdown";
type SegmentKind = "user" | "bot" | "bot_tool";
import { ChevronRight, ChevronDown } from "lucide-react";

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

function ChatSegment({ segment, children }: { segment: Segment; children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    switch (segment.kind) {
        case "user":
            return <div className="prose px-3 py-2 w-fit bg-accent ml-auto"><span>{children}</span>{segment.content}</div>;
        case "bot_tool":
            let tool_message = segment.content;
            switch (tool_message) {
                case "top_headlines":
                    tool_message = "Fetching top headlines...";
                    break;
                case "web_search":
                    tool_message = "Performing web search for query";
                    break;
                case "query_portfolio_analyst":
                    tool_message = "Querying portfolio analyst with";
                    break;
                case "finance_qa":
                    tool_message = "Querying finance Q&A agent with";
                    break;
                case "stress_test":
                    tool_message = "Running stress test on scenario:";
                    break;
            }

            return (
                <div className="prose px-3 pt-2 text-s font-light text-gray-800">
                    <span>
                        {tool_message}
                        {segment.input && segment.input !== "{}" && (
                            <i>{` ${segment.input.startsWith('"') ? segment.input : `"${segment.input}"`}...`}</i>
                        )}
                        { 
                            segment.output && (
                                <button
                                    onClick={() => setOpen(!open)}
                                    className="inline-flex items-center text-sm ml-3 text-gray-800 mr-1"
                                >
                                    {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                </button>
                            )
                        }
                        {(!segment.output || !open) && children}
                    </span>
                    {segment.output && open && (
                        <div className="prose px-3 pb-2 w-fit">
                            <ReactMarkdown
                            components={{
                                p: ({ node, ...props }) => <span {...props} />, // paragraphs → inline span
                                div: ({ node, ...props }) => <span {...props} />, // safeguard for divs
                            }}
                            >
                            {segment.output}
                            </ReactMarkdown>
                            {children}
                        </div>
                    )}
                </div>
            );
        default:
            return (
                <div className="prose px-3 pb-2 w-fit">
                    <ReactMarkdown
                    components={{
                        p: ({ node, ...props }) => <span {...props} />, // paragraphs → inline span
                        div: ({ node, ...props }) => <span {...props} />, // safeguard for divs
                    }}
                    >
                    {segment.content}
                    </ReactMarkdown>
                    {children}
                </div>
            );
    }
}

export { ChatSegment, updateSegment, mapTypeToKind };