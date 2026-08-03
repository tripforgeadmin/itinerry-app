#!/usr/bin/env python3
"""One-off backfill: LINE OA Manager chat-export CSVs -> line_message_log.

The Messaging API cannot fetch chat history retroactively; the OA Manager's
manual CSV export is the only source of pre-webhook history. This script maps
each per-customer CSV onto an account row (via line_display_name) and inserts
timeline rows so the admin chat panel shows the full history.

Usage:
  python3 scripts/import-oa-chat.py <export-dir>            # dry run (default)
  python3 scripts/import-oa-chat.py <export-dir> --live     # actually insert

Idempotent + reversible: every inserted row carries payload.source =
"oa_export_260803"; re-runs skip rows already imported, and a bad import can be
deleted with one filter on that marker.
"""

import csv
import glob
import json
import os
import re
import sys
import urllib.request
from datetime import datetime, timedelta, timezone

SOURCE_MARKER = "oa_export_260803"
BKK = timezone(timedelta(hours=7))
AUTO_REPLY_SENDER = "ข้อความตอบกลับอัตโนมัติ"
# Webhook inbound logging went live 2026-08-01; rows at/after this may already
# be in the table with slightly different timestamps -> content-based dedupe.
OVERLAP_START = "2026-07-31"  # date-only: '+00:00' in a query string reads as a space -> 400


def load_env():
    env = {}
    with open(".env.local", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip().strip('"').strip("'")
    url = env.get("SUPABASE_URL") or (
        f"https://{env['SUPABASE_DB_ID']}.supabase.co" if env.get("SUPABASE_DB_ID") else None
    )
    key = env.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        sys.exit("missing SUPABASE_URL/SUPABASE_DB_ID or SUPABASE_SERVICE_ROLE_KEY in .env.local")
    return url.rstrip("/"), key


def rest(base, key, method, path, body=None, prefer=None):
    req = urllib.request.Request(
        f"{base}/rest/v1/{path}",
        data=json.dumps(body).encode() if body is not None else None,
        method=method,
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            **({"Prefer": prefer} if prefer else {}),
        },
    )
    with urllib.request.urlopen(req) as res:
        raw = res.read()
        return json.loads(raw) if raw else None


def fetch_all(base, key, path):
    out, offset = [], 0
    while True:
        page = rest(base, key, "GET", f"{path}&limit=1000&offset={offset}")
        out.extend(page)
        if len(page) < 1000:
            return out
        offset += 1000


