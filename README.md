## AutoFlow AI — Agentic AI for Autonomous Enterprise Workflows

End-to-end multi-agent system designed for the ET AI Hackathon 2026. This is a **database-free, in-memory, multi-agent process orchestration engine** that takes complete ownership of a complex enterprise workflow. It leverages explicitly designed edge agents to detect SLA breaches, inject Chaos exceptions natively, auto-heal workflows, and maintain an immutable telemetry chain.

### 🏆 Hackathon Evaluation Focus & Rubric Alignment

- **Meeting intelligence systems:** The `Understanding Agent` natively parses noisy human conversation (prose or bullets) into strictly formatted Jira-compatible models (Story Points, Epics, Issue Types, Implicit dependencies).
- **Process orchestration agents:** The `Planning Agent` builds mathematical Directed Acyclic Graphs (DAGs) out of the tasks and maps critical paths instantly.
- **Multi-agent collaboration setups:** A swarm of isolated experts (`Execution`, `Monitoring`, `Decision`, `Action`, `Verification`, `Rollback`) execute cascading resolutions natively via Groq integrations.
- **Workflow health monitors:** The `Monitoring Agent` tracks SLA physics globally. Overloaded owner tracking, stalling tasks, and systemic capacity mathematically drive the Workflow Health Score index in real-time.
- **Depth of autonomy (Chaos Engineering):** True autonomy is proven through the `/inject-exception` endpoint. Triggering a severe simulated organizational roadblock causes the AI to *natively archive* the blocked task and intelligently *spawn an entirely new mitigation strategy* from scratch—proving zero human intervention.
- **Quality of Error Recovery & Auditability:** The `Rollback Agent` captures pre-mutation snapshots. If mitigation doesn't improve the total Workflow Health, it perfectly reverts to the snapshot. *Every single inference* writes to an invincible node-driven Audit Provenance graph. 

### Backend (FastAPI / Groq)

**Run:**

```bash
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

The backend exposes:
- **POST** `/process-meeting` – Meeting Intelligence input.
- **GET** `/workflow` – Access to in-memory workflow SLA physics.
- **POST** `/inject-exception` – Evaluates depth of autonomy by forcing extreme organizational blockers on tasks dynamically, testing if the swarm can build new ones natively. 
- **POST** `/simulate-delay` – Validates standard auto-reassignment protocols via simulated load delays.
- **GET** `/logs` – Immutable Provenance Audit API.

### Frontend (React + HTML5 + CSS)

No build step required. Extremely lightweight and fast rendering.

1. Open `frontend/index.html` directly in your browser, or serve `frontend/` with any static server (e.g., `python -m http.server 3000`).
2. Set `API_BASE` in `frontend/app.js` if your backend host differs.

### System Demo & Features Walkthrough
1. **Meeting Intelligence (Generative parsing):** Click the "Procurement Approval" scenario chip or paste text. Hit Generate.
2. **Process Orchestration:** Switch to the Sprint Board. The matrix was built dynamically. 
3. **Chaos Engineering & Resilience Run:** Press `C` on your keyboard or click "Inject Chaos". The Monitoring agent will detect a critical external failure, automatically archive the affected assignment, and spawn a brand-new mitigation issue directly. 
4. **Hybrid Manual Controls:** Click any Kanban card. A sleek frosted-glass drawer spawns exposing that task's precise LLM generation metrics. Try dragging its status forcing a human manual override!
5. **Real-Time Data Matrix:** Press `6` or check "Task Matrix" to pivot out of the Sprint Board and into a precise SLA-driven data table built exclusively to verify assignment depths natively.

