import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  MapPin, 
  Download, 
  Play, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Database, 
  TrendingUp, 
  History,
  FileSpreadsheet,
  Layers,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  Globe,
  Phone,
  Star,
  Copy,
  X,
  Mail,
  Info,
  Check,
  Compass,
  Trash2,
  ArrowLeft,
  Calendar,
  Sparkles,
  Clock,
  Pause,
  Settings,
  Building2,
  SlidersHorizontal,
  MessageCircle,
  Share2,
  Filter
} from 'lucide-react';


import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select } from '@/components/ui/select';
import { API_BASE, CONFIG_DEFAULTS, CONTACT_FIELDS } from './config';

const STEPS = [
  { label: 'Setup', desc: 'Initialize task parameters' },
  { label: 'Maps Search', desc: 'Scan Google Maps locations' },
  { label: 'Listings Parsing', desc: 'Extract listings metadata' },
  { label: 'Website Scan', desc: 'Crawl domains for email/leads' }
];

function TableRowSkeleton() {
  return (
    <tr className="border-b border-border/40">
      <td className="py-3 px-4 w-12">
        <div className="w-4 h-4 bg-zinc-800 rounded animate-pulse mx-auto" />
      </td>
      <td className="py-3 px-4">
        <div className="flex flex-col gap-1.5">
          <div className="h-3.5 w-32 bg-zinc-800 rounded animate-pulse" />
          <div className="h-2.5 w-16 bg-zinc-800/60 rounded animate-pulse" />
        </div>
      </td>
      <td className="py-3 px-3">
        <div className="h-5 w-28 bg-zinc-800 rounded-full animate-pulse" />
      </td>
      <td className="py-3 px-3">
        <div className="h-3.5 w-24 bg-zinc-800 rounded animate-pulse" />
      </td>
      <td className="py-3 px-3">
        <div className="flex flex-col items-center gap-1.5">
          <div className="h-3.5 w-10 bg-zinc-800 rounded animate-pulse" />
          <div className="flex gap-1">
            <div className="h-3 w-12 bg-zinc-800/80 rounded animate-pulse" />
          </div>
        </div>
      </td>
    </tr>
  );
}

