#!/usr/bin/env python3
"""ChromaDB Server for NEXUS Sim v2 — Persistent vector store with all-MiniLM-L6-v2 embeddings."""
import os

DATA_DIR = os.environ.get("CHROMA_DATA_DIR", "/home/z/my-project/.chroma-data")
HOST = os.environ.get("CHROMA_HOST", "127.0.0.1")
PORT = int(os.environ.get("CHROMA_PORT", "8000"))

os.makedirs(DATA_DIR, exist_ok=True)

from chromadb.config import Settings
from chromadb.server.fastapi import FastAPI as ChromaFastAPI

settings = Settings(
    persist_directory=DATA_DIR,
    anonymized_telemetry=False,
    allow_reset=True,
)

server = ChromaFastAPI(settings)

if __name__ == "__main__":
    import uvicorn
    print(f"[chroma] Starting on {HOST}:{PORT}, data={DATA_DIR}", flush=True)
    uvicorn.run(server.app(), host=HOST, port=PORT, log_level="warning", access_log=False)
