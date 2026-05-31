#!/usr/bin/env python3
"""
GitHub Repository API Client (urllib only, no external dependencies).

Provides read, write, append, list, and file-info operations against a GitHub repo
via the GitHub Contents API v3.

Configuration:
  GITHUB_OWNER   – repository owner  (default: env GITHUB_OWNER or "bautiarmanicode")
  GITHUB_REPO    – repository name   (default: env GITHUB_REPO  or "personal-os")
  GITHUB_TOKEN   – personal access token (default: env GITHUB_TOKEN)
  GITHUB_BRANCH  – target branch    (default: env GITHUB_BRANCH or "master")
"""

import base64
import json
import os
import sys
import urllib.request
import urllib.error
import urllib.parse

# ── Configuration ────────────────────────────────────────────────────────────
GITHUB_OWNER = os.environ.get("GITHUB_OWNER", "bautiarmanicode")
GITHUB_REPO = os.environ.get("GITHUB_REPO", "personal-os")
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
GITHUB_BRANCH = os.environ.get("GITHUB_BRANCH", "master")
GITHUB_API = "https://api.github.com"


# ── Internal helpers ─────────────────────────────────────────────────────────

def _headers(content_type="application/json"):
    """Return request headers with auth and optional content-type."""
    hdrs = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "github-repo-skill/1.0",
    }
    if content_type:
        hdrs["Content-Type"] = content_type
    if GITHUB_TOKEN:
        hdrs["Authorization"] = f"Bearer {GITHUB_TOKEN}"
    return hdrs


def _api_url(*path_segments):
    """Build a fully-qualified GitHub API URL."""
    segments = ["repos", GITHUB_OWNER, GITHUB_REPO, "contents"]
    segments.extend(path_segments)
    return f"{GITHUB_API}/{'/'.join(segments)}"


def _request(method, url, body=None):
    """Low-level HTTP request helper using urllib."""
    headers = _headers()
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")

    req = urllib.request.Request(url, data=data, headers=headers, method=method)

    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8")), resp.status
    except urllib.error.HTTPError as exc:
        error_body = ""
        try:
            error_body = exc.read().decode("utf-8")
        except Exception:
            pass
        raise RuntimeError(
            f"GitHub API {exc.code} {exc.reason} – {error_body}"
        ) from exc


# ── Public API ───────────────────────────────────────────────────────────────

def get_file_info(path):
    """
    Retrieve metadata for a single file or directory.

    Parameters
    ----------
    path : str
        Path relative to the repository root (e.g. "src/main.py").

    Returns
    -------
    dict  – GitHub API response with keys like: name, path, sha, size,
            type ("file" | "dir"), download_url, encoding, content, …

    Raises
    ------
    RuntimeError  – if the API returns an error (e.g. 404 Not Found).
    """
    params = urllib.parse.urlencode({"ref": GITHUB_BRANCH})
    url = f"{_api_url(path)}?{params}"
    data, _ = _request("GET", url)
    return data


def read_file(path):
    """
    Read and decode a file's contents from the repository.

    Parameters
    ----------
    path : str
        Path relative to the repository root.

    Returns
    -------
    str  – the decoded file content.

    Raises
    ------
    RuntimeError  – if the path does not exist or is not a file.
    """
    info = get_file_info(path)

    if info.get("type") != "file":
        raise RuntimeError(f"'{path}' is not a file (type={info.get('type')})")

    encoding = info.get("encoding", "none")
    raw_content = info.get("content", "")

    if encoding == "base64":
        # GitHub may insert newline characters in the base64 payload
        raw_content = raw_content.replace("\n", "")
        return base64.b64decode(raw_content).decode("utf-8")

    # Fallback: already plain text or fetched via download_url
    if "download_url" in info and info["download_url"]:
        req = urllib.request.Request(info["download_url"], headers={"User-Agent": "github-repo-skill/1.0"})
        with urllib.request.urlopen(req) as resp:
            return resp.read().decode("utf-8")

    return raw_content


