// Centralized Frontend Configuration
export const getApiBase = () => {
  if (typeof window === 'undefined') {
    return 'https://lid-gen-aioq.onrender.com/api';
  }

  // 1. Check custom tunnel URL in localStorage
  const savedCustom = localStorage.getItem('CUSTOM_API_BASE');
  if (savedCustom && savedCustom.trim()) {
    return savedCustom.trim().replace(/\/+$/, '');
  }

  // 2. Check query param ?api=... for quick tunnel linking
  const urlParams = new URLSearchParams(window.location.search);
  const paramApi = urlParams.get('api');
  if (paramApi && paramApi.trim()) {
    localStorage.setItem('CUSTOM_API_BASE', paramApi.trim().replace(/\/+$/, ''));
    return paramApi.trim().replace(/\/+$/, '');
  }

  // 3. Localhost detection
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:8000/api';
  }

  // 4. Default to Render cloud
  return 'https://lid-gen-aioq.onrender.com/api';
};

export const API_BASE = getApiBase();

export const CONFIG_DEFAULTS = {
  DEFAULT_SCRAPE_LIMIT: 50,
  DEFAULT_MANUAL_LIMIT: 25,
  DEFAULT_TABLE_PAGE_SIZE: 15,
  PAGE_SIZE_OPTIONS: [15, 25, 50, 100, 500],
  RECENT_SESSIONS_LIMIT: 10,
  DEFAULT_SMTP_PORT: 587,
  SAMPLE_PROMPTS: [
    'Plumbers in Seattle',
    'Marketing agencies in London',
    'Dentists in Toronto',
    'Real estate in Dubai'
  ]
};

// Contact fields available for the "Must-Have Fields" filter
export const CONTACT_FIELDS = [
  { id: 'email',     label: 'Email',     color: 'emerald' },
  { id: 'phone',     label: 'Phone',     color: 'sky' },
  { id: 'whatsapp',  label: 'WhatsApp',  color: 'green' },
  { id: 'website',   label: 'Website',   color: 'violet' },
  { id: 'facebook',  label: 'Facebook',  color: 'blue' },
  { id: 'instagram', label: 'Instagram', color: 'pink' },
  { id: 'linkedin',  label: 'LinkedIn',  color: 'cyan' },
  { id: 'youtube',   label: 'YouTube',   color: 'red' },
];