def parse_export_tz(rows):
    """Row 2 is ('ไทม์โซน', "'+09:00") — timestamps below are in that offset."""
    for row in rows[:4]:
        if row and row[0] == "ไทม์โซน" and len(row) > 1:
            m = re.search(r"([+-])(\d{2}):(\d{2})", row[1])
            if m:
                sign = 1 if m.group(1) == "+" else -1
                return timezone(sign * timedelta(hours=int(m.group(2)), minutes=int(m.group(3))))
    return timezone(timedelta(hours=9))


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    live = "--live" in sys.argv
    if not args:
        sys.exit(__doc__)
    export_dir = args[0]

    base, service_key = load_env()

    accounts = fetch_all(base, service_key, "account?select=id,line_display_name,last_inbound_at&line_display_name=not.is.null")
    by_name = {}
    for a in accounts:
        by_name.setdefault(a["line_display_name"].strip(), []).append(a)

    already = fetch_all(
        base, service_key,
        f"line_message_log?select=payload&payload->>source=eq.{SOURCE_MARKER}",
    )
    imported_keys = {(r["payload"].get("file"), r["payload"].get("line")) for r in already}

    recent = fetch_all(
        base, service_key,
        f"line_message_log?select=account_id,content,created_at&direction=eq.inbound&created_at=gte.{OVERLAP_START}",
    )
    # Webhook rows are stamped at receive time, not send time -> match on content within ±5 min.
    recent_by_account = {}
    for r in recent:
        recent_by_account.setdefault(r["account_id"], []).append(
            (r["content"], datetime.fromisoformat(r["created_at"].replace("Z", "+00:00")))
        )

    files = sorted(glob.glob(os.path.join(export_dir, "*.csv")))
    to_insert, unmatched, ambiguous, dup_skipped = [], [], [], 0
    latest_inbound = {}  # account_id -> max imported inbound ts

    for f in files:
        fname = os.path.basename(f)
        name_part = re.sub(r"^\d+_\d{8}_\d{8}_", "", fname)[:-4].strip()

        with open(f, encoding="utf-8-sig", newline="") as fh:
            rows = list(csv.reader(fh))
        tz = parse_export_tz(rows)

        # The name segment lists every display name the customer used, comma-separated.
        candidates = [name_part] + [n.strip() for n in name_part.split(",") if n.strip()]
        matches = []
        for cand in candidates:
            if cand in by_name:
                matches = by_name[cand]
                break
        if not matches:
            unmatched.append((fname, sum(1 for r in rows[4:] if len(r) >= 5)))
            continue
        if len(matches) > 1:
            ambiguous.append((fname, len(matches)))
            continue
        account = matches[0]

        for lineno, row in enumerate(rows[4:], start=5):
            if len(row) < 5:
                continue
            sender_type, sender_name, d, t, text = row[0], row[1], row[2], row[3], row[4]
            if not text.strip():
                continue
            if (fname, lineno) in imported_keys:
                continue
            try:
                ts = datetime.strptime(f"{d} {t}", "%Y/%m/%d %H:%M:%S").replace(tzinfo=tz)
            except ValueError:
                continue
            ts_utc = ts.astimezone(timezone.utc)

            inbound = sender_type == "User"
            if inbound:
                dup = False
                for content, existing_ts in recent_by_account.get(account["id"], []):
                    if content == text[:500] and abs((existing_ts - ts_utc).total_seconds()) < 300:
                        dup = True
                        break
                if dup:
                    dup_skipped += 1
                    continue
                prev = latest_inbound.get(account["id"])
                if prev is None or ts_utc > prev:
                    latest_inbound[account["id"]] = ts_utc

            to_insert.append({
                "account_id": account["id"],
                "assessment_id": None,
                "kind": "inbound" if inbound else "manual",
                "direction": "inbound" if inbound else "outbound",
                "content": text,
                "payload": {"source": SOURCE_MARKER, "file": fname, "line": lineno, "sender": sender_name},
                "sent_by": "customer" if inbound else ("system" if sender_name == AUTO_REPLY_SENDER else "admin"),
                "delivered": True,
                "created_at": ts_utc.isoformat(),
            })

    print(f"files: {len(files)}  matched: {len(files) - len(unmatched) - len(ambiguous)}  "
          f"unmatched: {len(unmatched)}  ambiguous: {len(ambiguous)}")
    print(f"rows to insert: {len(to_insert)}  (skipped {dup_skipped} webhook-overlap dups, "
          f"{len(imported_keys)} previously imported)")
    for fname, n in unmatched:
        print(f"  UNMATCHED ({n} rows): {fname}")
    for fname, n in ambiguous:
        print(f"  AMBIGUOUS ({n} accounts): {fname}")

    if not live:
        print("\ndry run — pass --live to insert")
        return

    for i in range(0, len(to_insert), 500):
        rest(base, service_key, "POST", "line_message_log", to_insert[i:i + 500], prefer="return=minimal")
        print(f"inserted {min(i + 500, len(to_insert))}/{len(to_insert)}")

    # Freshen last_inbound_at where the export shows a newer inbound than the DB knows of
    # (keeps the no_reply_72h broadcast condition honest for pre-webhook history).
    updated = 0
    acc_by_id = {a["id"]: a for a in accounts}
    for acc_id, ts in latest_inbound.items():
        current = acc_by_id[acc_id].get("last_inbound_at")
        if current is None or datetime.fromisoformat(current.replace("Z", "+00:00")) < ts:
            rest(base, service_key, "PATCH", f"account?id=eq.{acc_id}",
                 {"last_inbound_at": ts.isoformat()}, prefer="return=minimal")
            updated += 1
    print(f"done — last_inbound_at freshened on {updated} accounts")


if __name__ == "__main__":
    main()