def list_directory(path=""):
    """
    List the contents of a directory in the repository.

    Parameters
    ----------
    path : str
        Directory path relative to the repository root.  Use "" for root.

    Returns
    -------
    list[dict]  – each element is a GitHub API entry with: name, path, sha,
                  size, type ("file" | "dir"), …

    Raises
    ------
    RuntimeError  – if the path does not exist or is not a directory.
    """
    info = get_file_info(path)

    # GitHub returns a list for directories and a dict for files
    if isinstance(info, dict) and info.get("type") == "dir":
        # Re-fetch without ?ref to get the directory listing
        url = _api_url(path)
        params = urllib.parse.urlencode({"ref": GITHUB_BRANCH})
        data, _ = _request("GET", f"{url}?{params}")
        return data

    if isinstance(info, list):
        return info

    raise RuntimeError(f"'{path}' is not a directory (type={info.get('type')})")


def write_file(path, content, message="Update file via github-repo skill"):
    """
    Create or update a file in the repository.

    For **updates** the current SHA is fetched automatically so the caller
    does not need to supply it.

    Parameters
    ----------
    path    : str  – file path relative to the repository root.
    content : str  – new file content (will be UTF-8 encoded).
    message : str  – commit message.

    Returns
    -------
    dict  – GitHub API response with commit info and content metadata.
    """
    body = {
        "message": message,
        "content": base64.b64encode(content.encode("utf-8")).decode("utf-8"),
        "branch": GITHUB_BRANCH,
    }

    # Try to get the current SHA (for updates); ignore 404 (new file)
    try:
        info = get_file_info(path)
        if isinstance(info, dict) and info.get("type") == "file":
            body["sha"] = info["sha"]
    except RuntimeError:
        pass  # File doesn't exist yet – that's fine

    params = urllib.parse.urlencode({"ref": GITHUB_BRANCH})
    url = f"{_api_url(path)}?{params}"
    data, _ = _request("PUT", url, body=body)
    return data


def append_to_file(path, content, message=None):
    """
    Append content to an existing file (or create it if it doesn't exist).

    Parameters
    ----------
    path    : str  – file path relative to the repository root.
    content : str  – text to append.
    message : str  – commit message (auto-generated if None).

    Returns
    -------
    dict  – GitHub API response with commit info.
    """
    if message is None:
        message = f"Append to {path} via github-repo skill"

    try:
        existing = read_file(path)
    except RuntimeError:
        existing = ""

    full_content = existing + content
    return write_file(path, full_content, message)


# ── CLI interface ────────────────────────────────────────────────────────────

def _print_json(obj):
    print(json.dumps(obj, indent=2, ensure_ascii=False))


def main():
    if len(sys.argv) < 2:
        print("Usage: github_api.py <command> [args...]")
        print()
        print("Commands:")
        print("  read <path>                          Read a file")
        print("  write <path> <content> [message]     Write/create a file")
        print("  append <path> <content> [message]    Append to a file")
        print("  ls [path]                            List a directory")
        print("  info <path>                          Get file/directory info")
        sys.exit(1)

    cmd = sys.argv[1]

    if cmd == "read":
        if len(sys.argv) < 3:
            print("Error: 'read' requires a path argument", file=sys.stderr)
            sys.exit(1)
        print(read_file(sys.argv[2]))

    elif cmd == "info":
        if len(sys.argv) < 3:
            print("Error: 'info' requires a path argument", file=sys.stderr)
            sys.exit(1)
        _print_json(get_file_info(sys.argv[2]))

    elif cmd == "ls":
        path = sys.argv[2] if len(sys.argv) > 2 else ""
        entries = list_directory(path)
        for entry in entries:
            etype = "DIR " if entry.get("type") == "dir" else "FILE"
            size = entry.get("size", 0)
            print(f"  [{etype}] {entry['name']:40s}  ({size:>8d} bytes)")

    elif cmd == "write":
        if len(sys.argv) < 4:
            print("Error: 'write' requires <path> and <content>", file=sys.stderr)
            sys.exit(1)
        path = sys.argv[2]
        content = sys.argv[3]
        msg = sys.argv[4] if len(sys.argv) > 4 else f"Update {path} via github-repo skill"
        result = write_file(path, content, msg)
        _print_json({"status": "ok", "commit_sha": result.get("commit", {}).get("sha")})

    elif cmd == "append":
        if len(sys.argv) < 4:
            print("Error: 'append' requires <path> and <content>", file=sys.stderr)
            sys.exit(1)
        path = sys.argv[2]
        content = sys.argv[3]
        msg = sys.argv[4] if len(sys.argv) > 4 else None
        result = append_to_file(path, content, msg)
        _print_json({"status": "ok", "commit_sha": result.get("commit", {}).get("sha")})

    else:
        print(f"Error: unknown command '{cmd}'", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
