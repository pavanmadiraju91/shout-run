"""MCP server for shout.run — live terminal broadcasting for AI agents."""

from __future__ import annotations

import asyncio
import os
import time

from mcp.server.fastmcp import FastMCP

from shout_sdk import ShoutSession

__version__ = "0.1.3"

mcp = FastMCP(
    "shout",
    instructions=(
        "Broadcast terminal output to shout.run so humans can watch AI agents work in real-time. "
        "Call shout_start_broadcast first, then shout_write with terminal output, "
        "and shout_end_broadcast when done."
    ),
)

_session: ShoutSession | None = None
_session_url: str | None = None
_start_time: float | None = None


def _get_api_key() -> str | None:
    return os.environ.get("SHOUT_API_KEY")


def _get_api_url() -> str:
    return os.environ.get("SHOUT_API_URL", "https://api.shout.run")


@mcp.tool()
async def shout_start_broadcast(
    title: str = "Agent Session",
    visibility: str = "public",
) -> str:
    """Start broadcasting your terminal to shout.run. Viewers can watch live at the returned URL.

    Args:
        title: Session title shown to viewers.
        visibility: Who can see the session — 'public' or 'private'.
    """
    global _session, _session_url, _start_time

    api_key = _get_api_key()
    if not api_key:
        return "Error: SHOUT_API_KEY environment variable is not set. Get one at https://shout.run"

    if _session is not None and _session.state.value in ("connecting", "live"):
        return (
            f"A broadcast is already active (session {_session.session_id}). "
            f"End it first with shout_end_broadcast."
        )

    _session = ShoutSession(
        api_key=api_key,
        title=title,
        visibility=visibility,
        api_url=_get_api_url(),
    )

    try:
        result = await asyncio.to_thread(_session.start)
    except Exception as e:
        _session = None
        return f"Error starting broadcast: {e}"

    _session_url = result["url"]
    _start_time = time.time()

    return (
        f"Broadcasting live!\n"
        f"Session ID: {result['session_id']}\n"
        f"Viewer URL: {result['url']}\n\n"
        f"Use shout_write to send terminal output and shout_end_broadcast when done."
    )


@mcp.tool()
async def shout_write(data: str) -> str:
    """Write terminal output to the active broadcast. Viewers see this in real-time.

    Args:
        data: Terminal text to broadcast. Supports ANSI escape codes. Use \\r\\n for newlines.
    """
    if _session is None or _session.state.value not in ("connecting", "live"):
        return "Error: No active broadcast. Start one with shout_start_broadcast first."

    try:
        _session.write(data)
    except Exception as e:
        return f"Error writing to broadcast: {e}"

    return f"Sent {len(data)} characters to broadcast."


@mcp.tool()
async def shout_end_broadcast() -> str:
    """End the active broadcast session."""
    global _session, _session_url, _start_time

    if _session is None:
        return "No active broadcast to end."

    session_id = _session.session_id
    url = _session_url

    try:
        await asyncio.to_thread(_session.end)
    except Exception:
        pass

    _session = None
    _session_url = None
    _start_time = None

    replay_url = f"{url}" if url else ""
    return (
        f"Broadcast ended.\n"
        f"Session: {session_id}\n"
        f"Replay: {replay_url}"
    )


@mcp.tool()
async def shout_broadcast_status() -> str:
    """Check the status of the current broadcast."""
    if _session is None:
        return "No active broadcast."

    state = _session.state.value
    viewers = _session.viewers
    session_id = _session.session_id
    duration = ""

    if _start_time is not None:
        elapsed = int(time.time() - _start_time)
        minutes, seconds = divmod(elapsed, 60)
        duration = f"\nDuration: {minutes}m {seconds}s"

    return (
        f"Session: {session_id}\n"
        f"State: {state}\n"
        f"Viewers: {viewers}\n"
        f"URL: {_session_url or 'N/A'}"
        f"{duration}"
    )


@mcp.tool()
async def shout_delete_session(session_id: str) -> str:
    """Delete a broadcast session. Only works on ended sessions you own. This is permanent.

    Args:
        session_id: The session ID to delete.
    """
    api_key = _get_api_key()
    if not api_key:
        return "Error: SHOUT_API_KEY environment variable is not set."

    try:
        await asyncio.to_thread(
            ShoutSession.delete_session,
            api_key,
            session_id,
            api_url=_get_api_url(),
        )
    except Exception as e:
        return f"Failed to delete session: {e}"

    return f"Session {session_id} deleted."


@mcp.tool()
async def shout_search_sessions(
    query: str,
    tags: str = "",
    status: str = "",
    limit: int = 10,
) -> str:
    """Search for terminal broadcast sessions by query, tags, and status.

    Args:
        query: Search query (matches title and description).
        tags: Comma-separated list of tags to filter by (any match). Optional.
        status: Filter by session status — 'live' or 'ended'. Optional.
        limit: Maximum number of results (1-50, default: 10).
    """
    api_key = _get_api_key()
    if not api_key:
        return "Error: SHOUT_API_KEY environment variable is not set."

    tag_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else None
    status_filter = status if status in ("live", "ended") else None

    try:
        results = await asyncio.to_thread(
            ShoutSession.search_sessions,
            api_key,
            query,
            tags=tag_list,
            status=status_filter,
            limit=limit,
            api_url=_get_api_url(),
        )
    except Exception as e:
        return f"Search failed: {e}"

    if not results:
        return f'No sessions found matching "{query}".'

    lines = []
    for s in results:
        tags_str = f" [{', '.join(s.get('tags', []))}]" if s.get('tags') else ""
        status_str = " (LIVE)" if s.get('status') == 'live' else ""
        lines.append(
            f"- {s['title']}{tags_str}{status_str}\n"
            f"  ID: {s['id']} | by {s.get('username', 'unknown')} | {s.get('upvotes', 0)} upvotes"
        )

    return f"Found {len(results)} session(s):\n\n" + "\n\n".join(lines)


@mcp.tool()
async def shout_read_session(session_id: str) -> str:
    """Read the plain-text transcript of a terminal broadcast session.

    Args:
        session_id: The session ID to read.
    """
    api_key = _get_api_key()
    if not api_key:
        return "Error: SHOUT_API_KEY environment variable is not set."

    try:
        content = await asyncio.to_thread(
            ShoutSession.get_session_content,
            api_key,
            session_id,
            api_url=_get_api_url(),
        )
    except Exception as e:
        return f"Failed to read session: {e}"

    session = content.get("session", {})
    transcript = content.get("transcript", "")

    tags_str = f"Tags: {', '.join(session.get('tags', []))}\n" if session.get('tags') else ""
    header = (
        f"Title: {session.get('title', 'Unknown')}\n"
        f"By: {session.get('username', 'Unknown')}\n"
        f"Status: {session.get('status', 'unknown')}\n"
        f"{tags_str}"
        f"Upvotes: {session.get('upvotes', 0)}\n"
    )

    # Truncate transcript if too long
    max_len = 8000
    if len(transcript) > max_len:
        transcript = transcript[:max_len] + "\n\n... [transcript truncated]"

    return f"{header}\n--- Transcript ---\n\n{transcript or '(empty)'}"


def main():
    """Entry point for the shout-mcp command."""
    mcp.run()


if __name__ == "__main__":
    main()
