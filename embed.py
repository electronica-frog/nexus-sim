#!/usr/bin/env python3
"""
ChromaDB Embedding Generator for NEXUS Sim v2
Uses ChromaDB's PersistentClient with all-MiniLM-L6-v2 (384-dim) for semantic embeddings.
Called from Node.js via child_process.execFileSync with JSON input/output.
"""
import sys
import json
import os

DATA_DIR = os.environ.get("CHROMA_DATA_DIR", "/home/z/my-project/.chroma-data")

def to_python(obj):
    """Convert numpy arrays to native Python types for JSON serialization."""
    if hasattr(obj, 'tolist'):
        return obj.tolist()
    if isinstance(obj, dict):
        return {k: to_python(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [to_python(i) for i in obj]
    return obj

def main():
    if len(sys.argv) > 1:
        input_data = json.loads(sys.argv[1])
    else:
        raw = sys.stdin.read().strip()
        if not raw:
            print(json.dumps({"error": "No input provided"}))
            sys.exit(1)
        input_data = json.loads(raw)

    action = input_data.get("action", "embed")

    try:
        import chromadb

        client = chromadb.PersistentClient(path=DATA_DIR)

        if action == "embed":
            texts = input_data.get("texts", [])
            if len(texts) == 0:
                print(json.dumps({"error": "No texts provided"}))
                sys.exit(1)

            # Use temp collection to generate embeddings via ChromaDB's built-in model
            temp_col = client.get_or_create_collection(
                name="nexus-embed-temp",
                metadata={"hnsw:space": "cosine"}
            )

            temp_ids = [f"temp-{i}" for i in range(len(texts))]
            temp_col.add(ids=temp_ids, documents=texts)

            result = temp_col.get(ids=temp_ids, include=["embeddings"])
            embeddings = to_python(result["embeddings"])

            temp_col.delete(ids=temp_ids)

            print(json.dumps({
                "embeddings": embeddings,
                "dimension": len(embeddings[0]) if embeddings else 0
            }))

        elif action == "add":
            collection_name = input_data.get("collection", "nexus-memories")
            ids = input_data.get("ids", [])
            documents = input_data.get("documents", [])
            metadatas = input_data.get("metadatas", None)

            if len(ids) == 0 or len(documents) == 0:
                print(json.dumps({"error": "ids and documents required"}))
                sys.exit(1)

            col = client.get_or_create_collection(
                name=collection_name,
                metadata={"hnsw:space": "cosine"}
            )

            add_kwargs = {"ids": ids, "documents": documents}
            if metadatas:
                add_kwargs["metadatas"] = metadatas

            col.add(**add_kwargs)
            print(json.dumps({"success": True, "count": col.count()}))

        elif action == "query":
            collection_name = input_data.get("collection", "nexus-memories")
            query_texts = input_data.get("query_texts", [])
            n_results = input_data.get("n_results", 10)
            where_filter = input_data.get("where", None)

            if len(query_texts) == 0:
                print(json.dumps({"error": "query_texts required"}))
                sys.exit(1)

            col = client.get_or_create_collection(
                name=collection_name,
                metadata={"hnsw:space": "cosine"}
            )

            count = col.count()
            if count == 0:
                print(json.dumps({"ids": [[]], "documents": [[]], "metadatas": [[]], "distances": [[]]}))
            else:
                query_kwargs = {
                    "query_texts": query_texts,
                    "n_results": min(n_results, count),
                    "include": ["documents", "metadatas", "distances"]
                }
                if where_filter:
                    query_kwargs["where"] = where_filter

                results = col.query(**query_kwargs)
                print(json.dumps(to_python(results)))

        elif action == "delete":
            collection_name = input_data.get("collection", "nexus-memories")
            ids = input_data.get("ids", [])

            if len(ids) == 0:
                print(json.dumps({"error": "ids required"}))
                sys.exit(1)

            col = client.get_or_create_collection(
                name=collection_name,
                metadata={"hnsw:space": "cosine"}
            )
            col.delete(ids=ids)
            print(json.dumps({"success": True}))

        elif action == "count":
            collection_name = input_data.get("collection", "nexus-memories")
            try:
                col = client.get_collection(name=collection_name)
                print(json.dumps({"count": col.count()}))
            except Exception:
                print(json.dumps({"count": 0}))

        elif action == "reset":
            collection_name = input_data.get("collection", "nexus-memories")
            try:
                client.delete_collection(name=collection_name)
            except Exception:
                pass
            print(json.dumps({"success": True}))

        elif action == "list_collections":
            cols = client.list_collections()
            info = [{"name": c.name, "count": c.count()} for c in cols]
            print(json.dumps({"collections": info}))

        else:
            print(json.dumps({"error": f"Unknown action: {action}"}))
            sys.exit(1)

    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
