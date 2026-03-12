"""
CareAssist — Flask Backend
==========================
Runs on http://localhost:5000

API Routes
----------
POST /api/login              — authenticate user
POST /api/logout             — clear session

GET  /api/reminders          — list all reminders
POST /api/reminders          — create reminder
PUT  /api/reminders/<id>     — update reminder (name/time/freq/notes/taken)
DELETE /api/reminders/<id>   — delete reminder

GET  /api/health             — list all health records
POST /api/health             — add health record
DELETE /api/health/<id>      — delete health record
"""

from flask import Flask, request, jsonify, session, render_template
from functools import wraps
import uuid
from datetime import datetime

app = Flask(__name__)
app.secret_key = "careassist-secret-key-change-in-production"

# ── In-memory store (replace with a real DB for production) ──────────────────
# Keyed by user so multi-session safe
USERS = {
    "admin": "1234"
}

# Per-user data stores
_reminders: dict[str, list] = {}
_health_records: dict[str, list] = {}


def get_store(store: dict, user: str) -> list:
    if user not in store:
        store[user] = []
    return store[user]


# ── Auth helper ───────────────────────────────────────────────────────────────
def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if "user" not in session:
            return jsonify({"error": "Unauthorized", "authenticated": False}), 401
        return f(*args, **kwargs)
    return decorated


# ── Serve the SPA ─────────────────────────────────────────────────────────────
@app.route("/")
def index():
    return render_template("index.html")


# ── Auth routes ───────────────────────────────────────────────────────────────
@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    if not username:
        return jsonify({"error": "Please enter your username."}), 400
    if not password:
        return jsonify({"error": "Please enter your password."}), 400
    if USERS.get(username) != password:
        return jsonify({"error": "Incorrect username or password. Please try again."}), 401

    session["user"] = username
    return jsonify({"success": True, "username": username})


@app.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"success": True})


@app.route("/api/me", methods=["GET"])
def me():
    if "user" in session:
        return jsonify({"authenticated": True, "username": session["user"]})
    return jsonify({"authenticated": False}), 401


# ── Reminder routes ───────────────────────────────────────────────────────────
@app.route("/api/reminders", methods=["GET"])
@login_required
def get_reminders():
    reminders = get_store(_reminders, session["user"])
    return jsonify(reminders)


@app.route("/api/reminders", methods=["POST"])
@login_required
def add_reminder():
    data = request.get_json(silent=True) or {}
    name  = (data.get("name") or "").strip()
    time  = (data.get("time") or "").strip()
    freq  = (data.get("freq") or "Once daily").strip()
    notes = (data.get("notes") or "").strip()

    if not name:
        return jsonify({"error": "Medicine name is required."}), 400
    if not time:
        return jsonify({"error": "Reminder time is required."}), 400

    reminder = {
        "id": str(uuid.uuid4()),
        "name": name,
        "time": time,
        "freq": freq,
        "notes": notes,
        "taken": False,
        "created_at": datetime.utcnow().isoformat()
    }

    reminders = get_store(_reminders, session["user"])
    reminders.append(reminder)
    return jsonify(reminder), 201


@app.route("/api/reminders/<reminder_id>", methods=["PUT"])
@login_required
def update_reminder(reminder_id):
    data      = request.get_json(silent=True) or {}
    reminders = get_store(_reminders, session["user"])
    reminder  = next((r for r in reminders if r["id"] == reminder_id), None)

    if not reminder:
        return jsonify({"error": "Reminder not found."}), 404

    # Patch only provided fields
    if "name" in data:
        name = data["name"].strip()
        if not name:
            return jsonify({"error": "Medicine name cannot be empty."}), 400
        reminder["name"] = name
    if "time" in data:
        t = data["time"].strip()
        if not t:
            return jsonify({"error": "Time cannot be empty."}), 400
        reminder["time"] = t
    if "freq"  in data:  reminder["freq"]  = data["freq"]
    if "notes" in data:  reminder["notes"] = data["notes"]
    if "taken" in data:  reminder["taken"] = bool(data["taken"])

    return jsonify(reminder)


@app.route("/api/reminders/<reminder_id>", methods=["DELETE"])
@login_required
def delete_reminder(reminder_id):
    reminders = get_store(_reminders, session["user"])
    before    = len(reminders)
    _reminders[session["user"]] = [r for r in reminders if r["id"] != reminder_id]

    if len(_reminders[session["user"]]) == before:
        return jsonify({"error": "Reminder not found."}), 404
    return jsonify({"success": True})


# ── Health routes ─────────────────────────────────────────────────────────────
@app.route("/api/health", methods=["GET"])
@login_required
def get_health():
    records = get_store(_health_records, session["user"])
    return jsonify(records)


@app.route("/api/health", methods=["POST"])
@login_required
def add_health():
    data   = request.get_json(silent=True) or {}
    bp     = (data.get("bp")    or "").strip()
    sugar  = (data.get("sugar") or "").strip()
    hr     = (data.get("hr")    or "").strip()

    if not bp and not sugar and not hr:
        return jsonify({"error": "Please enter at least one value."}), 400

    # Basic format validation
    if bp:
        parts = bp.split("/")
        if len(parts) != 2 or not all(p.isdigit() for p in parts):
            return jsonify({"error": "BP format should be like 120/80"}), 400
    if sugar:
        try:
            sv = int(sugar)
            if not (0 <= sv <= 600):
                raise ValueError
        except ValueError:
            return jsonify({"error": "Enter a valid blood sugar value (0–600)."}), 400
    if hr:
        try:
            hv = int(hr)
            if not (0 <= hv <= 300):
                raise ValueError
        except ValueError:
            return jsonify({"error": "Enter a valid heart rate (0–300)."}), 400

    now    = datetime.now()
    record = {
        "id":    str(uuid.uuid4()),
        "bp":    bp    or "—",
        "sugar": sugar or "—",
        "hr":    hr    or "—",
        "date":  now.strftime("%d %b %Y"),
        "time":  now.strftime("%I:%M %p"),
        "ts":    int(now.timestamp() * 1000)
    }

    records = get_store(_health_records, session["user"])
    records.insert(0, record)
    # Keep last 30
    if len(records) > 30:
        _health_records[session["user"]] = records[:30]

    return jsonify(record), 201


@app.route("/api/health/<record_id>", methods=["DELETE"])
@login_required
def delete_health(record_id):
    records = get_store(_health_records, session["user"])
    before  = len(records)
    _health_records[session["user"]] = [r for r in records if r["id"] != record_id]

    if len(_health_records[session["user"]]) == before:
        return jsonify({"error": "Record not found."}), 404
    return jsonify({"success": True})


# ── Run ────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    app.run(debug=True, port=5000)
