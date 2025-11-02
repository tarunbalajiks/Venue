import asyncio
from crawl4ai import *
import requests
from bs4 import BeautifulSoup
import re
import google.generativeai as genai
import os
import json
import tqdm
import random

os.environ["GOOGLE_API_KEY"] = "AIzaSyDEg0v8IPiaj3rcANq5VpALCHaz-vADeU8"
genai.configure(api_key=os.environ["GOOGLE_API_KEY"])

def fetch_location_links():
    url = 'https://www.uoecollection.com/conferences-events/venue-hubs/old-town-campus/'
    response = requests.get(url)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, 'html.parser')
    location_link = soup.find_all('a', href=re.compile('/conferences-events/venue-hubs/old-town-campus/.*'))
    location_link = [link['href'] for link in location_link]
    location_link = list(set(location_link))
    venues_data = []
    for link in location_link:
        full_url = 'https://www.uoecollection.com/' + link
        venues_data.append(full_url)
    return venues_data

def slugify_name(s: str) -> str:
    s = re.sub(r'[^A-Za-z0-9]+', '_', s.strip())
    s = re.sub(r'_+', '_', s)
    return s.strip('_')

def infer_building_fallback(url: str) -> str:
    seg = url.rstrip('/').split('/')[-1]
    seg = seg.replace('-', ' ')
    return ' '.join(w.capitalize() for w in seg.split())

def random_walk_time():
    return f"{random.randint(5, 15)} min walk"

def guess_capacity(space_type: str):
    st = (space_type or "").lower()
    if "lecture" in st or "theatre" in st or "theater" in st:
        return "200"
    if "classroom" in st or "seminar" in st or "meeting" in st or "boardroom" in st:
        return "40"
    if "reception" in st or "concourse" in st or "hall" in st:
        return "400"
    return "50"

def guess_best_suited(space_type: str):
    st = (space_type or "").lower()
    if "lecture" in st or "theatre" in st or "theater" in st:
        return "Talks, presentations, large classes"
    if "classroom" in st or "seminar" in st:
        return "Seminars, tutorials, workshops"
    if "boardroom" in st or "meeting" in st:
        return "Meetings, small group discussions"
    if "reception" in st or "concourse" in st or "hall" in st:
        return "Receptions, exhibitions, networking"
    return "Academic events, meetings"

def ensure_defaults_for_group(g):
    if not g.get("capacity"):
        g["capacity"] = guess_capacity(g.get("space_type"))
    if not g.get("best_suited_for"):
        g["best_suited_for"] = guess_best_suited(g.get("space_type"))
    if not g.get("amenities"):
        g["amenities"] = ["Wi-Fi", "AV/Projector", "Accessibility"]
    if g.get("identifiers") is not None and not isinstance(g["identifiers"], list):
        g["identifiers"] = []
    return g

def ensure_defaults_for_single(s):
    if not s.get("capacity"):
        s["capacity"] = guess_capacity(s.get("space_type"))
    if not s.get("best_suited_for"):
        s["best_suited_for"] = guess_best_suited(s.get("space_type"))
    if not s.get("amenities"):
        s["amenities"] = ["Wi-Fi", "AV/Projector", "Accessibility"]
    return s

def explode_groups_to_instances(building_name, distance_from_main_campus, groups, singles=None):
    """
    Naming rules:
    - If a group has explicit 'identifiers' (e.g., ["LG.09","LG.06"]), use those EXACTLY as the room names.
      We'll also provide a 'canonical_name' namespaced with the building for uniqueness.
    - Else, auto-name: <Building>_<SpaceType>_<i>.
    - Singles: if 'name' is given, use it as the name; otherwise fall back to auto-name.
    """
    venues = []

    for g in groups or []:
        g = ensure_defaults_for_group(g)
        space_type = (g.get("space_type") or "Room").strip()
        capacity = g.get("capacity")
        best = g.get("best_suited_for")
        amenities = g.get("amenities") or []
        identifiers = g.get("identifiers") or []  
        count = int(g.get("count") or 0)

        base = f"{slugify_name(building_name)}_{slugify_name(space_type)}"

        if identifiers:
            for ident in identifiers:
                display_name = ident.strip()
                canonical = f"{slugify_name(building_name)}_{slugify_name(display_name)}"
                venues.append({
                    "name": display_name,                      
                    "canonical_name": canonical,               
                    "space_type": space_type,
                    "capacity": capacity,
                    "best_suited_for": best,
                    "amenities": amenities,
                    "distance_from_main_campus": distance_from_main_campus
                })
        else:

            if count <= 0:
                count = 1
            for i in range(1, count + 1):
                venues.append({
                    "name": f"{base}_{i}" if count > 1 else base,
                    "canonical_name": f"{base}_{i}" if count > 1 else base,
                    "space_type": space_type,
                    "capacity": capacity,
                    "best_suited_for": best,
                    "amenities": amenities,
                    "distance_from_main_campus": distance_from_main_campus
                })

    for s in singles or []:
        s = ensure_defaults_for_single(s)
        display_name = s.get("name") 
        space_type = (s.get("space_type") or "Room").strip()
        if display_name:
            canonical = f"{slugify_name(building_name)}_{slugify_name(display_name)}"
            name_out = display_name  
        else:
            base = f"{slugify_name(building_name)}_{slugify_name(space_type)}"
            canonical = base
            name_out = base

        venues.append({
            "name": name_out,
            "canonical_name": canonical,
            "space_type": space_type,
            "capacity": s.get("capacity"),
            "best_suited_for": s.get("best_suited_for"),
            "amenities": s.get("amenities") or [],
            "distance_from_main_campus": distance_from_main_campus
        })

    return {
        "building_name": building_name,
        "distance_from_main_campus": distance_from_main_campus,
        "venues": venues
    }

