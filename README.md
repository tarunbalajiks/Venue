<div align="center">

# <img alt="V.E.N.U.E" src="./V.E.N.U.E Logo.svg"></a>
### *V.E.N.U.E. — Venue Evaluation & Navigation Utility Engine*

<!-- Badges -->
<p align="center">
  <a href="https://www.python.org/"><img alt="Python" src="https://img.shields.io/badge/Python-3.13-3776AB?logo=python&logoColor=white"></a>
  <a href="https://react.dev/"><img alt="React" src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black"></a>
  <a href="https://neo4j.com/"><img alt="Neo4j" src="https://img.shields.io/badge/Neo4j-AuraDB-008CC1?logo=neo4j&logoColor=white"></a>
  <a href="https://python.langgraph.com/"><img alt="LangChain" src="https://img.shields.io/badge/LangGraph-Agents-2C3E50"></a>
  <a href="#"><img alt="License" src="https://img.shields.io/badge/License-MIT-green.svg"></a>
  <a href="#"><img alt="PRs Welcome" src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg"></a>
  <a href="#"><img alt="Made with Love" src="https://img.shields.io/badge/Made%20with-❤-ff69b4"></a>
</p>

🚀 **An Agentic AI workflow built on a Neo4j Knowledge Graph for intelligent, heuristic-driven venue selection.**

</div>

---

## 📚 Table of Contents
- [Overview](#-overview)
- [Architecture](#-architecture)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [Data Model](#-data-model)
- [API](#-api)
- [Visualization](#-visualization-react)
- [Roadmap](#-roadmap)
- [Contributors](#-contributors)
- [License](#-license)

---

## 🧠 Overview

**V.E.N.U.E** is an *Agentic AI* system that autonomously reasons through venue data — capacities, amenities, accessibility, and policies — to recommend the **most optimal venue** for a given event scenario.

It combines:
- 🧩 **Neo4j Knowledge Graph** — structured venue–amenity–policy relationships  
- 🧮 **Heuristic Scoring Engine** — capacity slack, amenity coverage, and feedback optimization  
- 🤖 **Agentic Workflow (V.E.N.U.E.)** — autonomous reasoning, selection, and feedback learning  

> **V.E.N.U.E.** stands for  
> **Venue Evaluation & Navigation Utility Engine** — the intelligent core of VenueVerse that *thinks like an event planner* and *reasons like an AI scientist.*

---

## ⚙️ Architecture

```
┌──────────────────────────────┐
│        User Query (LLM)      │
│   "Find a hall for 200 ppl…" │
└──────────────┬───────────────┘
               │
               ▼
       🤖 Agentic Layer (LangGraph)
       - Parses natural language
       - Extracts parameters (capacity, requirements, constraints)
               │
               ▼
      🧠 Neo4j Knowledge Graph
      - Venues, Amenities, Policies, Remarks
      - Query: MATCH (v:Venue)-[:HAS_AMENITY]->(a:Amenity)
               │
               ▼
      ⚖️ Heuristic Scoring Engine (V.E.N.U.E.)
      - Amenity coverage
      - Capacity slack penalty
      - Policy & feedback scores
               │
               ▼
      💡 Optimal Venue Recommendation
      - Top-K ranked venues
      - Explainable reasoning path
      - React graph visualization
```

---

## ✨ Features

- **Agentic Reasoning** — autonomous agents for parsing, constraint evaluation, retrieval.  
- **Knowledge Graph (Neo4j)** — venue–amenity–policy structure for logical traversal.  
- **Heuristic Scoring** — multi-objective optimization: coverage, slack penalty (+ extensible).  
- **Explainability** — graph traversal shows how the AI reached its decision.  
- **Interactive UI** — animated reasoning traversal, node highlighting, query history.

---

## 🧰 Tech Stack

**Frontend:** React 18, TailwindCSS, `react-force-graph-2d`  
**Backend:** Python **3.13**, FastAPI  
**Graph DB:** Neo4j AuraDB  
**Agents/LLM:** Gemini 2.0 Flash 
**Orchestration:** LangGraph

---

## 🚀 Quick Start

> Requires **Python 3.13**, Node 18+, and a Neo4j AuraDB instance.

### 1) Clone
```bash
git clone https://github.com/your-org/venueverse.git
cd venueverse
```

### 2) Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate  # (Windows: .venv\Scripts\activate)
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### 3) Frontend
```bash
cd ../frontend
npm install
npm run dev
```

### 4) Neo4j: load data
```bash
cd ../scripts
python populate_graph.py
```
---

## 🗺️ Data Model

```
(:Venue {name, canonical_name, capacity, ...})
  ├─[:HAS_AMENITY]→ (:Amenity {name})
  ├─[:LOCATED_IN]→ (:Building {name})
  ├─[:COMPLIES_WITH]→ (:Policy {name, type, score?})
  └─[:HAS_REMARK]→ (:Remark {text, rating?, source?})
```

Venue ranking (simplified):
```
score = 0.65 * amenity_score
      + 0.15 * coverage
      - 0.20 * slack_penalty
```
---

## 🧠 Visualization (React)

The reasoning path is shown as:
```
Root → Capacity Filter → Coverage Filter → Scoring → Best Venue → Matched Amenities
```
Use the provided `ReasoningGraph.tsx` to highlight the traversal (orange edges + glow).

---

## 🗺️ Screenshots

<img src="./WhatsApp Image 2025-11-02 at 11.15.14 AM.jpeg"></img>
<img src="./WhatsApp Image 2025-11-02 at 11.17.18 AM.jpeg"></img>
<img src="./WhatsApp Image 2025-11-02 at 11.19.10 AM.jpeg"></img>
<img src="./WhatsApp Image 2025-11-02 at 11.20.08 AM.jpeg"></img>


---

## 🛣️ Roadmap

- Feedback-aware re‑ranking (post‑event remarks)  
- Calendar availability integration  
- Multi‑campus federation  
- RAG explanations for traceability  
- Learned heuristic weights

---

## 👥 Contributors

| Name | Role |
|------|------|
|Tarun Balaji K S | AI + Graph |
|Jaden Menezes | AI |
|Ajay Kanan | Full Stack |
|Mohit Raval | Graph |
|Atharv Salian | AWS |
|Aditya Pandey | AWS |
---

## 📜 License
MIT © 2025 VenueVerse Team

<div align="center">
  
**V.E.N.U.E**  
*“Optimizing every event, one node at a time.”*

</div>
