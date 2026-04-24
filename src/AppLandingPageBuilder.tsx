import { useNavigate } from "react-router-dom"
import { useLandingPageStore, createDefaultPage } from "./stores/landingPageStore"
import { ArrowLeft, Plus, LayoutGrid } from "lucide-react"
import { useState } from "react"
import { Logo } from "./imports/Logo1"

type ViewMode = "dashboard" | "editor" | "preview"

export default function AppLandingPageBuilder() {
  const navigate = useNavigate()
  const { pages, deletePage, duplicatePage, setCurrentPage, addPage } = useLandingPageStore()
  const [viewMode, setViewMode] = useState<ViewMode>("dashboard")

  const handleCreateNew = () => {
    const newPage = createDefaultPage()
    addPage(newPage)
    setCurrentPage(newPage.id)
    setViewMode("editor")
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--background)" }}>
      <header className="gradient-header">
        <div className="max-w-6xl mx-auto px-4 md:px-8 lg:px-12">
          <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 0" }}>
            <button onClick={() => navigate("/")} style={{ padding: "6px 12px", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.75)", border: "1px solid rgba(255,255,255,0.12)", cursor: "pointer" }}>← Hub</button>
            <Logo variant="white" />
            <span style={{ color: "rgba(255,255,255,0.65)" }}>Construtor de Landing Pages</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-10">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <h1 style={{ color: "var(--foreground)", margin: 0 }}>Landing Pages</h1>
          <button onClick={handleCreateNew} style={{ backgroundColor: "#7C3AED", color: "#fff", padding: "10px 16px", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>+ Nova LP</button>
        </div>

        {pages.length === 0 ? (
          <div style={{ backgroundColor: "var(--card)", border: "1px dashed var(--border)", borderRadius: 12, padding: 40, textAlign: "center" }}>
            <p style={{ color: "var(--foreground)", fontWeight: 600, margin: 0 }}>Nenhuma landing page criada</p>
            <p style={{ color: "var(--muted-foreground)", fontSize: 14, margin: "8px 0 0 0" }}>Crie sua primeira LP clicando no botão acima</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
            {pages.map((p) => (
              <div key={p.id} style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ height: 160, backgroundColor: p.primaryColor, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: "#fff", opacity: 0.6 }}>{p.productName}</div></div>
                <div style={{ padding: 16 }}>
                  <h3 style={{ color: "var(--foreground)", fontSize: 14, fontWeight: 600, margin: 0 }}>{p.name}</h3>
                  <p style={{ color: "var(--muted-foreground)", fontSize: 12, margin: "4px 0" }}>{new Date(p.updatedAt).toLocaleDateString("pt-BR")}</p>
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button onClick={() => { setCurrentPage(p.id); setViewMode("editor"); }} style={{ flex: 1, padding: "8px 12px", borderRadius: 6, backgroundColor: "var(--secondary)", color: "var(--secondary-foreground)", border: "none", cursor: "pointer", fontSize: 12 }}>Editar</button>
                    <button onClick={() => duplicatePage(p.id)} style={{ padding: "8px 12px", borderRadius: 6, backgroundColor: "var(--secondary)", border: "none", cursor: "pointer" }}>Copiar</button>
                    <button onClick={() => { if (confirm("Excluir?")) deletePage(p.id); }} style={{ padding: "8px 12px", borderRadius: 6, backgroundColor: "rgba(239,68,68,0.1)", color: "#EF4444", border: "none", cursor: "pointer" }}>Excluir</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
