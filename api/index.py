import json
import threading
import time
from queue import Empty, Queue
from uuid import uuid4

from flask import Flask, Response, request, stream_with_context
from flask_cors import CORS
from portfolio_rag.runtime.session import ChatSession


app = Flask(__name__)
CORS(app)

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
    qtext = request.args.get("query", type=str)

    if session_id is None or qtext is None:
        return Response("Missing session_id or query parameter", status=400)
    if session_id not in chat_sessions:
        return Response(f"Session {session_id} not found", status=404)

    session = chat_sessions[session_id]

    def query_agent():
        q: Queue = Queue(maxsize=128)

        def produce():
            try:
                for out in session.query(qtext):
                    q.put(out)
            finally:
                q.put(SENTINEL)

        t = threading.Thread(target=produce, daemon=True)
        t.start()

        yield "retry: 15000\n\n"
        yield "event: start\ndata: {}\n\n"

        last_sent = time.time()
        heartbeat_every = 15.0   # seconds
        queue_poll = 1.0         # seconds

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
                    if now - last_sent >= heartbeat_every:
                        # SSE heartbeat comment (ignored by client, keeps connection warm)
                        yield ": keep-alive\n\n"
                        last_sent = now
                    continue

                # Normal event payload
                if isinstance(item, str):
                    event_type, content = item, ""
                else:
                    event_type, content = item

                payload = json.dumps({"type": event_type, "content": content})
                yield f"data: {payload}\n\n"
                last_sent = now

        except (GeneratorExit, BrokenPipeError):
            # Client disconnected; let the thread wind down
            pass
        finally:
            try:
                t.join(timeout=0.2)
            except Exception:
                pass

        yield "event: end\ndata: {}\n\n"

    return Response(
        stream_with_context(query_agent()),
        mimetype="text/event-stream",
        headers={
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
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

if __name__ == "__main__":
    from waitress import serve
    serve(app, host="0.0.0.0", port=8080)
    