"""
Generate synthetic Edinburgh venues using Gemini and save to synthetic_data.jsonl

Requires:
  pip install google-generativeai

Env:
  export GOOGLE_API_KEY=...
"""

import os
import json
import random
import re
from pathlib import Path
from typing import Dict, List, Any, Set

import google.generativeai as genai

# ------------------ CONFIG ------------------
os.environ["GOOGLE_API_KEY"] = "AIzaSyDEg0v8IPiaj3rcANq5VpALCHaz-vADeU8"
genai.configure(api_key=os.environ["GOOGLE_API_KEY"])
MODEL_NAME = "gemini-2.0-flash"
OUT_PATH = Path("synthetic_data.jsonl")

# target count
NUM_BUILDINGS = 10
BATCH_SIZE = 10          # buildings per Gemini call
MAX_RETRIES = 1

# Real names to exclude (from your message)
FORBIDDEN = {
    "Gordon Aikman Lecture Theatre",
    "50 George Square",
    "McEwan Hall",
    "Reid Concert Hall",
    "Edinburgh Futures Institute",
    "40 George Square",
    "Old College and Playfair Library",
    "Appleton Tower",
}

# Optional: extra exclusion aliases that often appear
FORBIDDEN_ALIASES = {re.sub(r"[^a-z]", "", s.lower()) for s in FORBIDDEN}

# Edinburgh-ish localities/contexts to seed realism
EDIN_LOCALITIES = [
    "Bruntsfield", "Marchmont", "Newington", "Morningside", "Southside",
    "Tollcross", "Haymarket", "Leith", "Portobello", "Stockbridge",
    "King’s Buildings", "Holyrood", "Old Town", "New Town", "Meadows",
    "Pollock Halls", "Canonmills", "Fountainbridge", "Gorgie", "Inverleith",
]

# Amenity palettes (varied by space type)
BASE_CONF = ["Wi-Fi", "AV/Projector", "Accessibility"]
AUDIO_VIS = ["PA System", "Handheld Mics", "Screen", "Hybrid/Streaming Kit"]
RECEPTION = ["Catering Station", "Standing Tables", "Coat Rail"]
LAB_CORE = [
    "Fume Hood", "Lab Benches", "Chemical-Resistant Worktops", "Sinks",
    "Eye Wash Station", "Safety Shower", "Ventilated Chemical Storage",
    "Gas Supply", "Power Outlets", "Local Extract Ventilation"
]
LAB_DEMO = ["Demonstration Bench", "Overhead Camera/Visualizer", "Tiered Seating"] + AUDIO_VIS
INDOOR_SPORT = ["Sprung Floor", "Mats", "Scoreboard", "Changing Rooms", "First Aid Kit", "Water Fountains"]
OUTDOOR_SPORT = ["Floodlights", "Changing Rooms", "Equipment Storage", "Grass/Turf", "Nets", "Scoreboard"]
MARTIAL_ARTS = ["Competition Mats", "Boundary Tape", "First Aid Kit", "Spectator Area"]

# -------------- UTILS & GUESSES --------------
def slugify(s: str) -> str:
    s = re.sub(r"[^A-Za-z0-9]+", "_", s.strip())
    s = re.sub(r"_+", "_", s)
    return s.strip("_")

def canonical(building_name: str, name: str) -> str:
    return f"{slugify(building_name)}_{slugify(name)}"

def walk_time() -> str:
    return f"{random.randint(5, 15)} min walk"

def is_forbidden(name: str) -> bool:
    key = re.sub(r"[^a-z]", "", (name or "").lower())
    return key in FORBIDDEN_ALIASES

def guess_capacity(space_type: str) -> str:
    st = (space_type or "").lower()
    if any(k in st for k in ["lecture", "theatre", "theater", "concert"]):
        return random.choice(["150", "200", "250", "300"])
    if any(k in st for k in ["classroom", "seminar", "meeting", "boardroom", "studio"]):
        return random.choice(["20", "24", "30", "40", "60"])
    if any(k in st for k in ["reception", "hall", "atrium", "gallery", "plaza", "lawn", "zone", "courtyard"]):
        return random.choice(["120", "180", "250", "300", "400"])
    if any(k in st for k in ["lab", "laboratory", "chemistry"]):
        return random.choice(["24", "30", "36"])
    if any(k in st for k in ["demo", "demonstration"]):
        return random.choice(["80", "120", "180"])
    if any(k in st for k in ["dojo", "karate", "mat"]):
        return random.choice(["30", "50", "80"])
    if any(k in st for k in ["pitch", "field", "court"]):
        return random.choice(["200", "300", "500", "800"])
    return "50"

