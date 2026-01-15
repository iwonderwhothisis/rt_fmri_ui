const normalizeBase = (base: string) => {
  if (!base) return '';
  return base.endsWith('/') ? base.slice(0, -1) : base;
};

export const getApiBaseUrl = () => normalizeBase(import.meta.env.VITE_API_BASE || '');

export const getWsBaseUrl = () => {
  const wsBase = normalizeBase(import.meta.env.VITE_WS_BASE || '');
  if (wsBase) return wsBase;

  const apiBase = getApiBaseUrl();
  if (!apiBase) return '';

  const url = new URL(apiBase);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.origin;
};

export const buildApiUrl = (path: string) => {
  const base = getApiBaseUrl();
  if (!base) return path;
  return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`;
};
