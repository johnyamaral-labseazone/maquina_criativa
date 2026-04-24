import { useState, useEffect, useRef } from 'react'
import { useCampanha2Store } from '../../stores/campanha2Store'
import type { AgentBase, CopySet2, Roteiro } from '../../stores/campanha2Store'
import {
  CheckCircle2, AlertCircle, Clock, Loader2, ChevronRight,
  Headphones, PenLine, Palette, Film, Award, Ban, Edit3, Check, RotateCcw, Timer
} from 'lucide-react'

// ── Status badge ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  idle:    { label: 'Aguardando',  color: 'var(--muted-foreground)',   bg: 'var(--secondary)',           icon: Clock },
  working: { label: 'Trabalhando', color: '#0055FF',                   bg: 'rgba(0,85,255,0.1)',         icon: Loader2 },
  waiting: { label: 'Revisão',     color: '#EA580C',                   bg: 'rgba(234,88,12,0.1)',        icon: Edit3 },
  done:    { label: 'Concluído',   color: '#5EA500',                   bg: 'rgba(94,165,0,0.1)',         icon: CheckCircle2 },
  error:   { label: 'Erro',        color: '#EF4444',                   bg: 'rgba(239,68,68,0.1)',        icon: AlertCircle },
}

const PHASE_ESTIMATES = { 1: 45, 2: 120, 3: 20 }

function PhaseTimer({ active, estimate }: { active: boolean; estimate: number }) {
  const [elapsed, setElapsed] = useState(0)
  const ref = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (active) {
      setElapsed(0)
      ref.current = setInterval(() => setElapsed(e => e + 1), 1000)
    } else {
      if (ref.current) clearInterval(ref.current)
    }
    return () => { if (ref.current) clearInterval(ref.current) }
  }, [active])

  if (!active) return null
  const remaining = Math.max(0, estimate - elapsed)
  const pct = Math.min(100, (elapsed / estimate) * 100)
  return (
    <div className="flex items-center gap-2" style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>
      <Timer size={10} />
      <span>{elapsed}s</span>
      {remaining > 0 && <span>· ~{remaining}s restantes</span>}
      <div style={{ flex: 1, height: 2, backgroundColor: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: pct + '%', height: '100%', backgroundColor: '#0055FF', borderRadius: 99, transition: 'width 1s linear' }} />
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: AgentBase['status'] }) {
  const cfg = STATUS_CONFIG[status]
  const Icon = cfg.icon
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.bg }}>
      <Icon size={11} style={{ color: cfg.color, animation: status === 'working' ? 'spin 1s linear infinite' : 'none' }} />
      <span style={{ fontSize: 10, fontWeight: 600, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{cfg.label}</span>
    </div>
  )
}

// ── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ height: 3, backgroundColor: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
      <div style={{ width: `${value}%`, height: '100%', backgroundColor: color, borderRadius: 99, transition: 'width 0.6s ease' }} />
    </div>
  )
}

// ── Log viewer ───────────────────────────────────────────────────────────────
function AgentLogs({ logs }: { logs: AgentBase['logs'] }) {
  if (!logs.length) return null
  const logColors = { info: 'var(--muted-foreground)', success: '#5EA500', error: '#EF4444', action: '#EA580C' }
  return (
    <div className="rounded-xl px-3 py-2 flex flex-col gap-0.5" style={{ backgroundColor: 'var(--secondary)', maxHeight: 64, overflowY: 'auto' }}>
      {logs.slice(-5).map((l, i) => (
        <div key={i} className="flex gap-2" style={{ fontSize: 11, fontFamily: 'monospace' }}>
          <span style={{ color: 'var(--muted-foreground)', flexShrink: 0 }}>{l.time}</span>
          <span style={{ color: logColors[l.type] }}>{l.msg}</span>
        </div>
      ))}
    </div>
  )
}

