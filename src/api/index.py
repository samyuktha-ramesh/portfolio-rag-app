import json
import os
import threading
import time
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from queue import Empty, Queue

from flask import Flask, Response, request, stream_with_context
from hydra import compose, initialize
from portfolio_rag.runtime.session import ChatSession

app = Flask(__name__)
SENTINEL = object()

chat_sessions = defaultdict(lambda: ChatSession(cfg))

now = datetime.now().strftime("%Y-%m-%d/%H-%M-%S")
working_dir = Path("outputs") / now
working_dir.mkdir(parents=True, exist_ok=True)
working_dir_absolute = working_dir.resolve().as_posix()

portfolio_rag_dir = (
    Path(__file__).resolve().parent.parent.parent.parent / "PortfolioRAG"
)
os.chdir(portfolio_rag_dir)

cfg_path = "../../../PortfolioRAG/src/portfolio_rag/configs"
with initialize(version_base="1.3", config_path=cfg_path, job_name="app"):
    cfg = compose(
        config_name="config", overrides=[f"+working_dir={working_dir_absolute}"]
    )


@app.route("/api/query", methods=["GET"])
def query():
    session_id = request.args.get("session_id", type=str)
    query = request.args.get("query", type=str)

    if session_id is None or query is None:
        return Response("Missing session_id or query parameter", status=400)

    session = chat_sessions[session_id]

    def query_agent():
        q: Queue = Queue(maxsize=128)

        def produce():
            try:
                for out in session.query(query):
                    q.put(out)
            finally:
                q.put(SENTINEL)

        t = threading.Thread(target=produce, daemon=True)
        t.start()

        yield "event: start\ndata: {}\n\n"
        last_sent = time.time()
        heartbeat_every = 15.0  # seconds
        queue_poll = 1.0  # how often we wake to check queue / send heartbeat

        try:
            while True:
                try:
                    item = q.get(timeout=queue_poll)
                except Empty:
                    item = None

                now = time.time()
                if item is SENTINEL:
                    break

                if item is None:
                    # no data this tick; maybe send heartbeat
                    if now - last_sent >= heartbeat_every:
                        # SSE comment line as heartbeat
                        yield ": keep-alive\n\n"
                        last_sent = now
                    continue

                # normal data item
                if isinstance(item, str):
                    event_type, content = item, ""
                else:
                    event_type, content = item
                payload = json.dumps({"type": event_type, "content": content})
                yield f"data: {payload}\n\n"
                last_sent = now
        finally:
            # best-effort join (thread is daemon; won't block shutdown)
            try:
                t.join(timeout=0.1)
            except Exception:
                pass

        yield "event: end\ndata: {}\n\n"

    return Response(
        stream_with_context(query_agent()),
        mimetype="text/event-stream",
        headers={
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