def guess_best(space_type: str) -> str:
    st = (space_type or "").lower()
    if any(k in st for k in ["lecture", "theatre", "theater", "concert"]):
        return "lectures, presentations, performances"
    if any(k in st for k in ["classroom", "seminar", "meeting", "boardroom", "studio"]):
        return "seminars, tutorials, workshops"
    if any(k in st for k in ["reception", "hall", "atrium", "gallery", "plaza", "lawn", "courtyard"]):
        return "receptions, exhibitions, networking"
    if any(k in st for k in ["lab", "laboratory", "chemistry"]):
        return "chemistry practicals, wet-lab classes"
    if any(k in st for k in ["demo", "demonstration"]):
        return "science shows, demonstrations with audience"
    if any(k in st for k in ["dojo", "karate", "mat"]):
        return "karate training and showcases"
    if any(k in st for k in ["pitch", "field", "court"]):
        return "sports training and fixtures"
    return "academic events, meetings"

def default_amenities(space_type: str) -> List[str]:
    st = (space_type or "").lower()
    # compose varied amenities sensibly
    if any(k in st for k in ["lab", "laboratory", "chemistry"]):
        return BASE_CONF + random.sample(LAB_CORE, k=5)
    if any(k in st for k in ["demo", "demonstration"]):
        return BASE_CONF + random.sample(LAB_DEMO, k=min(4, len(LAB_DEMO)))
    if any(k in st for k in ["dojo", "karate", "mat"]):
        return BASE_CONF + random.sample(MARTIAL_ARTS, k=min(3, len(MARTIAL_ARTS)))
    if any(k in st for k in ["pitch", "field", "court", "outdoor", "lawn", "plaza"]):
        return random.sample(OUTDOOR_SPORT, k=min(4, len(OUTDOOR_SPORT)))
    if any(k in st for k in ["reception", "atrium", "gallery", "hall", "foyer", "plaza", "courtyard"]):
        return BASE_CONF + random.sample(RECEPTION + AUDIO_VIS, k=3)
    if any(k in st for k in ["lecture", "theatre", "theater", "concert"]):
        return BASE_CONF + random.sample(AUDIO_VIS, k=min(3, len(AUDIO_VIS)))
    # default conference room
    return BASE_CONF

# -------------- GEMINI SETUP --------------
def setup_gemini():
    genai.configure(api_key=os.environ["GOOGLE_API_KEY"])
    return genai.GenerativeModel(
        model_name=MODEL_NAME,
        generation_config={
            "temperature": 0.9,
            "response_mime_type": "application/json"
        }
    )

PROMPT_TEMPLATE = """
You are generating synthetic venue data for Edinburgh-like university/event spaces.

Produce EXACT JSON (no comments, no markdown), as an array of {count} BUILDINGS.
Each building object MUST have:
{{
  "building_name": string,                // Unique, realistic, but NOT any of these real names: {forbidden_list}
  "url": string,                          // synthetic://... path made by you
  "distance_from_main_campus": null,      // leave null; client will randomize to 5-15 min
  "venues": [
    {{
      "name": string,                     // specific room/space name (use identifiers like "LG.09" when appropriate)
      "space_type": string,               // e.g., "Chemistry Teaching Lab", "Chemistry Demonstration Theatre", "Open Mat Area (Karate)", "Rugby Pitch", "Football Pitch (3G)", "Hockey Pitch (Water-based)", "Lecture Theatre", "Seminar Room", "Atrium Reception", "Courtyard Event Space"
      "capacity": string or null,         // can be estimated reasonably
      "best_suited_for": string or null,  // can be estimated reasonably
      "amenities": [string, ...]          // include varied, type-appropriate items (labs: fume hood...; karate: mats...; outdoor: floodlights...)
    }},
    ...
  ]
}}

Coverage requirements across the {count} buildings:
- Include multiple buildings for chemistry experiments/demos (teaching labs, demo theatres, prep rooms).
- Include indoor sports (sports hall) and martial arts (karate open mat / dojo).
- Include outdoor sports grounds (rugby, football 3G, hockey water-based), plus plazas/lawns/courtyards for large receptions.
- Include some standard conference spaces (lecture theatres, seminar/meeting rooms, atrium/foyer).
- Use realistic Edinburgh-style names (e.g., localities like {localities}) BUT DO NOT use any forbidden real names.

Rules:
- Names must be UNIQUE across the array.
- Do NOT include any forbidden real building names or obvious variants.
- Prefer giving 4–10 venues per building with diverse space types.
- Output ONLY valid JSON (an array). No trailing commas; no prose.
"""

