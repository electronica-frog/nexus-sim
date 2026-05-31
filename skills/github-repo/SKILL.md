# Skill: github-repo

Read and write files in a GitHub repository using the GitHub Contents API v3.

## Description

This skill provides a pure-Python (urllib, zero external dependencies) client for
the GitHub REST API.  It supports reading, writing, appending, listing, and
inspecting files and directories in a remote GitHub repository.

Use this skill whenever the user wants to interact with a GitHub repo: read
config files, update documentation, append entries to a log, explore directory
structure, etc.

## Configuration

Set these environment variables before invoking (defaults shown):

| Variable       | Default               | Description                |
|----------------|-----------------------|----------------------------|
| `GITHUB_OWNER` | `bautiarmanicode`     | Repository owner           |
| `GITHUB_REPO`  | `personal-os`         | Repository name            |
| `GITHUB_TOKEN` | *(empty)*             | Personal access token      |
| `GITHUB_BRANCH`| `master`              | Target branch              |

## Functions Reference

All functions are in `scripts/github_api.py`.

### `read_file(path) → str`

Read and decode a file from the repo.

```python
from scripts.github_api import read_file
content = read_file("README.md")
print(content)
```

### `write_file(path, content, message="…") → dict`

Create or update a file.  Fetches the current SHA automatically for updates.

```python
from scripts.github_api import write_file
write_file("notes/hello.txt", "Hello world!\n", "Add hello.txt")
```

### `append_to_file(path, content, message=None) → dict`

Append text to an existing file (creates the file if it does not exist).

```python
from scripts.github_api import append_to_file
append_to_file("log.md", "- New entry\n", "Add log entry")
```

### `list_directory(path="") → list[dict]`

List contents of a directory.  Use `""` for the repo root.

```python
from scripts.github_api import list_directory
for entry in list_directory("src"):
    print(entry["name"], entry["type"])
```

### `get_file_info(path) → dict`

Get SHA, size, type, and other metadata for a file or directory.

```python
from scripts.github_api import get_file_info
info = get_file_info("src/main.py")
print(f"SHA: {info['sha']}  Size: {info['size']}")
```

## CLI Usage

The script can also be called directly from the command line:

```bash
# Read a file
python scripts/github_api.py read "path/to/file.md"

# Write (or update) a file
python scripts/github_api.py write "path/to/file.md" "Hello!" "Commit message"

# Append to a file
python scripts/github_api.py append "path/to/log.md" "- new line" "Append entry"

# List a directory
python scripts/github_api.py ls "some/directory"

# Get file metadata (JSON)
python scripts/github_api.py info "path/to/file.md"
```

## Error Handling

All functions raise `RuntimeError` with a descriptive message when the GitHub
API returns an error (e.g. 404 Not Found, 403 Forbidden).

## Constraints

- Requires a **GitHub Personal Access Token** with the `repo` scope.
- The Contents API has a **100 MB** per-file limit.
- Large binary files should use the Git Data API or Git LFS instead.
- Rate limit: 5 000 requests/hour (authenticated).
