import json
from neo4j import GraphDatabase
from tqdm import tqdm

uri = "neo4j+s://30b84a7a.databases.neo4j.io"
user = "neo4j"
password = "YO9d3i-lA9EIXNwBKamz_d1lRwSsfMbxaugODbpbQ3c"

driver = GraphDatabase.driver(uri, auth=(user, password))

def ingest(tx, record):
    data = record["data"]
    building_name = data["building_name"]
    building_url = record["url"]
    dist = data.get("distance_from_main_campus", "")

    tx.run("""
        MERGE (b:Building {name:$building_name})
        SET b.url=$url, b.distance_from_main_campus=$dist
    """, building_name=building_name, url=building_url, dist=dist)

    for venue in data["venues"]:
        tx.run("""
            MERGE (v:Venue {canonical_name:$canonical_name})
            SET v.name=$name, v.space_type=$space_type, 
                v.capacity=toInteger($capacity),
                v.best_suited_for=$best_suited_for,
                v.distance_from_main_campus=$distance
            WITH v
            MATCH (b:Building {name:$building_name})
            MERGE (b)-[:HAS_VENUE]->(v)
        """, canonical_name=venue["canonical_name"],
             name=venue["name"],
             space_type=venue["space_type"],
             capacity=venue.get("capacity","0"),
             best_suited_for=venue.get("best_suited_for",""),
             distance=venue.get("distance_from_main_campus",""),
             building_name=building_name)

        for amenity in venue.get("amenities", []):
            tx.run("""
                MERGE (a:Amenity {name:$amenity})
                WITH a
                MATCH (v:Venue {canonical_name:$canonical_name})
                MERGE (v)-[:HAS_AMENITY]->(a)
            """, amenity=amenity, canonical_name=venue["canonical_name"])

def load_jsonl(file):
    with open(file) as f:
        for line in f:
            yield json.loads(line.strip())

def main():
    file = r"C:\\Users\\mohit\\Hack the burg\data\\final_synthetic_data.jsonl"
    with driver.session() as session:
        for record in tqdm(load_jsonl(file)):
            session.execute_write(ingest, record)

if __name__ == "__main__":
    main()