def build_prompt(batch_size: int) -> str:
    return PROMPT_TEMPLATE.format(
        count=batch_size,
        forbidden_list=", ".join(sorted(FORBIDDEN)),
        localities=", ".join(EDIN_LOCALITIES)
    )

# -------------- VALIDATION & ENRICHMENT --------------
def ensure_and_enrich_building(b: Dict[str, Any], used_building_names: Set[str]) -> Dict[str, Any]:
    # Skip forbidden building names and duplicates by mutating the name a bit if needed
    name = b.get("building_name", "").strip()
    if not name or is_forbidden(name) or name in used_building_names:
        # Try to mutate slightly
        base = name or f"Venue Hub {random.choice(EDIN_LOCALITIES)}"
        for i in range(1, 1000):
            cand = f"{base} {i}"
            if not is_forbidden(cand) and cand not in used_building_names:
                name = cand
                break
    used_building_names.add(name)

    url = b.get("url") or f"synthetic://{slugify(random.choice(EDIN_LOCALITIES))}/{slugify(name)}"
    distance = b.get("distance_from_main_campus") or walk_time()  # enforce 5–15 min

    venues_in = b.get("venues") or []
    venues_out = []
    for v in venues_in:
        v_name = (v.get("name") or "Room").strip()
        space_type = v.get("space_type") or "Room"
        capacity = v.get("capacity") or guess_capacity(space_type)
        best = v.get("best_suited_for") or guess_best(space_type)
        amenities = v.get("amenities") or default_amenities(space_type)

        venues_out.append({
            "name": v_name,
            "canonical_name": canonical(name, v_name),
            "space_type": space_type,
            "capacity": str(capacity),
            "best_suited_for": best,
            "amenities": amenities,
            "distance_from_main_campus": distance
        })

    return {
        "url": url,
        "data": {
            "building_name": name,
            "distance_from_main_campus": distance,
            "venues": venues_out
        }
    }

def fetch_batch(model, batch_size: int) -> List[Dict[str, Any]]:
    prompt = build_prompt(batch_size)
    for attempt in range(1, MAX_RETRIES + 1):
        resp = model.generate_content(prompt)
        try:
            arr = json.loads(resp.text)
            if isinstance(arr, list):
                return arr
        except Exception:
            pass
    # Fallback minimal structure if LLM fails repeatedly
    fallback = [{
        "building_name": f"Synthetic Venue Hub {i}",
        "url": f"synthetic://fallback/hub_{i}",
        "distance_from_main_campus": None,
        "venues": [
            {"name": "Lecture Theatre 1", "space_type": "Lecture Theatre", "capacity": None, "best_suited_for": None, "amenities": []},
            {"name": "Chemistry Demo LG.01", "space_type": "Chemistry Demonstration Theatre", "capacity": None, "best_suited_for": None, "amenities": []},
            {"name": "Open Mat Dojo 1", "space_type": "Open Mat Area (Karate)", "capacity": None, "best_suited_for": None, "amenities": []},
            {"name": "Rugby Pitch 1", "space_type": "Rugby Pitch", "capacity": None, "best_suited_for": None, "amenities": []},
        ]
    } for i in range(batch_size)]
    return fallback

# -------------- MAIN --------------
def main():
    genai_model = setup_gemini()
    OUT_PATH.write_text("", encoding="utf-8")  # truncate

    buildings_needed = NUM_BUILDINGS
    used_building_names: Set[str] = set()

    with OUT_PATH.open("a", encoding="utf-8") as f:
        while buildings_needed > 0:
            take = min(BATCH_SIZE, buildings_needed)
            raw_buildings = fetch_batch(genai_model, take)

            for b in raw_buildings:
                # drop if LLM accidentally used a forbidden name
                if is_forbidden(b.get("building_name", "")):
                    continue
                enriched = ensure_and_enrich_building(b, used_building_names)
                # VERY last guard: if somehow still forbidden slipped in after mutation, skip
                if is_forbidden(enriched["data"]["building_name"]):
                    continue
                f.write(json.dumps(enriched, ensure_ascii=False) + "\n")
                buildings_needed -= 1
                if buildings_needed == 0:
                    break

    print(f"Done. Wrote {NUM_BUILDINGS} synthetic buildings to {OUT_PATH}")

if __name__ == "__main__":
    main()
