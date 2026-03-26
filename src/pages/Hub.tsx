import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Logo } from '../imports/Logo1'
import { Lock, ArrowRight, Layers, MessageSquare, Eye, EyeOff, Sparkles } from 'lucide-react'

const PASSWORD = 'seazonedesign'
const SESSION_KEY = 'hub_auth'

const APPS = [
  {
    id: 'variacoes',
    path: '/variacoes',
    title: 'Automação de variações',
    description: 'Gere criativos de feed e story com múltiplas estruturas e variações automaticamente.',
    icon: Layers,
    accent: 'var(--primary)',
    accentLight: 'rgba(0,85,255,0.06)',
    accentBorder: 'rgba(0,85,255,0.12)',
    formats: ['Feed 4:5', 'Story 9:16'],
    badge: 'Variações',
    beta: false,
  },
  {
    id: 'whatsapp',
    path: '/whatsapp',
    title: 'Estáticos WhatsApp',
    description: 'Crie uma arte de WhatsApp dentro da identidade Seazone.',
    icon: MessageSquare,
    accent: 'var(--cores-verde-600, #5EA500)',
    accentLight: 'rgba(94,165,0,0.06)',
    accentBorder: 'rgba(94,165,0,0.12)',
    formats: ['WhatsApp 1:1', 'Story 9:16'],
    badge: 'WhatsApp',
    beta: false,
  },
  {
    id: 'campanha',
    path: '/campanha',
    title: 'Gerador de Campanhas IA',
    description: 'Envie seu briefing e a IA cria anúncios, variações e vídeos automaticamente.',
    icon: Sparkles,
    accent: '#7C3AED',
    accentLight: 'rgba(124,58,237,0.06)',
    accentBorder: 'rgba(124,58,237,0.15)',
    formats: ['Feed 4:5', 'Story 9:16', 'Vídeo'],
    badge: 'IA Geração',
    beta: true,
  },
]

export default function Hub() {
  const navigate = useNavigate()
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [shaking, setShaking] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === '1') {
      setAuthenticated(true)
    }
  }, [])

  const handleLogin = () => {
    if (password === PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, '1')
      setAuthenticated(true)
      setError(false)
    } else {
      setError(true)
      setShaking(true)
      setTimeout(() => setShaking(false), 500)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin()
  }

  if (!authenticated) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-4"
        style={{ backgroundColor: 'var(--background)' }}
      >
        <div
          className={`w-full max-w-sm animate-fade-in-up ${shaking ? 'animate-shake' : ''}`}
          style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--elevation-md)',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            className="px-8 pt-8 pb-6 flex flex-col items-center gap-4"
            style={{ background: 'linear-gradient(135deg, var(--cores-azul-50) 0%, rgba(0,85,255,0.03) 100%)' }}
          >
            <div style={{ width: 140 }}>
              <Logo variant="dark" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="h3" style={{ color: 'var(--foreground)' }}>Design Hub</span>
              <span className="body-regular" style={{ color: 'var(--muted-foreground)' }}>
                Acesso restrito à equipe Seazone
              </span>
            </div>
          </div>

          {/* Form */}
          <div className="px-8 pb-8 pt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="detail-medium" style={{ color: 'var(--muted-foreground)' }}>
                Senha de acesso
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(false) }}
                  onKeyDown={handleKeyDown}
                  placeholder="Digite a senha..."
                  className="w-full px-4 py-2.5 pr-10 rounded-xl body"
                  style={{
                    backgroundColor: 'var(--input)',
                    border: `1.5px solid ${error ? 'var(--destructive, #EF4444)' : 'var(--border)'}`,
                    color: 'var(--foreground)',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {error && (
                <span className="detail-regular" style={{ color: 'var(--destructive, #EF4444)' }}>
                  Senha incorreta. Tente novamente.
                </span>
              )}
            </div>

            <button
              onClick={handleLogin}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-full transition-all hover:opacity-90 active:scale-95 hover-lift"
              style={{
                backgroundColor: 'var(--primary)',
                color: 'var(--primary-foreground)',
                border: 'none',
              }}
            >
              <Lock size={15} />
              <span className="p-ui">Entrar</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      {/* Header */}
      <header className="gradient-header">
        <div className="max-w-6xl mx-auto px-4 md:px-8 lg:px-12">
          <div className="flex items-center gap-4 py-5">
            <div style={{ width: '140px', flexShrink: 0 }}>
              <Logo variant="white" />
            </div>
            <div className="w-px h-5 flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
            <span className="body flex-shrink-0" style={{ color: 'rgba(255,255,255,0.65)' }}>
              Design Hub
            </span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 md:px-8 lg:px-12 py-10 md:py-14">
        <div className="animate-fade-in-up flex flex-col gap-8">

          {/* Title */}
          <div className="flex flex-col gap-1">
            <h1 style={{ color: 'var(--foreground)' }}>Ferramentas de criação</h1>
            <span className="body-regular" style={{ color: 'var(--muted-foreground)' }}>
              Selecione uma aplicação para começar
            </span>
          </div>

          {/* App cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {APPS.map((app) => {
              const Icon = app.icon
              return (
                <button
                  key={app.id}
                  onClick={() => navigate(app.path)}
                  className="text-left rounded-2xl overflow-hidden transition-all hover-lift active:scale-[0.98]"
                  style={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--elevation-sm)',
                    cursor: 'pointer',
                  }}
                >
                  {/* Card header */}
                  <div
                    className="px-6 pt-6 pb-5"
                    style={{
                      background: `linear-gradient(135deg, ${app.accentLight} 0%, transparent 100%)`,
                      borderBottom: `1px solid ${app.accentBorder}`,
                    }}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <span
                        className="w-12 h-12 flex items-center justify-center rounded-2xl flex-shrink-0"
                        style={{ backgroundColor: app.accent, color: '#fff' }}
                      >
                        <Icon size={22} />
                      </span>
                      <div className="flex items-center gap-2">
                        {app.beta && (
                          <span
                            className="detail-medium px-2.5 py-1 rounded-full flex-shrink-0"
                            style={{ backgroundColor: 'rgba(124,58,237,0.1)', color: '#7C3AED', border: '1px solid rgba(124,58,237,0.2)', fontSize: 10 }}
                          >
                            Beta
                          </span>
                        )}
                        <span
                          className="detail-medium px-3 py-1 rounded-full flex-shrink-0"
                          style={{
                            backgroundColor: app.accentLight,
                            color: app.accent,
                            border: `1px solid ${app.accentBorder}`,
                          }}
                        >
                          {app.badge}
                        </span>
                      </div>
                    </div>
                    <h2 style={{ color: 'var(--foreground)', margin: 0, fontSize: '1.1rem', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontWeight: 700 }}>
                      {app.title}
                    </h2>
                  </div>

                  {/* Card body */}
                  <div className="px-6 py-4 flex flex-col gap-4">
                    <span className="body-regular" style={{ color: 'var(--muted-foreground)' }}>
                      {app.description}
                    </span>

                    {/* Formats */}
                    <div className="flex gap-2 flex-wrap">
                      {app.formats.map((fmt) => (
                        <span
                          key={fmt}
                          className="detail-medium px-2.5 py-1 rounded-full"
                          style={{
                            backgroundColor: 'var(--secondary)',
                            color: 'var(--secondary-foreground)',
                          }}
                        >
                          {fmt}
                        </span>
                      ))}
                    </div>

                    {/* CTA */}
                    <div
                      className="flex items-center gap-2 pt-1"
                      style={{ color: app.accent }}
                    >
                      <span className="p-ui-medium">Abrir aplicação</span>
                      <ArrowRight size={16} />
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
