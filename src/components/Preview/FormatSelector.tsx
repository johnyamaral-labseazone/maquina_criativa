import { useBriefingStore } from '../../stores/StoreContext'
import type { FormatoExport } from '../../types/briefing'
import { LayoutGrid, Smartphone, Square } from 'lucide-react'

const FORMAT_META: Record<FormatoExport, { label: string; size: string; icon: typeof LayoutGrid }> = {
  '4:5': { label: 'Feed 4:5',   size: '1080 x 1350', icon: LayoutGrid },
  '9:16': { label: 'Story 9:16', size: '1080 x 1920', icon: Smartphone },
  '1:1':  { label: 'WhatsApp',   size: '1080 x 1080', icon: Square },
}

export function FormatSelector() {
  const formato = useBriefingStore((s) => s.formato)
  const availableFormats = useBriefingStore((s) => s.availableFormats)
  const setFormato = useBriefingStore((s) => s.setFormato)

  return (
    <div className="flex gap-2">
      {availableFormats.map((value) => {
        const { label, size, icon: Icon } = FORMAT_META[value]
        const isActive = formato === value
        return (
          <button
            key={value}
            type="button"
            onClick={() => setFormato(value)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full transition-all active:scale-95 hover-lift"
            style={{
              backgroundColor: isActive ? 'var(--primary)' : 'var(--secondary)',
              color: isActive ? 'var(--primary-foreground)' : 'var(--secondary-foreground)',
              border: 'none',
              boxShadow: isActive ? '0 2px 8px rgba(0,85,255,0.3)' : 'none',
            }}
          >
            <Icon size={15} />
            <div className="text-left">
              <span className="body block">{label}</span>
              <span className="detail-regular block" style={{ opacity: 0.7 }}>{size}</span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
