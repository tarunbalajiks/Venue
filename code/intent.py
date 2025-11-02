from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage, SystemMessage
from typing import Annotated, Sequence, TypedDict, Optional, List, Literal
from langchain_core.messages import BaseMessage, SystemMessage, HumanMessage, AIMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.tools import tool
from langgraph.graph.message import add_messages
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
import json
from queryGraph import build_reasoning_path_for_query


class EventExtractionState(TypedDict):
    query: str
    organizer: Optional[str]
    event_type: Optional[str]
    attendees: Optional[int]
    requirements: List[str]
    constraints: List[str]
    raw_extraction: Optional[str]
    error: Optional[str]
    retry_count: int
    needs_enrichment: bool
    enriched_constraints: List[str]


llm = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash",
    google_api_key="AIzaSyCj_yXFirnX0ZRo6yMpd_BmM9FSFvhtgFA",
    temperature=0,
    max_tokens=1000
)


def extract_intent_node(state: EventExtractionState) -> EventExtractionState:
    query = state["query"]

    system_prompt = system_prompt = """You are an expert event coordinator specializing in matching events to appropriate venues.

Your task is to analyze an event booking query and extract ONLY information relevant to the **venue side**.

Return JSON in this exact format:
{
  "organizer": "string",
  "event_type": "string",
  "attendees": number,
  "requirements": ["..."],   // only venue-related requirements
  "constraints": ["..."]     // conditions that affect venue suitability
}

Clarifications:
- Focus **only** on what the *venue must provide* or *accommodate* — not what the organizer brings.
- Exclude non-venue requirements such as snacks, judges, prizes, or staff.
- Include elements like:
  - space type (stage, hall, classroom, gym, outdoor area)
  - equipment/facilities (lighting, power, Wi-Fi, seating, mats, projectors, sound system)
  - environment (quiet, ventilation, acoustics, weather protection)
  - safety, accessibility, and comfort.
  - ENSURE THAT THE REQUIREMENTS ARE LOWERCASED AND BELONG TO THE SET ('microphones', 'conference table', 'wi-fi', 'tables', 'chairs', 'power outlets', 'catering area', 'conference phone', 'goal posts', 'floodlights', 'goals', 'stage area', 'lighting', 'security', 'rotary evaporators', 'spectrophotometer', 'incubators', 'microscopes', 'autoclave', 'laminar flow hood', 'balances', 'ph meters', 'magnetic stirrers', 'stage', 'sound system', 'catering facilities', 'sprung floor', 'barres', 'easels', 'pottery wheels', 'kiln', 'ventilation system', 'starting blocks', 'lane ropes', 'shallow water', 'warm water', 'av/projector', 'accessibility', 'audio-visual facilities', 'induction loop', 'fume hoods', 'eye wash stations', 'chemical storage', 'gas taps', 'distilled water', 'large fume hood', 'projector', 'whiteboard', 'demonstration bench', 'pa system', 'chemical storage cabinets', 'fume hood', 'balance', 'nitrogen gas', 'spectrometer', 'chromatograph', 'computer workstations', 'badminton nets', 'basketball hoops', 'volleyball nets', 'scoreboard', 'changing rooms', 'mats', 'mirrors', 'training equipment', 'first aid kit', 'showers', 'lockers', 'toilets', 'benches', 'desks', 'podium, 'air conditioning', 'projector screen', 'monitor', 'seating area', 'sinks', 'safety signs', 'ventilation', 'lifeguard chair', 'water filtration system', 'decorative plants').
  - IF THE REQUIREMENTS DO NOT BELONG TO THE ABOVE SET, ADD THE MOST RELEVANT ONES FROM THE SET ELSE 'NOT PRESENT'
  
Guidelines by event type:
- Tech events: power outlets, Wi-Fi, tables, seating, projectors, whiteboards, overnight access, ventilation, accessibility, safety.
- Drama rehearsals: stage, lighting, prop storage, soundproofing, acoustics, seating, accessibility, safety.
- Physical activities (e.g., Karate): open space, mats, ventilation, safety gear storage, first aid, water access.
- Lectures: seating, projector, screen, microphone, lighting, acoustics, accessibility.
- Exhibitions: display stands, lighting, open area, accessibility, weather protection, security.
- Food events: kitchen access, ventilation, hygiene, tables, accessibility, safety.
- Outdoor events: open area, weather protection, restrooms, accessibility, safety.

IF YOU ARE UNSURE ABOUT ANY FIELD, JUST GENERALIZE IT AND ADD RELEVANT AMINITIES FROM THE ABOVE SET.
Always include accessibility and safety considerations.
"""


    try:
        response = llm.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"Query: {query}")
        ])
        raw_output = response.content

        # Extract and parse JSON
        json_str = raw_output
        if "```json" in json_str:
            json_str = json_str.split("```json")[1].split("```")[0].strip()
        elif "```" in json_str:
            json_str = json_str.split("```")[1].split("```")[0].strip()

        extracted = json.loads(json_str)

        return {
            **state,
            "organizer": extracted.get("organizer"),
            "event_type": extracted.get("event_type"),
            "attendees": extracted.get("attendees"),
            "requirements": extracted.get("requirements", []),
            "constraints": extracted.get("constraints", []),
            "raw_extraction": raw_output,
            "error": None,
            "needs_enrichment": len(extracted.get("constraints", [])) < 2
        }

    except Exception as e:
        return {
            **state,
            "error": f"Extraction failed: {e}",
            "raw_extraction": response.content if 'response' in locals() else None,
            "retry_count": state.get("retry_count", 0) + 1
        }


