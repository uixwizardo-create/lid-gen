const fs = require('fs');
const path = require('path');

function rewriteAppJsx() {
  const filePath = path.join('e:', 'Anti Gravity Project', 'Lid Gen', 'frontend', 'src', 'App.jsx');
  let content = fs.readFileSync(filePath, 'utf8');

  const stateToAdd = `
  // Pinned Sessions state
  const [pinnedSessionIds, setPinnedSessionIds] = useState(() => {
    try {
      const saved = localStorage.getItem('pinnedSessions');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('pinnedSessions', JSON.stringify(pinnedSessionIds));
  }, [pinnedSessionIds]);

  const togglePinSession = (sessionId, e) => {
    if (e) e.stopPropagation();
    setPinnedSessionIds(prev => {
      if (prev.includes(sessionId)) return prev.filter(id => id !== sessionId);
      return [...prev, sessionId];
    });
  };
`;

  if (!content.includes('pinnedSessionIds')) {
    content = content.replace('  // Scraping progress states', stateToAdd + '  // Scraping progress states');
  }

  const match = content.match(/^\s*return \(\s*<div className="min-h-screen/m);
  if (!match) {
    console.log("Could not find the return statement");
    return;
  }

  const preReturn = content.substring(0, match.index);

  const newReturn = `
  return (
    <div className="min-h-screen bg-[#0b0e14] text-foreground font-sans flex relative overflow-hidden">
      {/* Column 1: Leftmost Narrow Bar */}
      <aside className="w-16 bg-[#0E0F11] border-r border-border/40 flex flex-col justify-between items-center py-4 shrink-0 z-20">
        <div className="flex flex-col gap-6 items-center">
          {/* Logo */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center shadow-[0_0_15px_rgba(255,165,0,0.4)] cursor-pointer">
            <Layers className="w-6 h-6 text-white" />
          </div>
          {/* Nav Icons */}
          <nav className="flex flex-col gap-4 mt-4">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={\`p-3 rounded-xl transition-all \${currentView === 'dashboard' ? 'bg-zinc-800/80 text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40'}\`}
              title="Dashboard"
            >
              <Compass className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentView('history')}
              className={\`p-3 rounded-xl transition-all \${currentView === 'history' ? 'bg-zinc-800/80 text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40'}\`}
              title="History"
            >
              <History className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentView('settings')}
              className={\`p-3 rounded-xl transition-all \${currentView === 'settings' ? 'bg-zinc-800/80 text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40'}\`}
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </nav>
        </div>
        {/* Bottom Profile */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative group cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-lg border-2 border-zinc-800">
              U
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-[9px] rounded-full flex items-center justify-center border border-background">
              <Star className="w-2 h-2" />
            </div>
          </div>
        </div>
      </aside>

      {/* Column 2: Middle Panel - Session Manager */}
      <aside className="w-72 bg-[#131924] border-r border-border/40 flex flex-col shrink-0 z-10 h-screen overflow-hidden">
        <div className="p-4 border-b border-border/40">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input 
              placeholder="Search chat..." 
              className="w-full bg-[#0f141f] border-zinc-800 text-sm pl-9 pr-14 py-5 rounded-xl placeholder:text-zinc-500 focus-visible:ring-1 focus-visible:ring-zinc-700 focus-visible:border-transparent transition-all"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
              <kbd className="inline-flex h-5 items-center gap-1 rounded border border-zinc-700 bg-zinc-800 px-1.5 font-mono text-[10px] font-medium text-zinc-400">
                <span className="text-xs">⌘</span>K
              </kbd>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar p-3 space-y-6">
          {/* Pinned Sessions */}
          {pinnedSessionIds.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider px-2">Pinned</h3>
              <div className="flex flex-col gap-1">
                {sessions.filter(s => pinnedSessionIds.includes(s.id)).map(session => (
                  <button 
                    key={session.id}
                    onClick={() => {
                      setSelectedSessionId(session.id);
                      setCurrentSessionId(session.id);
                      setKeyword(session.keyword || 'lead generation');
                      setLocation(session.location || 'worldwide');
                      setPage(1);
                      setCurrentView('dashboard');
                    }}
                    className={\`flex items-start gap-3 w-full text-left p-2.5 rounded-xl transition-all group \${selectedSessionId === session.id ? 'bg-zinc-800/80 text-white' : 'hover:bg-zinc-800/40 text-zinc-400'}\`}
                  >
                    <div className="mt-0.5 shrink-0">
                      <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]"></div>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="text-sm font-medium truncate">{session.keyword || 'Search'} · {session.location || 'Anywhere'}</div>
                      <div className="text-[10px] text-zinc-500 mt-1 flex items-center gap-2">
                        <span>{session.status === 'completed' ? 'Completed' : 'Running'}</span>
                        <span className="w-1 h-1 rounded-full bg-zinc-600"></span>
                        <span>{session.total_leads || 0} leads</span>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => togglePinSession(session.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-orange-400 transition-all text-orange-500"
                    >
                      <Star className="w-4 h-4 fill-current" />
                    </button>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recent Sessions */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider px-2">Recent</h3>
            <div className="flex flex-col gap-1">
              {sessions.filter(s => !pinnedSessionIds.includes(s.id)).slice(0, 10).map(session => (
                <button 
                  key={session.id}
                  onClick={() => {
                    setSelectedSessionId(session.id);
                    setCurrentSessionId(session.id);
                    setKeyword(session.keyword || 'lead generation');
                    setLocation(session.location || 'worldwide');
                    setPage(1);
                    setCurrentView('dashboard');
                  }}
                  className={\`flex items-start gap-3 w-full text-left p-2.5 rounded-xl transition-all group \${selectedSessionId === session.id ? 'bg-zinc-800/80 text-white' : 'hover:bg-zinc-800/40 text-zinc-400'}\`}
                >
                  <div className="mt-0.5 shrink-0">
                    <div className={\`w-2 h-2 rounded-full \${session.status === 'completed' ? 'bg-zinc-600' : 'bg-primary-500 shadow-[0_0_8px_rgba(59,130,246,0.6)] animate-pulse'}\`}></div>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="text-sm font-medium truncate group-hover:text-zinc-200 transition-colors">{session.keyword || 'Search'} · {session.location || 'Anywhere'}</div>
                  </div>
                  <button 
                    onClick={(e) => togglePinSession(session.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-zinc-300 transition-all"
                  >
                    <Star className="w-4 h-4" />
                  </button>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom User Card */}
        <div className="p-4 border-t border-border/40 bg-[#0E0F11]">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="text-sm font-semibold text-zinc-200">Pro Plan</div>
              <div className="text-[10px] text-zinc-500 mt-0.5">8,400 credits remaining</div>
            </div>
            <Button variant="outline" size="sm" className="h-8 text-xs border-zinc-700 hover:bg-zinc-800">
              Upgrade
            </Button>
          </div>
        </div>
      </aside>

      {/* Column 3: Main Conversational Canvas */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-background relative">
        {/* Top Bar */}
        <header className="h-16 border-b border-border/40 flex items-center justify-between px-6 shrink-0 bg-background/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-zinc-200">
              {keyword ? \`\${keyword} · \${location}\` : 'New Extraction Session'}
            </h2>
            {isScraping && (
              <Badge variant="outline" className="bg-primary-500/10 text-primary-400 border-primary-500/20 text-[10px] h-5 animate-pulse">
                Running
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-zinc-200">
              <AlertCircle className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" className="gap-2 h-8 border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800" onClick={handleExportGoogleSheets} disabled={selectedLeadIds.length === 0 || isExportingSheets}>
              {isExportingSheets ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Export
            </Button>
            <Button size="sm" className="gap-2 h-8 bg-zinc-200 text-zinc-900 hover:bg-white font-medium" onClick={() => setShowCampaignSheet(true)} disabled={selectedLeadIds.length === 0}>
              <Mail className="w-3.5 h-3.5" />
              Share
            </Button>
          </div>
        </header>

        {/* Conversation Scroll Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pb-40">
          <div className="max-w-4xl mx-auto space-y-8">
            
            {(currentSessionId || keyword) ? (
              <>
                {/* User Message Bubble */}
                <div className="flex justify-end">
                  <div className="bg-zinc-800/60 border border-zinc-700 text-zinc-200 px-5 py-3.5 rounded-2xl rounded-tr-sm max-w-lg shadow-sm">
                    <p className="text-sm">Extract {limit} {keyword} in {location}</p>
                  </div>
                </div>

                {/* Assistant Message Block */}
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-yellow-500 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(249,115,22,0.3)]">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 space-y-6">
                    <div className="text-sm text-zinc-300">
                      I'll help you extract those leads. Here's the current status of the pipeline:
                    </div>

                    {/* Pipeline Status Stepper */}
                    <div className="glass-card rounded-xl p-5 border border-zinc-800/60 bg-[#131924]/60">
                      <div className="flex justify-between relative">
                        <div className="absolute top-4 left-6 right-6 h-[2px] bg-zinc-800/80 -z-10"></div>
                        {STEPS.map((step, i) => {
                          const isActive = i === activePhaseIndex;
                          const isPast = activePhaseIndex > i || (activePhaseIndex === -1 && !isScraping && currentSessionId);
                          return (
                            <div key={i} className="flex flex-col items-center gap-3">
                              <div className={\`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 bg-[#131924]
                                \${isActive ? 'border-orange-500 text-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.4)] scale-110' : 
                                  isPast ? 'border-primary-500 text-primary-500' : 'border-zinc-700 text-zinc-600'}
                              \`}>
                                {isPast ? <Check className="w-4 h-4" /> : isActive ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="text-xs font-bold">{i+1}</span>}
                              </div>
                              <div className="text-center">
                                <div className={\`text-xs font-semibold \${isActive ? 'text-zinc-200' : isPast ? 'text-zinc-400' : 'text-zinc-600'}\`}>{step.label}</div>
                                <div className="text-[9px] text-zinc-500 mt-0.5 max-w-[80px]">{step.desc}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Leads Table Card */}
                    {leads.length > 0 && (
                      <div className="glass-card rounded-2xl border border-zinc-800/80 bg-[#131924]/80 overflow-hidden shadow-2xl">
                        <div className="px-5 py-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/30">
                          <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                            <Database className="w-4 h-4 text-primary-400" />
                            Extracted Database
                          </h3>
                          <Badge className="bg-zinc-800 text-zinc-300 hover:bg-zinc-800 border-zinc-700">{totalLeadsCount} Records</Badge>
                        </div>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="border-zinc-800/80 hover:bg-transparent">
                                <TableHead className="w-12 text-center text-zinc-500 py-3">
                                  <input 
                                    type="checkbox" 
                                    className="rounded border-zinc-700 bg-zinc-900 text-primary-500 focus:ring-primary-500/50"
                                    checked={selectedLeadIds.length === leads.length && leads.length > 0}
                                    onChange={(e) => {
                                      if (e.target.checked) setSelectedLeadIds(leads.map(l => l.id));
                                      else setSelectedLeadIds([]);
                                    }}
                                  />
                                </TableHead>
                                <TableHead className="text-xs text-zinc-500 font-semibold py-3 uppercase tracking-wider">Company</TableHead>
                                <TableHead className="text-xs text-zinc-500 font-semibold py-3 uppercase tracking-wider">Contact</TableHead>
                                <TableHead className="text-xs text-zinc-500 font-semibold py-3 uppercase tracking-wider">Rating</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {leads.map((lead) => (
                                <TableRow key={lead.id} className="border-zinc-800/60 hover:bg-zinc-800/20 transition-colors group cursor-pointer" onClick={() => setActiveLead(lead)}>
                                  <TableCell className="text-center py-3">
                                    <input 
                                      type="checkbox"
                                      className="rounded border-zinc-700 bg-zinc-900 text-primary-500 focus:ring-primary-500/50"
                                      checked={selectedLeadIds.includes(lead.id)}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        setSelectedLeadIds(prev => prev.includes(lead.id) ? prev.filter(id => id !== lead.id) : [...prev, lead.id]);
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell className="py-3">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300 uppercase shrink-0">
                                        {lead.name ? lead.name.substring(0, 2) : '?'}
                                      </div>
                                      <div className="min-w-0">
                                        <div className="text-sm font-semibold text-zinc-200 truncate group-hover:text-primary-400 transition-colors">{lead.name || 'Unknown'}</div>
                                        <div className="text-xs text-zinc-500 truncate mt-0.5">{lead.website || 'No website'}</div>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-3">
                                    <div className="space-y-1">
                                      {lead.email ? (
                                        <div className="flex items-center gap-1.5">
                                          <Mail className="w-3.5 h-3.5 text-primary-400" />
                                          <span className="text-xs text-zinc-300">{lead.email}</span>
                                          <Badge className="h-4 px-1.5 text-[9px] bg-green-500/10 text-green-400 border-green-500/20 rounded ml-1">Verified</Badge>
                                        </div>
                                      ) : (
                                        <div className="text-xs text-zinc-600 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> No email</div>
                                      )}
                                      {lead.phone && (
                                        <div className="flex items-center gap-1.5">
                                          <Phone className="w-3.5 h-3.5 text-zinc-400" />
                                          <span className="text-xs text-zinc-400">{lead.phone}</span>
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-3">
                                    {lead.rating ? (
                                      <div className="flex items-center gap-1.5">
                                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                        <span className="text-sm font-bold text-zinc-200">{lead.rating.toFixed(1)}</span>
                                        <span className="text-xs text-zinc-500">({lead.reviews})</span>
                                      </div>
                                    ) : (
                                      <span className="text-xs text-zinc-600">-</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}

                    {/* Action Suggestions */}
                    {leads.length > 0 && !isScraping && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        <button onClick={handleExportGoogleSheets} className="text-xs font-medium bg-zinc-800/80 border border-zinc-700 text-zinc-300 px-4 py-2 rounded-full hover:bg-zinc-700 hover:text-white transition-all flex items-center gap-2">
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          Export to Sheets
                        </button>
                        <button onClick={() => setShowCampaignSheet(true)} className="text-xs font-medium bg-zinc-800/80 border border-zinc-700 text-zinc-300 px-4 py-2 rounded-full hover:bg-zinc-700 hover:text-white transition-all flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5" />
                          Start Campaign
                        </button>
                        <button className="text-xs font-medium bg-zinc-800/80 border border-zinc-700 text-zinc-300 px-4 py-2 rounded-full hover:bg-zinc-700 hover:text-white transition-all flex items-center gap-2">
                          <TrendingUp className="w-3.5 h-3.5" />
                          Analyze Market
                        </button>
                      </div>
                    )}

                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center shadow-[0_0_30px_rgba(255,165,0,0.3)] animate-pulse">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold text-zinc-100 tracking-tight">What do you want to extract today?</h2>
                  <p className="text-sm text-zinc-400">Describe the businesses and location you're targeting.</p>
                </div>
                
                <div className="flex flex-wrap justify-center gap-2 max-w-lg mt-6">
                  {['Plumbers in Seattle', 'Marketing agencies in London', 'Dentists in Toronto', 'Real estate in Dubai'].map(suggestion => (
                    <button key={suggestion} onClick={() => {
                        const parts = suggestion.split(' in ');
                        setKeyword(parts[0]);
                        setLocation(parts[1]);
                        setAiPrompt(\`Extract \${parts[0]} in \${parts[1]}\`);
                      }} 
                      className="px-4 py-2 rounded-full bg-zinc-800/40 border border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Floating Command Bar */}
        <div className="absolute bottom-6 left-0 right-0 px-6 pointer-events-none flex justify-center z-20">
          <div className="w-full max-w-3xl glass-card rounded-2xl border border-zinc-700/60 p-2 shadow-2xl bg-[#0f141f]/80 backdrop-blur-xl pointer-events-auto flex items-end gap-2 transition-all relative">
            
            {/* Green flash overlay effect */}
            <div className={\`absolute inset-0 rounded-2xl bg-green-500/20 mix-blend-overlay pointer-events-none transition-opacity duration-500 \${flashInputs ? 'opacity-100' : 'opacity-0'}\`}></div>
            
            <button className="p-3 text-zinc-500 hover:text-zinc-300 transition-colors shrink-0">
              <div className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center">
                <span className="text-xs font-bold leading-none">+</span>
              </div>
            </button>
            
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  const submitAi = async () => {
                    setIsConfiguringAI(true);
                    try {
                      const res = await fetch(\`\${API_BASE}/ai/configure-scraper\`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ prompt: aiPrompt })
                      });
                      if (res.ok) {
                        const config = await res.json();
                        setKeyword(config.keyword || '');
                        setLocation(config.location || '');
                        setLimit(config.limit || 50);
                        
                        setFlashInputs(true);
                        setTimeout(() => setFlashInputs(false), 800);
                        setTimeout(() => {
                           const startBtn = document.getElementById('hidden-run-btn');
                           if(startBtn) startBtn.click();
                        }, 500);
                      }
                    } catch (e) {
                      console.error(e);
                    }
                    setIsConfiguringAI(false);
                  };
                  submitAi();
                }
              }}
              placeholder="E.g. Extract 25 software companies in Sylhet..."
              className="flex-1 bg-transparent border-none resize-none outline-none text-sm text-zinc-200 placeholder:text-zinc-500 min-h-[44px] max-h-32 py-3 custom-scrollbar"
              rows={1}
            />
            
            <div className="flex items-center gap-1 shrink-0 p-1">
              <button className="p-2 text-zinc-500 hover:text-zinc-300 transition-colors">
                <Globe className="w-5 h-5" />
              </button>
              
              {/* Hidden button to trigger scraping programmatically */}
              <button 
                id="hidden-run-btn"
                className="hidden" 
                onClick={async () => {
                  if (!keyword || !location) return;
                  if (isScraping) return;
                  setIsScraping(true);
                  setProgressLogs([]);
                  setActivePhaseIndex(0);
                  setLeads([]);
                  setCurrentSessionId(null);
                  try {
                    const res = await fetch(\`\${API_BASE}/scrape\`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ keyword, location, limit })
                    });
                    if (res.ok) {
                      const data = await res.json();
                      const sid = data.session_id;
                      setCurrentSessionId(sid);
                      setSelectedSessionId(sid);
                      
                      if (eventSourceRef.current) {
                        eventSourceRef.current.close();
                      }
                      eventSourceRef.current = new EventSource(\`\${API_BASE}/scrape/stream/\${sid}\`);
                      eventSourceRef.current.onmessage = (event) => {
                        try {
                          const msg = JSON.parse(event.data);
                          if (msg.event === 'progress') {
                            setProgressLogs(prev => [...prev, { phase: msg.phase, message: msg.message }]);
                            const phaseIdx = STEPS.findIndex(s => s.label.toLowerCase() === msg.phase.toLowerCase());
                            if (phaseIdx !== -1) setActivePhaseIndex(phaseIdx);
                          } else if (msg.event === 'complete' || msg.event === 'error') {
                            setIsScraping(false);
                            setActivePhaseIndex(STEPS.length);
                            eventSourceRef.current.close();
                            fetchSessions();
                            fetchLeads();
                          }
                        } catch (e) {
                          console.error(e);
                        }
                      };
                    } else {
                      setIsScraping(false);
                    }
                  } catch (e) {
                    console.error(e);
                    setIsScraping(false);
                  }
                }}
              ></button>

              <button 
                onClick={() => {
                  const submitAi = async () => {
                    setIsConfiguringAI(true);
                    try {
                      const res = await fetch(\`\${API_BASE}/ai/configure-scraper\`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ prompt: aiPrompt })
                      });
                      if (res.ok) {
                        const config = await res.json();
                        setKeyword(config.keyword || '');
                        setLocation(config.location || '');
                        setLimit(config.limit || 50);
                        
                        setFlashInputs(true);
                        setTimeout(() => setFlashInputs(false), 800);
                        setTimeout(() => {
                           const startBtn = document.getElementById('hidden-run-btn');
                           if(startBtn) startBtn.click();
                        }, 500);
                      }
                    } catch (e) {
                      console.error(e);
                    }
                    setIsConfiguringAI(false);
                  };
                  submitAi();
                }}
                disabled={isConfiguringAI || !aiPrompt.trim()}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-yellow-500 hover:from-orange-400 hover:to-yellow-400 flex items-center justify-center text-white shadow-[0_0_15px_rgba(255,165,0,0.4)] disabled:opacity-50 disabled:shadow-none transition-all ml-1"
              >
                {isConfiguringAI ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowLeft className="w-5 h-5 rotate-90" />}
              </button>
            </div>
          </div>
        </div>
        
        {/* Drawers / Modals */}
        <Sheet open={!!activeLead} onOpenChange={(open) => !open && setActiveLead(null)}>
          <SheetContent className="w-full sm:max-w-md h-full bg-[#131924]/95 border-l border-zinc-800 backdrop-blur-xl flex flex-col text-zinc-200 p-0" side="right">
             <div className="p-6">
                <h3 className="text-lg font-bold text-white">{activeLead?.name}</h3>
                <p className="text-zinc-400 text-sm">{activeLead?.website}</p>
                <div className="mt-6 space-y-4">
                   {activeLead?.email && <div className="p-3 bg-zinc-800/50 rounded-lg flex items-center gap-3"><Mail className="w-5 h-5 text-zinc-400"/> {activeLead.email}</div>}
                   {activeLead?.phone && <div className="p-3 bg-zinc-800/50 rounded-lg flex items-center gap-3"><Phone className="w-5 h-5 text-zinc-400"/> {activeLead.phone}</div>}
                   {activeLead?.address && <div className="p-3 bg-zinc-800/50 rounded-lg flex items-center gap-3"><MapPin className="w-5 h-5 text-zinc-400"/> {activeLead.address}</div>}
                </div>
             </div>
          </SheetContent>
        </Sheet>
      </main>
    </div>
  );
}

export default App;
`;

  fs.writeFileSync(filePath, preReturn + newReturn, 'utf8');
}

rewriteAppJsx();
