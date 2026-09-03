#!/usr/bin/env python3
"""Delete duplicate api_keys that share the same key_hash and detach their agent_settings."""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any


def _headers(service_key: str) -> dict[str, str]:
    return {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }


def _request(
    base_url: str,
    service_key: str,
    method: str,
    path: str,
    body: dict[str, Any] | None = None,
) -> Any:
    url = f"{base_url.rstrip('/')}{path}"
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, headers=_headers(service_key), method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode()
        raise RuntimeError(f"{method} {path} failed ({exc.code}): {detail}") from exc


def _parse_ts(value: str | None) -> datetime:
    if not value:
        return datetime.min.replace(tzinfo=timezone.utc)
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def main() -> int:
    base_url = os.getenv("SUPABASE_URL", "").strip()
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if not base_url or not service_key:
        print("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.", file=sys.stderr)
        return 1

    rows = _request(
        base_url,
        service_key,
        "GET",
        "/rest/v1/api_keys?"
        + urllib.parse.urlencode(
            {
                "select": "id,user_id,name,key_hash,created_at,revoked_at",
                "order": "created_at.asc",
            },
        ),
    )
    if not isinstance(rows, list):
        print("Unexpected api_keys response.", file=sys.stderr)
        return 1

    active_by_hash: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        if row.get("revoked_at"):
            continue
        key_hash = row.get("key_hash")
        if key_hash:
            active_by_hash[str(key_hash)].append(row)

    duplicate_groups = {h: group for h, group in active_by_hash.items() if len(group) > 1}
    if not duplicate_groups:
        print("duplicate_hash_groups=0 keys_revoked=0 settings_detached=0")
        return 0

    keys_revoked = 0
    settings_detached = 0

    for key_hash, group in duplicate_groups.items():
        ordered = sorted(group, key=lambda row: _parse_ts(row.get("created_at")))
        keeper = ordered[0]
        for duplicate in ordered[1:]:
            duplicate_id = duplicate["id"]
            _request(
                base_url,
                service_key,
                "DELETE",
                f"/rest/v1/api_keys?id=eq.{urllib.parse.quote(str(duplicate_id))}",
            )
            keys_revoked += 1

            _request(
                base_url,
                service_key,
                "PATCH",
                f"/rest/v1/agent_settings?clinty_api_key_id=eq.{urllib.parse.quote(str(duplicate_id))}",
                {"clinty_api_key_id": None},
            )
            settings_detached += 1

        print(
            "merged_hash_group "
            f"keeper={keeper['id']} "
            f"revoked={[row['id'] for row in ordered[1:]]}",
        )

    print(
        f"duplicate_hash_groups={len(duplicate_groups)} "
        f"keys_revoked={keys_revoked} settings_detached={settings_detached}",
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