export default function App() {
  // Scraping input states
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');
  const [limit, setLimit] = useState(CONFIG_DEFAULTS.DEFAULT_SCRAPE_LIMIT);

  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // AI Assistant states
  const [aiPrompt, setAiPrompt] = useState('');
  const [isConfiguringAI, setIsConfiguringAI] = useState(false);
  const [flashInputs, setFlashInputs] = useState(false);

  // Manual Builder states & Refs
  const [showManualBuilder, setShowManualBuilder] = useState(false);
  const [manualKeyword, setManualKeyword] = useState('');
  const [manualLocation, setManualLocation] = useState('');
  const [manualLimit, setManualLimit] = useState(CONFIG_DEFAULTS.DEFAULT_MANUAL_LIMIT);
  const [skipPreviousLeads, setSkipPreviousLeads] = useState(true);
  const [requiredFields, setRequiredFields] = useState([]); // Must-Have Fields filter
  const manualBuilderRef = useRef(null);
  const manualToggleButtonRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        manualBuilderRef.current && 
        !manualBuilderRef.current.contains(event.target) &&
        manualToggleButtonRef.current &&
        !manualToggleButtonRef.current.contains(event.target)
      ) {
        setShowManualBuilder(false);
      }
    };
    if (showManualBuilder) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showManualBuilder]);

  // Google settings states
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleClientSecret, setGoogleClientSecret] = useState('');
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isExportingSheets, setIsExportingSheets] = useState(false);
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');
  const [googleSheetsNotification, setGoogleSheetsNotification] = useState(null);
  

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
  // Scraping progress states
  const [isScraping, setIsScraping] = useState(false);
  const [progressLogs, setProgressLogs] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [activePhaseIndex, setActivePhaseIndex] = useState(-1);
  const [showLogs, setShowLogs] = useState(false);
  
  // Database lead listing states
  const [leads, setLeads] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('session') || '';
    }
    return '';
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(CONFIG_DEFAULTS.DEFAULT_TABLE_PAGE_SIZE);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLeadsCount, setTotalLeadsCount] = useState(0);
  
  // Stats overview
  const [stats, setStats] = useState({
    totalLeads: 0,
    totalSessions: 0,
    activeRuns: 0
  });

  // Drawer / Selection states
  const [activeLead, setActiveLead] = useState(null);
  const [copiedField, setCopiedField] = useState(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showMarketAnalytics, setShowMarketAnalytics] = useState(false);
  const [deepWebScan, setDeepWebScan] = useState(true);

  // Sales Pitch states
  const [productDesc, setProductDesc] = useState("SEO & Web Development services");
  const [generatingPitch, setGeneratingPitch] = useState(false);

  // SMTP Configuration states
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(CONFIG_DEFAULTS.DEFAULT_SMTP_PORT);
  const [smtpUsername, setSmtpUsername] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpSenderName, setSmtpSenderName] = useState('');
  const [smtpSenderEmail, setSmtpSenderEmail] = useState('');
  const [smtpUseTls, setSmtpUseTls] = useState(1);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [smtpNotification, setSmtpNotification] = useState(null);

  // Scraper Schedules states
  const [schedules, setSchedules] = useState([]);
  const [schedKeyword, setSchedKeyword] = useState('');
  const [schedLocation, setSchedLocation] = useState('');
  const [schedLimit, setSchedLimit] = useState(50);
  const [schedInterval, setSchedInterval] = useState('daily');

  // Leads checkbox selection states
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);
  const [showCampaignSheet, setShowCampaignSheet] = useState(false);
  const [campaignSending, setCampaignSending] = useState(false);

  // Single send email state
  const [sendingEmail, setSendingEmail] = useState(false);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);

  // Filter states
  const [filterMode, setFilterMode] = useState('server'); // 'client' or 'server'
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'email', 'website', 'rated'

  // Navigation & History view states
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' or 'history'
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('all'); // 'all', 'completed', 'failed', 'running'
  const [historyDateFilter, setHistoryDateFilter] = useState('');
  const [historyDatePreset, setHistoryDatePreset] = useState('all'); // 'all', 'today', 'yesterday', 'custom'
  const searchInputRef = useRef(null);
  const [focusedRowIndex, setFocusedRowIndex] = useState(-1);

  const getTodayLocalDateStr = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getYesterdayLocalDateStr = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const year = yesterday.getFullYear();
    const month = String(yesterday.getMonth() + 1).padStart(2, '0');
    const day = String(yesterday.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleDatePresetChange = (preset) => {
    setHistoryDatePreset(preset);
    if (preset === 'all') {
      setHistoryDateFilter('');
    } else if (preset === 'today') {
      setHistoryDateFilter(getTodayLocalDateStr());
    } else if (preset === 'yesterday') {
      setHistoryDateFilter(getYesterdayLocalDateStr());
    } else {
      setHistoryDateFilter('');
    }
  };

  const handleSelectSession = (session) => {
    if (!session) return;
    setSelectedSessionId(session.id);
    setCurrentSessionId(session.id);
    setKeyword(session.keyword || 'lead generation');
    setLocation(session.location || 'worldwide');
    setPage(1);
    setCurrentView('dashboard');

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('session', session.id);
      window.history.pushState({ session: session.id }, '', url.toString());
    }
  };

  const handleStartNewSession = () => {
    setSelectedSessionId('');
    setCurrentSessionId('');
    setKeyword('');
    setLocation('');
    setAiPrompt('');
    setLeads([]);
    setCurrentView('dashboard');
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('session');
      window.history.pushState({ session: '' }, '', url.pathname);
    }
  };

  const handleDeleteSession = async (sessionId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this historical session and all its leads? This action cannot be undone.")) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/sessions/${sessionId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchSessions();
        if (selectedSessionId === sessionId) {
          setSelectedSessionId('');
          setPage(1);
          fetchLeads();
        }
      } else {
        alert("Failed to delete session.");
      }
    } catch (err) {
      console.error('Error deleting session:', err);
    }
  };

  const logEndRef = useRef(null);
  const eventSourceRef = useRef(null);

  // Cleanup SSE connection on component unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Scroll logging useEffect relocated to L1094 to avoid early initialization error

  // Load initial historical sessions and statistics
  useEffect(() => {
    fetchSessions(true);
  }, []);

  // Synchronize browser URL query param with selectedSessionId
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const currentParams = new URLSearchParams(window.location.search);
    const currentSessionInUrl = currentParams.get('session');

    if (selectedSessionId && selectedSessionId !== currentSessionInUrl) {
      currentParams.set('session', selectedSessionId);
      const newUrl = `${window.location.pathname}?${currentParams.toString()}`;
      window.history.pushState({ session: selectedSessionId }, '', newUrl);
    } else if (!selectedSessionId && currentSessionInUrl) {
      currentParams.delete('session');
      const queryStr = currentParams.toString();
      const newUrl = queryStr ? `${window.location.pathname}?${queryStr}` : window.location.pathname;
      window.history.pushState({ session: '' }, '', newUrl);
    }
  }, [selectedSessionId]);

  // Handle browser back / forward buttons navigation (popstate)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const sessionFromUrl = params.get('session') || '';
      setSelectedSessionId(sessionFromUrl);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Update lead list whenever query filters (search, page, selected session, filter settings) change
  useEffect(() => {
    fetchLeads();
  }, [selectedSessionId, searchTerm, page, pageSize, filterMode, activeFilter]);

  // Load SMTP settings and Scraper Schedules on mount
  useEffect(() => {
    fetchSmtpSettings();
    fetchSchedules();
  }, []);

  // Fetch Google OAuth settings and check OAuth callback code on mount
  useEffect(() => {
    fetchGoogleOauthSettings();
    
    // OAuth Callback Handler
    const handleOAuthCallback = async () => {
      if (window.location.pathname === '/oauth-callback') {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        if (code) {
          try {
            const redirectUri = window.location.origin + '/oauth-callback';
            const res = await fetch(`${API_BASE}/settings/google-oauth/callback`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                code,
                redirect_uri: redirectUri
              })
            });
            if (res.ok) {
              setIsGoogleConnected(true);
              // Clear query params & reset path to home
              window.history.replaceState({}, document.title, window.location.origin + '/');
              setCurrentView('settings');
              alert("Successfully connected to Google Workspace!");
            } else {
              const err = await res.json().catch(() => ({}));
              alert(`Google connection failed: ${err.detail || 'Unknown error'}`);
            }
          } catch (e) {
            console.error("OAuth Callback Error:", e);
            alert("Error exchanging code for Google tokens.");
          }
        }
      }
    };
    handleOAuthCallback();
  }, []);

  const fetchGoogleOauthSettings = async () => {
    try {
      const res = await fetch(`${API_BASE}/settings/google-oauth`);
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setGoogleClientId(data.client_id || '');
          setGoogleClientSecret(data.client_secret || '');
          if (data.access_token) {
            setIsGoogleConnected(true);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching Google OAuth settings:', err);
    }
  };

  const handleSaveGoogleOauth = async (e) => {
    if (e) e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/settings/google-oauth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: googleClientId,
          client_secret: googleClientSecret
        })
      });
      if (res.ok) {
        alert("Google Workspace API credentials saved successfully!");
      } else {
        alert("Failed to save Google credentials.");
      }
    } catch (err) {
      console.error('Error saving Google OAuth credentials:', err);
    }
  };

  const handleConnectGoogle = async () => {
    if (!googleClientId || !googleClientSecret) {
      alert("Please provide both Client ID and Client Secret.");
      return;
    }
    // Save first to ensure the backend has the details
    try {
      const res = await fetch(`${API_BASE}/settings/google-oauth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: googleClientId,
          client_secret: googleClientSecret
        })
      });
      if (!res.ok) {
        alert("Failed to save credentials before connecting.");
        return;
      }
    } catch (err) {
      console.error('Error saving credentials before redirect:', err);
    }

    const redirectUri = window.location.origin + '/oauth-callback';
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent('https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/gmail.send')}&access_type=offline&prompt=consent`;
    window.location.href = authUrl;
  };

  const handleDownloadCSV = (targetIds = selectedLeadIds) => {
    const targetLeads = targetIds.length > 0 
      ? leads.filter(l => targetIds.includes(l.id))
      : leads;

    if (targetLeads.length === 0) {
      setGoogleSheetsNotification({
        type: 'error',
        message: 'No leads available to export.'
      });
      return;
    }

    const headers = ["ID", "Name", "Phone", "Email", "Email Status", "Website", "Rating", "Address", "Tech Stack"];
    const csvRows = [headers.join(",")];

    targetLeads.forEach(lead => {
      const row = [
        lead.id,
        `"${(lead.name || '').replace(/"/g, '""')}"`,
        `"${(lead.phone || '').replace(/"/g, '""')}"`,
        `"${(lead.email || '').replace(/"/g, '""')}"`,
        `"${(lead.email_status || 'unchecked').replace(/"/g, '""')}"`,
        `"${(lead.website || '').replace(/"/g, '""')}"`,
        lead.rating || '',
        `"${(lead.address || '').replace(/"/g, '""')}"`,
        `"${(lead.website_tech || '').replace(/"/g, '""')}"`
      ];
      csvRows.push(row.join(","));
    });

    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(csvRows.join("\n"));
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", `Lid_Gen_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setGoogleSheetsNotification({
      type: 'success',
      message: `Downloaded CSV export for ${targetLeads.length} leads successfully!`
    });
  };

  const handleExportGoogleSheets = async () => {
    const targetIds = selectedLeadIds.length > 0 ? selectedLeadIds : leads.map(l => l.id);
    if (targetIds.length === 0) {
      setGoogleSheetsNotification({
        type: 'error',
        message: 'No leads available to export.'
      });
      return;
    }

    setIsExportingSheets(true);
    setGoogleSheetsNotification(null);
    try {
      const res = await fetch(`${API_BASE}/export/google-sheets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_ids: targetIds,
          spreadsheet_title: `Lid Gen Export - ${new Date().toLocaleDateString()}`
        })
      });
      if (res.ok) {
        const data = await res.json();
        setGoogleSheetUrl(data.url || '');
        setGoogleSheetsNotification({
          type: 'success',
          message: `Successfully exported ${targetIds.length} leads to Google Sheets!`,
          url: data.url
        });
      } else {
        const err = await res.json().catch(() => ({}));
        handleDownloadCSV(targetIds);
        setGoogleSheetsNotification({
          type: 'info',
          message: `${err.detail || 'Google Account not connected.'} Downloaded CSV file to your device instead!`
        });
      }
    } catch (err) {
      console.error('Error exporting to Google Sheets:', err);
      handleDownloadCSV(targetIds);
    } finally {
      setIsExportingSheets(false);
    }
  };

  const fetchSmtpSettings = async () => {
    try {
      const res = await fetch(`${API_BASE}/settings/smtp`);
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setSmtpHost(data.host || '');
          setSmtpPort(data.port || 587);
          setSmtpUsername(data.username || '');
          setSmtpPassword(data.password || '');
          setSmtpSenderName(data.sender_name || '');
          setSmtpSenderEmail(data.sender_email || '');
          setSmtpUseTls(data.use_tls !== undefined ? data.use_tls : 1);
        }
      }
    } catch (err) {
      console.error('Error fetching SMTP settings:', err);
    }
  };

  const handleTestSmtp = async () => {
    setTestingSmtp(true);
    setSmtpNotification(null);
    try {
      const res = await fetch(`${API_BASE}/settings/smtp/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: smtpHost,
          port: parseInt(smtpPort, 10),
          username: smtpUsername,
          password: smtpPassword,
          sender_name: smtpSenderName,
          sender_email: smtpSenderEmail,
          use_tls: smtpUseTls ? 1 : 0
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.status === 'success') {
        setSmtpNotification({ type: 'success', message: data.message || 'SMTP Connection Test Successful!' });
      } else {
        setSmtpNotification({ type: 'error', message: data.message || data.detail || 'SMTP Connection Test Failed.' });
      }
    } catch (err) {
      setSmtpNotification({ type: 'error', message: 'Error testing SMTP connection.' });
    } finally {
      setTestingSmtp(false);
    }
  };

  const handleSaveSmtp = async (e) => {
    e.preventDefault();
    setSavingSmtp(true);
    setSmtpNotification(null);
    try {
      const res = await fetch(`${API_BASE}/settings/smtp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: smtpHost,
          port: parseInt(smtpPort, 10),
          username: smtpUsername,
          password: smtpPassword,
          sender_name: smtpSenderName,
          sender_email: smtpSenderEmail,
          use_tls: smtpUseTls ? 1 : 0
        })
      });
      if (res.ok) {
        setSmtpNotification({ type: 'success', message: 'SMTP settings saved successfully.' });
      } else {
        const errorData = await res.json().catch(() => ({}));
        setSmtpNotification({ type: 'error', message: errorData.detail || 'Failed to save SMTP settings.' });
      }
    } catch (err) {
      setSmtpNotification({ type: 'error', message: 'Error saving SMTP settings.' });
    } finally {
      setSavingSmtp(false);
    }
  };

  const fetchSchedules = async () => {
    try {
      const res = await fetch(`${API_BASE}/schedules`);
      if (res.ok) {
        const data = await res.json();
        setSchedules(data);
      }
    } catch (err) {
      console.error('Error fetching schedules:', err);
    }
  };

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    if (!schedKeyword.trim() || !schedLocation.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: schedKeyword.trim(),
          location: schedLocation.trim(),
          limit: parseInt(schedLimit, 10),
          interval_type: schedInterval
        })
      });
      if (res.ok) {
        setSchedKeyword('');
        setSchedLocation('');
        setSchedLimit(50);
        setSchedInterval('daily');
        fetchSchedules();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(`Failed to create schedule: ${errData.detail || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error creating schedule:', err);
      alert('Error creating schedule.');
    }
  };

  const handleToggleScheduleActive = async (scheduleId, currentActive) => {
    try {
      const res = await fetch(`${API_BASE}/schedules/${scheduleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_active: currentActive === 1 ? 0 : 1
        })
      });
      if (res.ok) {
        fetchSchedules();
      } else {
        alert("Failed to toggle schedule status.");
      }
    } catch (err) {
      console.error('Error toggling schedule:', err);
    }
  };

  const handleRunScheduleNow = async (scheduleId) => {
    try {
      const res = await fetch(`${API_BASE}/schedules/${scheduleId}/run`, {
        method: 'POST'
      });
      if (res.ok) {
        fetchSchedules();
        alert("Schedule run triggered successfully!");
      } else {
        alert("Failed to trigger schedule run.");
      }
    } catch (err) {
      console.error('Error running schedule now:', err);
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    if (!window.confirm("Are you sure you want to delete this schedule?")) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/schedules/${scheduleId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchSchedules();
      } else {
        alert("Failed to delete schedule.");
      }
    } catch (err) {
      console.error('Error deleting schedule:', err);
    }
  };

  const handleStartCampaign = async () => {
    if (selectedLeadIds.length === 0) return;
    setCampaignSending(true);
    try {
      const res = await fetch(`${API_BASE}/campaign/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_ids: selectedLeadIds,
          product_desc: productDesc
        })
      });
      if (res.ok) {
        alert(`Campaign launched successfully to ${selectedLeadIds.length} leads!`);
        setSelectedLeadIds([]);
        setShowCampaignSheet(false);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(`Failed to launch campaign: ${data.detail || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error launching campaign:', err);
      alert('Error launching campaign.');
    } finally {
      setCampaignSending(false);
    }
  };

  const handleSendSingleEmail = async (leadId) => {
    setSendingEmail(true);
    try {
      const res = await fetch(`${API_BASE}/leads/${leadId}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_desc: productDesc })
      });
      if (res.ok) {
        const data = await res.json();
        // Updates activeLead with the new delivery fields: email_sent_status, email_sent_at, and email_sent_error returned by the backend.
        setActiveLead(prev => {
          if (prev && prev.id === leadId) {
            return {
              ...prev,
              email_sent_status: data.email_sent_status,
              email_sent_at: data.email_sent_at,
              email_sent_error: data.email_sent_error
            };
          }
          return prev;
        });

        // Also updates the lead record inside the active leads state list.
        setLeads(prevLeads => prevLeads.map(lead => {
          if (lead.id === leadId) {
            return {
              ...lead,
              email_sent_status: data.email_sent_status,
              email_sent_at: data.email_sent_at,
              email_sent_error: data.email_sent_error
            };
          }
          return lead;
        }));
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(`Failed to send email: ${errData.detail || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error sending email:', err);
      alert('Error sending email.');
    } finally {
      setSendingEmail(false);
    }
  };

  // Update the stepper phase automatically based on selection or scraping status
  useEffect(() => {
    if (isScraping) {
      return; // Handled dynamically in SSE message stream
    }
    
    if (selectedSessionId) {
      const sess = sessions.find(s => s.id === selectedSessionId);
      if (sess) {
        if (sess.status === 'completed') {
          setActivePhaseIndex(4);
        } else if (sess.status === 'failed') {
          setActivePhaseIndex(-1);
        } else if (sess.status === 'running') {
          setActivePhaseIndex(1); // Maps Search
        } else {
          setActivePhaseIndex(0); // Setup
        }
      }
    } else {
      setActivePhaseIndex(-1); // Inactive state
    }
  }, [selectedSessionId, sessions, isScraping]);

  // Auto-refresh background running sessions every 4 seconds
  useEffect(() => {
    const sess = sessions.find(s => s.id === selectedSessionId);
    if (sess && sess.status === 'running' && !isScraping) {
      const interval = setInterval(() => {
        fetchSessions();
        fetchLeads(selectedSessionId);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [selectedSessionId, sessions, isScraping]);

  const fetchSessions = async (autoSelect = false) => {
    try {
      const res = await fetch(`${API_BASE}/sessions`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
        
        // Calculate basic statistics
        const totalLeads = data.reduce((acc, s) => acc + (s.total_leads || 0), 0);
        const activeRuns = data.filter(s => s.status === 'running').length;
        setStats({
          totalLeads,
          totalSessions: data.length,
          activeRuns
        });

        // Automatically select session: prioritize URL ?session=... param if valid, else first session if autoSelect
        if (data.length > 0) {
          const urlParamSession = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('session') : null;
          if (urlParamSession && data.some(s => s.id === urlParamSession)) {
            setSelectedSessionId(urlParamSession);
          } else if (autoSelect && !urlParamSession) {
            setSelectedSessionId(data[0].id);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching sessions:', err);
    }
  };

  const startScrapingProcess = async (targetKeyword, targetLocation, targetLimit) => {
    if (isScraping) return;

    // Close any existing active SSE stream connection to prevent socket/memory leaks
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setIsScraping(true);
    setActivePhaseIndex(0); // Setup phase
    setProgressLogs(['Dispatching scrape task to backend background worker...']);
    setLeads([]);
    setCurrentSessionId(null);
    setSelectedSessionId(null);
    setCurrentView('dashboard');
    
    // Also update UI inputs so the user sees what's running
    setKeyword(targetKeyword);
    setLocation(targetLocation);
    setLimit(targetLimit);

    try {
      let res;
      try {
        res = await fetch(`${API_BASE}/scrape`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            keyword: targetKeyword.trim(), 
            location: targetLocation.trim(), 
            limit: parseInt(targetLimit, 10),
            skip_previous: skipPreviousLeads,
            required_fields: requiredFields,
          })
        });
      } catch (firstErr) {
        setProgressLogs(prev => [...prev, 'Cloud server waking up, retrying connection...']);
        await new Promise(r => setTimeout(r, 3000));
        res = await fetch(`${API_BASE}/scrape`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            keyword: targetKeyword.trim(), 
            location: targetLocation.trim(), 
            limit: parseInt(targetLimit, 10),
            skip_previous: skipPreviousLeads,
            required_fields: requiredFields,
          })
        });
      }

      if (!res.ok) {
        throw new Error('Failed to launch scraper background process');
      }

      const data = await res.json();
      const sessionId = data.session_id;
      setCurrentSessionId(sessionId);
      setSelectedSessionId(sessionId); // Auto-focus on new session
      
      // Connect to Server-Sent Events (SSE) progress endpoint
      const eventSource = new EventSource(`${API_BASE}/progress/${sessionId}`);
      eventSourceRef.current = eventSource;
      
      eventSource.onmessage = (event) => {
        const log = event.data;
        if (log === 'EOF') {
          eventSource.close();
          if (eventSourceRef.current === eventSource) {
            eventSourceRef.current = null;
          }
          setIsScraping(false);
          setActivePhaseIndex(4); // Complete
          setProgressLogs(prev => [...prev, '✓ Scraper completed job successfully.']);
          fetchSessions();
          fetchLeads(sessionId);
        } else {
          setProgressLogs(prev => [...prev, log]);

          // Parse tags to update stepper active state
          if (log.includes('[PHASE:MAPS]')) {
            setActivePhaseIndex(1);
          } else if (log.includes('[PHASE:LISTINGS]')) {
            setActivePhaseIndex(2);
          } else if (log.includes('[PHASE:WEBSITES]')) {
            setActivePhaseIndex(3);
          } else if (log.includes('[PHASE:COMPLETE]')) {
            setActivePhaseIndex(4);
          }
        }
      };

      eventSource.onerror = (err) => {
        console.error('SSE Error:', err);
        eventSource.close();
        if (eventSourceRef.current === eventSource) {
          eventSourceRef.current = null;
        }
        setIsScraping(false);
        setActivePhaseIndex(-1);
        setProgressLogs(prev => [...prev, '✖ Connection to stream lost or task failed.']);
        fetchSessions();
        fetchLeads(sessionId);
      };

    } catch (err) {
      console.error('Error starting scrape:', err);
      setIsScraping(false);
      setActivePhaseIndex(-1);
      setProgressLogs(prev => [...prev, `✖ ${err.message || 'Error occurred.'}`]);
    }
  };

  const runScraper = async (targetKeyword, targetLocation, targetLimit) => {
    await startScrapingProcess(targetKeyword, targetLocation, targetLimit || 25);
  };

  const parsePromptClientSide = (text) => {
    let limit = 25;
    let clean = (text || '').trim();
    
    // Extract limit if specified (e.g. "Extract 25 ...", "50 plumbers ...")
    const limitMatch = clean.match(/(?:extract|find|get|scrape|top)?\s*(\d+)\s*/i);
    if (limitMatch && limitMatch[1]) {
      const parsedNum = parseInt(limitMatch[1], 10);
      if (parsedNum > 0 && parsedNum <= 200) {
        limit = parsedNum;
        clean = clean.replace(limitMatch[0], ' ').trim();
      }
    }
    
    clean = clean.replace(/^(extract|find|get|scrape|show|search)\s+/i, '').trim();
    
    let keyword = clean;
    let location = 'worldwide';
    
    const locMatch = clean.match(/(.*?)\s+(?:in|at|near|around|for)\s+(.+)$/i);
    if (locMatch) {
      keyword = locMatch[1].trim();
      location = locMatch[2].trim();
    }
    
    return {
      keyword: keyword || 'businesses',
      location: location || 'worldwide',
      limit
    };
  };

  const handleSendAiPrompt = async (promptText) => {
    if (!promptText.trim()) return;
    setIsConfiguringAI(true);
    let config = null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      
      const res = await fetch(`${API_BASE}/ai/parse-command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: promptText }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        config = await res.json();
      }
    } catch (e) {
      console.warn("AI parse command network fallback to local heuristic parser:", e);
    }

    // If backend AI parsing failed or timed out, use intelligent client-side parser
    if (!config || !config.keyword) {
      config = parsePromptClientSide(promptText);
    }

    setAiPrompt('');
    setIsConfiguringAI(false);
    await startScrapingProcess(config.keyword, config.location, config.limit || 25);
  };

  const fetchLeads = async (sessionIdOverride = null) => {
    setIsLoadingLeads(true);
    try {
      const url = new URL(`${API_BASE}/leads`);
      const targetSessionId = sessionIdOverride !== null ? sessionIdOverride : selectedSessionId;
      if (targetSessionId) url.searchParams.append('session_id', targetSessionId);
      if (searchTerm) url.searchParams.append('search', searchTerm);
      url.searchParams.append('page', page.toString());
      url.searchParams.append('page_size', pageSize.toString());

      // If server-side mode is active, we append the filter params to the API request
      if (filterMode === 'server') {
        if (activeFilter === 'email') {
          url.searchParams.append('has_email', 'true');
        } else if (activeFilter === 'website') {
          url.searchParams.append('has_website', 'true');
        } else if (activeFilter === 'rated') {
          url.searchParams.append('min_rating', '4.5');
        }
      }

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads);
        setTotalPages(data.total_pages);
        setTotalLeadsCount(data.total_count);
      }
      setIsLoadingLeads(false);
    } catch (err) {
      console.error('Error fetching leads:', err);
      setIsLoadingLeads(false);
    }
  };


  // Client-side filtering implementation
  const filteredLeads = React.useMemo(() => {
    if (filterMode === 'server') {
      return leads;
    }
    
    // Client-side filter
    return leads.filter(lead => {
      if (activeFilter === 'email') {
        return !!lead.email;
      }
      if (activeFilter === 'website') {
        return !!lead.website;
      }
      if (activeFilter === 'rated') {
        return lead.rating && lead.rating >= 4.5;
      }
      return true;
    });
  }, [leads, filterMode, activeFilter]);

  // Keyboard shortcuts (Linear-style navigation)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeEl = document.activeElement;
      const isTyping = activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable;

      // Escape: close drawer
      if (e.key === 'Escape') {
        setActiveLead(null);
        setFocusedRowIndex(-1);
        return;
      }

      // '/' focus search (unless already typing)
      if (e.key === '/' && !isTyping) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // Row navigation only when not typing and not in drawer
      if (isTyping || activeLead) return;

      switch (e.key) {
        case 'j':
        case 'ArrowDown':
          e.preventDefault();
          setFocusedRowIndex(prev => Math.min(prev + 1, filteredLeads.length - 1));
          break;
        case 'k':
        case 'ArrowUp':
          e.preventDefault();
          setFocusedRowIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'x':
          e.preventDefault();
          if (focusedRowIndex >= 0 && focusedRowIndex < filteredLeads.length) {
            const lead = filteredLeads[focusedRowIndex];
            setSelectedLeadIds(prev =>
              prev.includes(lead.id) ? prev.filter(id => id !== lead.id) : [...prev, lead.id]
            );
          }
          break;
        case 'Enter':
        case 'o':
          e.preventDefault();
          if (focusedRowIndex >= 0 && focusedRowIndex < filteredLeads.length) {
            setActiveLead(filteredLeads[focusedRowIndex]);
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredLeads, focusedRowIndex, activeLead]);


  // Dynamic logs computation for the active or selected historical session
  const displayLogs = React.useMemo(() => {
    if (isScraping || progressLogs.length > 0) {
      return progressLogs;
    }
    if (selectedSessionId) {
      const sess = sessions.find(s => s.id === selectedSessionId);
      if (sess) {
        if (sess.status === 'completed') {
          return [
            `✓ Initialization parameters: Keyword "${sess.keyword}", Location "${sess.location}"`,
            `✓ Connection to Google Maps scraper established.`,
            `✓ Listings metadata successfully parsed.`,
            `✓ Web crawler finished scanning target domains.`,
            `✓ Extraction pipeline completed. Saved ${sess.total_leads} unique leads to database.`
          ];
        } else if (sess.status === 'failed') {
          return [
            `✓ Initialization parameters: Keyword "${sess.keyword}", Location "${sess.location}"`,
            `✖ Extraction task failed or was aborted by system.`,
          ];
        } else if (sess.status === 'running') {
          return [
            `✓ Initialization parameters: Keyword "${sess.keyword}", Location "${sess.location}"`,
            `⚙ Scraper is actively running in background. Extracting leads...`,
          ];
        } else {
          return [
            `✓ Initialization parameters: Keyword "${sess.keyword}", Location "${sess.location}"`,
            `⚙ Task is pending queue space.`,
          ];
        }
      }
    }
    return [];
  }, [isScraping, progressLogs, selectedSessionId, sessions]);

  // Scroll SSE logger to bottom (placed here to avoid reference error during initialization)
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [displayLogs]);

  // Lead Strength badge helper
  const getLeadStrength = (lead) => {
    const hasPhone = !!lead.phone;
    const hasEmail = !!lead.email;
    const hasHighRating = lead.rating && lead.rating > 4;

    if (hasPhone && hasEmail && hasHighRating) {
      return {
        label: 'High Value',
        color: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
      };
    }
    
    const criteriaCount = (hasPhone ? 1 : 0) + (hasEmail ? 1 : 0) + (lead.rating ? 1 : 0);
    if (criteriaCount >= 2) {
      return {
        label: 'Medium Value',
        color: 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
      };
    }
    
    return {
      label: 'Low Value',
      color: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
    };
  };

  const handleGeneratePitch = async (leadId) => {
    if (!leadId) return;
    setGeneratingPitch(true);
    try {
      const res = await fetch(`${API_BASE}/leads/${leadId}/pitch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ product_desc: productDesc }),
      });
      if (res.ok) {
        const data = await res.json();
        const pitchJsonStr = JSON.stringify(data);
        
        // Update active lead in drawer
        setActiveLead(prev => prev && prev.id === leadId ? { ...prev, sales_pitch: pitchJsonStr } : prev);
        
        // Cache/update lead in current leads list
        setLeads(prevLeads => prevLeads.map(lead => lead.id === leadId ? { ...lead, sales_pitch: pitchJsonStr } : lead));
      } else {
        alert("Failed to generate sales pitch. Please try again.");
      }
    } catch (err) {
      console.error('Error generating sales pitch:', err);
    } finally {
      setGeneratingPitch(false);
    }
  };

  const formatDate = (dateStr) => {

    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(date);
    } catch (e) {
      return dateStr;
    }
  };

  const formatSessionTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) {
        return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
      }
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;

      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const d = new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(date);
      const t = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      return `${d}, ${t}`;
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0e14] text-foreground font-sans flex relative overflow-hidden">
      {/* Column 1: Leftmost Narrow Bar */}
      <aside className="w-16 bg-[#0E0F11] border-r border-border/40 flex flex-col justify-between items-center py-4 shrink-0 z-20">
        <div className="flex flex-col gap-6 items-center">
          {/* Logo */}
          <div 
            onClick={handleStartNewSession}
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center shadow-[0_0_15px_rgba(255,165,0,0.4)] cursor-pointer"
          >
            <Layers className="w-6 h-6 text-white" />
          </div>
          {/* Nav Icons */}
          <nav className="flex flex-col gap-4 mt-4">
            <button
              onClick={handleStartNewSession}
              className={`p-3 rounded-xl transition-all ${currentView === 'dashboard' && !selectedSessionId && !currentSessionId ? 'bg-zinc-800/80 text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40'}`}
              title="New Session"
            >
              <Compass className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentView('history')}
              className={`p-3 rounded-xl transition-all ${currentView === 'history' ? 'bg-zinc-800/80 text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40'}`}
              title="History"
            >
              <History className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentView('settings')}
              className={`p-3 rounded-xl transition-all ${currentView === 'settings' ? 'bg-zinc-800/80 text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40'}`}
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
              value={historySearchTerm}
              onChange={(e) => setHistorySearchTerm(e.target.value)}
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
                {sessions
                  .filter(s => pinnedSessionIds.includes(s.id))
                  .filter(s => {
                    if (!historySearchTerm.trim()) return true;
                    const query = historySearchTerm.toLowerCase();
                    return (s.keyword || '').toLowerCase().includes(query) || (s.location || '').toLowerCase().includes(query);
                  })
                  .map(session => (
                    <button 
                      key={session.id}
                      onClick={() => handleSelectSession(session)}
                      className={`flex items-start gap-3 w-full text-left p-2.5 rounded-xl transition-all group ${selectedSessionId === session.id ? 'bg-zinc-800/80 text-white' : 'hover:bg-zinc-800/40 text-zinc-400'}`}
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
              {sessions
                .filter(s => !pinnedSessionIds.includes(s.id))
                .filter(s => {
                  if (!historySearchTerm.trim()) return true;
                  const query = historySearchTerm.toLowerCase();
                  return (s.keyword || '').toLowerCase().includes(query) || (s.location || '').toLowerCase().includes(query);
                })
                .slice(0, 10)
                .map(session => {
                  const isPinned = pinnedSessionIds.includes(session.id);
                  return (
                    <button 
                      key={session.id}
                      onClick={() => handleSelectSession(session)}
                      className={`flex items-start gap-3 w-full text-left p-2.5 rounded-xl transition-all group ${selectedSessionId === session.id ? 'bg-zinc-800/80 text-white border border-zinc-700/60 shadow-sm' : 'hover:bg-zinc-800/40 text-zinc-400'}`}
                    >
                      <div className="mt-1 shrink-0">
                        <div className={`w-2 h-2 rounded-full ${session.status === 'completed' ? 'bg-zinc-500' : session.status === 'failed' ? 'bg-rose-500' : 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)] animate-pulse'}`}></div>
                      </div>
                      <div className="flex-1 overflow-hidden min-w-0">
                        <div className="text-xs font-medium truncate text-zinc-300 group-hover:text-white transition-colors">{session.keyword || 'Search'} · {session.location || 'Anywhere'}</div>
                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 mt-0.5">
                          <Clock className="w-3 h-3 text-zinc-600 shrink-0" />
                          <span className="truncate">{formatSessionTime(session.created_at)}</span>
                          <span>•</span>
                          <span>{session.total_leads || 0} leads</span>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => togglePinSession(session.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-zinc-300 transition-all shrink-0"
                        title={isPinned ? "Unpin session" : "Pin session"}
                      >
                        <Star className={`w-3.5 h-3.5 ${isPinned ? 'text-yellow-500 fill-yellow-500 opacity-100' : ''}`} />
                      </button>
                    </button>
                  );
                })}
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
        {/* Floating Notification Toast */}
        {googleSheetsNotification && (
          <div className="fixed top-20 right-6 z-50 animate-fade-in max-w-md">
            <div className={`p-4 rounded-xl shadow-2xl border backdrop-blur-xl flex items-start justify-between gap-3 ${
              googleSheetsNotification.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-200' :
              googleSheetsNotification.type === 'error' ? 'bg-rose-950/90 border-rose-500/30 text-rose-200' :
              'bg-zinc-900/90 border-zinc-700 text-zinc-200'
            }`}>
              <div className="flex items-start gap-3 min-w-0">
                {googleSheetsNotification.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" /> :
                 googleSheetsNotification.type === 'error' ? <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" /> :
                 <Info className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />}
                <div className="min-w-0 text-xs space-y-1">
                  <div className="font-semibold text-white">{googleSheetsNotification.message}</div>
                  {googleSheetsNotification.url && (
                    <a href={googleSheetsNotification.url} target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:underline font-bold inline-flex items-center gap-1">
                      Open Google Sheet <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
              <button onClick={() => setGoogleSheetsNotification(null)} className="text-zinc-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Top Bar */}
        <header className="h-16 border-b border-border/40 flex items-center justify-between px-6 shrink-0 bg-background/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-zinc-200">
              {currentView === 'settings' ? 'Outreach & Scraping Configuration' : (keyword ? `${keyword} · ${location}` : 'New Extraction Session')}
            </h2>
            {isScraping && (
              <Badge variant="outline" className="bg-primary-500/10 text-primary-400 border-primary-500/20 text-[10px] h-5 animate-pulse">
                Running
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowHelpModal(true)}
              className="gap-1.5 h-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60"
              title="How to use Lid Gen"
            >
              <Info className="w-4 h-4 text-orange-400" />
              <span className="text-xs font-medium">Guide</span>
            </Button>

            <Button 
              variant="outline" 
              size="sm" 
              className="gap-1.5 h-8 border-zinc-750 bg-zinc-800/50 hover:bg-zinc-800 text-xs font-medium text-zinc-200" 
              onClick={handleExportGoogleSheets} 
              disabled={isExportingSheets || leads.length === 0}
              title="Export leads to Google Sheets or CSV"
            >
              {isExportingSheets ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Export
            </Button>

            <Button 
              size="sm" 
              className="gap-1.5 h-8 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium shadow-sm transition-all" 
              onClick={() => {
                if (selectedLeadIds.length === 0 && leads.length > 0) {
                  setSelectedLeadIds(leads.map(l => l.id));
                }
                setShowCampaignSheet(true);
              }} 
              disabled={leads.length === 0}
            >
              <Mail className="w-3.5 h-3.5" />
              Outreach
            </Button>
          </div>
        </header>

        {/* Conversation Scroll Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pb-48">
          <div className={`${currentView === 'settings' ? 'max-w-7xl' : 'max-w-4xl'} mx-auto space-y-8`}>
            
            {currentView === 'settings' ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20">
                {/* Column 1: Configuration Credentials */}
                <div className="lg:col-span-5 flex flex-col gap-6 h-fit">
                  {/* SMTP Settings Card */}
                  <Card className="bg-popover border border-zinc-800/80 shadow-sm overflow-hidden h-fit">
                    <CardHeader>
                      <CardTitle className="font-bold text-zinc-400 text-base">SMTP Settings</CardTitle>
                      <CardDescription className="text-xs text-zinc-500">Provide outbound mail server details</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleSaveSmtp} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">
                              SMTP Host
                            </label>
                            <Input
                              type="text"
                              required
                              placeholder="e.g. smtp.gmail.com"
                              value={smtpHost}
                              onChange={(e) => setSmtpHost(e.target.value)}
                              className="text-sm bg-[#0E0F11] border-zinc-800 placeholder:text-zinc-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">
                              SMTP Port
                            </label>
                            <Input
                              type="number"
                              required
                              placeholder="e.g. 587 or 465"
                              value={smtpPort}
                              onChange={(e) => setSmtpPort(e.target.value)}
                              className="text-sm bg-[#0E0F11] border-zinc-800 placeholder:text-zinc-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">
                              SMTP Username (Email)
                            </label>
                            <Input
                              type="email"
                              required
                              placeholder="e.g. user@example.com"
                              value={smtpUsername}
                              onChange={(e) => setSmtpUsername(e.target.value)}
                              className="text-sm bg-[#0E0F11] border-zinc-800 placeholder:text-zinc-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">
                              SMTP Password
                            </label>
                            <Input
                              type="password"
                              required
                              placeholder="••••••••"
                              value={smtpPassword}
                              onChange={(e) => setSmtpPassword(e.target.value)}
                              className="text-sm bg-[#0E0F11] border-zinc-800 placeholder:text-zinc-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">
                              Sender Name
                            </label>
                            <Input
                              type="text"
                              required
                              placeholder="e.g. John Doe"
                              value={smtpSenderName}
                              onChange={(e) => setSmtpSenderName(e.target.value)}
                              className="text-sm bg-[#0E0F11] border-zinc-800 placeholder:text-zinc-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">
                              Sender Email
                            </label>
                            <Input
                              type="email"
                              required
                              placeholder="e.g. john@example.com"
                              value={smtpSenderEmail}
                              onChange={(e) => setSmtpSenderEmail(e.target.value)}
                              className="text-sm bg-[#0E0F11] border-zinc-800 placeholder:text-zinc-500"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2 py-2">
                          <div className="relative inline-flex items-center justify-center">
                            <input
                              type="checkbox"
                              id="smtpUseTls"
                              checked={smtpUseTls === 1}
                              onChange={(e) => setSmtpUseTls(e.target.checked ? 1 : 0)}
                              className="peer appearance-none w-4 h-4 rounded bg-[#131924] border border-zinc-800 checked:bg-orange-500 checked:border-orange-500 cursor-pointer transition-all hover:bg-zinc-800 focus:outline-none"
                            />
                            <Check className="w-3 h-3 text-white absolute pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity stroke-[3]" />
                          </div>
                          <label htmlFor="smtpUseTls" className="text-xs font-semibold text-zinc-300 select-none cursor-pointer">
                            Use TLS Encryption (Recommended for port 587)
                          </label>
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t border-zinc-800/80">
                          <Button
                            type="button"
                            variant="outline"
                            disabled={testingSmtp || savingSmtp}
                            onClick={handleTestSmtp}
                            className="border-zinc-700 text-xs font-bold text-primary-400 hover:text-primary-300 flex items-center gap-1.5 h-10 px-4"
                          >
                            {testingSmtp ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Testing...
                              </>
                            ) : (
                              'Test SMTP'
                            )}
                          </Button>
                          <Button
                            type="submit"
                            disabled={testingSmtp || savingSmtp}
                            className="font-bold bg-primary-600 hover:bg-primary-500 text-white flex items-center gap-1.5 h-10 px-6"
                          >
                            {savingSmtp ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              'Save SMTP'
                            )}
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>

                  {/* Google Workspace API Credentials Card */}
                  <Card className="bg-popover border border-zinc-800/80 shadow-sm overflow-hidden h-fit mt-6">
                    <CardHeader>
                      <CardTitle className="font-bold text-zinc-400 text-base">Google Workspace Integration</CardTitle>
                      <CardDescription className="text-xs text-zinc-500">Provide Google Cloud OAuth 2.0 Credentials</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleSaveGoogleOauth} className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">
                            Google Client ID
                          </label>
                          <Input
                            type="text"
                            required
                            placeholder="e.g. 123456789-abc.apps.googleusercontent.com"
                            value={googleClientId}
                            onChange={(e) => setGoogleClientId(e.target.value)}
                            className="text-sm bg-[#0E0F11] border-zinc-800 placeholder:text-zinc-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">
                            Google Client Secret
                          </label>
                          <Input
                            type="password"
                            required
                            placeholder="••••••••"
                            value={googleClientSecret}
                            onChange={(e) => setGoogleClientSecret(e.target.value)}
                            className="text-sm bg-[#0E0F11] border-zinc-800 placeholder:text-zinc-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">
                            Redirect URI (Read-only)
                          </label>
                          <Input
                            type="text"
                            readOnly
                            value={window.location.origin + '/oauth-callback'}
                            className="text-xs bg-zinc-950/40 border-border/80 text-zinc-500 cursor-not-allowed"
                          />
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t border-zinc-800/80 gap-4">
                          <Button
                            type="button"
                            onClick={handleConnectGoogle}
                            disabled={!googleClientId || !googleClientSecret}
                            className={`font-bold text-xs h-10 px-4 flex items-center gap-1.5 ${
                              isGoogleConnected 
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
                                : 'bg-primary-600 hover:bg-primary-500 text-white'
                            }`}
                          >
                            {isGoogleConnected ? (
                              <>
                                <CheckCircle className="w-4 h-4" />
                                Account Connected
                              </>
                            ) : (
                              <>
                                <RefreshCw className="w-3.5 h-3.5" />
                                Connect Account
                              </>
                            )}
                          </Button>
                          <Button
                            type="submit"
                            className="font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 h-10 px-5"
                          >
                            Save API Keys
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                </div>

                {/* Column 2: Scraper Schedules Panel */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                  <Card className="bg-popover border border-zinc-800/80 shadow-sm overflow-hidden flex flex-col">
                    <CardHeader className="pb-4 border-b border-zinc-800/80 bg-zinc-900/10">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary-500/10 border border-primary-500/20 p-2 rounded-xl text-primary-400 shadow-[0_0_15px_rgba(37,99,235,0.2)]">
                          <Calendar className="w-5 h-5 text-primary-500" />
                        </div>
                        <div>
                          <CardTitle className="font-bold text-zinc-300 text-base">Automated Scraper Schedules</CardTitle>
                          <CardDescription className="text-xs text-zinc-500">Schedule background extractions on recurring intervals</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-8">
                      
                      {/* Form: Create New Schedule */}
                      <div className="space-y-4">
                        <h3 className="text-xs font-extrabold uppercase tracking-widest text-zinc-400 border-l-2 border-primary-500 pl-2">Create New Schedule</h3>
                        
                        <form onSubmit={handleCreateSchedule} className="space-y-4 bg-background/20 border border-zinc-800/80 p-4 rounded-xl">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">
                                Keyword / Niche
                              </label>
                              <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400 z-10">
                                  <Search className="w-4 h-4" />
                                </span>
                                <Input
                                  type="text"
                                  required
                                  placeholder="e.g. Restaurants, Gym"
                                  value={schedKeyword}
                                  onChange={(e) => setSchedKeyword(e.target.value)}
                                  className="pl-10 text-sm bg-[#0E0F11] border-zinc-800 placeholder:text-zinc-500"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">
                                Location / City
                              </label>
                              <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400 z-10">
                                  <MapPin className="w-4 h-4" />
                                </span>
                                <Input
                                  type="text"
                                  required
                                  placeholder="e.g. New York, London"
                                  value={schedLocation}
                                  onChange={(e) => setSchedLocation(e.target.value)}
                                  className="pl-10 text-sm bg-[#0E0F11] border-zinc-800 placeholder:text-zinc-500"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <div className="flex justify-between items-center mb-1.5">
                                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                  Max Listings Limit
                                </label>
                                <Badge variant="outline" className="text-xs font-bold text-primary-400 bg-primary-500/10 border-primary-500/20 px-2 py-0.5">
                                  {schedLimit} leads
                                </Badge>
                              </div>
                              <Slider
                                min={5}
                                max={150}
                                step={5}
                                value={[schedLimit]}
                                onValueChange={(val) => setSchedLimit(val[0])}
                                className="w-full mt-2"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">
                                Interval Type
                              </label>
                              <Select
                                value={schedInterval}
                                onChange={(val) => setSchedInterval(val)}
                                options={[
                                  { value: 'daily', label: 'Daily' },
                                  { value: 'weekly', label: 'Weekly' },
                                  { value: 'monthly', label: 'Monthly' },
                                  { value: 'minute', label: 'Minute (Testing)' }
                                ]}
                                className="w-full h-10"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end pt-2">
                            <Button
                              type="submit"
                              disabled={!schedKeyword || !schedLocation}
                              className="font-bold bg-primary-600 hover:bg-primary-500 text-white flex items-center gap-1.5 h-10 px-6"
                            >
                              <Calendar className="w-4 h-4" /> Save Schedule
                            </Button>
                          </div>
                        </form>
                      </div>

                      {/* Listing: Active Schedules */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-extrabold uppercase tracking-widest text-zinc-400 border-l-2 border-primary-500 pl-2">Active Schedules</h3>
                          <Badge variant="outline" className="text-xs bg-zinc-800 text-zinc-400 border-zinc-700 font-bold px-2 py-0.5">
                            {schedules.length} schedules
                          </Badge>
                        </div>

                        <div className="border border-zinc-800 rounded-xl bg-background/20 max-h-[380px] overflow-y-auto pr-1 text-zinc-300">
                          {schedules.length === 0 ? (
                            <div className="py-12 text-center text-zinc-500 flex flex-col items-center gap-2">
                              <Clock className="w-8 h-8 text-zinc-600 animate-pulse" />
                              <span className="font-semibold text-xs text-zinc-400">No scraper schedules configured.</span>
                              <p className="text-[10px] text-zinc-500">Configure parameters above to setup recurring extractions.</p>
                            </div>
                          ) : (
                            <Table className="w-full text-xs">
                              <TableHeader>
                                <TableRow className="bg-background/60 border-b border-zinc-800/80 hover:bg-transparent">
                                  <TableHead className="py-3 px-4 font-semibold uppercase tracking-wider text-zinc-400">Target Parameter</TableHead>
                                  <TableHead className="py-3 px-3 font-semibold uppercase tracking-wider text-zinc-400">Interval</TableHead>
                                  <TableHead className="py-3 px-3 font-semibold uppercase tracking-wider text-zinc-400 text-center">Status</TableHead>
                                  <TableHead className="py-3 px-3 font-semibold uppercase tracking-wider text-zinc-400">Run Details</TableHead>
                                  <TableHead className="py-3 px-4 font-semibold uppercase tracking-wider text-zinc-400 text-right">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody className="divide-y divide-zinc-800/80 text-zinc-300">
                                {schedules.map((schedule) => (
                                  <TableRow key={schedule.id} className="hover:bg-zinc-850/30 transition-colors border-b border-zinc-800/80">
                                    <TableCell className="py-3.5 px-4 font-bold text-zinc-100">
                                      <div>
                                        <div className="font-bold text-zinc-200">{schedule.keyword}</div>
                                        <div className="font-bold text-zinc-400 mt-0.5">Loc: {schedule.location} (Limit: {schedule.limit})</div>
                                      </div>
                                    </TableCell>
                                    <TableCell className="py-3.5 px-3">
                                      <Badge variant="outline" className="font-bold text-[9px] bg-zinc-800/50 text-zinc-300 border-zinc-700 px-2 py-0.5 capitalize">
                                        {schedule.interval_type}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="py-3.5 px-3 text-center">
                                      <Badge variant="outline" className={`font-bold text-[9px] px-2 py-0.5 ${
                                        schedule.is_active === 1
                                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                          : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                                      }`}>
                                        {schedule.is_active === 1 ? 'Active' : 'Paused'}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="py-3.5 px-3">
                                      <div className="space-y-0.5 text-[10px]">
                                        <div className="text-zinc-400">
                                          <span className="text-zinc-500 font-bold">Next Run: </span>
                                          {schedule.next_run ? formatDateTime(schedule.next_run) : '—'}
                                        </div>
                                        <div className="text-zinc-400">
                                          <span className="text-zinc-500 font-bold">Last Run: </span>
                                          {schedule.last_run ? formatDateTime(schedule.last_run) : 'Never'}
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell className="py-3.5 px-4 text-right">
                                      <div className="flex items-center justify-end gap-1.5">
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleToggleScheduleActive(schedule.id, schedule.is_active)}
                                          className="border-zinc-850 text-zinc-400 hover:text-zinc-200 h-8 w-8 p-0 flex items-center justify-center"
                                          title={schedule.is_active === 1 ? "Pause Schedule" : "Resume Schedule"}
                                        >
                                          {schedule.is_active === 1 ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleRunScheduleNow(schedule.id)}
                                          className="border-zinc-850 text-primary-400 hover:text-primary-300 h-8 w-8 p-0 flex items-center justify-center"
                                          title="Run Schedule Now"
                                        >
                                          <RefreshCw className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleDeleteSchedule(schedule.id)}
                                          className="border-zinc-850 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 h-8 w-8 p-0 flex items-center justify-center"
                                          title="Delete Schedule"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                        </div>
                      </div>

                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : currentView === 'history' ? (
              <div className="space-y-6 pb-20 animate-fade-in">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <History className="w-5 h-5 text-orange-500" />
                      Scraping History & Sessions
                    </h2>
                    <p className="text-xs text-zinc-500 mt-1">Browse, view, and manage your past lead generation extraction runs.</p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                        <Search className="w-4 h-4" />
                      </span>
                      <Input
                        type="text"
                        placeholder="Search history..."
                        value={historySearchTerm}
                        onChange={(e) => setHistorySearchTerm(e.target.value)}
                        className="pl-9 h-9 w-60 text-xs bg-[#0E0F11] border-zinc-800 placeholder:text-zinc-500"
                      />
                    </div>
                    
                    <Select
                      value={historyStatusFilter}
                      onChange={(val) => setHistoryStatusFilter(val)}
                      options={[
                        { value: 'all', label: 'All Statuses' },
                        { value: 'completed', label: 'Completed' },
                        { value: 'failed', label: 'Failed' },
                        { value: 'running', label: 'Running' }
                      ]}
                      className="h-9"
                    />

                    <Select
                      value={historyDatePreset}
                      onChange={(val) => handleDatePresetChange(val)}
                      options={[
                        { value: 'all', label: 'All Dates' },
                        { value: 'today', label: 'Today' },
                        { value: 'yesterday', label: 'Yesterday' }
                      ]}
                      className="h-9"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sessions
                    .filter(session => {
                      const matchesSearch = 
                        session.keyword.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
                        session.location.toLowerCase().includes(historySearchTerm.toLowerCase());
                      const matchesStatus = historyStatusFilter === 'all' || session.status === historyStatusFilter;
                      
                      let matchesDate = true;
                      if (historyDateFilter) {
                        const sessDateStr = new Date(session.created_at).toISOString().split('T')[0];
                        matchesDate = (sessDateStr === historyDateFilter);
                      }
                      
                      return matchesSearch && matchesStatus && matchesDate;
                    })
                    .map(session => {
                      const isPinned = pinnedSessionIds.includes(session.id);
                      return (
                        <Card key={session.id} className="bg-popover border border-zinc-800/80 shadow-sm hover:border-zinc-700/80 transition-all flex flex-col justify-between overflow-hidden group">
                          <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
                            <div>
                              <CardTitle className="text-sm font-bold text-zinc-100 line-clamp-1 capitalize">{session.keyword}</CardTitle>
                              <CardDescription className="text-[11px] text-zinc-500 mt-0.5 capitalize flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {session.location}
                              </CardDescription>
                            </div>
                            <button 
                              onClick={(e) => togglePinSession(session.id, e)} 
                              className="text-zinc-500 hover:text-yellow-500 transition-colors p-1"
                              title={isPinned ? "Unpin session" : "Pin session"}
                            >
                              <Star className={`w-4 h-4 ${isPinned ? 'text-yellow-500 fill-yellow-500' : ''}`} />
                            </button>
                          </CardHeader>
                          <CardContent className="p-4 pt-2 pb-3 flex-1 flex flex-col justify-between">
                            <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-4">
                              <span className="text-[10px] text-zinc-500 font-medium">
                                {new Date(session.created_at).toLocaleDateString()} at {new Date(session.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </span>
                              <Badge variant="outline" className={`font-bold text-[9px] px-2 py-0.2 ${
                                session.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                session.status === 'failed' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                'bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse'
                              }`}>
                                {session.status}
                              </Badge>
                            </div>
                            
                            <div className="flex justify-between items-center bg-zinc-900/35 border border-zinc-850 p-2.5 rounded-lg mb-4">
                              <span className="text-[11px] text-zinc-500 font-semibold">Leads Extracted</span>
                              <span className="text-sm font-bold text-zinc-200">{session.total_leads}</span>
                            </div>

                            <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/40">
                              <Button 
                                onClick={() => handleSelectSession(session)}
                                className="flex-1 text-xs h-8 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-white"
                              >
                                View Leads
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={(e) => handleDeleteSession(session.id, e)}
                                className="border-zinc-850 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 h-8 w-8 p-0 flex items-center justify-center shrink-0"
                                title="Delete session"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  {sessions.length === 0 && (
                    <div className="col-span-full py-16 text-center text-zinc-500 flex flex-col items-center gap-2">
                      <History className="w-10 h-10 text-zinc-700" />
                      <span className="font-semibold text-sm text-zinc-400">No scraping history found.</span>
                      <p className="text-xs text-zinc-500">Run a new lead extraction to build your history.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (selectedSessionId || currentSessionId || isScraping) ? (
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
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 bg-[#131924]
                                ${isActive ? 'border-orange-500 text-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.4)] scale-110' : 
                                  isPast ? 'border-primary-500 text-primary-500' : 'border-zinc-700 text-zinc-600'}
                              `}>
                                {isPast ? <Check className="w-4 h-4" /> : isActive ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="text-xs font-bold">{i+1}</span>}
                              </div>
                              <div className="text-center">
                                <div className={`text-xs font-semibold ${isActive ? 'text-zinc-200' : isPast ? 'text-zinc-400' : 'text-zinc-600'}`}>{step.label}</div>
                                <div className="text-[9px] text-zinc-500 mt-0.5 max-w-[80px]">{step.desc}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Real-time Logs Terminal */}
                    {displayLogs.length > 0 && (
                      <div className="glass-card rounded-xl border border-zinc-800/65 bg-[#0a0d14]/90 overflow-hidden shadow-lg mt-4">
                        <div className="px-4 py-2 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/40">
                          <div className="flex items-center gap-2">
                            <div className={`w-2.5 h-2.5 rounded-full ${isScraping ? 'bg-orange-500 animate-pulse' : 'bg-zinc-500'}`}></div>
                            <span className="text-[11px] font-semibold text-zinc-400 tracking-wider uppercase font-mono">Extraction Terminal</span>
                          </div>
                          {isScraping && (
                            <span className="text-[10px] text-orange-400 animate-pulse font-mono">Running...</span>
                          )}
                        </div>
                        <div className="p-4 font-mono text-[11px] text-zinc-400 max-h-48 overflow-y-auto space-y-1.5 custom-scrollbar bg-black/30">
                          {displayLogs.map((log, index) => (
                            <div key={index} className="flex items-start gap-2">
                              <span className="text-zinc-600 select-none">[{index + 1}]</span>
                              <span className={
                                log.startsWith('✓') || log.includes('[PHASE:COMPLETE]') ? 'text-emerald-400' :
                                log.startsWith('✖') || log.includes('ERROR:') ? 'text-rose-400 font-semibold' :
                                log.includes('[PHASE:') ? 'text-orange-400 font-semibold' : 'text-zinc-300'
                              }>
                                {log}
                              </span>
                            </div>
                          ))}
                          <div ref={logEndRef} />
                        </div>
                      </div>
                    )}

                    {/* Leads Table Card or Loading Status */}
                    {leads.length > 0 ? (
                      <div className="glass-card rounded-2xl border border-zinc-800/80 bg-[#131924]/80 overflow-hidden shadow-2xl">
                        <div className="px-5 py-3 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 bg-zinc-900/40">
                          <div className="flex items-center gap-3">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                              <Database className="w-4 h-4 text-orange-500" />
                              Extracted Database
                            </h3>
                            <Badge className="bg-zinc-800/80 text-zinc-300 border-zinc-700/80 text-xs px-2.5 py-0.5 font-mono">
                              {totalLeadsCount} Records
                            </Badge>
                          </div>

                          {!isScraping && (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowMarketAnalytics(true)}
                                className="h-7 px-2.5 text-xs border-zinc-750 bg-zinc-800/60 hover:bg-zinc-750 text-zinc-300 hover:text-white transition-all gap-1.5"
                                title="Analyze Market Intelligence"
                              >
                                <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                                <span>Analytics</span>
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleExportGoogleSheets}
                                className="h-7 px-2.5 text-xs border-zinc-750 bg-zinc-800/60 hover:bg-zinc-750 text-zinc-300 hover:text-white transition-all gap-1.5"
                                title="Export leads to Google Sheets or CSV"
                              >
                                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Export CSV</span>
                              </Button>

                              <Button
                                size="sm"
                                onClick={() => {
                                  if (selectedLeadIds.length === 0 && leads.length > 0) {
                                    setSelectedLeadIds(leads.map(l => l.id));
                                  }
                                  setShowCampaignSheet(true);
                                }}
                                className="h-7 px-3 text-xs bg-orange-500 hover:bg-orange-600 text-white font-medium shadow-sm transition-all gap-1.5"
                              >
                                <Mail className="w-3.5 h-3.5" />
                                <span>Outreach</span>
                              </Button>
                            </div>
                          )}
                        </div>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="border-zinc-800/80 hover:bg-transparent">
                                <TableHead className="w-12 py-3 px-4 text-center">
                                  <div className="relative inline-flex items-center justify-center">
                                    <input 
                                      type="checkbox" 
                                      checked={leads.length > 0 && leads.every(lead => selectedLeadIds.includes(lead.id))}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedLeadIds(prev => [...new Set([...prev, ...leads.map(lead => lead.id)])]);
                                        } else {
                                          setSelectedLeadIds(prev => prev.filter(id => !leads.some(lead => lead.id === id)));
                                        }
                                      }}
                                      className="peer appearance-none w-4 h-4 rounded bg-[#131924] border border-zinc-800 checked:bg-orange-500 checked:border-orange-500 cursor-pointer transition-all hover:bg-zinc-800 focus:outline-none"
                                    />
                                    <Check className="w-3 h-3 text-white absolute pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity stroke-[3]" />
                                  </div>
                                </TableHead>
                                <TableHead className="py-3 px-4 font-semibold uppercase tracking-wider text-zinc-400 text-xs">Business Profile</TableHead>
                                <TableHead className="py-3 px-4 font-semibold uppercase tracking-wider text-zinc-400 text-xs">Contact Details</TableHead>
                                <TableHead className="py-3 px-4 font-semibold uppercase tracking-wider text-zinc-400 text-xs">Rating</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-zinc-800/80 text-zinc-300">
                              {leads.map((lead) => (
                                <TableRow 
                                  key={lead.id} 
                                  onClick={() => setActiveLead(lead)} 
                                  className="hover:bg-zinc-850/20 transition-colors border-b border-zinc-800/80 cursor-pointer"
                                >
                                  <TableCell className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                                    <div className="relative inline-flex items-center justify-center">
                                      <input 
                                        type="checkbox" 
                                        checked={selectedLeadIds.includes(lead.id)}
                                        onChange={() => {
                                          setSelectedLeadIds(prev => 
                                            prev.includes(lead.id) 
                                              ? prev.filter(id => id !== lead.id) 
                                              : [...prev, lead.id]
                                          );
                                        }}
                                        className="peer appearance-none w-4 h-4 rounded bg-[#131924] border border-zinc-800 checked:bg-orange-500 checked:border-orange-500 cursor-pointer transition-all hover:bg-zinc-800 focus:outline-none"
                                      />
                                      <Check className="w-3 h-3 text-white absolute pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity stroke-[3]" />
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-3 px-4">
                                    <div>
                                      <div className="font-bold text-zinc-100 text-sm">{lead.name}</div>
                                      <div className="text-xs text-zinc-450 mt-1 flex items-center gap-1.5">
                                        {lead.website ? (
                                          <a 
                                            href={lead.website} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            onClick={(e) => e.stopPropagation()} 
                                            className="text-primary-400 hover:underline flex items-center gap-1"
                                          >
                                            <Globe className="w-3 h-3" />
                                            {lead.website.replace('https://', '').replace('http://', '').replace('www.', '').split('/')[0]}
                                            <ExternalLink className="w-2.5 h-2.5" />
                                          </a>
                                        ) : (
                                          <span className="text-zinc-650 flex items-center gap-1"><Globe className="w-3 h-3" /> No website</span>
                                        )}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-3">
                                    <div className="space-y-1">
                                      {lead.email ? (
                                        <div className="flex items-center gap-1.5">
                                          <Mail className="w-3.5 h-3.5 text-zinc-400" />
                                          <span className="text-xs text-zinc-200">{lead.email}</span>
                                          {lead.email_status === 'valid' ? (
                                            <Badge className="h-4 px-1.5 text-[9px] bg-emerald-950/80 text-emerald-400 border-emerald-800 rounded ml-1">Verified</Badge>
                                          ) : lead.email_status === 'risky' ? (
                                            <Badge className="h-4 px-1.5 text-[9px] bg-yellow-950/80 text-yellow-400 border-yellow-800 rounded ml-1">Risky</Badge>
                                          ) : lead.email_status === 'invalid' ? (
                                            <Badge className="h-4 px-1.5 text-[9px] bg-rose-950/80 text-rose-400 border-rose-800 rounded ml-1">Invalid</Badge>
                                          ) : (
                                            <Badge className="h-4 px-1.5 text-[9px] bg-zinc-800 text-zinc-400 border-zinc-700 rounded ml-1">Unchecked</Badge>
                                          )}
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

        {/* Table Footer with Pagination Controls */}
        <div className="px-6 py-4 border-t border-zinc-800/80 bg-[#0d121c]/90 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-zinc-400">
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-zinc-400 font-medium">
              Showing <span className="text-white font-bold">{leads.length > 0 ? ((page - 1) * pageSize + 1) : 0}</span> to <span className="text-white font-bold">{Math.min(page * pageSize, totalLeadsCount)}</span> of <span className="text-white font-bold">{totalLeadsCount}</span> records
            </div>

            <div className="h-4 w-px bg-zinc-800 hidden sm:block"></div>

            <div className="flex items-center gap-2">
              <span className="text-zinc-400 font-medium">Rows per page:</span>
              <Select
                value={pageSize}
                onChange={(val) => {
                  setPageSize(Number(val));
                  setPage(1);
                }}
                options={[
                  { value: 15, label: '15' },
                  { value: 25, label: '25' },
                  { value: 50, label: '50' },
                  { value: 100, label: '100' },
                  { value: 500, label: 'All (500)' }
                ]}
                position="up"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-zinc-400 font-medium">
              Page <strong className="text-white font-bold">{page}</strong> of <strong className="text-white font-bold">{totalPages || 1}</strong>
            </span>

            <div className="flex items-center gap-1.5">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => Math.max(1, p - 1))} 
                disabled={page === 1}
                className="h-8 px-3 border-zinc-750 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white disabled:opacity-40 rounded-lg text-xs font-medium transition-all shadow-sm"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
              </Button>

              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                disabled={page >= totalPages}
                className="h-8 px-3 border-zinc-750 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white disabled:opacity-40 rounded-lg text-xs font-medium transition-all shadow-sm"
              >
                Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    ) : isScraping ? (
      <div className="glass-card rounded-2xl border border-zinc-800/80 bg-[#131924]/60 p-8 text-center flex flex-col items-center justify-center space-y-3 shadow-lg">
        <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
        <div className="text-sm text-zinc-200 font-medium">Extracting business listings from Google Maps...</div>
        <div className="text-xs text-zinc-500">Scanning names, phone numbers, websites, and emails in real-time.</div>
      </div>
    ) : null}

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
                        runScraper(parts[0], parts[1], 15);
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
        {currentView !== 'settings' && (
          <div className="absolute bottom-6 left-0 right-0 px-6 pointer-events-none flex justify-center z-20">
            {/* Mode & Active Filter Bar (Positioned right above prompt bar) */}
            <div className="absolute -top-10 left-6 right-6 flex items-center justify-between z-30 pointer-events-auto">
              {/* Active Filter Indicator Pill (Only shown when filters are selected) */}
              <div className="flex items-center gap-2">
                {requiredFields.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 backdrop-blur-xl text-[11px] font-semibold text-orange-400 animate-in fade-in-50 slide-in-from-bottom-1">
                    <Filter className="w-3 h-3 text-orange-400" />
                    <span>Must-Have: <strong className="text-white">{requiredFields.join(', ')}</strong></span>
                    <button
                      type="button"
                      onClick={() => setRequiredFields([])}
                      className="ml-1 hover:text-white text-zinc-400 p-0.5 rounded-full transition-colors cursor-pointer"
                      title="Clear active required fields filter"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Skip Previously Scraped Toggle */}
              <button
                type="button"
                onClick={() => setSkipPreviousLeads(prev => !prev)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold backdrop-blur-xl shadow-lg transition-all cursor-pointer shrink-0 ${
                  skipPreviousLeads 
                    ? 'bg-orange-500/15 border-orange-500/40 text-orange-400 shadow-orange-500/10' 
                    : 'bg-[#131924]/90 border-zinc-750 text-zinc-400 hover:text-zinc-200'
                }`}
                title={skipPreviousLeads ? "Skip previously extracted leads: Enabled" : "Skip previously extracted leads: Disabled"}
              >
                <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                <span className="hidden sm:inline">Skip Previously Scraped</span>
                <span className="sm:hidden">Skip Old</span>
                <div className={`w-7 h-4 rounded-full transition-colors relative flex items-center p-0.5 ${skipPreviousLeads ? 'bg-orange-500' : 'bg-zinc-700'}`}>
                  <div className={`w-3 h-3 rounded-full bg-white transition-transform ${skipPreviousLeads ? 'translate-x-3' : 'translate-x-0'}`} />
                </div>
              </button>
            </div>

            <div className="w-full max-w-3xl glass-card rounded-2xl border border-zinc-750/80 p-2 shadow-2xl bg-[#0b0e14]/90 backdrop-blur-2xl pointer-events-auto flex items-end gap-2 transition-all relative">
              
              {/* Green flash overlay effect */}
              <div className={`absolute inset-0 rounded-2xl bg-green-500/20 mix-blend-overlay pointer-events-none transition-opacity duration-500 ${flashInputs ? 'opacity-100' : 'opacity-0'}`}></div>
              
              <button 
                onClick={() => setAiPrompt("Extract 25 software companies in Sylhet")}
                className="p-3 text-zinc-400 hover:text-orange-400 transition-colors shrink-0"
                title="Click to insert sample prompt"
              >
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
                    handleSendAiPrompt(aiPrompt);
                  }
                }}
                placeholder="E.g. Extract 25 software companies in Sylhet..."
                className="flex-1 bg-transparent border-none resize-none outline-none text-sm text-zinc-200 placeholder:text-zinc-500 min-h-[44px] max-h-32 py-3 custom-scrollbar"
                rows={1}
              />
              
              <div className="flex items-center gap-1 shrink-0 p-1">
                <button 
                  ref={manualToggleButtonRef}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowManualBuilder(prev => !prev);
                  }}
                  className={`p-2 transition-all rounded-lg relative ${showManualBuilder ? 'text-orange-400 bg-orange-500/10' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'}`}
                  title="Manual Extraction Parameters & Must-Have Filters"
                >
                  <SlidersHorizontal className="w-5 h-5" />
                  {requiredFields.length > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-orange-500 ring-2 ring-[#0b0e14]" />
                  )}
                </button>

                <button 
                  onClick={() => setDeepWebScan(prev => !prev)}
                  className={`p-2 transition-colors rounded-lg ${deepWebScan ? 'text-orange-400 bg-orange-500/10' : 'text-zinc-500 hover:text-zinc-300'}`}
                  title={deepWebScan ? "Deep Web Crawler & Tech Scan: Enabled" : "Deep Web Crawler & Tech Scan: Disabled"}
                >
                  <Globe className="w-5 h-5" />
                </button>

                <button 
                  onClick={() => handleSendAiPrompt(aiPrompt)}
                  disabled={isConfiguringAI || !aiPrompt.trim()}
                  className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-yellow-500 hover:from-orange-400 hover:to-yellow-400 flex items-center justify-center text-white shadow-[0_0_15px_rgba(255,165,0,0.4)] disabled:opacity-50 disabled:shadow-none transition-all ml-1"
                >
                  {isConfiguringAI ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowLeft className="w-5 h-5 rotate-90" />}
                </button>
              </div>
            </div>

            {/* Raycast / Linear-Grade Command Popover */}
            {showManualBuilder && (
              <div 
                ref={manualBuilderRef}
                className="absolute bottom-full mb-4 right-0 sm:right-6 w-[92vw] sm:w-[440px] p-5 rounded-2xl bg-[#0c1017]/95 border border-zinc-750/90 backdrop-blur-3xl shadow-[0_30px_70px_rgba(0,0,0,0.95)] z-50 animate-in fade-in-80 zoom-in-95 space-y-4 pointer-events-auto ring-1 ring-white/5"
              >
                {/* Popover Header */}
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/25 flex items-center justify-center text-orange-400 shrink-0">
                      <SlidersHorizontal className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white tracking-wide uppercase">Extraction Parameters</h4>
                      <p className="text-[11px] text-zinc-400 font-medium">Specify target parameters & required contact fields</p>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setShowManualBuilder(false)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-all shrink-0 cursor-pointer"
                    title="Close Builder"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Form Input Grid */}
                <div className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    {/* Keyword Field */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-zinc-300 flex items-center gap-1">
                        <Search className="w-3 h-3 text-orange-400" />
                        Target Keyword
                      </label>
                      <Input
                        type="text"
                        placeholder="e.g. Software, Real Estate"
                        value={manualKeyword}
                        onChange={(e) => setManualKeyword(e.target.value)}
                        className="bg-zinc-950/80 border-zinc-800 text-xs text-white placeholder:text-zinc-600 h-9 px-3 rounded-xl focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-all"
                      />
                    </div>

                    {/* Location Field */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-zinc-300 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-orange-400" />
                        Target Location
                      </label>
                      <Input
                        type="text"
                        placeholder="e.g. Sylhet, Dubai"
                        value={manualLocation}
                        onChange={(e) => setManualLocation(e.target.value)}
                        className="bg-zinc-950/80 border-zinc-800 text-xs text-white placeholder:text-zinc-600 h-9 px-3 rounded-xl focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-all"
                      />
                    </div>
                  </div>

                  {/* Lead Count Selector */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-zinc-300">Extraction Count Limit</label>
                      <span className="text-[10px] text-orange-400 font-bold px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20">{manualLimit} Leads</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[15, 25, 50, 100].map((count) => (
                        <button
                          key={count}
                          type="button"
                          onClick={() => setManualLimit(count)}
                          className={`h-8 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                            manualLimit === count
                              ? 'bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border-orange-500 text-orange-400 shadow-md ring-1 ring-orange-500/30'
                              : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                          }`}
                        >
                          {count}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Must-Have Contact Fields Filter */}
                <div className="pt-2 border-t border-zinc-800/70">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Filter className="w-3 h-3 text-orange-400" />
                      Must-Have Required Fields
                    </label>
                    {requiredFields.length > 0 && (
                      <span className="text-[9px] font-bold text-orange-400 bg-orange-500/15 border border-orange-500/30 px-2 py-0.5 rounded-full">
                        {requiredFields.length} selected
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'email',     label: 'Email',     Icon: Mail,            color: 'text-emerald-400' },
                      { id: 'phone',     label: 'Phone',     Icon: Phone,           color: 'text-sky-400' },
                      { id: 'whatsapp',  label: 'WhatsApp',  Icon: MessageCircle,   color: 'text-green-400' },
                      { id: 'website',   label: 'Website',   Icon: Globe,           color: 'text-violet-400' },
                      { id: 'facebook',  label: 'Facebook',  Icon: Share2,          color: 'text-blue-400' },
                      { id: 'instagram', label: 'Instagram', Icon: Share2,          color: 'text-pink-400' },
                      { id: 'linkedin',  label: 'LinkedIn',  Icon: Building2,       color: 'text-cyan-400' },
                      { id: 'youtube',   label: 'YouTube',   Icon: Play,            color: 'text-red-400' },
                    ].map(({ id, label, Icon, color }) => {
                      const isActive = requiredFields.includes(id);
                      const toggleField = () => {
                        setRequiredFields(prev =>
                          isActive ? prev.filter(f => f !== id) : [...prev, id]
                        );
                      };
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={toggleField}
                          className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer select-none ${
                            isActive
                              ? 'bg-orange-500/15 border-orange-500/50 text-orange-300 ring-1 ring-orange-500/30 shadow-sm'
                              : 'bg-zinc-950/60 border-zinc-800/90 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                          }`}
                        >
                          <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-orange-400' : color}`} />
                          <span className="flex-1 text-left">{label}</span>
                          {isActive && <Check className="w-3.5 h-3.5 text-orange-400" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Popover Action Buttons */}
                <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setManualKeyword("");
                      setManualLocation("");
                      setManualLimit(25);
                      setRequiredFields([]);
                    }}
                    className="h-8 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 px-3 rounded-lg cursor-pointer"
                  >
                    Reset All
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      const kw = manualKeyword.trim() || "businesses";
                      const loc = manualLocation.trim() ? ` in ${manualLocation.trim()}` : "";
                      const generatedText = `Extract ${manualLimit} ${kw}${loc}`;
                      setAiPrompt(generatedText);
                      setShowManualBuilder(false);
                      setFlashInputs(true);
                      setTimeout(() => setFlashInputs(false), 1000);
                    }}
                    className="h-8 px-4 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-400 hover:to-yellow-400 text-white text-xs font-bold rounded-lg shadow-lg hover:shadow-orange-500/20 gap-1.5 transition-all cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Apply to Prompt
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Drawers / Modals */}
        <Sheet open={showCampaignSheet} onOpenChange={setShowCampaignSheet}>
          <SheetContent className="w-full sm:max-w-md h-full bg-[#131924]/95 border-l border-zinc-800 backdrop-blur-xl flex flex-col text-zinc-200 p-0" side="right">
             <div className="p-6 flex flex-col h-full">
                <SheetHeader className="pb-4 border-b border-zinc-800">
                  <SheetTitle className="text-lg font-bold text-white flex items-center gap-2">
                    <Mail className="w-5 h-5 text-orange-500" />
                    Outreach Campaign Settings
                  </SheetTitle>
                </SheetHeader>
                
                <div className="flex-1 overflow-y-auto py-6 space-y-6">
                  <div>
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Selected Leads ({selectedLeadIds.length})</label>
                    <div className="max-h-40 overflow-y-auto border border-zinc-800 bg-zinc-900/50 rounded-lg p-2 space-y-1.5 divide-y divide-zinc-850">
                      {selectedLeadIds.map(leadId => {
                        const targetLead = leads.find(l => l.id === leadId);
                        return targetLead ? (
                          <div key={leadId} className="flex justify-between items-center text-xs py-1.5 px-2">
                            <span className="font-medium text-zinc-200 truncate max-w-[200px]">{targetLead.name}</span>
                            <span className="text-zinc-500 truncate max-w-[120px]">{targetLead.email}</span>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Product/Service Description</label>
                    <textarea 
                      value={productDesc}
                      onChange={(e) => setProductDesc(e.target.value)}
                      placeholder="Describe what services or products you are promoting..."
                      className="w-full h-32 rounded-lg bg-zinc-900 border border-zinc-800 p-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-700 resize-none"
                    />
                    <p className="text-[11px] text-zinc-500">This description will be used by Gemini to draft personalized B2B cold emails for each lead based on their industry, tech stack, and online rating.</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-800 space-y-2">
                  <Button 
                    onClick={handleStartCampaign}
                    disabled={campaignSending || selectedLeadIds.length === 0}
                    className="w-full bg-gradient-to-br from-orange-500 to-yellow-500 hover:from-orange-400 hover:to-yellow-400 text-white font-medium shadow-[0_0_15px_rgba(255,165,0,0.3)] disabled:opacity-50"
                  >
                    {campaignSending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Launching Campaign...
                      </>
                    ) : (
                      `Send Outreach Campaign`
                    )}
                  </Button>
                  <Button variant="ghost" onClick={() => setShowCampaignSheet(false)} className="w-full text-zinc-400 hover:text-zinc-200">
                    Cancel
                  </Button>
                </div>
             </div>
          </SheetContent>
        </Sheet>

        <Sheet open={!!activeLead} onOpenChange={(open) => !open && setActiveLead(null)}>
          <SheetContent className="w-full sm:max-w-md h-full bg-[#131924]/95 border-l border-zinc-800 backdrop-blur-xl flex flex-col text-zinc-200 p-0 overflow-hidden" side="right">
             {activeLead && (
               <div className="flex flex-col h-full">
                 {/* Header */}
                 <div className="p-6 pb-4 border-b border-zinc-800/80 bg-zinc-900/40">
                   {/* Google Maps Original Business Photo / Dynamic Cover */}
                   {activeLead.image_url ? (
                     <div className="relative w-full h-36 rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800/80 mb-4 shadow-md group">
                       <img 
                         src={activeLead.image_url} 
                         alt={activeLead.name}
                         className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                         onError={(e) => {
                           e.target.parentElement.style.display = 'none';
                         }}
                       />
                       <div className="absolute inset-0 bg-gradient-to-t from-[#131924] via-transparent to-black/30"></div>
                       <Badge className="absolute bottom-2.5 left-2.5 bg-black/70 backdrop-blur-md text-zinc-200 border-zinc-700/60 text-[10px] gap-1">
                         <MapPin className="w-3 h-3 text-orange-400" />
                         Google Maps Photo
                       </Badge>
                     </div>
                   ) : (
                     <div className="relative w-full h-24 rounded-xl overflow-hidden bg-gradient-to-br from-zinc-850 via-zinc-900 to-[#182030] border border-zinc-800/80 mb-4 p-4 flex flex-col justify-between shadow-md">
                       <div className="flex items-center justify-between">
                         <div className="w-10 h-10 rounded-lg bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400 font-bold text-base shadow-sm">
                           {activeLead.name ? activeLead.name.substring(0, 2).toUpperCase() : 'BZ'}
                         </div>
                         <Badge className="bg-zinc-800/80 backdrop-blur-md text-zinc-300 border-zinc-700/60 text-[10px] gap-1">
                           <Building2 className="w-3 h-3 text-orange-400" />
                           Verified Business Profile
                         </Badge>
                       </div>
                       <div className="text-[11px] text-zinc-400 font-medium truncate mt-1">
                         {activeLead.address || 'Address available in contact section'}
                       </div>
                     </div>
                   )}

                   <div className="flex items-start justify-between gap-3">
                     <div>
                       <h3 className="text-lg font-bold text-white leading-tight">{activeLead.name}</h3>
                       {activeLead.website ? (
                         <a 
                           href={activeLead.website} 
                           target="_blank" 
                           rel="noopener noreferrer" 
                           className="text-xs text-primary-400 hover:underline flex items-center gap-1.5 mt-1 font-medium"
                         >
                           <Globe className="w-3.5 h-3.5" />
                           {activeLead.website}
                           <ExternalLink className="w-3 h-3" />
                         </a>
                       ) : (
                         <span className="text-xs text-zinc-500 mt-1 block">No website available</span>
                       )}
                     </div>
                     {activeLead.rating && (
                       <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 px-2.5 py-1 flex items-center gap-1 shrink-0">
                         <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                         <span className="font-bold text-xs">{activeLead.rating.toFixed(1)}</span>
                       </Badge>
                     )}
                   </div>
                 </div>

                 {/* Body - Scrollable */}
                 <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                   
                   {/* Contact Information */}
                   <div className="space-y-3">
                     <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Contact Information</h4>
                     
                     <div className="space-y-2">
                       {/* Email */}
                       <div className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-xl flex items-center justify-between">
                         <div className="flex items-center gap-3 min-w-0">
                           <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center text-primary-400 shrink-0">
                             <Mail className="w-4 h-4" />
                           </div>
                           <div className="min-w-0">
                             <div className="text-[10px] text-zinc-500 font-semibold uppercase">Email Address</div>
                             <div className="text-xs font-medium text-zinc-200 truncate">{activeLead.email || 'Not found'}</div>
                           </div>
                         </div>
                         {activeLead.email && (
                           <Badge className={`text-[9px] px-2 py-0.5 ml-2 ${
                             activeLead.email_status === 'deliverable' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                             activeLead.email_status === 'risky' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                             activeLead.email_status === 'undeliverable' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                             'bg-zinc-800 text-zinc-400 border-zinc-700'
                           }`}>
                             {activeLead.email_status || 'Unchecked'}
                           </Badge>
                         )}
                       </div>

                       {/* Phone */}
                       <div className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-xl flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
                           <Phone className="w-4 h-4" />
                         </div>
                         <div className="min-w-0">
                           <div className="text-[10px] text-zinc-500 font-semibold uppercase">Phone Number</div>
                           <div className="text-xs font-medium text-zinc-200">{activeLead.phone || 'Not available'}</div>
                         </div>
                       </div>

                       {/* Address */}
                       <div className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-xl flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400 shrink-0">
                           <MapPin className="w-4 h-4" />
                         </div>
                         <div className="min-w-0">
                           <div className="text-[10px] text-zinc-500 font-semibold uppercase">Location Address</div>
                           <div className="text-xs font-medium text-zinc-200">{activeLead.address || 'Not available'}</div>
                         </div>
                       </div>
                     </div>
                   </div>

                   {/* Live Google Map Location Embed */}
                   <div className="space-y-2">
                     <div className="flex items-center justify-between">
                       <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                         <MapPin className="w-3.5 h-3.5 text-orange-500" />
                         Live Map Location
                       </h4>
                       <a 
                         href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeLead.name + ' ' + (activeLead.address || ''))}`}
                         target="_blank" 
                         rel="noopener noreferrer"
                         className="text-[10px] text-orange-400 hover:underline flex items-center gap-1 font-medium"
                       >
                         Google Maps <ExternalLink className="w-2.5 h-2.5" />
                       </a>
                     </div>
                     <div className="w-full h-44 rounded-xl overflow-hidden border border-zinc-800/80 bg-zinc-900 shadow-inner">
                       <iframe
                         title="Google Map Location"
                         width="100%"
                         height="100%"
                         style={{ border: 0, filter: 'invert(90%) hue-rotate(180deg) contrast(1.1)' }}
                         loading="lazy"
                         allowFullScreen
                         src={`https://maps.google.com/maps?q=${encodeURIComponent(activeLead.address || activeLead.name)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                       ></iframe>
                     </div>
                   </div>

                   {/* Tech Stack */}
                   {activeLead.website_tech && (
                     <div className="space-y-2">
                       <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Detected Tech Stack</h4>
                       <div className="flex flex-wrap gap-1.5 p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-xl">
                         {activeLead.website_tech.split(',').map((tech, idx) => (
                           <Badge key={idx} variant="outline" className="bg-zinc-800 text-zinc-300 border-zinc-700 text-[10px] px-2 py-0.5">
                             {tech.trim()}
                           </Badge>
                         ))}
                       </div>
                     </div>
                   )}

                   {/* Social Profiles + WhatsApp */}
                   {(activeLead.facebook || activeLead.instagram || activeLead.linkedin || activeLead.youtube || activeLead.whatsapp) && (
                     <div className="space-y-2">
                       <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Social & Contact Profiles</h4>
                       <div className="grid grid-cols-2 gap-2">
                         {activeLead.whatsapp && (
                           <a
                             href={`https://wa.me/${activeLead.whatsapp.replace(/[^\d]/g, '')}`}
                             target="_blank"
                             rel="noopener noreferrer"
                             className="p-2.5 bg-green-500/10 border border-green-500/30 rounded-lg text-xs text-green-400 hover:bg-green-500/20 flex items-center gap-2 transition-colors"
                           >
                             <Phone className="w-3.5 h-3.5" /> {activeLead.whatsapp}
                           </a>
                         )}
                         {activeLead.facebook && (
                           <a href={activeLead.facebook} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded-lg text-xs text-blue-400 hover:bg-zinc-800/80 flex items-center gap-2 transition-colors">
                             <Globe className="w-3.5 h-3.5" /> Facebook
                           </a>
                         )}
                         {activeLead.instagram && (
                           <a href={activeLead.instagram} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded-lg text-xs text-pink-400 hover:bg-zinc-800/80 flex items-center gap-2 transition-colors">
                             <Globe className="w-3.5 h-3.5" /> Instagram
                           </a>
                         )}
                         {activeLead.linkedin && (
                           <a href={activeLead.linkedin} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded-lg text-xs text-sky-400 hover:bg-zinc-800/80 flex items-center gap-2 transition-colors">
                             <Globe className="w-3.5 h-3.5" /> LinkedIn
                           </a>
                         )}
                         {activeLead.youtube && (
                           <a href={activeLead.youtube} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded-lg text-xs text-red-400 hover:bg-zinc-800/80 flex items-center gap-2 transition-colors">
                             <Globe className="w-3.5 h-3.5" /> YouTube
                           </a>
                         )}
                       </div>
                     </div>
                   )}

                   {/* AI Generated Pitch */}
                   {activeLead.sales_pitch && (
                     <div className="space-y-2">
                       <div className="flex items-center justify-between">
                         <h4 className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
                           <Sparkles className="w-3.5 h-3.5" /> AI Outreach Proposal
                         </h4>
                         <Button 
                           variant="ghost" 
                           size="sm" 
                           className="h-6 px-2 text-[10px] text-zinc-400 hover:text-white"
                           onClick={() => navigator.clipboard.writeText(activeLead.sales_pitch)}
                         >
                           <Copy className="w-3 h-3 mr-1" /> Copy Pitch
                         </Button>
                       </div>
                       <div className="p-3.5 bg-gradient-to-b from-orange-500/5 to-transparent border border-orange-500/20 rounded-xl text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap font-mono">
                         {activeLead.sales_pitch}
                       </div>
                     </div>
                   )}

                   {/* Email Outreach Status */}
                   {activeLead.email_sent_status && (
                     <div className="space-y-2">
                       <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Campaign Status</h4>
                       <div className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-xl flex items-center justify-between text-xs">
                         <span className="text-zinc-400 font-medium">Status</span>
                         <Badge className={`text-[10px] capitalize ${
                           activeLead.email_sent_status === 'sent' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                           activeLead.email_sent_status === 'failed' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                           'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                         }`}>
                           {activeLead.email_sent_status}
                         </Badge>
                       </div>
                       {activeLead.email_sent_at && (
                         <div className="text-[10px] text-zinc-500 text-right">Sent at: {new Date(activeLead.email_sent_at).toLocaleString()}</div>
                       )}
                       {activeLead.email_sent_error && (
                         <div className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] rounded-lg">
                           {activeLead.email_sent_error}
                         </div>
                       )}
                     </div>
                   )}
                 </div>

                 {/* Footer */}
                 <div className="p-4 border-t border-zinc-800/80 bg-zinc-900/40">
                   <Button 
                     onClick={() => {
                       setSelectedLeadIds([activeLead.id]);
                       setActiveLead(null);
                       setShowCampaignSheet(true);
                     }}
                     className="w-full bg-gradient-to-br from-orange-500 to-yellow-500 hover:from-orange-400 hover:to-yellow-400 text-white text-xs font-medium h-9 shadow-[0_0_15px_rgba(255,165,0,0.3)]"
                   >
                     <Mail className="w-3.5 h-3.5 mr-2" /> Start Outreach for this Lead
                   </Button>
                 </div>
               </div>
             )}
          </SheetContent>
        </Sheet>

        {/* Help / Guide Modal */}
        <Sheet open={showHelpModal} onOpenChange={setShowHelpModal}>
          <SheetContent className="w-full sm:max-w-md h-full bg-[#131924]/95 border-l border-zinc-800 backdrop-blur-xl flex flex-col text-zinc-200 p-6 overflow-y-auto custom-scrollbar" side="right">
            <SheetHeader className="pb-4 border-b border-zinc-800">
              <SheetTitle className="text-lg font-bold text-white flex items-center gap-2">
                <Info className="w-5 h-5 text-orange-500" />
                How to Use Lid Gen
              </SheetTitle>
            </SheetHeader>

            <div className="py-6 space-y-6 text-xs text-zinc-300">
              <div className="p-4 bg-zinc-900/60 border border-zinc-800/80 rounded-xl space-y-2">
                <div className="font-bold text-sm text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-xs">1</span>
                  Extract B2B Leads
                </div>
                <p className="text-zinc-400 leading-relaxed">
                  Type your target industry and location into the bottom command bar (e.g. <em>"Extract 25 software companies in Sylhet"</em>) or click any preset keyword prompt.
                </p>
              </div>

              <div className="p-4 bg-zinc-900/60 border border-zinc-800/80 rounded-xl space-y-2">
                <div className="font-bold text-sm text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-xs">2</span>
                  Inspect & Export
                </div>
                <p className="text-zinc-400 leading-relaxed">
                  Select leads using checkboxes. Click <strong>Export Data</strong> to sync with Google Sheets or download a clean CSV file directly to your computer.
                </p>
              </div>

              <div className="p-4 bg-zinc-900/60 border border-zinc-800/80 rounded-xl space-y-2">
                <div className="font-bold text-sm text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-xs">3</span>
                  Automated Cold Outreach
                </div>
                <p className="text-zinc-400 leading-relaxed">
                  Click <strong>Start Outreach Campaign</strong> to generate AI-personalized pitch emails for each business and dispatch them automatically via SMTP or Gmail API.
                </p>
              </div>
            </div>

            <Button onClick={() => setShowHelpModal(false)} className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200">
              Got it, Close Guide
            </Button>
          </SheetContent>
        </Sheet>

        {/* Market Analytics Sheet */}
        <Sheet open={showMarketAnalytics} onOpenChange={setShowMarketAnalytics}>
          <SheetContent className="w-full sm:max-w-md h-full bg-[#131924]/95 border-l border-zinc-800 backdrop-blur-xl flex flex-col text-zinc-200 p-6 overflow-y-auto custom-scrollbar" side="right">
            <SheetHeader className="pb-4 border-b border-zinc-800">
              <SheetTitle className="text-lg font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-500" />
                Market Intelligence Overview
              </SheetTitle>
            </SheetHeader>

            <div className="py-6 space-y-6">
              {/* Stat Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-zinc-900/60 border border-zinc-800/80 rounded-xl">
                  <div className="text-[10px] uppercase font-bold text-zinc-500">Total Leads</div>
                  <div className="text-xl font-bold text-white mt-1">{leads.length}</div>
                </div>
                <div className="p-4 bg-zinc-900/60 border border-zinc-800/80 rounded-xl">
                  <div className="text-[10px] uppercase font-bold text-zinc-500">Email Coverage</div>
                  <div className="text-xl font-bold text-emerald-400 mt-1">
                    {leads.length > 0 ? Math.round((leads.filter(l => !!l.email).length / leads.length) * 100) : 0}%
                  </div>
                </div>
              </div>

              {/* Verified Emails & Ratings */}
              <div className="p-4 bg-zinc-900/60 border border-zinc-800/80 rounded-xl space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Data Quality Metrics</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">Has Phone Number</span>
                    <span className="font-bold text-zinc-200">{leads.filter(l => !!l.phone).length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">Has Website URL</span>
                    <span className="font-bold text-zinc-200">{leads.filter(l => !!l.website).length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">Average Rating</span>
                    <span className="font-bold text-yellow-400">
                      {leads.length > 0 ? (leads.reduce((a, b) => a + (b.rating || 0), 0) / leads.length).toFixed(1) : '—'} ⭐
                    </span>
                  </div>
                </div>
              </div>

              {/* Tech Stack Distribution */}
              <div className="p-4 bg-zinc-900/60 border border-zinc-800/80 rounded-xl space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Detected Website Tech</h4>
                <div className="flex flex-wrap gap-1.5">
                  {Array.from(new Set(leads.flatMap(l => (l.website_tech || '').split(',').map(t => t.trim()).filter(Boolean)))).map((tech, i) => (
                    <Badge key={i} variant="outline" className="bg-zinc-800 text-zinc-300 border-zinc-700 text-[10px]">
                      {tech}
                    </Badge>
                  ))}
                  {leads.every(l => !l.website_tech) && (
                    <span className="text-xs text-zinc-500">Scan domains during scraping to reveal tech stack.</span>
                  )}
                </div>
              </div>
            </div>

            <Button onClick={() => setShowMarketAnalytics(false)} className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200">
              Close Intelligence View
            </Button>
          </SheetContent>
        </Sheet>
      </main>
    </div>
  );
}


