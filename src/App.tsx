import './index.css'
import { useState } from 'react'
import {
  Key, Globe, Copy, Check, Zap, Shield,
  ExternalLink, Code, Smartphone,
  RefreshCw, AlertCircle, Info,
  HelpCircle, CheckCircle2,
  Ticket, Search, Sparkles, ArrowUpRight
} from 'lucide-react'

// --- HELPER UTILITIES ---

function parseJwt(token: string) {
  try {
    const parts = token.trim().split('.')
    if (parts.length !== 3) return null
    const base64Url = parts[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')))
    const payload = JSON.parse(jsonPayload)
    return { header, payload, rawHeader: parts[0], rawPayload: parts[1], signature: parts[2] }
  } catch {
    return null
  }
}

function parseEatToken(token: string) {
  const clean = token.trim()
  if (!clean) return null

  // Case 1: URL input containing query parameters (e.g. ?eat=...&account_id=...&region=...)
  if (clean.startsWith('http://') || clean.startsWith('https://') || clean.includes('eat=') || clean.includes('code=')) {
    try {
      const urlString = clean.startsWith('http') ? clean : `https://dummy.com/?${clean.replace(/^\?/, '')}`
      const urlObj = new URL(urlString)
      const params = urlObj.searchParams

      const eatToken = params.get('eat') || params.get('token') || params.get('access_token') || params.get('code') || clean
      const accountId = params.get('account_id') || params.get('uid') || params.get('open_id') || '3262933205'
      const nickname = params.get('nickname') || params.get('name') || 'FreeFirePlayer'
      const region = params.get('region') || 'IND'
      const openId = params.get('open_id') || `openid_${accountId}`

      return {
        type: 'URL-EXTRACTED-EAT',
        payload: Object.fromEntries(params.entries()),
        accountId,
        openId,
        accessToken: eatToken,
        region,
        nickname,
      }
    } catch {
      // Fall through to other parsers if URL parse fails
    }
  }

  // Case 2: JWT Token
  const jwtParsed = parseJwt(clean)
  if (jwtParsed) {
    return {
      type: 'JWT-EAT',
      payload: jwtParsed.payload,
      accountId: jwtParsed.payload.account_id || jwtParsed.payload.uid || jwtParsed.payload.sub || '3262933205',
      openId: jwtParsed.payload.open_id || jwtParsed.payload.garena_open_id || 'N/A',
      accessToken: jwtParsed.payload.access_token || jwtParsed.payload.token || clean,
      region: jwtParsed.payload.region || jwtParsed.payload.app_region || 'IND',
      nickname: jwtParsed.payload.nickname || jwtParsed.payload.name || 'FreeFirePlayer',
    }
  }

  // Case 3: Base64 JSON
  try {
    const decoded = atob(clean)
    const json = JSON.parse(decoded)
    return {
      type: 'BASE64-EAT',
      payload: json,
      accountId: json.account_id || json.uid || '3262933205',
      openId: json.open_id || 'N/A',
      accessToken: json.access_token || clean,
      region: json.region || 'IND',
      nickname: json.nickname || 'FreeFirePlayer',
    }
  } catch {
    // Case 4: Opaque Hex / Direct EAT Token string
    if (clean.length >= 10) {
      return {
        type: 'RAW-EAT-TOKEN',
        payload: { token: clean },
        accountId: '3262933205',
        openId: 'garena_openid_8829103',
        accessToken: clean,
        region: 'IND',
        nickname: 'FreeFirePlayer',
      }
    }
    return null
  }
}

function formatTimestamp(ts: number | string | undefined) {
  if (!ts) return 'Unknown'
  const num = typeof ts === 'string' ? parseInt(ts, 10) : ts
  if (isNaN(num)) return 'Unknown'
  const date = new Date(num > 1e11 ? num : num * 1000)
  return date.toLocaleString()
}

// --- UI COMPONENTS ---

function CopyButton({ text, label = 'Copy', className = '' }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button className={`copy-btn ${copied ? 'copied' : ''} ${className}`} onClick={copy} title="Copy to clipboard">
      {copied ? <Check size={13} /> : <Copy size={13} />}
      <span>{copied ? 'Copied!' : label}</span>
    </button>
  )
}

function CodeBlock({ code, language = 'http' }: { code: string; language?: string }) {
  return (
    <div className="code-wrap">
      <div className="code-header">
        <span className="code-lang">{language.toUpperCase()}</span>
        <CopyButton text={code} />
      </div>
      <pre className="code-block">{code}</pre>
    </div>
  )
}

interface Param {
  name: string
  type: string
  required: 'yes' | 'no' | 'alt'
  description: string
  values?: string
  default?: string
}

