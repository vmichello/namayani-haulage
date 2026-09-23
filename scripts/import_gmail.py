#!/usr/bin/env python3
"""Import sender-filtered Gmail message bodies into the private knowledge DB."""

import base64
import json
import sqlite3
import urllib.parse
import urllib.request
from email.utils import parsedate_to_datetime
from pathlib import Path

TOKEN_PATH = Path(".private/gmail-token.json")
DATABASE_PATH = Path(".private/bot-knowledge.sqlite3")
QUERY = "from:(victor@namayani.com)"
API = "https://gmail.googleapis.com/gmail/v1/users/me"


def request(url, token):
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req) as response:
        return json.load(response)


def decode_body(value):
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4)).decode(
        "utf-8", errors="replace"
    )


def walk_parts(part, output):
    filename = part.get("filename", "")
    body = part.get("body", {})
    mime = part.get("mimeType", "")
    if not filename and mime in ("text/plain", "text/html") and body.get("data"):
        output.append(decode_body(body["data"]))
    for child in part.get("parts", []):
        walk_parts(child, output)


def headers(message):
    return {item["name"].lower(): item["value"] for item in message["payload"].get("headers", [])}


def main():
    token = json.loads(TOKEN_PATH.read_text())["access_token"]
    message_ids = []
    page = None
    while True:
        params = {"q": QUERY, "maxResults": "500"}
        if page:
            params["pageToken"] = page
        result = request(f"{API}/messages?{urllib.parse.urlencode(params)}", token)
        message_ids.extend(item["id"] for item in result.get("messages", []))
        page = result.get("nextPageToken")
        if not page:
            break

    connection = sqlite3.connect(DATABASE_PATH)
    connection.executescript(
        """
        CREATE TABLE IF NOT EXISTS gmail_messages (
          id TEXT PRIMARY KEY,
          sender TEXT NOT NULL,
          subject TEXT,
          sent_at TEXT,
          message_id TEXT,
          body TEXT NOT NULL,
          imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        """
    )
    imported = 0
    for message_id in message_ids:
        message = request(f"{API}/messages/{message_id}?format=full", token)
        message_headers = headers(message)
        sender = message_headers.get("from", "")
        if "victor@namayani.com" not in sender.lower():
            continue
        body_parts = []
        walk_parts(message["payload"], body_parts)
        body = "\n\n".join(body_parts).strip()
        sent_at = message_headers.get("date", "")
        try:
            sent_at = parsedate_to_datetime(sent_at).isoformat()
        except (TypeError, ValueError):
            pass
        connection.execute(
            """
            INSERT OR REPLACE INTO gmail_messages
              (id, sender, subject, sent_at, message_id, body)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                message_id,
                sender,
                message_headers.get("subject", ""),
                sent_at,
                message_headers.get("message-id", ""),
                body,
            ),
        )
        imported += 1
    connection.commit()
    total = connection.execute("SELECT COUNT(*) FROM gmail_messages").fetchone()[0]
    print(json.dumps({"matched": len(message_ids), "imported": imported, "stored_total": total}))


if __name__ == "__main__":
    main()