async def main(venueUrl):
    async with AsyncWebCrawler() as crawler:
        result = await crawler.arun(url=venueUrl)
        text_content = result.markdown

        building_name = None
        for line in text_content.splitlines():
            if line.startswith("# "):
                building_name = line[2:].strip()
                break
        if not building_name:
            building_name = infer_building_fallback(venueUrl)

        prompt = f"""
You are a highly precise data extraction engine.

Extract all rooms/spaces in this building. If grouped like "Lecture Theatre x3 – 200",
return a group with a 'count'. If the text lists specific room numbers/names (e.g., "LG.09", "LG.06"),
put them in 'identifiers' under that group. For individually named spaces, use 'singles'.

If a field is missing, you MAY make an educated guess:
- capacity: Lecture Theatre ~200–300, Classroom/Seminar ~20–60, Reception/Concourse ~300–600
- best_suited_for: derive from type (lectures, seminars, receptions, meetings)
- amenities: default to ["Wi-Fi","AV/Projector","Accessibility"] if absent

If distance from the main campus is not explicit, you can leave it null.

Output only valid JSON with this exact schema:
{{
  "building_name": string or null,
  "distance_from_main_campus": string or null,
  "groups": [
    {{
      "space_type": string,                 // e.g., "Lecture Theatre", "Seminar Room"
      "count": integer,                     // use when listed as "xN"; 0 or omit if using identifiers
      "identifiers": [string, ...],         // optional specific room codes/names (e.g., ["LG.09","LG.06"])
      "capacity": string or null,
      "best_suited_for": string or null,
      "amenities": [string, ...]
    }}
  ],
  "singles": [
    {{
      "name": string,                       // exact unique room name/number if given
      "space_type": string or null,
      "capacity": string or null,
      "best_suited_for": string or null,
      "amenities": [string, ...]
    }}
  ]
}}

Now extract from this text:

{text_content}
"""

        model = genai.GenerativeModel(
            model_name="gemini-2.0-flash",
            generation_config={
                "temperature": 0.2,
                "response_mime_type": "application/json"
            }
        )

        response = model.generate_content(prompt)

        try:
            raw = json.loads(response.text)
        except json.JSONDecodeError:
            print(f"Invalid JSON returned for {venueUrl}. Raw response below:")
            print(response.text)
            raw = {
                "building_name": building_name,
                "distance_from_main_campus": None,
                "groups": [],
                "singles": []
            }

        if not raw.get("building_name"):
            raw["building_name"] = building_name

        distance = raw.get("distance_from_main_campus") or random_walk_time()

        expanded = explode_groups_to_instances(
            building_name=raw["building_name"],
            distance_from_main_campus=distance,
            groups=raw.get("groups") or [],
            singles=raw.get("singles") or []
        )

        print(f"Extracted data for {venueUrl}:")
        print(json.dumps(expanded, indent=2, ensure_ascii=False), "\n")

        with open("edinburgh_venue_results.jsonl", "a", encoding="utf-8") as f:
            json.dump({"url": venueUrl, "data": expanded}, f, ensure_ascii=False)
            f.write("\n")

if __name__ == "__main__":
    venue_urls = fetch_location_links()
    print(f"Total venues found: {len(venue_urls)}\n")
    for venueUrl in tqdm.tqdm(venue_urls, desc="Crawling Venues"):
        print(f"Crawling URL: {venueUrl}")
        asyncio.run(main(venueUrl))
    print("Crawling completed.")


