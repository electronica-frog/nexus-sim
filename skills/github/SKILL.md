---
name: github
description: "GitHub API integration for reading, creating, and managing files in GitHub repositories. Use this skill whenever the user asks to interact with GitHub repos, read/commit/push files, check commits, manage branches, create issues or PRs, or anything related to GitHub operations. This includes phrases like 'leé del repo', 'commiteá esto', 'chequeá el commit', 'creá una branch', 'actualizá el board', 'leé el handoff', 'push al repo', or any mention of GitHub, repos, commits, branches, issues, or pull requests. Always use this skill when working with botardo-os or any GitHub-hosted project."
---

# GitHub API Skill

## Overview

This skill enables reading, creating, updating, and managing files in GitHub repositories via the GitHub REST API v3. It supports the full botardo-os workflow (SYNC_PROMPT cycle) and general GitHub operations.

## Authentication

The GitHub Personal Access Token (PAT) is provided by the CEO at session start. Store it as:

```
TOKEN = "ghp_xxxxx"
```

**Security**: NEVER expose the token in Discord messages or outputs. Only use it in API calls.

## Available Operations

### Read a file
```python
import urllib.request, json, base64

def leer(repo, path, token):
    url = f"https://api.github.com/repos/{repo}/contents/{path}"
    req = urllib.request.Request(url, headers={
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json"
    })
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read())
        return base64.b64decode(data["content"]).decode(), data["sha"]
```

### Create or update a file
```python
def escribir(repo, path, contenido, msg, sha, token):
    url = f"https://api.github.com/repos/{repo}/contents/{path}"
    body = json.dumps({
        "message": msg,
        "content": base64.b64encode(contenido.encode()).decode(),
        "sha": sha  # Required for updates. Omit for new files.
    }).encode()
    req = urllib.request.Request(url, data=body, headers={
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json"
    }, method="PUT")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())["commit"]["sha"]
```

### List directory contents
```python
def listar(repo, path, token):
    url = f"https://api.github.com/repos/{repo}/contents/{path}"
    req = urllib.request.Request(url, headers={
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json"
    })
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read())
        if isinstance(data, list):
            return [(item["name"], item["type"]) for item in data]
        return []
```

### List commits
```python
def commits(repo, token, per_page=10):
    url = f"https://api.github.com/repos/{repo}/commits?per_page={per_page}"
    req = urllib.request.Request(url, headers={
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json"
    })
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read())
        return [{"sha": c["sha"][:7], "msg": c["commit"]["message"], "date": c["commit"]["author"]["date"]} for c in data]
```

### Create a branch
```python
def crear_branch(repo, base_branch, new_branch, token):
    # Get SHA of base branch
    url = f"https://api.github.com/repos/{repo}/git/ref/heads/{base_branch}"
    req = urllib.request.Request(url, headers={
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json"
    })
    with urllib.request.urlopen(req) as resp:
        sha = json.loads(resp.read())["object"]["sha"]

    # Create new branch
    url = f"https://api.github.com/repos/{repo}/git/refs"
    body = json.dumps({"ref": f"refs/heads/{new_branch}", "sha": sha}).encode()
    req = urllib.request.Request(url, data=body, headers={
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json"
    }, method="POST")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())
```

### Create an issue
```python
def crear_issue(repo, title, body, token, labels=None):
    url = f"https://api.github.com/repos/{repo}/issues"
    payload = {"title": title, "body": body}
    if labels:
        payload["labels"] = labels
    body_bytes = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=body_bytes, headers={
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json"
    }, method="POST")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())
```

## Error Handling

| HTTP Code | Meaning | Action |
|-----------|---------|--------|
| 200 | OK | Success |
| 201 | Created | File/branch created |
| 404 | Not Found | File doesn't exist — create it (omit SHA) |
| 409 | Conflict | SHA is stale — re-read the file to get fresh SHA |
| 403 | Forbidden | Check token permissions or rate limit |
| 422 | Unprocessable | Check request body format |

**Rate limiting**: GitHub allows 5,000 API calls/hour for authenticated requests. If you hit rate limits, implement exponential backoff (2s, 4s, 8s).

## Commit Message Convention

Follow botardo-os convention:
```
<tipo>: <descripción>
```
Types: `feat`, `fix`, `docs`, `sync`, `output`, `refactor`

Examples:
- `feat(electronica-3): agregar análisis de EQ`
- `sync: actualizar BOARD.md`
- `output: guía de mezcla 2026-04-10`

## Botardo OS Specific Operations

### Reading from botardo-os (READ-ONLY)
```
Repo: bautiarmanicode/botardo-os
Files: sandbox/SYNC_PROMPT.md, templates/, REGLAS_OPERATIVAS.md, DISCORD_STANDARD.md
```

### Writing to project repo
```
Repo: electronica-frog/electronica
Files: BOARD.md, MEMORY.md, .botardo/, handoff/, output/
```

### SYNC_PROMPT Cycle (5 steps)
1. **CONTEXTO**: Read BOARD.md, MEMORY.md, SYNC_STATE.md, handoff/
2. **TRABAJO**: Execute highest priority task from board
3. **OUTPUT**: Write results to output/YYYY-MM-DD_HH-mm_descripcion.md
4. **HANDOFF**: Update handoff/YYYY-MM-DD_handoff.md
5. **DISCORD**: Report only if error/decision needed/important discovery

## Notes

- Always check for existing files before creating (GET first to check 404)
- When updating files, always use the latest SHA
- Use `curl` commands as fallback if Python is not available
- For binary files, use raw base64 content without decoding