def validate_extraction_node(state: EventExtractionState) -> EventExtractionState:
    errors = []

    if not state.get("organizer"):
        errors.append("Organizer not identified")
    if not state.get("event_type"):
        errors.append("Event type not identified")
    if not state.get("attendees") or state["attendees"] <= 0:
        errors.append("Invalid or missing attendee count")

    return {**state, "error": "; ".join(errors)} if errors else state


def enrich_constraints_node(state: EventExtractionState) -> EventExtractionState:
    event_type = state.get("event_type", "")
    attendees = state.get("attendees", 0)
    existing_constraints = state.get("constraints", [])

    prompt = f"""Given:
- Event Type: {event_type}
- Attendees: {attendees}
- Existing Constraints: {', '.join(existing_constraints) or 'None'}

Provide 3–5 additional constraints as a JSON array:
["constraint 1", "constraint 2", "constraint 3"]
"""

    try:
        response = llm.invoke([HumanMessage(content=prompt)])
        content = response.content.strip()

        # Extract JSON array
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()

        enriched = json.loads(content)
        combined = list(set(existing_constraints + enriched))

        return {
            **state,
            "enriched_constraints": enriched,
            "constraints": combined,
            "needs_enrichment": False
        }

    except Exception as e:
        return {
            **state,
            "needs_enrichment": False,
            "error": f"{state.get('error', '')} (Enrichment failed: {e})"
        }


def format_output_node(state: EventExtractionState) -> EventExtractionState:
    """Formats the final output state."""
    return state



def should_retry(state: EventExtractionState) -> Literal["extract_intent", "validate"]:
    if state.get("error") and state.get("retry_count", 0) < 2:
        return "extract_intent"
    return "validate"


def should_enrich(state: EventExtractionState) -> Literal["enrich_constraints", "format_output"]:
    if state.get("needs_enrichment", False) and not state.get("error"):
        return "enrich_constraints"
    return "format_output"



def create_advanced_extraction_graph():
    workflow = StateGraph(EventExtractionState)

    workflow.add_node("extract_intent", extract_intent_node)
    workflow.add_node("validate", validate_extraction_node)
    workflow.add_node("enrich_constraints", enrich_constraints_node)
    workflow.add_node("format_output", format_output_node)

    workflow.set_entry_point("extract_intent")

    workflow.add_conditional_edges(
        "extract_intent", should_retry,
        {"extract_intent": "extract_intent", "validate": "validate"}
    )
    workflow.add_conditional_edges(
        "validate", should_enrich,
        {"enrich_constraints": "enrich_constraints", "format_output": "format_output"}
    )

    workflow.add_edge("enrich_constraints", "format_output")
    workflow.add_edge("format_output", END)
    return workflow.compile()



def display_results(state: dict, show_enrichment: bool = True) -> None:
    divider = "=" * 60
    print(f"\n{divider}\nEVENT EXTRACTION RESULTS\n{divider}")

    if state.get("error"):
        print(f"\nERROR: {state['error']}")
        if state.get("raw_extraction"):
            print("\nRaw LLM Output:")
            print(state["raw_extraction"])
        print(f"\n{divider}\n")
        return

    print(f"\nQuery: {state.get('query', 'N/A')}")
    print(f"Organizer: {state.get('organizer', 'N/A')}")
    print(f"Event Type: {state.get('event_type', 'N/A')}")
    print(f"Attendees: {state.get('attendees', 'N/A')}")

    print("\nRequirements:")
    requirements = state.get("requirements", [])
    if requirements:
        for req in requirements:
            print(f"  - {req}")
    else:
        print("  - None specified")

    print("\nConstraints:")
    constraints = state.get("constraints", [])
    if constraints:
        for c in constraints:
            print(f"  - {c}")
    else:
        print("  - None identified")

    if show_enrichment and state.get("enriched_constraints"):
        print("\nEnriched Constraints:")
        for ec in state["enriched_constraints"]:
            print(f"  - {ec}")

    print(f"\n{divider}\n")



def extract_event_intent(query: str, use_enrichment: bool = True) -> EventExtractionState:
    """Main entry point for extracting event intent from a query."""
    graph = create_advanced_extraction_graph()
    initial_state: EventExtractionState = {
        "query": query,
        "organizer": None,
        "event_type": None,
        "attendees": None,
        "requirements": [],
        "constraints": [],
        "raw_extraction": None,
        "error": None,
        "retry_count": 0,
        "needs_enrichment": use_enrichment,
        "enriched_constraints": []
    }
    return graph.invoke(initial_state)

if __name__ == "__main__":
    print("\n🚀 ADVANCED EVENT INTENT EXTRACTION WITH ENRICHMENT\n")
    queries = [
        "Event space for 300 with stage, sound system, catering facilities.",
        "Find a lecture theatre for 200 with wi-fi.",
        "football match for 700 spectators, need changing rooms and floodlights",
        "Computer Society hosting hackathon for 200 members",
        "Karate Society hosting sparring session for 20 members",
        "Drama Society needs a space for rehearsal with 50 people, need good acoustics",
        "Chess Club tournament for 30 players, need tables and quiet environment",
        "Photography Club outdoor exhibition for 100 visitors"
    ]
    for q in queries[:1]:
        result = extract_event_intent(q, use_enrichment=True)
        display_results(result)
        # print(result['requirements'])

        # requirements = [req.lower() for req in result['requirements']]
        # attendees = result['attendees']
        # #query(requirements, attendees=200, k=5, require_all=False)
        # #query(requirements, attendees=attendees, k=5, min_coverage=0.2)
        # payload = build_reasoning_path_for_query(requirements, attendees=attendees, min_coverage=0.3, topk_for_context=5)

        # print(json.dumps(payload, indent=2))

        # with open("allPathOutput.json", "w", encoding="utf-8") as f:
        #     json.dump(payload, f, ensure_ascii=False, indent=2)