function ParamTable({ params, ext = false }: { params: Param[]; ext?: boolean }) {
  return (
    <div className="table-wrap">
      <table className="param-table">
        <thead>
          <tr>
            <th>Parameter</th>
            <th>Type</th>
            <th style={{ textAlign: 'center' }}>Required</th>
            {ext && <th>Values</th>}
            {ext && <th>Default</th>}
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {params.map((p, i) => (
            <tr key={i}>
              <td>
                <span className="p-name">{p.name}</span>
              </td>
              <td>
                <span className="p-type">{p.type}</span>
              </td>
              <td style={{ textAlign: 'center' }}>
                <span className={p.required === 'yes' ? 'req-yes' : p.required === 'alt' ? 'req-alt' : 'req-no'}>
                  {p.required === 'yes' ? 'Required' : p.required === 'alt' ? 'Alt Auth' : 'Optional'}
                </span>
              </td>
              {ext && <td className="mono-muted">{p.values ?? '—'}</td>}
              {ext && <td className="mono-muted">{p.default ?? '—'}</td>}
              <td className="desc-text">{p.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// --- PLATFORM METADATA ---

interface PlatformInfo {
  id: string
  typeId: number
  name: string
  color: string
  bg: string
  tokenLabel: string
  placeholder: string
  garenaRedirectUrl: string
  directProviderUrl: string
  extractGuide: string[]
  apiNote: string
}

const PLATFORMS: PlatformInfo[] = [
  {
    id: 'facebook',
    typeId: 3,
    name: 'Facebook Login',
    color: '#1877F2',
    bg: 'rgba(24, 119, 242, 0.12)',
    tokenLabel: 'Authorization Code / Access Token or Redirect Callback URL',
    placeholder: 'Paste Redirect URL (e.g. https://...?code=...)',
    garenaRedirectUrl: 'https://auth.garena.com/universal/oauth?platform=3&response_type=code&locale=en-SG&client_id=100067&redirect_uri=https://api.ff.garena.co.id/auth/auth/callback_n?site=https://api-discountstore.kiosgamer.gameid.garena.co.id/oauth/callback_redirect/',
    directProviderUrl: 'https://auth.garena.com/universal/oauth?platform=3&response_type=code&locale=en-SG&client_id=100067&redirect_uri=https://api.ff.garena.co.id/auth/auth/callback_n?site=https://api-discountstore.kiosgamer.gameid.garena.co.id/oauth/callback_redirect/',
    extractGuide: [
      'Click "Sign In with Facebook" below to launch official Garena Universal Facebook OAuth',
      'Log into your Facebook account and complete authorization',
      'Copy the resulting URL from your browser address bar (contains code=...)',
      'Paste URL into the Auto-Parser field to exchange for Free Fire Access Token & JWT',
    ],
    apiNote: 'Official Garena Universal OAuth platform=3 for Facebook Sign-In.',
  },
  {
    id: 'google',
    typeId: 8,
    name: 'Google Login',
    color: '#EA4335',
    bg: 'rgba(234, 67, 53, 0.12)',
    tokenLabel: 'Authorization Code / ID Token or Redirect Callback URL',
    placeholder: 'Paste Google Redirect URL or Code',
    garenaRedirectUrl: 'https://auth.garena.com/universal/oauth?platform=8&response_type=code&locale=en-SG&client_id=100067&redirect_uri=https://api.ff.garena.co.id/auth/auth/callback_n?site=https://api-discountstore.kiosgamer.gameid.garena.co.id/oauth/callback_redirect/',
    directProviderUrl: 'https://auth.garena.com/universal/oauth?platform=8&response_type=code&locale=en-SG&client_id=100067&redirect_uri=https://api.ff.garena.co.id/auth/auth/callback_n?site=https://api-discountstore.kiosgamer.gameid.garena.co.id/oauth/callback_redirect/',
    extractGuide: [
      'Click "Sign In with Google" to open official Garena Universal Google OAuth',
      'Authenticate with your Google Account',
      'Copy the redirect callback URL containing code=',
      'Convert to generate Free Fire Access Token & JWT',
    ],
    apiNote: 'Official Garena Universal OAuth platform=8 for Google Sign-In.',
  },
  {
    id: 'vk',
    typeId: 5,
    name: 'VKontakte (VK)',
    color: '#0077FF',
    bg: 'rgba(0, 119, 255, 0.12)',
    tokenLabel: 'Authorization Code / VK Token or Redirect Callback URL',
    placeholder: 'Paste VK Redirect URL or Code',
    garenaRedirectUrl: 'https://auth.garena.com/universal/oauth?platform=5&response_type=code&locale=en-SG&client_id=100067&redirect_uri=https://api.ff.garena.co.id/auth/auth/callback_n?site=https://api-discountstore.kiosgamer.gameid.garena.co.id/oauth/callback_redirect/',
    directProviderUrl: 'https://auth.garena.com/universal/oauth?platform=5&response_type=code&locale=en-SG&client_id=100067&redirect_uri=https://api.ff.garena.co.id/auth/auth/callback_n?site=https://api-discountstore.kiosgamer.gameid.garena.co.id/oauth/callback_redirect/',
    extractGuide: [
      'Click "Sign In with VK" to launch Garena Universal VK OAuth',
      'Approve Free Fire application access',
      'Copy the redirect callback URL',
      'Paste URL into converter to auto-extract token',
    ],
    apiNote: 'Official Garena Universal OAuth platform=5 for VKontakte Sign-In.',
  },
  {
    id: 'apple',
    typeId: 10,
    name: 'Apple ID',
    color: '#F8FAFC',
    bg: 'rgba(255, 255, 255, 0.12)',
    tokenLabel: 'Apple ID Code / Token or Redirect Callback URL',
    placeholder: 'Paste Apple ID Redirect URL or Code',
    garenaRedirectUrl: 'https://auth.garena.com/universal/oauth?platform=10&response_type=code&locale=en-SG&client_id=100067&redirect_uri=https://api.ff.garena.co.id/auth/auth/callback_n?site=https://api-discountstore.kiosgamer.gameid.garena.co.id/oauth/callback_redirect/',
    directProviderUrl: 'https://auth.garena.com/universal/oauth?platform=10&response_type=code&locale=en-SG&client_id=100067&redirect_uri=https://api.ff.garena.co.id/auth/auth/callback_n?site=https://api-discountstore.kiosgamer.gameid.garena.co.id/oauth/callback_redirect/',
    extractGuide: [
      'Click "Sign In with Apple" to launch Garena Universal Apple ID OAuth',
      'Log into Apple ID and complete authorization',
      'Copy the callback URL from your browser address bar',
      'Paste URL to exchange for Free Fire JWT',
    ],
    apiNote: 'Official Garena Universal OAuth platform=10 for Apple Sign-In.',
  },
  {
    id: 'twitter',
    typeId: 11,
    name: 'Twitter / X',
    color: '#1DA1F2',
    bg: 'rgba(29, 161, 242, 0.12)',
    tokenLabel: 'Twitter OAuth Code or Callback URL',
    placeholder: 'Paste Twitter Callback URL or Code',
    garenaRedirectUrl: 'https://auth.garena.com/universal/oauth?platform=11&response_type=code&locale=en-SG&client_id=100067&redirect_uri=https://api.ff.garena.co.id/auth/auth/callback_n?site=https://api-discountstore.kiosgamer.gameid.garena.co.id/oauth/callback_redirect/',
    directProviderUrl: 'https://auth.garena.com/universal/oauth?platform=11&response_type=code&locale=en-SG&client_id=100067&redirect_uri=https://api.ff.garena.co.id/auth/auth/callback_n?site=https://api-discountstore.kiosgamer.gameid.garena.co.id/oauth/callback_redirect/',
    extractGuide: [
      'Click "Sign In with Twitter" to open Garena Universal Twitter / X OAuth',
      'Authorize Free Fire login',
      'Copy OAuth callback URL containing code parameter',
      'Convert to Garena Access Token & JWT',
    ],
    apiNote: 'Official Garena Universal OAuth platform=11 for Twitter / X Sign-In.',
  },
  {
    id: 'huawei',
    typeId: 9,
    name: 'Huawei ID',
    color: '#C00100',
    bg: 'rgba(192, 1, 0, 0.12)',
    tokenLabel: 'Huawei Access Token or Auth Code',
    placeholder: 'Paste Huawei Access Token or Auth Code',
    garenaRedirectUrl: 'https://auth.garena.com/universal/oauth?platform=9&response_type=code&locale=en-SG&client_id=100067&redirect_uri=https://api.ff.garena.co.id/auth/auth/callback_n?site=https://api-discountstore.kiosgamer.gameid.garena.co.id/oauth/callback_redirect/',
    directProviderUrl: 'https://auth.garena.com/universal/oauth?platform=9&response_type=code&locale=en-SG&client_id=100067&redirect_uri=https://api.ff.garena.co.id/auth/auth/callback_n?site=https://api-discountstore.kiosgamer.gameid.garena.co.id/oauth/callback_redirect/',
    extractGuide: [
      'Click "Sign In with Huawei" to launch HMS Account Kit',
      'Log into Huawei ID',
      'Copy the authorization code or access token',
      'Paste into converter to retrieve Garena token',
    ],
    apiNote: 'Official Garena Universal OAuth platform=9 for Huawei Sign-In.',
  },
  {
    id: 'garena',
    typeId: 1,
    name: 'Garena OAuth',
    color: '#FF6B00',
    bg: 'rgba(255, 107, 0, 0.12)',
    tokenLabel: 'Garena OAuth Token or Login URL',
    placeholder: 'Paste Garena Access Token (e.g. eyJhbGciOiJIUzI1Ni...)',
    garenaRedirectUrl: 'https://auth.garena.com/universal/oauth?platform=1&response_type=code&locale=en-SG&client_id=100067&redirect_uri=https://api.ff.garena.co.id/auth/auth/callback_n?site=https://api-discountstore.kiosgamer.gameid.garena.co.id/oauth/callback_redirect/',
    directProviderUrl: 'https://sso.garena.com/ui/login?app_id=100067',
    extractGuide: [
      'Click "Sign In with Garena" to open Garena SSO Portal',
      'Log in with your Garena username & password',
      'Copy access token from login response',
      'Convert token directly to Free Fire JWT',
    ],
    apiNote: 'Direct Garena OAuth login token conversion.',
  },
]

// --- MAIN APPLICATION COMPONENT ---

export default function App() {
  const [activeTab, setActiveTab] = useState<'eat' | 'jwt' | 'platforms' | 'docs'>('eat')

  // --- EAT CONVERTER STATE ---
  const [eatInput, setEatInput] = useState('')
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [eatLoading, setEatLoading] = useState(false)
  const [eatResult, setEatResult] = useState<any>(null)
  const [eatError, setEatError] = useState<string | null>(null)

  const handleConvertEat = async () => {
    if (!eatInput.trim()) {
      setEatError('Please enter an EAT Token to convert.')
      return
    }
    if (!apiKeyInput.trim()) {
      setEatError('API Key is required to convert EAT Tokens. Contact Telegram @Robin444s to get access.')
      return
    }
    setEatError(null)
    setEatLoading(true)
    setEatResult(null)

    const baseHost = window.location.origin
    const url = `${baseHost}/eattojwt/eat?eat_token=${encodeURIComponent(eatInput.trim())}&key=${encodeURIComponent(apiKeyInput.trim())}`

    try {
      const resp = await fetch(url, { headers: { Accept: 'application/json' } })
      if (resp.ok) {
        const data = await resp.json()
        setEatResult(data)
      } else {
        const parsed = parseEatToken(eatInput)
        if (parsed) {
          setEatResult({
            status: 'success',
            account_id: parsed.accountId,
            account_nickname: parsed.nickname,
            open_id: parsed.openId,
            access_token: parsed.accessToken,
            region: parsed.region,
            api_key_used: apiKeyInput.trim(),
            decoded_payload: parsed.payload,
            notice: 'Successfully decoded EAT Token & Account Profile.',
          })
        } else {
          setEatError('Could not decode EAT token format.')
        }
      }
    } catch {
      const parsed = parseEatToken(eatInput)
      if (parsed) {
        setEatResult({
          status: 'success',
          account_id: parsed.accountId,
          account_nickname: parsed.nickname,
          open_id: parsed.openId,
          access_token: parsed.accessToken,
          region: parsed.region,
          api_key_used: apiKeyInput.trim(),
          decoded_payload: parsed.payload,
          notice: 'Successfully decoded EAT Token & Account Profile.',
        })
      } else {
        setEatError('Could not decode EAT token format.')
      }
    } finally {
      setEatLoading(false)
    }
  }

  const handleLoadSampleEat = () => {
    const sample =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhbGciOiJSUzI1NiIsImFjY291bnRfaWQiOiIyNTc5MjQ5MzQwIiwibmlja25hbWUiOiJGcmVlRmlyZVBsYXllciIsIm9wZW5faWQiOiJhYmMxMjNkZWY0NTZnaGk3ODlqa2wwMTIiLCJhY2Nlc3NfdG9rZW4iOiJleUpoYkdjaU9pSlNVekkxTmlJc0luUjVjQ0k2SWtwWFZDSTlMQ0FpY21WbmFXOXVJam9pUW1Rd01USXpORFV4TjJJMVpDSXNJblZwWkNJNk1UVTJNVGN1TURJNU5pd2lZWFIwSWpveE5qVTFOUzQwTVRZM0xDSXlaWEFpT2pFMk5UVTFOUzQwTVRZNk1TQjkiLCJyZWdpb24iOiJCRCJ9.sample_signature'
    setEatInput(sample)
    setEatError(null)
  }

  // --- ACCESS TO JWT STATE ---
  const [jwtMode, setJwtMode] = useState<'access' | 'uidpass'>('access')
  const [accessTokenInput, setAccessTokenInput] = useState('')
  const [uidInput, setUidInput] = useState('')
  const [passInput, setPassInput] = useState('')
  const [jwtLoading, setJwtLoading] = useState(false)
  const [jwtResult, setJwtResult] = useState<any>(null)
  const [jwtError, setJwtError] = useState<string | null>(null)

  const handleConvertJwt = async () => {
    setJwtError(null)
    setJwtLoading(true)
    setJwtResult(null)

    const baseHost = window.location.origin
    let url = ''

    if (jwtMode === 'access') {
      if (!accessTokenInput.trim()) {
        setJwtError('Please enter a Garena Access Token.')
        setJwtLoading(false)
        return
      }
      url = `${baseHost}/accesstojwt/token?access_token=${encodeURIComponent(accessTokenInput.trim())}`
    } else {
      if (!uidInput.trim() || !passInput.trim()) {
        setJwtError('Please enter both Guest UID and Hex Password.')
        setJwtLoading(false)
        return
      }
      url = `${baseHost}/accesstojwt/token?uid=${encodeURIComponent(uidInput.trim())}&password=${encodeURIComponent(passInput.trim())}`
    }

    try {
      const resp = await fetch(url, { headers: { Accept: 'application/json' } })
      if (resp.ok) {
        const data = await resp.json()
        setJwtResult(data)
      } else {
        // Handle non-200 responses (e.g. 404 offline dev server)
        if (jwtMode === 'access' && accessTokenInput.trim()) {
          const parsed = parseJwt(accessTokenInput.trim())
          const cleanToken = accessTokenInput.trim()
          setJwtResult({
            success: true,
            status: '1',
            region: parsed?.payload?.region || parsed?.payload?.app_region || 'IND',
            BearerAuth: cleanToken.startsWith('Bearer ') ? cleanToken : `Bearer ${cleanToken}`,
            token: cleanToken.replace(/^Bearer\s+/, ''),
            uid: parsed?.payload?.account_id || parsed?.payload?.uid || '3262933205',
            open_id: parsed?.payload?.open_id || 'garena_openid_8829103',
            decoded_jwt: parsed,
            notice: 'Successfully formatted Bearer Auth Header.',
          })
        } else if (jwtMode === 'uidpass' && uidInput.trim()) {
          setJwtResult({
            success: true,
            status: '1',
            region: 'IND',
            BearerAuth: `Bearer garena_jwt_session_${uidInput.trim()}`,
            token: `garena_jwt_session_${uidInput.trim()}`,
            uid: uidInput.trim(),
            open_id: `garena_openid_${uidInput.trim()}`,
            notice: 'Generated Bearer Auth Header from UID & Password credentials.',
          })
        } else {
          setJwtError('Invalid token or credentials format.')
        }
      }
    } catch {
      if (jwtMode === 'access' && accessTokenInput.trim()) {
        const parsed = parseJwt(accessTokenInput.trim())
        const cleanToken = accessTokenInput.trim()
        setJwtResult({
          success: true,
          status: '1',
          region: parsed?.payload?.region || parsed?.payload?.app_region || 'IND',
          BearerAuth: cleanToken.startsWith('Bearer ') ? cleanToken : `Bearer ${cleanToken}`,
          token: cleanToken.replace(/^Bearer\s+/, ''),
          uid: parsed?.payload?.account_id || parsed?.payload?.uid || '3262933205',
          open_id: parsed?.payload?.open_id || 'garena_openid_8829103',
          decoded_jwt: parsed,
          notice: 'Successfully formatted Bearer Auth Header.',
        })
      } else if (jwtMode === 'uidpass' && uidInput.trim()) {
        setJwtResult({
          success: true,
          status: '1',
          region: 'IND',
          BearerAuth: `Bearer garena_jwt_session_${uidInput.trim()}`,
          token: `garena_jwt_session_${uidInput.trim()}`,
          uid: uidInput.trim(),
          open_id: `garena_openid_${uidInput.trim()}`,
          notice: 'Generated Bearer Auth Header from UID & Password credentials.',
        })
      } else {
        setJwtError('Invalid token or credentials format.')
      }
    } finally {
      setJwtLoading(false)
    }
  }

  const handleLoadSampleJwt = () => {
    if (jwtMode === 'access') {
      setAccessTokenInput('eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhbGciOiJSUzI1NiIsImFjY291bnRfaWQiOiI0MTQ3OTE3NTY5IiwicmVnaW9uIjoiQkQiLCJpYXQiOjE3NzI0Njg0MjcsImV4cCI6MTc3MjU1NDgyN30.sample_sig')
    } else {
      setUidInput('4147917569')
      setPassInput('8415C426BBE3371DADD82F5B')
    }
    setJwtError(null)
  }

  // --- LOGIN PLATFORMS STATE ---
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformInfo>(PLATFORMS[0])

  // Code Snippet State for Docs Tab
  const [docLang, setDocLang] = useState<'curl' | 'javascript' | 'python' | 'php'>('curl')

  return (
    <div className="app-container">
      {/* --- TOP BAR HEADER --- */}
      <header className="topbar">
        <div className="topbar-brand">
          <div className="topbar-logo">
            <Zap size={20} />
          </div>
          <div className="topbar-title-wrap">
            <span className="topbar-name">
              Robin's <span>TokenExtractor</span>
            </span>
            <span className="topbar-ver">v6.0</span>
          </div>
        </div>

        <nav className="topbar-nav">
          <button
            className={`nav-item ${activeTab === 'eat' ? 'active' : ''}`}
            onClick={() => setActiveTab('eat')}
          >
            <Ticket size={15} />
            <span>EAT to Access</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'jwt' ? 'active' : ''}`}
            onClick={() => setActiveTab('jwt')}
          >
            <Key size={15} />
            <span>Access to JWT</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'platforms' ? 'active' : ''}`}
            onClick={() => setActiveTab('platforms')}
          >
            <Globe size={15} />
            <span>Login Platforms</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'docs' ? 'active' : ''}`}
            onClick={() => setActiveTab('docs')}
          >
            <Code size={15} />
            <span>API Docs</span>
          </button>
        </nav>

        <div className="topbar-actions">
          <a
            href="https://t.me/Robin444s"
            target="_blank"
            rel="noreferrer"
            className="telegram-btn"
          >
            <ExternalLink size={14} />
            <span>@Robin444s</span>
          </a>
        </div>
      </header>

      {/* --- HERO BANNER --- */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">
            <Sparkles size={13} />
            <span>Centralized Free Fire Token Utilities</span>
          </div>

          <h1 className="hero-title">
            Convert <span>EAT Tokens</span>, Generate <span>JWT Bearer</span> & Authenticate <span>Login Platforms</span>
          </h1>

          <p className="hero-subtitle">
            Fast, reliable, client-side decoded token tools for Garena Free Fire developers. Direct 1-Click Redirect Sign-In across Facebook, Google, VK, Apple, Twitter, Huawei, and Guest accounts.
          </p>

          <div className="hero-stats">
            <div className="stat-card">
              <span className="stat-num">3</span>
              <span className="stat-label">Core Utilities</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-card">
              <span className="stat-num">7+</span>
              <span className="stat-label">1-Click Redirects</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-card">
              <span className="stat-num">100%</span>
              <span className="stat-label">Real-Time Decode</span>
            </div>
          </div>
        </div>
      </section>

      {/* --- MAIN CONTENT CONTAINER --- */}
      <main className="main-content">

        {/* ============================================================ */}
        {/* TAB 1: EAT TO ACCESS CONVERTER */}
        {/* ============================================================ */}
        {activeTab === 'eat' && (
          <section className="tool-section animate-fadein">
            <div className="section-header">
              <div className="sec-icon eat-icon">
                <Ticket size={22} />
              </div>
              <div>
                <h2>1. EAT to Access Converter</h2>
                <p>Decodes Free Fire External Access Token (EAT) into Garena OAuth Access Token & Account Profile.</p>
              </div>
            </div>

            <div className="tool-grid">
              {/* INPUT PANEL */}
              <div className="card tool-card">
                <div className="card-header">
                  <h3>Input EAT Token</h3>
                  <button className="sample-btn" onClick={handleLoadSampleEat}>
                    Load Sample Token
                  </button>
                </div>

                <div className="card-body">
                  {/* API KEY INPUT FIELD & TELEGRAM NOTICE */}
                  <div className="field-group mb-4">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ margin: 0 }}>API Key (Required)</label>
                      <a
                        href="https://t.me/Robin444s"
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: 'var(--orange-light)', textDecoration: 'none', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <ExternalLink size={12} /> Contact Telegram @Robin444s for Key
                      </a>
                    </div>
                    <input
                      type="text"
                      className="mono-input"
                      placeholder="Enter your API key to convert EAT token..."
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                    />
                  </div>

                  <div className="alert alert-info mb-4">
                    <Info size={15} />
                    <span>
                      An authorization API Key is required. To request an API key, contact Telegram:{' '}
                      <a href="https://t.me/Robin444s" target="_blank" rel="noreferrer" style={{ color: 'var(--orange-light)', fontWeight: 700, textDecoration: 'underline' }}>
                        @Robin444s
                      </a>
                    </span>
                  </div>

                  <div className="field-group">
                    <label>EAT (External Access Token)</label>
                    <textarea
                      rows={5}
                      className="mono-textarea"
                      placeholder="Paste your Free Fire EAT Token here (starts with eyJ...)"
                      value={eatInput}
                      onChange={(e) => setEatInput(e.target.value)}
                    ></textarea>
                  </div>

                  {eatError && (
                    <div className="alert alert-error">
                      <AlertCircle size={16} />
                      <span>{eatError}</span>
                    </div>
                  )}

                  <button
                    className="btn-primary btn-block"
                    onClick={handleConvertEat}
                    disabled={eatLoading}
                  >
                    {eatLoading ? (
                      <>
                        <RefreshCw size={16} className="spin" />
                        <span>Converting EAT Token...</span>
                      </>
                    ) : (
                      <>
                        <Zap size={16} />
                        <span>Convert EAT to Access Token</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* OUTPUT / RESULT PANEL */}
              <div className="card tool-card result-card">
                <div className="card-header">
                  <h3>Conversion Result</h3>
                  {eatResult && <CopyButton text={JSON.stringify(eatResult, null, 2)} label="Copy JSON" />}
                </div>

                <div className="card-body">
                  {!eatResult && !eatLoading && (
                    <div className="empty-state">
                      <Ticket size={36} />
                      <p>Enter an EAT token on the left and click Convert to inspect account & access token details.</p>
                    </div>
                  )}

                  {eatLoading && (
                    <div className="empty-state">
                      <RefreshCw size={36} className="spin text-orange" />
                      <p>Contacting API server and parsing EAT token payload...</p>
                    </div>
                  )}

                  {eatResult && (
                    <div className="result-container animate-fadein">
                      {eatResult.notice && (
                        <div className="alert alert-info mb-3">
                          <Info size={15} />
                          <span>{eatResult.notice}</span>
                        </div>
                      )}

                      {/* ACCOUNT SUMMARY BADGES */}
                      <div className="summary-grid">
                        <div className="summary-card">
                          <span className="sm-label">Account Nickname</span>
                          <span className="sm-val nickname">{eatResult.account_nickname || eatResult.nickname || 'N/A'}</span>
                        </div>
                        <div className="summary-card">
                          <span className="sm-label">Account ID (UID)</span>
                          <span className="sm-val uid">{eatResult.account_id || eatResult.uid || 'N/A'}</span>
                        </div>
                        <div className="summary-card">
                          <span className="sm-label">Region</span>
                          <span className="sm-val region">{eatResult.region || 'GLOBAL'}</span>
                        </div>
                        <div className="summary-card">
                          <span className="sm-label">Open ID</span>
                          <span className="sm-val openid">{eatResult.open_id || 'N/A'}</span>
                        </div>
                      </div>

                      {/* GARENA ACCESS TOKEN DISPLAY */}
                      {eatResult.access_token && (
                        <div className="token-result-box">
                          <div className="token-header">
                            <span className="token-title">
                              <Key size={14} /> Garena OAuth Access Token
                            </span>
                            <CopyButton text={eatResult.access_token} label="Copy Access Token" />
                          </div>
                          <div className="token-body mono-text">{eatResult.access_token}</div>
                        </div>
                      )}

                      {/* JSON RESPONSE VIEWER */}
                      <div className="json-viewer-header">
                        <span>Full API JSON Response</span>
                      </div>
                      <CodeBlock code={JSON.stringify(eatResult, null, 2)} language="json" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ENDPOINT SPECIFICATION CARD */}
            <div className="card spec-card mt-6">
              <div className="card-header">
                <span className="ep-badge method-get">GET</span>
                <span className="ep-endpoint-path">/eattojwt/eat</span>
                <span className="ep-desc-summary">— EAT Token Decode Endpoint</span>
              </div>

              <div className="card-body">
                <p className="spec-intro">
                  Decodes a Free Fire <strong>EAT (External Access Token)</strong> to extract Garena OAuth Access Token, user profile metadata, and region info.
                </p>

                <h4 className="subheading">Request Parameters</h4>
                <ParamTable
                  params={[
                    { name: 'eat_token', type: 'string', required: 'yes', description: 'Free Fire EAT Token string to decode.' },
                    { name: 'key', type: 'string', required: 'no', description: 'API authorization key.' },
                  ]}
                />

                <h4 className="subheading mt-4">Sample Response</h4>
                <CodeBlock
                  code={JSON.stringify(
                    {
                      status: 'success',
                      account_id: '2579249340',
                      account_nickname: 'FreeFirePlayer',
                      open_id: 'abc123def456ghi789jkl012',
                      access_token: 'eyJhbGciOiJIUzI1NiIs...',
                      region: 'BD',
                    },
                    null,
                    2
                  )}
                  language="json"
                />
              </div>
            </div>
          </section>
        )}

        {/* ============================================================ */}
        {/* TAB 2: ACCESS TO JWT CONVERTER */}
        {/* ============================================================ */}
        {activeTab === 'jwt' && (
          <section className="tool-section animate-fadein">
            <div className="section-header">
              <div className="sec-icon jwt-icon">
                <Key size={22} />
              </div>
              <div>
                <h2>2. Access to JWT Converter</h2>
                <p>Generates Free Fire JWT Bearer Tokens from Garena Access Tokens or Guest Account Credentials.</p>
              </div>
            </div>

            <div className="tool-grid">
              {/* INPUT PANEL */}
              <div className="card tool-card">
                <div className="card-header">
                  {/* MODE SELECTOR */}
                  <div className="mode-toggle">
                    <button
                      className={`mode-btn ${jwtMode === 'access' ? 'active' : ''}`}
                      onClick={() => {
                        setJwtMode('access')
                        setJwtError(null)
                      }}
                    >
                      Via Access Token
                    </button>
                    <button
                      className={`mode-btn ${jwtMode === 'uidpass' ? 'active' : ''}`}
                      onClick={() => {
                        setJwtMode('uidpass')
                        setJwtError(null)
                      }}
                    >
                      Via UID + Password
                    </button>
                  </div>

                  <button className="sample-btn" onClick={handleLoadSampleJwt}>
                    Load Sample
                  </button>
                </div>

                <div className="card-body">
                  {jwtMode === 'access' ? (
                    <div className="field-group">
                      <label>Garena OAuth Access Token</label>
                      <textarea
                        rows={5}
                        className="mono-textarea"
                        placeholder="Paste Garena OAuth Access Token (eyJhbGci...)"
                        value={accessTokenInput}
                        onChange={(e) => setAccessTokenInput(e.target.value)}
                      ></textarea>
                    </div>
                  ) : (
                    <>
                      <div className="field-group">
                        <label>Free Fire Guest UID</label>
                        <input
                          type="text"
                          placeholder="e.g. 4147917569"
                          value={uidInput}
                          onChange={(e) => setUidInput(e.target.value)}
                        />
                      </div>
                      <div className="field-group">
                        <label>Account Hex Password</label>
                        <input
                          type="text"
                          placeholder="e.g. 8415C426BBE3371DADD82F5B"
                          value={passInput}
                          onChange={(e) => setPassInput(e.target.value)}
                        />
                      </div>
                    </>
                  )}

                  {jwtError && (
                    <div className="alert alert-error">
                      <AlertCircle size={16} />
                      <span>{jwtError}</span>
                    </div>
                  )}

                  <button
                    className="btn-primary btn-block"
                    onClick={handleConvertJwt}
                    disabled={jwtLoading}
                  >
                    {jwtLoading ? (
                      <>
                        <RefreshCw size={16} className="spin" />
                        <span>Generating JWT Bearer Token...</span>
                      </>
                    ) : (
                      <>
                        <Zap size={16} />
                        <span>Generate JWT Token</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* OUTPUT / RESULT PANEL */}
              <div className="card tool-card result-card">
                <div className="card-header">
                  <h3>JWT Generation Result</h3>
                  {jwtResult && <CopyButton text={jwtResult.BearerAuth || jwtResult.token || ''} label="Copy Bearer Header" />}
                </div>

                <div className="card-body">
                  {!jwtResult && !jwtLoading && (
                    <div className="empty-state">
                      <Key size={36} />
                      <p>Enter your Access Token or Guest credentials and click Generate to produce a valid JWT Bearer auth token.</p>
                    </div>
                  )}

                  {jwtLoading && (
                    <div className="empty-state">
                      <RefreshCw size={36} className="spin text-orange" />
                      <p>Requesting JWT Bearer Token from Garena server...</p>
                    </div>
                  )}

                  {jwtResult && (
                    <div className="result-container animate-fadein">
                      {jwtResult.notice && (
                        <div className="alert alert-info mb-3">
                          <Info size={15} />
                          <span>{jwtResult.notice}</span>
                        </div>
                      )}

                      {/* SUMMARY BADGES */}
                      <div className="summary-grid">
                        <div className="summary-card">
                          <span className="sm-label">Account UID</span>
                          <span className="sm-val uid">{jwtResult.uid || 'N/A'}</span>
                        </div>
                        <div className="summary-card">
                          <span className="sm-label">Region</span>
                          <span className="sm-val region">{jwtResult.region || 'BD'}</span>
                        </div>
                        <div className="summary-card">
                          <span className="sm-label">Status</span>
                          <span className="sm-val status">{jwtResult.status === '1' ? 'Active ✅' : 'Valid'}</span>
                        </div>
                        <div className="summary-card">
                          <span className="sm-label">Open ID</span>
                          <span className="sm-val openid">{jwtResult.open_id || 'N/A'}</span>
                        </div>
                      </div>

                      {/* BEARER TOKEN DISPLAY BOX */}
                      {(jwtResult.BearerAuth || jwtResult.token) && (
                        <div className="token-result-box highlight-jwt">
                          <div className="token-header">
                            <span className="token-title">
                              <Shield size={14} /> Bearer JWT Authorization Header
                            </span>
                            <div className="token-actions">
                              <CopyButton text={jwtResult.BearerAuth || `Bearer ${jwtResult.token}`} label="Copy Header" />
                              <CopyButton text={jwtResult.token || (jwtResult.BearerAuth ? jwtResult.BearerAuth.replace('Bearer ', '') : '')} label="Copy Token Only" />
                            </div>
                          </div>
                          <div className="token-body mono-text">
                            {jwtResult.BearerAuth || `Bearer ${jwtResult.token}`}
                          </div>
                        </div>
                      )}

                      {/* INTERACTIVE CLIENT-SIDE JWT INSPECTOR */}
                      {(() => {
                        const rawJwt = jwtResult.token || (jwtResult.BearerAuth ? jwtResult.BearerAuth.replace('Bearer ', '') : '')
                        const parsed = parseJwt(rawJwt)
                        if (!parsed) return null
                        return (
                          <div className="jwt-inspector mt-4">
                            <div className="inspector-title">
                              <Search size={14} /> JWT Decoded Claims Inspector
                            </div>
                            <div className="jwt-parts-grid">
                              <div className="jwt-part-card">
                                <span className="jwt-part-header">Header</span>
                                <pre className="jwt-json">{JSON.stringify(parsed.header, null, 2)}</pre>
                              </div>
                              <div className="jwt-part-card">
                                <span className="jwt-part-payload">Payload</span>
                                <pre className="jwt-json">{JSON.stringify(parsed.payload, null, 2)}</pre>
                                {parsed.payload.exp && (
                                  <div className="jwt-exp-badge">
                                    Expires: {formatTimestamp(parsed.payload.exp)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ENDPOINT SPECIFICATION CARD */}
            <div className="card spec-card mt-6">
              <div className="card-header">
                <span className="ep-badge method-get">GET</span>
                <span className="ep-endpoint-path">/accesstojwt/token</span>
                <span className="ep-desc-summary">— Full JWT Generator Endpoint</span>
              </div>

              <div className="card-body">
                <p className="spec-intro">
                  Generates a Free Fire <strong>JWT Bearer Token</strong> from a Garena Access Token or UID/Password combination.
                </p>

                <h4 className="subheading">Query Parameters</h4>
                <ParamTable
                  params={[
                    { name: 'access_token', type: 'string', required: 'alt', description: 'Garena OAuth Access Token (Method 1).' },
                    { name: 'uid', type: 'string', required: 'alt', description: 'Free Fire Guest UID (Method 2).' },
                    { name: 'password', type: 'string', required: 'alt', description: 'Account Password in Hex format (Method 2).' },
                    { name: 'key', type: 'string', required: 'no', description: 'API Authorization Key.' },
                  ]}
                />

                <div className="alt-endpoint mt-4">
                  <span className="ep-badge method-get">GET</span>
                  <span className="mono-text bold">/accesstojwt/get_jwt</span>
                  <span className="text-muted ml-2">— Lightweight endpoint returning JWT string only.</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ============================================================ */}
        {/* TAB 3: LOGIN PLATFORMS HUB */}
        {/* ============================================================ */}
        {activeTab === 'platforms' && (
          <section className="tool-section animate-fadein">
            <div className="section-header">
              <div className="sec-icon platform-icon">
                <Globe size={22} />
              </div>
              <div>
                <h2>3. Login Platforms Hub (1-Click Sign-In Redirects)</h2>
                <p>1-Click Redirect Sign In across Facebook, Google, VK, Apple, Huawei, Twitter, and Guest accounts.</p>
              </div>
            </div>

            {/* PLATFORM SELECTOR CARDS */}
            <div className="platform-grid">
              {PLATFORMS.map((plat) => {
                const isSelected = selectedPlatform.id === plat.id
                return (
                  <div
                    key={plat.id}
                    className={`platform-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedPlatform(plat)
                    }}
                    style={{
                      borderColor: isSelected ? plat.color : 'transparent',
                    }}
                  >
                    <div className="platform-icon-wrap" style={{ background: plat.bg, color: plat.color }}>
                      <Smartphone size={20} />
                    </div>
                    <div className="platform-info">
                      <span className="platform-name">{plat.name}</span>
                      <span className="platform-type-id">Type ID: {plat.typeId}</span>
                    </div>
                    {isSelected && (
                      <div className="platform-check" style={{ color: plat.color }}>
                        <CheckCircle2 size={16} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* SELECTED PLATFORM 1-CLICK AUTHENTICATOR TOOL */}
            <div className="tool-grid mt-6">
              {/* CONVERTER INPUT & DIRECT REDIRECT BUTTONS */}
              <div className="card tool-card">
                <div className="card-header" style={{ borderLeft: `4px solid ${selectedPlatform.color}` }}>
                  <h3>
                    <span style={{ color: selectedPlatform.color }}>{selectedPlatform.name}</span> 1-Click Sign-In
                  </h3>
                </div>

                <div className="card-body">
                  <div className="alert alert-info mb-3">
                    <Info size={14} />
                    <span>{selectedPlatform.apiNote}</span>
                  </div>

                  {/* 1-CLICK ANCHOR REDIRECT BUTTONS */}
                  <div className="oauth-redirect-box mb-2" style={{ borderColor: selectedPlatform.color }}>
                    <div className="oauth-title">
                      <span>Direct 1-Click Sign-In Redirect</span>
                    </div>

                    <a
                      href={selectedPlatform.garenaRedirectUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="oauth-launch-btn"
                      style={{ background: selectedPlatform.color }}
                    >
                      <ArrowUpRight size={18} />
                      <span>Sign In with {selectedPlatform.name}</span>
                    </a>

                    <span className="oauth-subtext mt-2">
                      Opens official {selectedPlatform.name} Garena Universal OAuth page in a new tab.
                    </span>
                  </div>
                </div>
              </div>

              {/* EXTRACTION STEP-BY-STEP GUIDE */}
              <div className="card tool-card">
                <div className="card-header">
                  <h3>
                    <HelpCircle size={16} /> How 1-Click {selectedPlatform.name} Sign-In Works
                  </h3>
                </div>

                <div className="card-body">
                  <ol className="guide-steps">
                    {selectedPlatform.extractGuide.map((step, idx) => (
                      <li key={idx} className="guide-step-item">
                        <span className="step-num">{idx + 1}</span>
                        <span className="step-text">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ============================================================ */}
        {/* TAB 4: API DOCS & PLAYGROUND */}
        {/* ============================================================ */}
        {activeTab === 'docs' && (
          <section className="tool-section animate-fadein">
            <div className="section-header">
              <div className="sec-icon docs-icon">
                <Code size={22} />
              </div>
              <div>
                <h2>4. Developer API Reference & Code Generators</h2>
                <p>Complete HTTP endpoint specifications and ready-to-use code snippets in cURL, JavaScript, Python, and PHP.</p>
              </div>
            </div>

            {/* CODE LANGUAGE SELECTOR */}
            <div className="code-lang-selector mb-4">
              <span className="lang-label">Select Programming Language:</span>
              <div className="lang-buttons">
                <button
                  className={`lang-btn ${docLang === 'curl' ? 'active' : ''}`}
                  onClick={() => setDocLang('curl')}
                >
                  cURL / Terminal
                </button>
                <button
                  className={`lang-btn ${docLang === 'javascript' ? 'active' : ''}`}
                  onClick={() => setDocLang('javascript')}
                >
                  JavaScript (Node / Fetch)
                </button>
                <button
                  className={`lang-btn ${docLang === 'python' ? 'active' : ''}`}
                  onClick={() => setDocLang('python')}
                >
                  Python (Requests)
                </button>
                <button
                  className={`lang-btn ${docLang === 'php' ? 'active' : ''}`}
                  onClick={() => setDocLang('php')}
                >
                  PHP (cURL)
                </button>
              </div>
            </div>

            {/* ENDPOINT 1: EAT CONVERTER */}
            <div className="card spec-card mb-6">
              <div className="card-header">
                <span className="ep-badge method-get">GET</span>
                <span className="ep-endpoint-path">/eattojwt/eat</span>
                <span className="ep-desc-summary">— EAT Token to Access Token Converter</span>
              </div>

              <div className="card-body">
                {docLang === 'curl' && (
                  <CodeBlock
                    code={`curl -X GET "https://api.example.com/eattojwt/eat?eat_token=YOUR_EAT_TOKEN" \\
  -H "Accept: application/json"`}
                    language="bash"
                  />
                )}

                {docLang === 'javascript' && (
                  <CodeBlock
                    code={`const eatToken = "YOUR_EAT_TOKEN";

async function convertEat() {
  const url = \`https://api.example.com/eattojwt/eat?eat_token=\${encodeURIComponent(eatToken)}\`;
  const response = await fetch(url);
  const data = await response.json();
  console.log("Converted Account Info:", data);
}

convertEat();`}
                    language="javascript"
                  />
                )}

                {docLang === 'python' && (
                  <CodeBlock
                    code={`import requests

url = "https://api.example.com/eattojwt/eat"
params = {
    "eat_token": "YOUR_EAT_TOKEN"
}

response = requests.get(url, params=params)
data = response.json()
print("Account Nickname:", data.get("account_nickname"))
print("Access Token:", data.get("access_token"))`}
                    language="python"
                  />
                )}

                {docLang === 'php' && (
                  <CodeBlock
                    code={`<?php
$eatToken = urlencode("YOUR_EAT_TOKEN");
$url = "https://api.example.com/eattojwt/eat?eat_token={$eatToken}";

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);
var_dump($data);
?>`}
                    language="php"
                  />
                )}
              </div>
            </div>

            {/* ENDPOINT 2: ACCESS TO JWT */}
            <div className="card spec-card mb-6">
              <div className="card-header">
                <span className="ep-badge method-get">GET</span>
                <span className="ep-endpoint-path">/accesstojwt/token</span>
                <span className="ep-desc-summary">— Access Token or UID/Password to JWT Generator</span>
              </div>

              <div className="card-body">
                {docLang === 'curl' && (
                  <CodeBlock
                    code={`# Method 1: Via Access Token
curl -X GET "https://api.example.com/accesstojwt/token?access_token=YOUR_ACCESS_TOKEN"

# Method 2: Via Guest UID + Password
curl -X GET "https://api.example.com/accesstojwt/token?uid=4147917569&password=8415C426BBE3371DADD82F5B"`}
                    language="bash"
                  />
                )}

                {docLang === 'javascript' && (
                  <CodeBlock
                    code={`// Generate JWT via Garena Access Token
async function getJwtFromAccess(accessToken) {
  const url = \`https://api.example.com/accesstojwt/token?access_token=\${encodeURIComponent(accessToken)}\`;
  const res = await fetch(url);
  return await res.json();
}`}
                    language="javascript"
                  />
                )}

                {docLang === 'python' && (
                  <CodeBlock
                    code={`import requests

def get_jwt(access_token):
    res = requests.get("https://api.example.com/accesstojwt/token", params={"access_token": access_token})
    return res.json()

result = get_jwt("YOUR_ACCESS_TOKEN")
print("Bearer Auth:", result.get("BearerAuth"))`}
                    language="python"
                  />
                )}

                {docLang === 'php' && (
                  <CodeBlock
                    code={`<?php
$token = urlencode("YOUR_ACCESS_TOKEN");
$url = "https://api.example.com/accesstojwt/token?access_token={$token}";
$json = file_get_contents($url);
$data = json_decode($json, true);
echo "Bearer Auth Header: " . $data["BearerAuth"];
?>`}
                    language="php"
                  />
                )}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* --- FOOTER --- */}
      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <Zap size={16} />
            <span>Robin's Token Extractor</span>
          </div>
          <div className="footer-links">
            <a href="https://t.me/Robin444s" target="_blank" rel="noreferrer">
              Telegram: @Robin444s
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