// ── Phase label ───────────────────────────────────────────────────────────────
function PhaseLabel({ number, label, active, done, estimate }: { number: number; label: string; active: boolean; done: boolean; estimate: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
      <span style={{ width: 20, height: 20, borderRadius: "50%", backgroundColor: done ? "#5EA500" : active ? "#1C398E" : "var(--secondary)", color: done || active ? "#fff" : "var(--muted-foreground)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{done ? "✓" : number}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: active ? "var(--foreground)" : "var(--muted-foreground)" }}>{label}</span>
      {active && <PhaseTimer active={active} estimate={estimate} />}
    </div>
  )
}

// ── Restart panel ─────────────────────────────────────────────────────────────
function RestartPanel({ problemas, onRestart }: { problemas: string[]; onRestart: (obs: string) => void }) {
  return (
    <div style={{ padding: 12, backgroundColor: "rgba(239,68,68,0.08)", borderRadius: 8, border: "1px solid rgba(239,68,68,0.2)" }}>
      <p style={{ color: "#EF4444", fontSize: 12, fontWeight: 600, margin: "0 0 6px" }}>Problemas detectados:</p>
      {problemas.map((p, i) => <p key={i} style={{ color: "var(--foreground)", fontSize: 12, margin: "2px 0" }}>• {p}</p>)}
      <button onClick={() => onRestart("")} style={{ marginTop: 8, padding: "6px 14px", borderRadius: 6, border: "none", backgroundColor: "#EF4444", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Reiniciar com feedback</button>
    </div>
  )
}

// ── Agent card ────────────────────────────────────────────────────────────────
function CompactAgentCard({
  icon: Icon, label, role, color, agent, children,
}: {
  icon: React.ElementType; label: string; role: string; color: string; agent: AgentBase; children?: React.ReactNode
}) {
  const active = agent.status !== 'idle'
  return (
    <div
      className="flex flex-col gap-3 p-4 rounded-2xl transition-all"
      style={{
        border: active ? `1.5px solid ${color}30` : '1px solid var(--border)',
        backgroundColor: 'var(--card)',
        boxShadow: agent.status === 'working' ? `0 0 0 2px ${color}20` : 'none',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: active ? color : 'var(--secondary)' }}
          >
            <Icon size={15} style={{ color: active ? '#fff' : 'var(--muted-foreground)' }} />
          </div>
          <div className="flex flex-col" style={{ lineHeight: 1.3 }}>
            <span className="p-ui-medium" style={{ color: 'var(--foreground)' }}>{label}</span>
            <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{role}</span>
          </div>
        </div>
        <StatusBadge status={agent.status} />
      </div>

      {/* Progress */}
      {(agent.status === 'working' || agent.status === 'done') && (
        <ProgressBar value={agent.progress} color={color} />
      )}

      {/* Message */}
      {active && (
        <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: 0 }}>{agent.message}</p>
      )}

      {/* Logs */}
      {active && <AgentLogs logs={agent.logs} />}

      {/* Custom content */}
      {children}
    </div>
  )
}

// ── Copy editor panel ─────────────────────────────────────────────────────────
function CopyEditor() {
  const { redator, updateCopy, approveRedator, cancelAgency } = useCampanha2Store()
  const copies = Array.isArray(redator.copies) ? redator.copies : []
  const [activeIdx, setActiveIdx] = useState(0)

  const estruturas = [...new Set(copies.map(c => c.estrutura))].sort()

  return (
    <div className="flex flex-col gap-4 p-5 rounded-2xl" style={{ border: '1.5px solid #EA580C40', backgroundColor: 'var(--card)' }}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Edit3 size={16} style={{ color: '#EA580C' }} />
          <span className="p-ui-medium" style={{ color: 'var(--foreground)' }}>Revisão do Redator</span>
          <span className="detail-regular" style={{ color: 'var(--muted-foreground)' }}>— revise as copies antes de enviar ao Designer</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={cancelAgency}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all hover:opacity-80"
            style={{ backgroundColor: 'var(--secondary)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--muted-foreground)', fontSize: 12 }}
          >
            <Ban size={12} /> Cancelar
          </button>
          <button
            onClick={() => approveRedator()}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl transition-all hover:opacity-90"
            style={{ backgroundColor: '#5EA500', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
          >
            <Check size={13} /> Aprovar e Gerar
          </button>
        </div>
      </div>

      {/* Structure tabs */}
      <div className="flex gap-1">
        {estruturas.map(e => {
          const eCopies = copies.filter(c => c.estrutura === e)
          const isActive = copies[activeIdx]?.estrutura === e
          return (
            <button
              key={e}
              onClick={() => setActiveIdx(copies.findIndex(c => c.estrutura === e))}
              className="px-3 py-1.5 rounded-xl transition-all"
              style={{
                backgroundColor: isActive ? 'var(--primary)' : 'var(--secondary)',
                color: isActive ? '#fff' : 'var(--muted-foreground)',
                border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              }}
            >
              E{e} <span style={{ opacity: 0.7 }}>({eCopies.length}v)</span>
            </button>
          )
        })}
      </div>

      {/* Variation tabs */}
      {copies[activeIdx] && (
        <div className="flex gap-1">
          {copies.filter(c => c.estrutura === copies[activeIdx].estrutura).map(c => {
            const idx = copies.indexOf(c)
            return (
              <button
                key={idx}
                onClick={() => setActiveIdx(idx)}
                className="px-2.5 py-1 rounded-lg transition-all"
                style={{
                  backgroundColor: activeIdx === idx ? '#EA580C' : 'var(--secondary)',
                  color: activeIdx === idx ? '#fff' : 'var(--muted-foreground)',
                  border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 500,
                }}
              >
                V{c.variacao}{c.edited ? ' ✎' : ''}
              </button>
            )
          })}
        </div>
      )}

      {/* Copy form */}
      {copies[activeIdx] && (
        <CopyForm copy={copies[activeIdx]} idx={activeIdx} onUpdate={updateCopy} />
      )}

      {/* Roteiros preview */}
      <RoteirosPreview roteirosNarrado={redator.roteirosNarrado} roteirosApresentadora={redator.roteirosApresentadora} />
    </div>
  )
}

function CopyForm({ copy, idx, onUpdate }: { copy: CopySet2; idx: number; onUpdate(i: number, f: Partial<CopySet2>): void }) {
  const fields: { key: keyof CopySet2; label: string; multiline?: boolean }[] = [
    { key: 'headline', label: 'Headline' },
    { key: 'body', label: 'Corpo do texto', multiline: true },
    { key: 'cta', label: 'CTA' },
  ]
  return (
    <div className="grid grid-cols-1 gap-3">
      {fields.map(f => (
        <div key={f.key} className="flex flex-col gap-1">
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.label}</label>
          {f.multiline ? (
            <textarea
              value={String(copy[f.key] ?? '')}
              onChange={e => onUpdate(idx, { [f.key]: e.target.value })}
              rows={2}
              className="px-3 py-2 rounded-xl resize-none"
              style={{ backgroundColor: 'var(--input)', border: '1px solid var(--border)', color: 'var(--foreground)', outline: 'none', fontSize: 13, width: '100%' }}
            />
          ) : (
            <input
              value={String(copy[f.key] ?? '')}
              onChange={e => onUpdate(idx, { [f.key]: e.target.value })}
              className="px-3 py-2 rounded-xl"
              style={{ backgroundColor: 'var(--input)', border: '1px solid var(--border)', color: 'var(--foreground)', outline: 'none', fontSize: 13, width: '100%' }}
            />
          )}
        </div>
      ))}
    </div>
  )
}

interface RoteirosPreviewProps {
  roteirosNarrado: Roteiro[]
  roteirosApresentadora: Roteiro[]
}
function RoteirosPreview({ roteirosNarrado, roteirosApresentadora }: RoteirosPreviewProps) {
  if (!Array.isArray(roteirosNarrado) || !Array.isArray(roteirosApresentadora)) return null
  if (!roteirosNarrado.length && !roteirosApresentadora.length) return null

  const renderRoteiro = (rot: Roteiro, tipo: string) => (
    <div key={`${tipo}-e${rot.estrutura}`} className="flex flex-col gap-1 p-3 rounded-xl" style={{ backgroundColor: 'var(--secondary)', border: '1px solid var(--border)' }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>{tipo} — E{rot.estrutura} · {rot.duracao}</span>
      <p style={{ fontSize: 12, color: 'var(--foreground)', margin: 0, lineHeight: 1.5 }}>{rot.roteiro}</p>
      {rot.legenda && <p style={{ fontSize: 11, color: 'var(--muted-foreground)', fontStyle: 'italic', margin: 0 }}>📱 {rot.legenda}</p>}
    </div>
  )

  return (
    <div className="flex flex-col gap-2">
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>Roteiros</span>
      {roteirosNarrado.map(r => renderRoteiro(r, 'Narrado'))}
      {roteirosApresentadora.map(r => renderRoteiro(r, 'Apresentadora'))}
    </div>
  )
}

// ── Main view ─────────────────────────────────────────────────────────────────

// ── Live artifacts panel (right column) ──────────────────────────────────────
function ArtifactsPanel() {
  const { redator, designer, videoMaker, diretorArte } = useCampanha2Store()
  const showCopyReview = redator.status === 'waiting'
  const doneCreatives = designer.creatives.filter(c => c.status === 'done' && c.imageDataUrl)
  const doneVideos = videoMaker.videos.filter(v => v.status === 'done' || v.videoUrl)
  const hasArtifacts = showCopyReview || doneCreatives.length > 0 || doneVideos.length > 0 || diretorArte.status === 'done'

  if (!hasArtifacts) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 min-h-64" style={{ padding: '2rem' }}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'var(--secondary)' }}>
          <Palette size={20} style={{ color: 'var(--muted-foreground)' }} />
        </div>
        <div className="text-center">
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--foreground)', margin: 0 }}>Os artefatos aparecem aqui</p>
          <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: '4px 0 0' }}>Copies, imagens e vídeos gerados em tempo real</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {showCopyReview && <CopyEditor />}

      {designer.status !== 'idle' && designer.creatives.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Palette size={14} style={{ color: '#7C3AED' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--foreground)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Imagens · {doneCreatives.length}/{designer.creatives.length}
            </span>
          </div>
          <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))' }}>
            {designer.creatives.map(cr => (
              <div key={cr.id} className="relative rounded-xl overflow-hidden flex items-center justify-center"
                style={{
                  aspectRatio: cr.formato === '4:5' ? '4/5' : '9/16',
                  backgroundColor: 'var(--secondary)',
                  border: `1px solid ${cr.status === 'done' ? '#7C3AED30' : cr.status === 'error' ? '#EF444430' : 'var(--border)'}`,
                }}>
                {cr.status === 'done' && cr.imageDataUrl
                  ? <img src={cr.imageDataUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div className="flex flex-col items-center gap-1">
                      {cr.status === 'generating'
                        ? <Loader2 size={16} style={{ color: '#7C3AED', animation: 'spin 1s linear infinite' }} />
                        : cr.status === 'error' ? <AlertCircle size={16} style={{ color: '#EF4444' }} />
                        : <Clock size={14} style={{ color: 'var(--muted-foreground)' }} />}
                    </div>}
                <div className="absolute bottom-1 left-1 right-1 flex justify-between items-center">
                  <span style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.9)', backgroundColor: 'rgba(0,0,0,0.5)', padding: '1px 4px', borderRadius: 4 }}>{cr.formato}</span>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.9)', backgroundColor: 'rgba(0,0,0,0.5)', padding: '1px 4px', borderRadius: 4 }}>E{cr.estrutura}V{cr.variacao}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {videoMaker.status !== 'idle' && videoMaker.videos.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Film size={14} style={{ color: '#0891B2' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--foreground)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Vídeos · {doneVideos.length}/{videoMaker.videos.length}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {videoMaker.videos.map(v => (
              <div key={v.id} className="flex items-center gap-3 p-3 rounded-xl"
                style={{ backgroundColor: 'var(--secondary)', border: `1px solid ${v.status === 'done' ? 'rgba(8,145,178,0.2)' : 'var(--border)'}` }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: v.status === 'done' ? 'rgba(8,145,178,0.15)' : 'var(--border)' }}>
                  {v.status === 'done' ? <CheckCircle2 size={14} style={{ color: '#0891B2' }} />
                    : v.status === 'generating' ? <Loader2 size={14} style={{ color: '#0891B2', animation: 'spin 1s linear infinite' }} />
                    : <Clock size={14} style={{ color: 'var(--muted-foreground)' }} />}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)' }}>{v.tipo === 'narrado' ? 'Narrado' : 'Apresentadora'} E{v.estrutura}</span>
                  <span style={{ fontSize: 10, color: 'var(--muted-foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.roteiro?.titulo ?? '—'}</span>
                </div>
                {v.videoUrl && (
                  <a href={v.videoUrl} target="_blank" rel="noreferrer"
                    style={{ fontSize: 10, color: '#0891B2', fontWeight: 600, flexShrink: 0, textDecoration: 'none' }}>Ver</a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {diretorArte.status === 'done' && diretorArte.review && (
        <div className="flex flex-col gap-3 p-4 rounded-2xl"
          style={{ border: `1.5px solid ${diretorArte.review.aprovado ? 'rgba(94,165,0,0.3)' : 'rgba(239,68,68,0.3)'}`, backgroundColor: 'var(--card)' }}>
          <div className="flex items-center justify-between">
            <span style={{ fontWeight: 700, color: diretorArte.review.aprovado ? '#5EA500' : '#EF4444', fontSize: 13 }}>
              {diretorArte.review.aprovado ? '✓ Campanha aprovada' : '⚠ Ajustes necessários'}
            </span>
            <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl"
              style={{ backgroundColor: diretorArte.review.aprovado ? 'rgba(94,165,0,0.1)' : 'rgba(239,68,68,0.1)' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: diretorArte.review.aprovado ? '#5EA500' : '#EF4444' }}>{diretorArte.review.score}</span>
              <span style={{ fontSize: 8, color: 'var(--muted-foreground)' }}>/100</span>
            </div>
          </div>
          <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: 0 }}>{diretorArte.review.relatorio}</p>
        </div>
      )}
    </div>
  )
}

export default function AgenciaView() {
  const state = useCampanha2Store()
  const { atendimento, redator, designer, videoMaker, diretorArte, cancelAgency, restartWithFeedback, campaignName } = state

  const phase1Active = atendimento.status === 'working' || redator.status === 'working'
  const phase1Done = redator.status === 'done' || redator.status === 'waiting'
  const phase2Active = designer.status === 'working' || videoMaker.status === 'working'
  const phase2Done = designer.status === 'done' && videoMaker.status === 'done'
  const phase3Active = diretorArte.status === 'working'
  const phase3Done = diretorArte.status === 'done'

  return (
    <div className="flex flex-col gap-4 w-full max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 style={{ color: 'var(--foreground)', fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>Agência IA em execução</h2>
          {campaignName && <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{campaignName}</span>}
        </div>
        {(atendimento.status !== 'idle' && diretorArte.status !== 'done') && (
          <button onClick={cancelAgency}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all hover:opacity-80"
            style={{ backgroundColor: 'var(--secondary)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--muted-foreground)', fontSize: 12 }}>
            <Ban size={13} /> Cancelar geração
          </button>
        )}
      </div>

      <div className="flex gap-5 items-start" style={{ flexWrap: 'wrap' }}>
        {/* LEFT: Agent progress */}
        <div className="flex flex-col gap-4 flex-shrink-0" style={{ width: 'clamp(280px, 340px, 100%)' }}>
          <div className="flex flex-col gap-2">
            <PhaseLabel number={1} label="Inteligência" active={phase1Active} done={phase1Done} estimate={PHASE_ESTIMATES[1]} />
            <CompactAgentCard icon={Headphones} label="Atendimento" role="Lê e organiza o briefing" color="#0055FF" agent={atendimento} />
            <CompactAgentCard icon={PenLine} label="Redator" role="Cria copies e roteiros" color="#EA580C" agent={redator} />
          </div>
          <div className="flex flex-col gap-2">
            <PhaseLabel number={2} label="Criação" active={phase2Active} done={phase2Done} estimate={PHASE_ESTIMATES[2]} />
            <CompactAgentCard icon={Palette} label="Designer" role="Gera imagens nos formatos" color="#7C3AED" agent={designer} />
            <CompactAgentCard icon={Film} label="Vídeo Maker" role="Gera vídeos narrados" color="#0891B2" agent={videoMaker} />
          </div>
          <div className="flex flex-col gap-2">
            <PhaseLabel number={3} label="Direção de Arte" active={phase3Active} done={phase3Done} estimate={PHASE_ESTIMATES[3]} />
            <CompactAgentCard icon={Award} label="Diretor de Arte" role="Revisa e valida a campanha" color="#059669" agent={diretorArte} />
            {phase3Done && diretorArte.review && !diretorArte.review.aprovado && diretorArte.review.problemas.length > 0 && (
              <RestartPanel problemas={diretorArte.review.problemas} onRestart={restartWithFeedback} />
            )}
          </div>
        </div>

        {/* RIGHT: Live artifacts */}
        <div className="flex-1 min-w-0" style={{ minWidth: 280 }}>
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--card)', minHeight: 300 }}>
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--secondary)' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Artefatos gerados</span>
            </div>
            <div className="p-4">
              <ArtifactsPanel />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
