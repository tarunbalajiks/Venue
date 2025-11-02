
"""
Import Bookings and Feedback into Neo4j (Aura) — ready to run with your credentials.

Files expected:
  - /mnt/data/booked.jsonl
  - /mnt/data/feedback_reviews.jsonl

Run:
  python /mnt/data/import_with_credentials.py
"""

from neo4j import GraphDatabase
import json, os

URI = "neo4j+s://30b84a7a.databases.neo4j.io"
USER = "neo4j"
PASSWORD = "YO9d3i-lA9EIXNwBKamz_d1lRwSsfMbxaugODbpbQ3c"

BOOKED_PATH = "./booked.jsonl"
FEEDBACK_PATH = "./feedback_reviews.jsonl"

CONSTRAINTS = [
    "CREATE CONSTRAINT venue_canonical_unique IF NOT EXISTS FOR (v:Venue) REQUIRE v.canonical_name IS UNIQUE",
    "CREATE CONSTRAINT booking_id_unique IF NOT EXISTS FOR (b:Booking) REQUIRE b.booking_id IS UNIQUE",
    "CREATE CONSTRAINT feedback_id_unique IF NOT EXISTS FOR (f:Feedback) REQUIRE f.feedback_id IS UNIQUE",
    "CREATE INDEX venue_name_index IF NOT EXISTS FOR (v:Venue) ON (v.name)"
]


# Bookings: synthesize booking_id if missing as username|date|time|canonical_name
BOOKINGS_CYPHER = """
UNWIND $rows AS row
WITH row
WITH row,
     coalesce(row.booking_id, row.username + '|' + toString(row.date) + '|' + toString(row.time) + '|' + toString(row.canonical_name)) AS computed_id
MATCH (v:Venue {canonical_name: row.canonical_name})
MERGE (b:Booking { booking_id: computed_id })
SET b.attendees = coalesce(row.attendees, b.attendees),
    b.start_time = coalesce(row.time, b.start_time),
    b.end_time   = coalesce(row.end_time, b.end_time),
    b.organizer  = coalesce(row.username, b.organizer),
    b.cost       = coalesce(row.cost, b.cost),
    b.status     = coalesce(row.status, b.status),
    b.created_at = coalesce(row.date, b.created_at),
    b.venue_canonical_name = row.canonical_name
MERGE (b)-[:FOR_VENUE]->(v);
"""

# Feedback: link to Venue via suggested_venue_canonical (fallback to canonical_name)
FEEDBACK_CYPHER = """
UNWIND $rows AS row
WITH row,
     coalesce(row.suggested_venue_canonical, row.canonical_name) AS vcanon
WITH row, vcanon WHERE vcanon IS NOT NULL
MATCH (v:Venue {canonical_name: vcanon})
MERGE (f:Feedback { feedback_id: row.feedback_id })
SET f.rating     = coalesce(row.rating, row.generated_ranked, f.rating),
    f.comment    = coalesce(row.comment, f.comment),
    f.author     = coalesce(row.author, row.username, f.author),
    f.created_at = coalesce(row.created_at, row.date, f.created_at),
    f.sentiment  = coalesce(row.sentiment, f.sentiment),
    f.tags       = coalesce(row.tags, f.tags),
    f.venue_canonical_name = vcanon
MERGE (f)-[:ABOUT]->(v);
"""

def read_jsonl(path):
    rows = []
    if not os.path.exists(path):
        return rows
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except Exception as e:
                print("Skipping bad line:", e)
    return rows

def chunked(iterable, size):
    for i in range(0, len(iterable), size):
        yield iterable[i:i+size]

def main():
    booked_rows = read_jsonl(BOOKED_PATH)
    feedback_rows = read_jsonl(FEEDBACK_PATH)

    if not booked_rows and not feedback_rows:
        print("No input rows found. Ensure the JSONL files exist at:")
        print(" -", BOOKED_PATH)
        print(" -", FEEDBACK_PATH)
        return

    driver = GraphDatabase.driver(URI, auth=(USER, PASSWORD))

    with driver.session() as session:
        # Constraints
        # Constraints
        for stmt in CONSTRAINTS:
            session.run(stmt)


        # Bookings
        if booked_rows:
            for batch in chunked(booked_rows, 1000):
                session.run(BOOKINGS_CYPHER, rows=batch)
            print(f"Upserted {len(booked_rows)} booking rows.")

        # Feedback
        if feedback_rows:
            for batch in chunked(feedback_rows, 1000):
                session.run(FEEDBACK_CYPHER, rows=batch)
            print(f"Upserted {len(feedback_rows)} feedback rows.")

    driver.close()
    print("Import complete.")

if __name__ == "__main__":
    main()
