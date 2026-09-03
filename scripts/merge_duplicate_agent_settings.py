#!/usr/bin/env python3
"""Merge duplicate agent_settings rows that share the same clinty_api_key_id."""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from typing import Any

MERGE_FIELDS = (
    "name",
    "langgraph_api_key",
    "url",
    "graph_id",
    "openapi_key",
    "database_uri",
    "redis_uri",
    "secrets_dir",
    "calendar_provider",
    "square_access_token",
    "square_location_id",
    "square_service_variation_id",
    "square_service_variation_version",
    "square_team_member_id",
    "square_timezone",
    "auto_book_scheduling",
    "auto_respond_instruction",
    "auto_respond_scheduling",
    "environment",
    "log_level",
    "pgoptions",
    "postgres_schema",
)


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


def _non_empty(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    return True


def _merge_rows(rows: list[dict[str, Any]]) -> dict[str, Any]:
    ordered = sorted(
        rows,
        key=lambda row: (row.get("updated_at") or "", row.get("created_at") or ""),
        reverse=True,
    )
    merged: dict[str, Any] = {}
    for field in MERGE_FIELDS:
        for row in ordered:
            value = row.get(field)
            if _non_empty(value):
                merged[field] = value
                break
    return merged


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
        "/rest/v1/agent_settings?"
        + urllib.parse.urlencode(
            {
                "select": ",".join(["id", "clinty_api_key_id", "updated_at", "created_at", *MERGE_FIELDS]),
                "order": "updated_at.desc",
            },
        ),
    )
    if not isinstance(rows, list):
        print("Unexpected agent_settings response.", file=sys.stderr)
        return 1

    groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        key_id = row.get("clinty_api_key_id")
        if key_id:
            groups[str(key_id)].append(row)

    duplicate_groups = {key_id: group for key_id, group in groups.items() if len(group) > 1}
    if not duplicate_groups:
        print("duplicate_api_key_groups=0 rows_updated=0 rows_deleted=0")
        return 0

    rows_updated = 0
    rows_deleted = 0
    for key_id, group in duplicate_groups.items():
        ordered = sorted(
            group,
            key=lambda row: (row.get("updated_at") or "", row.get("created_at") or ""),
            reverse=True,
        )
        keeper = ordered[0]
        keep_id = keeper["id"]
        patch = _merge_rows(ordered)
        if patch:
            _request(
                base_url,
                service_key,
                "PATCH",
                f"/rest/v1/agent_settings?id=eq.{urllib.parse.quote(str(keep_id))}",
                patch,
            )
            rows_updated += 1

        for extra in ordered[1:]:
            extra_id = extra["id"]
            _request(
                base_url,
                service_key,
                "DELETE",
                f"/rest/v1/agent_settings?id=eq.{urllib.parse.quote(str(extra_id))}",
            )
            rows_deleted += 1

    print(
        f"duplicate_api_key_groups={len(duplicate_groups)} "
        f"rows_updated={rows_updated} rows_deleted={rows_deleted}",
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
