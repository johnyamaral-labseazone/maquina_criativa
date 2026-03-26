import { useState } from 'react'
import { toPng } from 'html-to-image'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { useBriefingStore } from '../../stores/StoreContext'
import { Download, Package, ArrowLeft, Loader2, FileImage, CheckCircle2 } from 'lucide-react'
import type { FormatoExport } from '../../types/briefing'

const DIMENSIONS = {
  '4:5': { width: 1080, height: 1350 },
  '9:16': { width: 1080, height: 1920 },
  '1:1': { width: 1080, height: 1080 },
}

async function capturePreview(
  previewEl: HTMLElement,
  width: number,
  height: number
): Promise<string> {
  return toPng(previewEl, {
    width,
    height,
    pixelRatio: 1,
    style: { transform: 'scale(1)', transformOrigin: 'top left' },
  })
}

export function ExportPanel() {
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState('')
  const [progressPercent, setProgressPercent] = useState(0)
  const briefing = useBriefingStore((s) => s.briefing)
  const formato = useBriefingStore((s) => s.formato)
  const availableFormats = useBriefingStore((s) => s.availableFormats)
  const setStep = useBriefingStore((s) => s.setStep)
  const setSelectedEstrutura = useBriefingStore((s) => s.setSelectedEstrutura)
  const setSelectedVariacao = useBriefingStore((s) => s.setSelectedVariacao)
  const setFormato = useBriefingStore((s) => s.setFormato)

  const totalPecas = briefing.estruturas.reduce((sum, e) => sum + e.variacoes.length, 0) * 2

  const exportCurrent = async () => {
    const el = document.getElementById('creative-preview')
    if (!el) return
    setExporting(true)
    try {
      const dim = DIMENSIONS[formato]
      const dataUrl = await capturePreview(el, dim.width, dim.height)
      const link = document.createElement('a')
      link.download = `criativo_${formato.replace(':', 'x')}.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error('Export error:', err)
    }
    setExporting(false)
  }

  const exportAll = async () => {
    setExporting(true)
    setProgressPercent(0)
    const zip = new JSZip()
    const formatos = availableFormats as FormatoExport[]
    let count = 0

    for (let ei = 0; ei < briefing.estruturas.length; ei++) {
      const estrutura = briefing.estruturas[ei]
      for (let vi = 0; vi < estrutura.variacoes.length; vi++) {
        for (const fmt of formatos) {
          count++
          setProgress(`Exportando ${count}/${totalPecas}...`)
          setProgressPercent((count / totalPecas) * 100)

          setSelectedEstrutura(ei)
          setSelectedVariacao(vi)
          setFormato(fmt)

          await new Promise((r) => setTimeout(r, 300))

          const el = document.getElementById('creative-preview')
          if (!el) continue

          try {
            const dim = DIMENSIONS[fmt]
            const dataUrl = await capturePreview(el, dim.width, dim.height)
            const base64 = dataUrl.split(',')[1]
            const eName = estrutura.nome || `estrutura${ei + 1}`
            const fileName = `${eName}/variacao${vi + 1}_${fmt.replace(':', 'x')}.png`
            zip.file(fileName, base64, { base64: true })
          } catch (err) {
            console.error(`Error exporting E${ei + 1}V${vi + 1} ${fmt}:`, err)
          }
        }
      }
    }

    const blob = await zip.generateAsync({ type: 'blob' })
    saveAs(blob, 'criativos.zip')
    setExporting(false)
    setProgress('')
    setProgressPercent(0)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2>Exportar</h2>
        <span className="subtle-regular" style={{ color: 'var(--muted-foreground)' }}>
          Baixe os criativos em PNG individual ou pacote ZIP
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Current */}
        <div
          className="rounded-xl overflow-hidden hover-lift"
          style={{
            border: '1px solid var(--border)',
            backgroundColor: 'var(--card)',
            boxShadow: 'var(--elevation-sm)',
          }}
        >
          <div
            className="px-5 pt-5 pb-4"
            style={{
              background: 'linear-gradient(135deg, var(--cores-azul-50) 0%, rgba(0,85,255,0.03) 100%)',
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <span
                className="w-10 h-10 flex items-center justify-center rounded-full"
                style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
              >
                <FileImage size={18} />
              </span>
              <div>
                <h3 style={{ margin: 0 }}>Exportar atual</h3>
                <span className="detail-regular" style={{ color: 'var(--muted-foreground)' }}>
                  Formato {formato} selecionado
                </span>
              </div>
            </div>
          </div>
          <div className="px-5 pb-5">
            <button
              onClick={exportCurrent}
              disabled={exporting}
              className="w-full px-6 py-3 rounded-full transition-all hover:opacity-90 active:scale-95 hover-lift flex items-center justify-center gap-2"
              style={{
                backgroundColor: exporting ? 'var(--muted)' : 'var(--primary)',
                color: exporting ? 'var(--muted-foreground)' : 'var(--primary-foreground)',
                border: 'none',
                opacity: exporting ? 0.6 : 1,
              }}
            >
              {exporting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Download size={16} />
              )}
              <span className="p-ui">{exporting ? 'Exportando...' : 'Exportar PNG'}</span>
            </button>
          </div>
        </div>

        {/* Export All */}
        <div
          className="rounded-xl overflow-hidden hover-lift"
          style={{
            border: '1px solid var(--border)',
            backgroundColor: 'var(--card)',
            boxShadow: 'var(--elevation-sm)',
          }}
        >
          <div
            className="px-5 pt-5 pb-4"
            style={{
              background: 'linear-gradient(135deg, rgba(94,165,0,0.06) 0%, rgba(94,165,0,0.02) 100%)',
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <span
                className="w-10 h-10 flex items-center justify-center rounded-full"
                style={{ backgroundColor: 'var(--cores-verde-600, #5EA500)', color: '#FFFFFF' }}
              >
                <Package size={18} />
              </span>
              <div>
                <h3 style={{ margin: 0 }}>Exportar todas</h3>
                <span className="detail-regular" style={{ color: 'var(--muted-foreground)' }}>
                  {totalPecas} peças em ZIP
                </span>
              </div>
            </div>
          </div>
          <div className="px-5 pb-5">
            {exporting && progressPercent > 0 && (
              <div className="mb-3">
                <div className="progress-bar">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${progressPercent}%`,
                      background: 'linear-gradient(90deg, var(--cores-verde-600, #5EA500), #7CCF00)',
                    }}
                  />
                </div>
                <span className="detail-regular block mt-1" style={{ color: 'var(--muted-foreground)' }}>
                  {progress}
                </span>
              </div>
            )}
            <button
              onClick={exportAll}
              disabled={exporting}
              className="w-full px-6 py-3 rounded-full transition-all hover:opacity-90 active:scale-95 hover-lift flex items-center justify-center gap-2"
              style={{
                backgroundColor: exporting ? 'var(--muted)' : 'var(--cores-verde-600, #5EA500)',
                color: exporting ? 'var(--muted-foreground)' : '#FFFFFF',
                border: 'none',
                opacity: exporting ? 0.6 : 1,
              }}
            >
              {exporting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span className="p-ui">{progress || 'Preparando...'}</span>
                </>
              ) : (
                <>
                  <Package size={16} />
                  <span className="p-ui">Exportar ZIP ({totalPecas} peças)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div
        className="rounded-xl p-4 flex items-center gap-3"
        style={{
          backgroundColor: 'rgba(94,165,0,0.04)',
          border: '1px solid rgba(94,165,0,0.12)',
        }}
      >
        <CheckCircle2 size={18} style={{ color: 'var(--cores-verde-600, #5EA500)' }} />
        <span className="body-regular" style={{ color: 'var(--foreground)' }}>
          {briefing.estruturas.length} estrutura(s) × {briefing.estruturas.reduce((s, e) => s + e.variacoes.length, 0)} variações × 2 formatos = <strong>{totalPecas} peças</strong>
        </span>
      </div>

      <div className="flex justify-start">
        <button
          type="button"
          onClick={() => setStep(2)}
          className="flex items-center gap-2 px-6 py-2.5 rounded-full transition-all active:scale-95 hover-lift"
          style={{ backgroundColor: 'transparent', color: 'var(--foreground)', border: '1.5px solid var(--border)' }}
        >
          <ArrowLeft size={16} />
          <span className="p-ui-medium">Voltar ao Preview</span>
        </button>
      </div>
    </div>
  )
}
