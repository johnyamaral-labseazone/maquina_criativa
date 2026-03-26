import { useBriefingStore } from '../../stores/StoreContext'
import { Shield } from 'lucide-react'

export function SafeZoneOverlay() {
  const formato = useBriefingStore((s) => s.formato)
  const safeZone = useBriefingStore((s) => s.safeZone)
  const setSafeZone = useBriefingStore((s) => s.setSafeZone)

  if (formato !== '9:16') return null


  return (
    <div
      className="mt-4 p-4 rounded-xl"
      style={{
        backgroundColor: 'var(--input)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Shield size={15} style={{ color: 'var(--cores-vermelho-400, #FF6467)' }} />
        <span className="body" style={{ color: 'var(--foreground)' }}>Safe Zones (px)</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {(['top', 'bottom', 'left', 'right'] as const).map((side) => (
          <div key={side} className="flex items-center gap-2">
            <label className="detail-medium capitalize" style={{ color: 'var(--muted-foreground)', width: '48px' }}>
              {side}
            </label>
            <input
              type="number"
              value={safeZone[side]}
              onChange={(e) => setSafeZone({ [side]: Number(e.target.value) })}
              className="w-20 px-3 py-1.5 outline-none transition-all focus-ring"
              style={{
                backgroundColor: 'var(--background)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                color: 'var(--foreground)',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--primary)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
              min={0}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
