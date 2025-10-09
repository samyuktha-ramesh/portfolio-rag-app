import json
import threading
import time
from queue import Empty, Queue
from uuid import uuid4

from flask import Flask, Response, request, stream_with_context

# from hydra import compose, initialize
from portfolio_rag.runtime.session import ChatSession

app = Flask(__name__)
SENTINEL = object()

chat_sessions = {}


@app.route("/api/start_session", methods=["POST"])
def start_session():
    while True:
        session_id = str(uuid4())
        if session_id not in chat_sessions:
            break
    chat_sessions[session_id] = ChatSession(session_id=session_id)
    return {"session_id": session_id}


@app.route("/api/query", methods=["GET"])
def query():
    session_id = request.args.get("session_id", type=str)
    query = request.args.get("query", type=str)

    if session_id is None or query is None:
        return Response("Missing session_id or query parameter", status=400)

    if session_id not in chat_sessions:
        return Response(f"Session {session_id} not found", status=404)

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


@app.route("/api/end_session", methods=["POST"])
def end_session():
    session_id = request.args.get("session_id", type=str)

    if session_id is None:
        return Response("Missing session_id parameter", status=400)

    if session_id in chat_sessions:
        del chat_sessions[session_id]
        return Response(f"Session {session_id} ended", status=200)
    else:
        return Response(f"Session {session_id} not found", status=404)
