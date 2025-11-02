
# import json

# def lower_values_only(obj):
#     if isinstance(obj, dict):
#         return {k: lower_values_only(v) for k, v in obj.items()}
#     elif isinstance(obj, list):
#         return [lower_values_only(i) for i in obj]
#     elif isinstance(obj, str):
#         return obj.lower()
#     else:
#         return obj

# file_path = r"C:\\Users\\mohit\\Hack the burg\data\\synthetic_data.jsonl"

# # Read file line by line (each line = one JSON object)
# lowered_jsons = []
# with open(file_path, "r", encoding="utf-8") as f:
#     for line in f:
#         line = line.strip()
#         if not line:
#             continue
#         obj = json.loads(line)
#         lowered_jsons.append(lower_values_only(obj))

# # Overwrite file with lowercase versions
# with open(file_path, "w", encoding="utf-8") as f:
#     for obj in lowered_jsons:
#         json.dump(obj, f, ensure_ascii=False)
#         f.write("\n")

# import csv
# file = r"C:\\Users\\mohit\\Downloads\\neo4j_query_table_data_2025-11-1.csv"

# with open(file, 'r', encoding='utf-8') as f:
#     real = lowered = []
#     reader = csv.reader(f)
#     for row in reader:
#         lowered_row = [cell.lower().split("name: ")[-1].split("})")[0] for cell in row]
#         print(lowered_row)
#         lowered.append(lowered_row[0])
# # print(real)
# print(lowered[1:])

import json

input_file = r"C:\\Users\\mohit\\Hack the burg\data\\synthetic_data.jsonl"
output_file =  r"C:\\Users\\mohit\\Hack the burg\data\\final_synthetic_data.jsonl"

updated_entries = []
with open(input_file, "r", encoding="utf-8") as f:
    for line in f:
        entry = json.loads(line)
        data = entry.get("data", {})
        for venue in data.get("venues", []):
            space_type = venue.get("space_type", "").lower()
            amenities = set(venue.get("amenities", []))  

            if "lecture theatre" in space_type or "conference" in space_type:
                amenities.update([
                    "chairs", "desks", "microphones", "projector screen",
                    "lighting", "podium", "air conditioning"
                ])


            elif "seminar" in space_type:
                amenities.update(["chairs", "desks", "whiteboard", "air conditioning"])
            elif "meeting room" in space_type:
                amenities.update(["chairs", "conference phone", "monitor", "whiteboard"])
            elif "hall" in space_type:
                amenities.update(["stage", "sound system", "lighting", "seating area"])
            elif "lab" in space_type:
                amenities.update(["sinks", "safety signs", "first aid kit"])
            elif "studio" in space_type:
                amenities.update(["mirrors", "sound system", "ventilation"])
            elif "pool" in space_type:
                amenities.update(["lifeguard chair", "water filtration system"])
            elif "pitch" in space_type or "sports" in space_type:
                amenities.update(["scoreboard", "first aid kit", "changing rooms"])
            elif "courtyard" in space_type or "outdoor" in space_type:
                amenities.update(["lighting", "security", "seating area"])
            elif "foyer" in space_type or "reception" in space_type:
                amenities.update(["seating area", "power outlets", "decorative plants"])

            venue["amenities"] = sorted(amenities)

        updated_entries.append(entry)

with open(output_file, "w", encoding="utf-8") as f:
    for e in updated_entries:
        json.dump(e, f, ensure_ascii=False)
        f.write("\n")

print(f"✅ Updated venues saved to {output_file}")

