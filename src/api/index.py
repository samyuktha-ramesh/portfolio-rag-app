from datetime import datetime
import json
from collections import defaultdict
import os
from pathlib import Path

from flask import Flask, Response, request, stream_with_context
from hydra import compose, initialize
from portfolio_rag.runtime.session import ChatSession

app = Flask(__name__)

chat_sessions = defaultdict(lambda: ChatSession(cfg))

now = datetime.now().strftime("%Y-%m-%d/%H-%M-%S")
working_dir = Path("outputs") / now
working_dir.mkdir(parents=True, exist_ok=True)
working_dir_absolute = working_dir.resolve().as_posix()

portfolio_rag_dir = Path(__file__).resolve().parent.parent.parent.parent / "PortfolioRAG" 
os.chdir(portfolio_rag_dir)

cfg_path = "../../../PortfolioRAG/src/portfolio_rag/configs"
with initialize(version_base="1.3", config_path=cfg_path, job_name="app"):
    cfg = compose(config_name="config", overrides=[f"+working_dir={working_dir_absolute}"])


@app.route("/api/query", methods=["GET"])
def query():
    session_id = request.args.get("session_id", type=str)
    query = request.args.get("query", type=str)
    
    if session_id is None or query is None:
        return Response("Missing session_id or query parameter", status=400)
    
    session = chat_sessions[session_id]

    def query_agent():
        yield "event: start\ndata: {}\n\n"
        for out in session.query(query):
            if out is not None:
                if isinstance(out, str):
                    event_type, content = out, ""
                else:
                    event_type, content = out
                payload = json.dumps({'type': event_type, 'content': content})
                yield f"data: {payload}\n\n"
        yield "event: end\ndata: {}\n\n"

    return Response(
        stream_with_context(query_agent()),
        mimetype="text/event-stream",
        headers={            
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )
