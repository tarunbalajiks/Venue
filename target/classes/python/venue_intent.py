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
import sys


class EventExtractionState(TypedDict):
    """Schema defining the state across extraction workflow."""
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
    google_api_key="AIzaSyCRtIOzit-vgIiE-7tvvSQAcCYoVJlO3UE",
    temperature=0.7,
    max_tokens=1000
)


def extract_intent_node(state: EventExtractionState) -> EventExtractionState:
    """Extracts structured event information from natural language query."""
    query = state["query"]

    system_prompt = """You are an expert event coordinator specializing in matching events to appropriate venues.

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

Guidelines by event type:
- Tech events: power outlets, Wi-Fi, tables, seating, projectors, whiteboards, overnight access, ventilation, accessibility, safety.
- Drama rehearsals: stage, lighting, prop storage, soundproofing, acoustics, seating, accessibility, safety.
- Physical activities (e.g., Karate): open space, mats, ventilation, safety gear storage, first aid, water access.
- Lectures: seating, projector, screen, microphone, lighting, acoustics, accessibility.
- Exhibitions: display stands, lighting, open area, accessibility, weather protection, security.
- Food events: kitchen access, ventilation, hygiene, tables, accessibility, safety.
- Outdoor events: open area, weather protection, restrooms, accessibility, safety.

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
    """Validates extracted data for completeness and correctness."""
    errors = []

    if not state.get("organizer"):
        errors.append("Organizer not identified")
    if not state.get("event_type"):
        errors.append("Event type not identified")
    if not state.get("attendees") or state["attendees"] <= 0:
        errors.append("Invalid or missing attendee count")

    return {**state, "error": "; ".join(errors)} if errors else state


def enrich_constraints_node(state: EventExtractionState) -> EventExtractionState:
    """Adds contextual enrichment to constraints."""
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
    """Determines whether to retry extraction or move to validation."""
    if state.get("error") and state.get("retry_count", 0) < 2:
        return "extract_intent"
    return "validate"


def should_enrich(state: EventExtractionState) -> Literal["enrich_constraints", "format_output"]:
    """Determines whether to trigger constraint enrichment."""
    if state.get("needs_enrichment", False) and not state.get("error"):
        return "enrich_constraints"
    return "format_output"



def create_advanced_extraction_graph():
    """Creates and compiles the LangGraph workflow."""
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
    # Command line interface for Java to call
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No query provided"}))
        sys.exit(1)
    
    query = " ".join(sys.argv[1:])
    
    try:
        result = extract_event_intent(query, use_enrichment=True)
        
        # Convert result to JSON-serializable format
        output = {
            "query": result.get("query"),
            "organizer": result.get("organizer"),
            "event_type": result.get("event_type"),
            "attendees": result.get("attendees"),
            "requirements": result.get("requirements", []),
            "constraints": result.get("constraints", []),
            "enriched_constraints": result.get("enriched_constraints", []),
            "error": result.get("error"),
            "raw_extraction": result.get("raw_extraction")
        }
        
        print(json.dumps(output, indent=2))
        
    except Exception as e:
        print(json.dumps({"error": f"Failed to extract intent: {str(e)}"}))
        sys.exit(1)

