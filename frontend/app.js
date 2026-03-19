const { useState, useEffect, useMemo, useRef } = React;

const API_BASE = "http://127.0.0.1:8000";

// --- SVG Icons Map ---
const Icons = {
  Home: () => <svg className="svg-icon" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>,
  Layout: () => <svg className="svg-icon" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>,
  Cpu: () => <svg className="svg-icon" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg>,
  Terminal: () => <svg className="svg-icon" viewBox="0 0 24 24"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>,
  Zap: () => <svg className="svg-icon" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>,
  Alert: () => <svg className="svg-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>,
  Pulse: () => <svg className="svg-icon" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>,
  User: () => <svg className="svg-icon" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>,
  Check: () => <svg className="svg-icon" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>,
  Refresh: () => <svg className="svg-icon" viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"></polyline><polyline points="23 20 23 14 17 14"></polyline><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 0 1 3.51 15"></path></svg>,
  Points: () => <svg className="svg-icon" viewBox="0 0 24 24" style={{width: '12px', height: '12px'}}><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
};

function App() {
  const [activeNav, setActiveNav] = useState("overview");
  const [selectedTask, setSelectedTask] = useState(null);
  const [meetingText, setMeetingText] = useState("");
  const [workflow, setWorkflow] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [runStats, setRunStats] = useState({ total: 0, lastRun: null });

  // Chatbot State
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([{ role: "assistant", content: "Hi! I'm the AutoFlow AI Assistant. I monitor all enterprise workflows. How can I help you today?" }]);
  const [chatInput, setChatInput] = useState("");
  const messagesEndRef = useRef(null);

  const getInitials = (name) => name ? name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase() : '?';
  
  const getAvatarColor = (name) => {
     if(!name) return '#475569';
     const colors = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6', '#ef4444', '#3b82f6'];
     let sum = 0; for(let i=0;i<name.length;i++) sum += name.charCodeAt(i);
     return colors[sum % colors.length];
  };

  const getTrafficLight = (deadline) => {
    if (!deadline) return 'gray';
    const hours = (new Date(deadline) - new Date()) / (1000 * 60 * 60);
    if (hours < 24) return 'red';
    if (hours < 72) return 'yellow';
    return 'green';
  };

  async function fetchWorkflow() {
    try {
      const res = await fetch(`${API_BASE}/workflow`);
      if (!res.ok) return;
      const data = await res.json();
      setWorkflow(data);
    } catch (e) { }
  }

  async function fetchLogs() {
    try {
      const res = await fetch(`${API_BASE}/logs`);
      if (!res.ok) return;
      const data = await res.json();
      setLogs(data.reverse());
    } catch (e) { }
  }

  async function handleProcessMeeting() {
    if (!meetingText.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/process-meeting`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: meetingText }),
      });
      if (!res.ok) throw new Error("Failed to process meeting");
      const data = await res.json();
      setWorkflow(data);
      setRunStats(s => ({ total: s.total + 1, lastRun: "just now" }));
      await fetchLogs();
    } catch (e) {
      setError(e.message || "Failed to contact API.");
    } finally {
      setLoading(false);
    }
  }

  const handleSimulateDelay = async () => {
    if (!workflow || workflow.tasks.length === 0) return;
    setLoading(true);
    try {
       await fetch(`${API_BASE}/simulate-delay`, { method: "POST" });
       await fetchWorkflow();
       await fetchLogs();
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const handleInjectException = async () => {
    if (!workflow || workflow.tasks.length === 0) return;
    setLoading(true);
    try {
       await fetch(`${API_BASE}/inject-exception`, { method: "POST" });
       await fetchWorkflow();
       await fetchLogs();
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  async function handleReset() {
    setLoading(true);
    try {
      await fetch(`${API_BASE}/reset`, { method: "POST" });
      setWorkflow(null);
      setMeetingText("");
      setLogs([]);
      setSelectedTask(null);
      await fetchLogs();
    } catch (e) { } finally { setLoading(false); }
  }

  async function handleUpdateTaskStatus(newStatus) {
    if (!selectedTask) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/update-task`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: selectedTask.id, status: newStatus })
      });
      if (res.ok) {
        const data = await res.json();
        setWorkflow(data);
        setSelectedTask(data.tasks.find(t => t.id === selectedTask.id));
        await fetchLogs();
      }
    } catch (e) { } finally { setLoading(false); }
  }

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    const newMsg = { role: "user", content: chatInput };
    const updatedMessages = [...chatMessages, newMsg];
    setChatMessages(updatedMessages);
    setChatInput("");
    
    // Temporary loading bubble
    setChatMessages([...updatedMessages, { role: "assistant", content: "..." }]);
    
    try {
      const resp = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
           messages: updatedMessages
             .filter((m, i) => !(i === 0 && m.role === "assistant"))
             .map(m => ({role: m.role, content: m.content})) 
        })
      });
      const data = await resp.json();
      setChatMessages([...updatedMessages, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setChatMessages([...updatedMessages, { role: "assistant", content: "Connection error. Unable to reach Groq LLM." }]);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatOpen]);

  useEffect(() => {
    fetchWorkflow();
    fetchLogs();
    const interval = setInterval(() => { fetchWorkflow(); fetchLogs(); }, 2000); 
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (document.activeElement.tagName === 'TEXTAREA') return;
      if (e.key.toLowerCase() === 'g') handleProcessMeeting();
      if (e.key === 'r' || e.key === 'R') { handleReset(); }
      if (e.key === 'c' || e.key === 'C') { if (!loading && workflow && workflow.tasks.length > 0) handleInjectException(); }
      if (e.key === '1') { setActiveNav('overview'); document.getElementById('overview')?.scrollIntoView({ behavior: 'smooth' }); }
      if (e.key === '2') { setActiveNav('workflow'); document.getElementById('workflow')?.scrollIntoView({ behavior: 'smooth' }); }
      if (e.key === '3') { setActiveNav('engine'); document.getElementById('engine')?.scrollIntoView({ behavior: 'smooth' }); }
      if (e.key === '4') { setActiveNav('logs'); document.getElementById('logs')?.scrollIntoView({ behavior: 'smooth' }); }
      if (e.key === '5') { setActiveNav('history'); setSelectedTask(null); }
      if (e.key === '6') { setActiveNav('chart'); setSelectedTask(null); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [meetingText]);

  const aiActions = logs.filter(l => l.agent === "decision_agent" || l.agent === "action_agent" || l.agent === "monitoring_agent");

  const getHealthStatus = () => workflow?.status || 'healthy';
  const getHealthClass = (status) => {
    if (status === 'risk') return 'health-status-yellow';
    if (status === 'critical') return 'health-status-red';
    return 'health-status-green';
  };

  const setScenario = (type) => {
    if (type === 'sales') setMeetingText("- Prepare Q2 sales deck (Alice)\n- Pull CRM pipeline report (Bob)\n- Align with finance on targets (Carol)");
    if (type === 'sprint') setMeetingText("- Deploy new login flow (Dave)\n- Update API documentation (Eve)\n- Fix latency bugs (Frank)");
    if (type === 'ops') setMeetingText("- Audit quarterly spending (Grace)\n- Onboard new engineering hires (Heidi)");
    if (type === 'procurement') setMeetingText("- Request formal vendor MSA from Legal (Anna)\n- Negotiate enterprise software bulk discount ASAP (Mike)\n- Review Q4 hardware budget allocation completely\n- URGENT: Sign final MSA contract by EOD (Sarah)");
  };

  const getCols = () => {
     let todo = [], inprog = [], review = [], done = [];
     if(workflow?.tasks) {
        workflow.tasks.forEach(t => {
           if(t.status === 'pending' || t.status === 'delayed') todo.push(t);
           else if(t.status === 'in_progress') inprog.push(t);
           else if(t.status === 'blocked') review.push(t);
           else if(t.status === 'done') done.push(t);
        });
     }
     return { todo, inprog, review, done };
  };
  const board = getCols();

  const renderSparkline = (data) => {
    if(!data || data.length < 2) return null;
    const max = Math.max(...data, 10);
    const w = 60, h = 24;
    const pts = data.map((d, i) => `${(i / (data.length-1)) * w},${h - (d / max) * h}`).join(" ");
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.125rem', opacity: 0.8 }}>
         <svg width={w} height={h} style={{overflow: 'visible'}}>
           <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
         </svg>
         <span style={{fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing:'0.05em'}}>Velocity</span>
      </div>
    );
  };

  const renderTaskCard = (t) => {
    const light = getTrafficLight(t.deadline);
    return (
      <div key={t.id} className={`kanban-card status-${t.status} ${selectedTask?.id === t.id ? 'selected' : ''}`} onClick={() => setSelectedTask(t)}>
        <div className="kb-card-header">
           <span className="kb-issue-type">{t.issue_type || "Task"}</span>
           {t.epic && <span className="kb-epic-badge">{t.epic}</span>}
        </div>
        <div className="kb-card-title">{t.title}</div>
        
        {t.labels && t.labels.length > 0 && (
          <div className="kb-labels">
            {t.labels.slice(0, 3).map((l, i) => <span key={i} className="kb-label-pill">{l}</span>)}
          </div>
        )}
        
        <div className="kb-card-footer">
          <div className="kb-card-meta">
            <span className="kb-story-points" title="Story Points"><Icons.Points /> {t.story_points || 1}</span>
            <span className={`kb-traffic-light light-${light}`} title={`Deadline indicator`}></span>
          </div>
          <div className="kb-avatar-group">
            {t.watchers && t.watchers.map((w, i) => (
              <div key={i} className="kb-avatar watcher-avatar" style={{backgroundColor: getAvatarColor(w)}} title={`Watcher: ${w}`}>
                 {getInitials(w)}
              </div>
            ))}
            <div className="kb-avatar owner-avatar" style={{backgroundColor: getAvatarColor(t.owner)}} title={`Owner: ${t.owner || 'Unassigned'}`}>
               {getInitials(t.owner)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <Icons.Zap /> AutoFlow AI
          <span className={`health-dot ${getHealthStatus()}`} title={`System: ${getHealthStatus()}`}></span>
        </div>
        <nav className="sidebar-nav">
          <a href="#overview" className={`nav-item ${activeNav === 'overview' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveNav('overview'); }}>
            <div className="nav-item-inner"><Icons.Home /> Overview</div>
            <span className="shortcut-hint">1</span>
          </a>
          <a href="#workflow" className={`nav-item ${activeNav === 'workflow' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveNav('workflow'); }}>
            <div className="nav-item-inner"><Icons.Layout /> Sprint Board</div>
            <span className="shortcut-hint">2</span>
          </a>
          <a href="#engine" className={`nav-item ${activeNav === 'engine' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveNav('engine'); }}>
            <div className="nav-item-inner"><Icons.Cpu /> AI Engine</div>
            <span className="shortcut-hint">3</span>
          </a>
          <a href="#logs" className={`nav-item ${activeNav === 'logs' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveNav('logs'); }}>
            <div className="nav-item-inner"><Icons.Terminal /> Audit Logs</div>
            <span className="shortcut-hint">4</span>
          </a>
          <a href="#history" className={`nav-item ${activeNav === 'history' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveNav('history'); setSelectedTask(null); }}>
            <div className="nav-item-inner"><Icons.Terminal /> Full History</div>
            <span className="shortcut-hint">5</span>
          </a>
          <a href="#chart" className={`nav-item ${activeNav === 'chart' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveNav('chart'); setSelectedTask(null); }}>
            <div className="nav-item-inner"><Icons.Layout /> Task Matrix</div>
            <span className="shortcut-hint">6</span>
          </a>
        </nav>
      </aside>

      <main className="main-content">
        <header className="header">
          <div className="header-title-container">
            <h1>Process Orchestration</h1>
            <p>Agentic AI for Autonomous Enterprise Workflows</p>
          </div>
        </header>

        <div className="dashboard-body" id="overview">
          {activeNav === 'history' ? (
            <section className="card log-panel audit-card" style={{height: '100%', minHeight: '600px', flex:1}}>
              <div className="card-header">
                <div className="card-header-title"><Icons.Terminal /> Full Historical Audit Trace</div>
              </div>
              <div className="log-content audit-content" style={{maxHeight: 'none', overflowY: 'auto'}}>
                {logs.length > 0 ? logs.map((log, i) => {
                  const isWarning = typeof log.reasoning === 'string' && (log.reasoning.toLowerCase().includes('issue') || log.reasoning.toLowerCase().includes('delay') || log.reasoning.toLowerCase().includes('fail'));
                  return (
                    <div key={log.id} className="audit-log-item" style={{ animationDelay: `${Math.min(i * 0.02, 0.5)}s` }}>
                      <span className="audit-time">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                      <span className="audit-agent">{log.agent}:</span>
                      <span className={isWarning ? 'audit-msg warning' : 'audit-msg'}>
                        {typeof log.reasoning === 'object' ? log.reasoning.reason_for_owner || JSON.stringify(log.reasoning) : log.reasoning}
                      </span>
                    </div>
                  );
                }) : (
                  <div style={{ color: '#4b5563', textAlign: 'center', marginTop: '3rem' }}>No history recorded.</div>
                )}
              </div>
            </section>
          ) : activeNav === 'chart' ? (
             <section className="card" style={{height: '100%', minHeight: '600px', flex:1}}>
                <div className="card-header">
                  <div className="card-header-title"><Icons.Layout /> Detailed Workflow Matrix</div>
                </div>
                <div className="table-responsive">
                  <table className="task-matrix-table">
                    <thead>
                      <tr>
                        <th>Status</th>
                        <th>Epic</th>
                        <th>Task Name</th>
                        <th>Priority</th>
                        <th>Deadline</th>
                        <th>Assignee</th>
                        <th>Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workflow && workflow.tasks ? workflow.tasks.map(t => (
                        <tr key={t.id} onClick={() => setSelectedTask(t)} className="clickable-row">
                          <td><span className={`status-badge ${t.status}`}>{t.status.replace('_',' ')}</span></td>
                          <td><span className="drawer-epic-badge">{t.epic || 'TASK'}</span></td>
                          <td className="task-title-cell">{t.title}</td>
                          <td>
                             <div className="priority-cell">
                               <div className={`priority-dot ${t.priority}`}></div>
                               <span style={{textTransform:'capitalize'}}>{t.priority}</span>
                             </div>
                          </td>
                          <td className="deadline-cell">
                             {t.deadline ? new Date(t.deadline).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}) : 'No Deadline'}
                          </td>
                          <td>
                            <div className="assignee-cell">
                               <div className="kb-avatar" style={{backgroundColor: getAvatarColor(t.owner), width:'20px', height:'20px', fontSize:'0.55rem'}}>{getInitials(t.owner)}</div>
                               {t.owner || 'Unassigned'}
                            </div>
                          </td>
                          <td><div style={{display:'flex', alignItems:'center', gap:'4px'}}><Icons.Points /> {t.story_points || '-'}</div></td>
                        </tr>
                      )) : <tr><td colSpan="7" style={{textAlign:'center', padding:'2rem', color:'var(--text-muted)'}}>No workflow generated.</td></tr>}
                    </tbody>
                  </table>
                </div>
             </section>
          ) : (
            <>
              <section className="hero">
                <h2>From discussion → execution → optimization</h2>
                <div className="hero-subtitle">AI agents that plan, execute, monitor, and self-correct workflows.</div>
                {runStats.lastRun && (
                  <div className="status-ticker">
                    <span className="pulsing-dot"></span>
                    {runStats.total} workflows processed · 0 failures · last run: {runStats.lastRun}
                  </div>
                )}
              </section>

              <section className="card input-panel">
                <div className="card-header">
                  <div className="card-header-title"><Icons.Terminal /> Meeting Input</div>
                </div>
                <div className="input-panel-content">
                  <div className="scenario-chips">
                    <span className="scenario-chip" onClick={() => setScenario('sales')}>+ Sales Review</span>
                    <span className="scenario-chip" onClick={() => setScenario('sprint')}>+ Sprint Planning</span>
                    <span className="scenario-chip" onClick={() => setScenario('ops')}>+ Ops Standup</span>
                    <span className="scenario-chip" onClick={() => setScenario('procurement')}>+ Procurement Approval</span>
                  </div>
                  <div className="textarea-wrapper">
                    <textarea
                      className="input-textarea"
                      value={meetingText}
                      onChange={(e) => setMeetingText(e.target.value)}
                      placeholder="Paste your meeting notes here or click a scenario above..."
                    ></textarea>
                    <div className="textarea-counter">
                      {meetingText.length} chars / {meetingText.split(/\r\n|\r|\n/).length} lines
                    </div>
                  </div>
                  <div className="input-footer">
                    <span className="shortcut-hint" style={{ fontSize: '0.7rem' }}>Press G to generate</span>
                    <button onClick={handleProcessMeeting} disabled={loading || !meetingText.trim()} className="btn btn-primary">
                      {loading ? <><div className="loading-spinner"></div> Processing agents...</> : <><Icons.Zap /> Generate Workflow</>}
                    </button>
                  </div>
                </div>
              </section>

              {/* SPRINT KANBAN BOARD */}
              <section className="card" id="workflow" style={{backgroundColor: 'transparent', border:'none', boxShadow:'none'}}>
                <div className="card-header" style={{backgroundColor: 'var(--card-bg)', borderRadius: 'var(--radius-lg)', marginBottom: '1rem', border: '1px solid var(--border-color)'}}>
                  <div className="card-header-title">
                     <Icons.Layout /> 
                     {workflow?.sprint?.sprint_name ? workflow.sprint.sprint_name : "Active Sprint Board"}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button onClick={handleReset} className="btn" style={{ fontSize: '0.7rem', padding: '0.375rem 0.625rem', backgroundColor: '#334155', color: '#fff' }}>
                      <Icons.Refresh /> Reset
                    </button>
                    <button onClick={handleSimulateDelay} disabled={loading || !workflow || workflow.tasks.length === 0} className="btn btn-warning btn-xs" style={{ fontSize: '0.7rem', padding: '0.375rem 0.625rem' }}>
                      <Icons.Alert /> Simulate Delay <span className="shortcut-hint" style={{ background: 'transparent', borderColor: 'currentColor', marginLeft: '4px' }}>S</span>
                    </button>
                    <button onClick={handleInjectException} disabled={loading || !workflow || workflow.tasks.length === 0} className="btn btn-danger btn-xs" style={{ fontSize: '0.7rem', padding: '0.375rem 0.625rem', backgroundColor: '#e11d48', color: '#fff', border: '1px solid #be123c' }}>
                      <Icons.Alert /> Inject Chaos <span className="shortcut-hint" style={{ background: 'transparent', borderColor: 'currentColor', marginLeft: '4px' }}>C</span>
                    </button>
                  </div>
                </div>
                
                <div className="kanban-board">
                  <div className="kanban-col">
                     <div className="kanban-col-header">TODO <span className="count">{board.todo.length}</span></div>
                     {board.todo.map(renderTaskCard)}
                  </div>
                  <div className="kanban-col">
                     <div className="kanban-col-header">IN PROGRESS <span className="count">{board.inprog.length}</span></div>
                     {board.inprog.map(renderTaskCard)}
                  </div>
                  <div className="kanban-col">
                     <div className="kanban-col-header">BLOCKED <span className="count">{board.review.length}</span></div>
                     {board.review.map(renderTaskCard)}
                  </div>
                  <div className="kanban-col">
                     <div className="kanban-col-header">DONE <span className="count">{board.done.length}</span></div>
                     {board.done.map(renderTaskCard)}
                  </div>
                </div>
              </section>

              <section className="logs-grid">
                <div className="card log-panel" id="engine">
                  <div className="card-header" style={{ color: 'var(--primary)' }}>
                    <div className="card-header-title"><Icons.Cpu /> AI Decision Engine</div>
                  </div>
                  <div className="log-content">
                    {aiActions.length > 0 ? aiActions.map((log, i) => (
                      <div key={log.id} className="ai-log-item" style={{ animationDelay: `${Math.min(i * 0.1, 1)}s` }}>
                        <div className="ai-log-header">
                          <span className="ai-log-action">{log.action.replace(/_/g, " ")}</span>
                          <span className="ai-log-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <div className="ai-log-body">
                          {typeof log.reasoning === 'object' ? log.reasoning.reason_for_owner || JSON.stringify(log.reasoning) : log.reasoning}
                        </div>
                      </div>
                    )) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', marginTop: '3rem', fontSize: '0.8125rem', color: 'var(--primary)', opacity: 0.6 }}>
                        <Icons.Pulse /> API Agent Network Standby
                      </div>
                    )}
                  </div>
                </div>

                <div className="card log-panel audit-card" id="logs">
                  <div className="card-header">
                   <div className="card-header-title"><Icons.Terminal /> Autonomous Decision Log</div>
                  </div>
                  <div className="log-content audit-content">
                    {logs.length > 0 ? logs.slice(0, 20).map((log, i) => {
                      const isWarning = typeof log.reasoning === 'string' && (log.reasoning.toLowerCase().includes('issue') || log.reasoning.toLowerCase().includes('delay'));
                      const msgClass = isWarning ? 'audit-msg warning' : 'audit-msg';
                      return (
                        <div key={log.id} className="audit-log-item" style={{ animationDelay: `${Math.min(i * 0.05, 1)}s` }}>
                          <span className="audit-time">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                          <span className="audit-agent">{log.agent}:</span>
                          <span className={msgClass}>
                            {typeof log.reasoning === 'object' ? log.reasoning.reason_for_owner || JSON.stringify(log.reasoning) : log.reasoning}
                          </span>
                        </div>
                      );
                    }) : (
                      <div style={{ color: '#4b5563', textAlign: 'center', marginTop: '3rem' }}>Awaiting execution instructions...</div>
                    )}
                  </div>
                </div>
              </section>

              <section className={`card health-card ${getHealthClass(workflow?.status)}`}>
                <div className="health-info">
                  <div>
                    <div className="health-title"><Icons.Pulse /> Workflow Health Score</div>
                    <div className="health-subtext">
                      {workflow?.status === 'healthy' ? 'System operating efficiently. All agents idle.' : 
                       workflow?.status === 'risk' ? 'Warning: Task delays detected. Mitigation agents active.' : 
                       workflow?.status === 'critical' ? 'Critical: Workflow stalls requiring intervention.' : 
                       'System monitoring initializing...'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  {workflow && renderSparkline(workflow.velocity_history)}
                  <div className="health-score">
                    {workflow ? `${workflow.health_score}%` : "100%"}
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </main>

      {/* TASK SLIDE-OUT OVERLAY AND DRAWER */}
      <div className={`task-drawer-overlay ${selectedTask ? 'open' : ''}`} onClick={() => setSelectedTask(null)}></div>
      <aside className={`task-side-panel pristine-drawer ${selectedTask ? 'open' : ''}`}>
        {selectedTask && (
          <>
            <div className="panel-header">
              <div>
                <span className="drawer-epic-badge">{selectedTask.epic || 'Task'}</span>
                <h3 style={{marginTop: '0.5rem'}}>{selectedTask.title}</h3>
              </div>
              <button className="btn-close" onClick={() => setSelectedTask(null)}>✕</button>
            </div>
            
            <div className="panel-body">
              <div className="drawer-section">
                <label className="drawer-section-title">Workflow Status Override</label>
                <select value={selectedTask.status} onChange={(e) => handleUpdateTaskStatus(e.target.value)} className="drawer-status-select">
                  <option value="todo">⭘ TODO</option>
                  <option value="in_progress">▶ IN PROGRESS</option>
                  <option value="blocked">■ BLOCKED</option>
                  <option value="done">✓ DONE</option>
                  <option value="delayed">⚠️ DELAYED</option>
                </select>
              </div>

              <div className="drawer-metadata-grid">
                <div className="drawer-meta-item">
                  <span className="drawer-meta-label">Assignee</span>
                  <span className="drawer-meta-value">
                    <div className="kb-avatar" style={{backgroundColor: getAvatarColor(selectedTask.owner), width: '24px', height: '24px', fontSize: '0.65rem'}}>{getInitials(selectedTask.owner)}</div>
                    {selectedTask.owner || 'Unassigned'}
                  </span>
                </div>
                <div className="drawer-meta-item">
                  <span className="drawer-meta-label">Priority</span>
                  <span className="drawer-meta-value" style={{textTransform: 'capitalize'}}>
                    <div className={`priority-dot ${selectedTask.priority}`}></div>
                    {selectedTask.priority}
                  </span>
                </div>
                <div className="drawer-meta-item">
                  <span className="drawer-meta-label">Story Points</span>
                  <span className="drawer-meta-value"><Icons.Points /> {selectedTask.story_points || '-'}</span>
                </div>
                <div className="drawer-meta-item">
                  <span className="drawer-meta-label">AI Confidence</span>
                  <span className="drawer-meta-value">{selectedTask.confidence}%</span>
                </div>
              </div>

              <div className="drawer-section" style={{marginTop: '0.5rem'}}>
                <label className="drawer-section-title">Autonomous Exection Changelog</label>
                <div className="timeline-container">
                  {selectedTask.audit_trail && selectedTask.audit_trail.length > 0 ? (
                     selectedTask.audit_trail.map((line, i) => {
                       const matches = line.match(/^\[(.*?)\] (.*)/);
                       const timeStr = matches ? new Date(matches[1]).toLocaleString() : 'System';
                       const content = matches ? matches[2] : line;
                       return (
                         <div key={i} className="timeline-item">
                           <div className="timeline-time">{timeStr}</div>
                           <div className="timeline-content">{content}</div>
                         </div>
                       );
                     })
                  ) : (
                     <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>No history recorded.</span>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </aside>

      {/* CHATBOT WIDGET */}
      <div className={`chat-widget ${chatOpen ? 'open' : ''}`}>
        <div className="chat-header" onClick={() => setChatOpen(!chatOpen)}>
           <div className="chat-header-title"><Icons.Terminal /> AutoFlow Assistant</div>
           <button className="btn-close" onClick={(e) => { e.stopPropagation(); setChatOpen(false); }}>✕</button>
        </div>
        {chatOpen && (
          <div className="chat-body">
            <div className="chat-messages">
              {chatMessages.map((m, i) => (
                <div key={i} className={`chat-bubble ${m.role}`}>
                  {m.content}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="chat-input-area">
              <input 
                type="text" 
                value={chatInput} 
                onChange={(e) => setChatInput(e.target.value)} 
                onKeyDown={(e) => { if (e.key === 'Enter') handleSendChat(); }}
                placeholder="Ask about the workflow..."
                className="chat-input"
              />
              <button className="chat-send-btn" onClick={handleSendChat} disabled={!chatInput.trim() || chatMessages[chatMessages.length-1].content === "..."}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2z"/></svg>
              </button>
            </div>
          </div>
        )}
      </div>
      
      {!chatOpen && (
        <button className="chat-fab" onClick={() => setChatOpen(true)}>
           <Icons.Terminal />
        </button>
      )}

    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(React.createElement(App));
