import json
from collections import defaultdict

from flask import Flask, Response, request, stream_with_context
from hydra import compose, initialize
from portfolio_rag.runtime.session import ChatSession

app = Flask(__name__)

chat_sessions = defaultdict(lambda: ChatSession(cfg))

cfg_path = "../../../PortfolioRAG/src/portfolio_rag/configs"
with initialize(version_base="1.3", config_path=cfg_path, job_name="app"):
    cfg = compose(config_name="config", overrides=[])


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
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )
