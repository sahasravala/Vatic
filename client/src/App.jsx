import { useState, useEffect, useMemo, useRef } from "react"

const C = {
  bg: "#08090B",
  panel: "#0D0E11",
  panelHi: "#131419",
  border: "rgba(255,255,255,0.06)",
  borderHi: "rgba(255,255,255,0.12)",
  text: "#EDEDEF",
  dim: "#7C818C",
  faint: "#4A4E57",
  accent: "#8B5CF6",
  accent2: "#6366F1",
  up: "#4ADE80",
  down: "#F87171",
}

const ML_API = "http://localhost:8000"
const API = "http://localhost:8080"
const MARKET_FEATURES = ["marketReturn1d", "marketReturn5d", "vixLevel", "vixChange"]

const FEATURE_LABELS = {
  return1d: "1-day return", return2d: "2-day return", return5d: "5-day return",
  return10d: "10-day return", priceVsMa5: "Price vs 5-day avg", priceVsMa20: "Price vs 20-day avg",
  ma5VsMa20: "5-day vs 20-day avg", volatility5: "5-day volatility", volatility20: "20-day volatility",
  volumeVsAvg: "Volume vs average", intradayRange: "Intraday range", closePosition: "Close in range",
  gapOpen: "Overnight gap", marketReturn1d: "Market 1-day return", marketReturn5d: "Market 5-day return",
  excessReturn1d: "Excess return 1d", excessReturn5d: "Excess return 5d",
  relativeStrength20: "Relative strength 20d", vixLevel: "Volatility index", vixChange: "Volatility change",
}

const TICKERS = ["AAPL","MSFT","NVDA","GOOGL","AMZN","META","AMD","INTC","CRM","ORCL",
  "JPM","BAC","GS","V","JNJ","UNH","PFE","WMT","KO","PG","HD","CAT","XOM","CVX"]

/* ---------- animation hook ---------- */
function useCountUp(target, duration = 900, deps = []) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (target == null) return
    let raf, start
    const tick = (t) => {
      if (!start) start = t
      const p = Math.min((t - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(target * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, ...deps])
  return val
}

/* ---------- charts ---------- */
function DistributionChart({ data, baseline, height = 190 }) {
  const [mounted, setMounted] = useState(false)
  const [hover, setHover] = useState(null)
  useEffect(() => { const t = setTimeout(() => setMounted(true), 60); return () => clearTimeout(t) }, [])
  if (!data?.length) return null

  const vals = data.map(d => d.accuracy)
  const lo = Math.min(...vals, baseline) - 0.02
  const hi = Math.max(...vals, baseline) + 0.02
  const range = hi - lo
  const barW = 100 / data.length

  return (
    <div style={{ position: "relative", height }}>
      <div style={{
        position: "absolute", left: 0, right: 0, borderTop: `1px dashed ${C.faint}`,
        top: `${(1 - (baseline - lo) / range) * 100}%`, zIndex: 1,
      }}>
        <span style={{ position: "absolute", right: 0, top: -18, fontSize: 11, color: C.dim }}>
          baseline {(baseline * 100).toFixed(1)}%
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", height: "100%", gap: 2 }}>
        {data.map((d, i) => {
          const h = ((d.accuracy - lo) / range) * 100
          const above = d.accuracy >= baseline
          const isHover = hover === i
          return (
            <div key={d.symbol} style={{ flex: 1, height: "100%", display: "flex", alignItems: "flex-end", position: "relative" }}
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              {isHover && (
                <div style={{
                  position: "absolute", bottom: `${h}%`, left: "50%", transform: "translate(-50%,-8px)",
                  background: C.panelHi, border: `1px solid ${C.borderHi}`, borderRadius: 6,
                  padding: "5px 9px", fontSize: 11, whiteSpace: "nowrap", zIndex: 3,
                }}>
                  <span style={{ color: C.text }}>{d.symbol}</span>{" "}
                  <span className="mono" style={{ color: C.dim }}>{(d.accuracy * 100).toFixed(1)}%</span>
                </div>
              )}
              <div style={{
                width: "100%", height: mounted ? `${h}%` : "0%", borderRadius: "3px 3px 0 0",
                background: above
                  ? `linear-gradient(180deg, ${C.accent}, ${C.accent2})`
                  : "rgba(255,255,255,0.13)",
                opacity: isHover ? 1 : 0.85,
                transition: `height 700ms cubic-bezier(0.16,1,0.3,1) ${i * 22}ms, opacity 120ms`,
              }} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function LineChart({ series, baseline, height = 200 }) {
  const [len, setLen] = useState(0)
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current) setLen(ref.current.getTotalLength())
  }, [series])
  if (!series || series.length < 2) return null

  const W = 1000, H = height
  const vals = series.map(s => s.accuracy)
  const lo = Math.min(...vals, baseline) - 0.03
  const hi = Math.max(...vals, baseline) + 0.03
  const range = hi - lo || 1
  const step = W / (series.length - 1)
  const y = v => H - ((v - lo) / range) * H
  const path = series.map((s, i) => `${i === 0 ? "M" : "L"}${i * step},${y(s.accuracy)}`).join(" ")
  const area = `${path} L${W},${H} L0,${H} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height, display: "block" }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.accent} stopOpacity="0.22" />
          <stop offset="100%" stopColor={C.accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1="0" y1={y(baseline)} x2={W} y2={y(baseline)} stroke={C.faint} strokeWidth="1" strokeDasharray="5 5" />
      <path d={area} fill="url(#fade)" />
      <path ref={ref} d={path} fill="none" stroke={C.accent} strokeWidth="2" strokeLinejoin="round"
        strokeDasharray={len} strokeDashoffset={len}
        style={{ animation: len ? "draw 1400ms cubic-bezier(0.16,1,0.3,1) forwards" : "none" }} />
      <style>{`@keyframes draw { to { stroke-dashoffset: 0 } }`}</style>
    </svg>
  )
}

function Sparkline({ data, color = C.accent, height = 130 }) {
  if (!data || data.length < 2) return <div style={{ height }} />
  const W = 1000
  const min = Math.min(...data), max = Math.max(...data)
  const range = max - min || 1
  const step = W / (data.length - 1)
  const path = data.map((d, i) => `${i === 0 ? "M" : "L"}${i * step},${height - ((d - min) / range) * height}`).join(" ")
  return (
    <svg viewBox={`0 0 ${W} ${height}`} style={{ width: "100%", height, display: "block" }} preserveAspectRatio="none">
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

/* ---------- app ---------- */
export default function App() {
  const [evalData, setEvalData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState("overview")
  const [selected, setSelected] = useState(null)
  const [history, setHistory] = useState(null)
  const [sortBy, setSortBy] = useState("accuracy")
  const [query, setQuery] = useState("")

  const [btSymbol, setBtSymbol] = useState("AAPL")
  const [btStart, setBtStart] = useState("2025-01-01")
  const [btEnd, setBtEnd] = useState("2025-06-30")
  const [btModel, setBtModel] = useState("random_forest")
  const [btRetrain, setBtRetrain] = useState(21)
  const [btRunning, setBtRunning] = useState(false)
  const [btResult, setBtResult] = useState(null)
  const [btError, setBtError] = useState(null)

  useEffect(() => {
    fetch(`${API}/evaluation`).then(r => r.json())
      .then(d => { setEvalData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selected) return
    setHistory(null)
    fetch(`${API}/stocks/${selected.symbol}/history/saved`).then(r => r.json())
      .then(d => setHistory([...d].sort((a,b)=>new Date(a.date)-new Date(b.date)).slice(-250)))
      .catch(() => {})
  }, [selected])

  const runBacktest = async () => {
    setBtRunning(true); setBtError(null); setBtResult(null)
    try {
      const res = await fetch(`${ML_API}/backtest`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: btSymbol, startDate: btStart, endDate: btEnd,
          model: btModel, retrainEvery: Number(btRetrain), minTrainSize: 250 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || "Backtest failed")
      setBtResult(data)
    } catch (e) {
      setBtError(e.message === "Failed to fetch"
        ? "Cannot reach the ML service on port 8000."
        : e.message)
    } finally { setBtRunning(false) }
  }

  const tickers = useMemo(() => {
    if (!evalData?.byTicker) return []
    let l = [...evalData.byTicker]
    if (query.trim()) l = l.filter(t => t.symbol.toLowerCase().includes(query.toLowerCase()))
    l.sort(sortBy === "accuracy" ? (a,b)=>b.accuracy-a.accuracy : (a,b)=>a.symbol.localeCompare(b.symbol))
    return l
  }, [evalData, sortBy, query])

  const bestAcc = evalData && !evalData.error
    ? Math.max(...evalData.models.filter(m => !m.name.startsWith("Baseline")).map(m => m.accuracy))
    : 0
  const animAcc = useCountUp(bestAcc * 100, 1100, [view])

  if (loading) return <Center>Loading</Center>
  if (!evalData || evalData.error) return <Center>No evaluation results. Run train_model.py.</Center>

  const { dataset, split, models, featureImportance, byTicker } = evalData
  const maxImp = Math.max(...featureImportance.map(f => f.importance))
  const marketShare = featureImportance.filter(f => MARKET_FEATURES.includes(f.feature))
    .reduce((s,f)=>s+f.importance, 0)
  const baseline = models.find(m => m.name.startsWith("Baseline"))
  const best = models.filter(m => !m.name.startsWith("Baseline")).reduce((a,b)=>a.accuracy>b.accuracy?a:b)
  const sortedTickers = [...byTicker].sort((a,b)=>b.accuracy-a.accuracy)

  const pct = n => `${(n*100).toFixed(2)}%`
  const pct1 = n => `${(n*100).toFixed(1)}%`
  const closes = history?.map(h => h.close) || []
  const yearChange = closes.length ? (closes[closes.length-1]-closes[0])/closes[0] : 0

  const NAV = [["overview","Overview"],["backtest","Backtest"],["models","Models"],
    ["features","Signals"],["tickers","Tickers"],["method","Method"]]

  const input = { background: C.panelHi, border: `1px solid ${C.border}`, borderRadius: 7,
    padding: "7px 10px", color: C.text, fontSize: 13, fontFamily: "inherit", outline: "none" }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text }}>

      {/* ambient glow */}
      <div style={{ position: "fixed", top: -260, left: "38%", width: 720, height: 520,
        background: "radial-gradient(ellipse, rgba(139,92,246,0.13), transparent 65%)",
        pointerEvents: "none", zIndex: 0 }} />

      {/* sidebar */}
      <aside style={{ position: "fixed", left: 0, top: 0, bottom: 0, width: 196, zIndex: 2,
        borderRight: `1px solid ${C.border}`, padding: "18px 12px", display: "flex", flexDirection: "column",
        background: "rgba(8,9,11,0.7)", backdropFilter: "blur(12px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 8px", marginBottom: 26 }}>
          <div style={{ width: 17, height: 17, borderRadius: 5,
            background: `linear-gradient(135deg, ${C.accent}, ${C.accent2})`,
            boxShadow: `0 0 14px rgba(139,92,246,0.5)` }} />
          <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em" }}>Vatic</span>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {NAV.map(([id,label]) => (
            <button key={id} onClick={() => { setView(id); setSelected(null) }}
              style={{ textAlign: "left", padding: "7px 8px", borderRadius: 6, border: "none",
                background: view===id ? "rgba(139,92,246,0.12)" : "transparent",
                color: view===id ? C.text : C.dim, fontSize: 13, fontFamily: "inherit",
                cursor: "pointer", transition: "all 120ms" }}>{label}</button>
          ))}
        </nav>
        <div style={{ marginTop: "auto", padding: "0 8px", display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: C.up, boxShadow: `0 0 6px ${C.up}` }} />
          <span style={{ fontSize: 11, color: C.dim }}>3 services up</span>
        </div>
      </aside>

      <main style={{ marginLeft: 196, position: "relative", zIndex: 1 }}>

        {/* status strip */}
        <div style={{ borderBottom: `1px solid ${C.border}`, display: "flex", padding: "0 28px",
          background: "rgba(8,9,11,0.6)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 3 }}>
          {[
            ["Examples", dataset.totalExamples.toLocaleString()],
            ["Stocks", dataset.tickers],
            ["Held out", split.testSize.toLocaleString()],
            ["Baseline", pct1(baseline.accuracy)],
            ["Best model", pct1(best.accuracy)],
          ].map(([k,v], i) => (
            <div key={k} style={{ padding: "11px 22px 11px 0", marginRight: 22,
              borderRight: i < 4 ? `1px solid ${C.border}` : "none", display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 11.5, color: C.dim }}>{k}</span>
              <span className="mono" style={{ fontSize: 12.5, color: C.text }}>{v}</span>
            </div>
          ))}
        </div>

        <div style={{ padding: "28px 28px 56px", maxWidth: 1140 }}>

          {view === "overview" && (
            <>
              {/* hero */}
              <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 14, marginBottom: 14 }}>
                <Panel style={{ padding: 24, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ fontSize: 12, color: C.dim, margin: "0 0 14px" }}>Best model accuracy</p>
                    <p className="mono" style={{ fontSize: 52, lineHeight: 1, margin: 0, fontWeight: 300,
                      letterSpacing: "-0.03em" }}>
                      {animAcc.toFixed(2)}<span style={{ fontSize: 26, color: C.dim }}>%</span>
                    </p>
                    <p className="mono" style={{ fontSize: 13, color: C.down, margin: "10px 0 0" }}>
                      {(best.vsBaseline*100).toFixed(2)}pp vs baseline
                    </p>
                  </div>
                  <p style={{ fontSize: 12.5, color: C.dim, lineHeight: 1.65, margin: "22px 0 0" }}>
                    Below what you get by guessing the more common outcome every day.
                  </p>
                </Panel>

                <Panel style={{ padding: "22px 24px 18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 26 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>Accuracy by stock, held-out period</p>
                    <p style={{ fontSize: 11.5, color: C.dim, margin: 0 }}>{dataset.tickers} stocks · {byTicker[0]?.days} days each</p>
                  </div>
                  <DistributionChart data={sortedTickers} baseline={baseline.accuracy} />
                  <p style={{ fontSize: 11.5, color: C.dim, margin: "18px 0 0", lineHeight: 1.6 }}>
                    Random variation alone moves each bar about six points. The spread is noise.
                  </p>
                </Panel>
              </div>

              {/* second row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Panel style={{ padding: "20px 22px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>What the model weighted</p>
                    <p className="mono" style={{ fontSize: 12, color: C.accent, margin: 0 }}>{pct1(marketShare)} market-wide</p>
                  </div>
                  {featureImportance.slice(0,8).map((f,i) => {
                    const isM = MARKET_FEATURES.includes(f.feature)
                    return (
                      <div key={f.feature} style={{ display: "flex", alignItems: "center", gap: 12, padding: "5px 0" }}>
                        <span style={{ fontSize: 12, width: 150, flexShrink: 0, color: isM ? C.text : C.dim }}>
                          {FEATURE_LABELS[f.feature] || f.feature}
                        </span>
                        <div style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.04)" }}>
                          <div style={{ width: `${(f.importance/maxImp)*100}%`, height: "100%", borderRadius: 2,
                            background: isM ? `linear-gradient(90deg, ${C.accent2}, ${C.accent})` : "rgba(255,255,255,0.16)",
                            transition: `width 800ms cubic-bezier(0.16,1,0.3,1) ${i*50}ms` }} />
                        </div>
                      </div>
                    )
                  })}
                  <button onClick={() => setView("features")}
                    style={{ background: "none", border: "none", color: C.accent, fontSize: 12,
                      padding: "12px 0 0", cursor: "pointer", fontFamily: "inherit" }}>
                    All 20 signals
                  </button>
                </Panel>

                <Panel style={{ padding: "20px 22px" }}>
                  <p style={{ fontSize: 13, fontWeight: 500, margin: "0 0 16px" }}>Models tested</p>
                  {models.map(m => {
                    const isBase = m.name.startsWith("Baseline")
                    return (
                      <div key={m.name} style={{ display: "flex", justifyContent: "space-between",
                        alignItems: "center", padding: "11px 0", borderBottom: `1px solid ${C.border}` }}>
                        <span style={{ fontSize: 13, color: isBase ? C.dim : C.text }}>{m.name}</span>
                        <div style={{ display: "flex", gap: 18, alignItems: "baseline" }}>
                          <span className="mono" style={{ fontSize: 13 }}>{pct(m.accuracy)}</span>
                          <span className="mono" style={{ fontSize: 12, width: 62, textAlign: "right",
                            color: isBase ? C.faint : m.vsBaseline > 0 ? C.up : C.down }}>
                            {isBase ? "—" : `${m.vsBaseline>=0?"+":""}${(m.vsBaseline*100).toFixed(2)}pp`}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                  <button onClick={() => setView("backtest")}
                    style={{ marginTop: 16, width: "100%", background: `linear-gradient(135deg, ${C.accent}, ${C.accent2})`,
                      border: "none", borderRadius: 7, padding: "9px 0", color: "#fff", fontSize: 13,
                      fontWeight: 500, fontFamily: "inherit", cursor: "pointer" }}>
                    Run your own backtest
                  </button>
                </Panel>
              </div>
            </>
          )}

          {view === "backtest" && (
            <>
              <Panel style={{ padding: 20, marginBottom: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1.2fr 1fr auto", gap: 12, alignItems: "end" }}>
                  <Field label="Stock">
                    <select value={btSymbol} onChange={e=>setBtSymbol(e.target.value)} style={{...input, width:"100%"}}>
                      {TICKERS.map(t => <option key={t} value={t} style={{background:C.panelHi}}>{t}</option>)}
                    </select>
                  </Field>
                  <Field label="From"><input type="date" value={btStart} onChange={e=>setBtStart(e.target.value)} style={{...input,width:"100%"}} /></Field>
                  <Field label="To"><input type="date" value={btEnd} onChange={e=>setBtEnd(e.target.value)} style={{...input,width:"100%"}} /></Field>
                  <Field label="Model">
                    <select value={btModel} onChange={e=>setBtModel(e.target.value)} style={{...input,width:"100%"}}>
                      <option value="random_forest" style={{background:C.panelHi}}>Random Forest</option>
                      <option value="logistic_regression" style={{background:C.panelHi}}>Logistic Regression</option>
                    </select>
                  </Field>
                  <Field label="Retrain every">
                    <select value={btRetrain} onChange={e=>setBtRetrain(e.target.value)} style={{...input,width:"100%"}}>
                      {[1,5,21,63].map(d => <option key={d} value={d} style={{background:C.panelHi}}>{d} days</option>)}
                    </select>
                  </Field>
                  <button onClick={runBacktest} disabled={btRunning}
                    style={{ background: btRunning ? "rgba(139,92,246,0.35)" : `linear-gradient(135deg, ${C.accent}, ${C.accent2})`,
                      border: "none", borderRadius: 7, padding: "8px 18px", color: "#fff", fontSize: 13,
                      fontWeight: 500, fontFamily: "inherit", cursor: btRunning?"default":"pointer", whiteSpace: "nowrap" }}>
                    {btRunning ? "Running…" : "Run"}
                  </button>
                </div>
                {btError && <p style={{ fontSize:13, color:C.down, margin:"12px 0 0" }}>{btError}</p>}
              </Panel>

              {!btResult && !btRunning && (
                <Panel style={{ padding: 60, textAlign: "center" }}>
                  <p style={{ fontSize: 14, color: C.text, margin: "0 0 8px" }}>Walk forward through time</p>
                  <p style={{ fontSize: 13, color: C.dim, margin: 0, lineHeight: 1.7, maxWidth: 420, marginInline: "auto" }}>
                    The model retrains as it goes, using only data available before each day.
                    Pick a stock and period above, then run it.
                  </p>
                </Panel>
              )}

              {btRunning && (
                <Panel style={{ padding: 60, textAlign: "center" }}>
                  <p className="mono" style={{ fontSize: 13, color: C.accent, margin: 0 }}>
                    Retraining across {btSymbol}…
                  </p>
                </Panel>
              )}

              {btResult && (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 14, marginBottom: 14 }}>
                    <Panel style={{ padding: 22 }}>
                      <p style={{ fontSize: 12, color: C.dim, margin: "0 0 12px" }}>{btResult.symbol} accuracy</p>
                      <p className="mono" style={{ fontSize: 42, lineHeight: 1, margin: 0, fontWeight: 300 }}>
                        {(btResult.accuracy*100).toFixed(2)}<span style={{fontSize:22,color:C.dim}}>%</span>
                      </p>
                      <p className="mono" style={{ fontSize: 13, margin: "10px 0 20px",
                        color: btResult.vsBaseline>=0?C.up:C.down }}>
                        {btResult.vsBaseline>=0?"+":""}{(btResult.vsBaseline*100).toFixed(2)}pp vs baseline
                      </p>
                      <div style={{ display: "grid", gap: 9 }}>
                        {[["Baseline", pct(btResult.baseline)],
                          ["Days tested", btResult.totalDays],
                          ["Correct", btResult.correct],
                          ["Retrained every", `${btResult.retrainEvery}d`]].map(([k,v]) => (
                          <div key={k} style={{ display:"flex", justifyContent:"space-between" }}>
                            <span style={{ fontSize:12, color:C.dim }}>{k}</span>
                            <span className="mono" style={{ fontSize:12 }}>{v}</span>
                          </div>
                        ))}
                      </div>
                    </Panel>

                    <Panel style={{ padding: "22px 24px 16px" }}>
                      <p style={{ fontSize: 13, fontWeight: 500, margin: "0 0 22px" }}>Running accuracy</p>
                      <LineChart series={btResult.runningAccuracy} baseline={btResult.baseline} />
                      <p style={{ fontSize: 11.5, color: C.dim, margin: "14px 0 0" }}>
                        Early swings are small-sample noise. Dashed line is the baseline.
                      </p>
                    </Panel>
                  </div>

                  <Panel style={{ padding: 0, maxHeight: 360, overflowY: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead style={{ position: "sticky", top: 0, background: C.panel, zIndex: 1 }}>
                        <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                          {["Date","Predicted","Actual","Confidence","Result"].map((h,i)=>(
                            <th key={h} style={{ textAlign: i===0?"left":"right", padding: "10px 20px",
                              fontSize: 11.5, fontWeight: 500, color: C.dim }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {btResult.predictions.map(p => (
                          <tr key={p.date} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                            <td className="mono" style={{ padding:"8px 20px", fontSize:12, color:C.dim }}>{p.date}</td>
                            <td style={{ padding:"8px 20px", fontSize:12, textAlign:"right" }}>{p.predicted}</td>
                            <td style={{ padding:"8px 20px", fontSize:12, textAlign:"right", color:C.dim }}>{p.actual}</td>
                            <td className="mono" style={{ padding:"8px 20px", fontSize:12, textAlign:"right", color:C.dim }}>
                              {(p.confidence*100).toFixed(1)}%
                            </td>
                            <td style={{ padding:"8px 20px", fontSize:12, textAlign:"right",
                              color: p.correct?C.up:C.down }}>{p.correct?"Correct":"Wrong"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Panel>
                </>
              )}
            </>
          )}

          {view === "models" && (
            <div style={{ display: "grid", gap: 14 }}>
              {models.map(m => {
                const isBase = m.name.startsWith("Baseline")
                return (
                  <Panel key={m.name} style={{ padding: 22, display: "grid", gridTemplateColumns: "1fr 200px", gap: 24 }}>
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 600, margin: "0 0 8px" }}>{m.name}</p>
                      <p style={{ fontSize: 13, color: C.dim, lineHeight: 1.7, margin: 0 }}>
                        {isBase
                          ? "Predicts the more common outcome every day. Any model that cannot beat this has learned nothing useful."
                          : `Predicted an increase ${pct1(m.predictedUpRate)} of the time, against an actual rate of ${pct1(split.testUpRate)}.`}
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p className="mono" style={{ fontSize: 30, margin: 0, fontWeight: 300 }}>{pct(m.accuracy)}</p>
                      <p className="mono" style={{ fontSize: 12.5, margin: "6px 0 0",
                        color: isBase ? C.faint : m.vsBaseline>0 ? C.up : C.down }}>
                        {isBase ? "reference" : `${m.vsBaseline>=0?"+":""}${(m.vsBaseline*100).toFixed(2)}pp`}
                      </p>
                    </div>
                  </Panel>
                )
              })}
            </div>
          )}

          {view === "features" && (
            <Panel style={{ padding: "22px 24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20 }}>
                <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Feature importance</p>
                <p style={{ fontSize: 12, color: C.dim, margin: 0 }}>
                  Market-wide inputs in violet · {pct1(marketShare)} of total
                </p>
              </div>
              {featureImportance.map((f,i) => {
                const isM = MARKET_FEATURES.includes(f.feature)
                return (
                  <div key={f.feature} style={{ display:"flex", alignItems:"center", gap:14, padding:"6px 0" }}>
                    <span style={{ fontSize:12.5, width:200, flexShrink:0, color:isM?C.text:C.dim }}>
                      {FEATURE_LABELS[f.feature] || f.feature}
                    </span>
                    <div style={{ flex:1, height:5, borderRadius:3, background:"rgba(255,255,255,0.04)" }}>
                      <div style={{ width:`${(f.importance/maxImp)*100}%`, height:"100%", borderRadius:3,
                        background: isM ? `linear-gradient(90deg, ${C.accent2}, ${C.accent})` : "rgba(255,255,255,0.16)",
                        transition:`width 800ms cubic-bezier(0.16,1,0.3,1) ${i*35}ms` }} />
                    </div>
                    <span className="mono" style={{ fontSize:11.5, width:42, textAlign:"right", color:isM?C.text:C.dim }}>
                      {f.importance.toFixed(3)}
                    </span>
                  </div>
                )
              })}
            </Panel>
          )}

          {view === "tickers" && !selected && (
            <>
              <div style={{ display:"flex", gap:8, marginBottom:14 }}>
                <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search"
                  style={{...input, flex:1, maxWidth:220}} />
                {[["accuracy","By accuracy"],["symbol","A–Z"]].map(([id,label])=>(
                  <button key={id} onClick={()=>setSortBy(id)}
                    style={{ background: sortBy===id?"rgba(139,92,246,0.12)":C.panel,
                      border:`1px solid ${sortBy===id?"rgba(139,92,246,0.3)":C.border}`, borderRadius:7,
                      padding:"7px 12px", fontSize:13, color: sortBy===id?C.text:C.dim,
                      cursor:"pointer", fontFamily:"inherit" }}>{label}</button>
                ))}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:8 }}>
                {tickers.map(t => {
                  const above = t.accuracy >= baseline.accuracy
                  return (
                    <button key={t.symbol} onClick={()=>setSelected(t)}
                      style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:9,
                        padding:"14px 14px", textAlign:"left", cursor:"pointer", fontFamily:"inherit",
                        position:"relative", overflow:"hidden", transition:"all 140ms" }}
                      onMouseEnter={e=>{e.currentTarget.style.background=C.panelHi; e.currentTarget.style.borderColor=C.borderHi}}
                      onMouseLeave={e=>{e.currentTarget.style.background=C.panel; e.currentTarget.style.borderColor=C.border}}>
                      <div style={{ position:"absolute", left:0, top:0, bottom:0, width:2,
                        background: above ? C.accent : "rgba(255,255,255,0.1)" }} />
                      <p style={{ fontSize:12.5, fontWeight:600, margin:"0 0 5px" }}>{t.symbol}</p>
                      <p className="mono" style={{ fontSize:15, margin:0, color: above?C.text:C.dim }}>{pct1(t.accuracy)}</p>
                    </button>
                  )
                })}
              </div>
              <p style={{ fontSize:12, color:C.dim, marginTop:18, lineHeight:1.7, maxWidth:620 }}>
                Violet bars sit above baseline. With {byTicker[0]?.days} days each, that entire spread
                fits inside normal random variation.
              </p>
            </>
          )}

          {view === "tickers" && selected && (
            <>
              <button onClick={()=>setSelected(null)}
                style={{ background:"none", border:"none", color:C.dim, fontSize:13,
                  cursor:"pointer", padding:0, marginBottom:18, fontFamily:"inherit" }}>← All tickers</button>
              <div style={{ display:"grid", gridTemplateColumns:"260px 1fr", gap:14 }}>
                <Panel style={{ padding:22 }}>
                  <p style={{ fontSize:22, fontWeight:600, margin:"0 0 4px" }}>{selected.symbol}</p>
                  {closes.length>0 && (
                    <>
                      <p className="mono" style={{ fontSize:30, margin:"12px 0 4px", fontWeight:300 }}>
                        ${closes[closes.length-1].toFixed(2)}
                      </p>
                      <p className="mono" style={{ fontSize:13, margin:"0 0 20px", color: yearChange>=0?C.up:C.down }}>
                        {yearChange>=0?"+":""}{(yearChange*100).toFixed(1)}%
                      </p>
                    </>
                  )}
                  <div style={{ display:"grid", gap:9 }}>
                    {[["Model accuracy", pct1(selected.accuracy)],
                      ["Test days", selected.days],
                      ["vs baseline", `${((selected.accuracy-baseline.accuracy)*100).toFixed(1)}pp`]].map(([k,v])=>(
                      <div key={k} style={{ display:"flex", justifyContent:"space-between" }}>
                        <span style={{ fontSize:12, color:C.dim }}>{k}</span>
                        <span className="mono" style={{ fontSize:12 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </Panel>
                <Panel style={{ padding:"22px 24px" }}>
                  <p style={{ fontSize:13, fontWeight:500, margin:"0 0 20px" }}>Price, last 250 sessions</p>
                  {closes.length
                    ? <Sparkline data={closes} color={yearChange>=0?C.up:C.down} />
                    : <p className="mono" style={{fontSize:12,color:C.dim,margin:0}}>Loading</p>}
                </Panel>
              </div>
            </>
          )}

          {view === "method" && (
            <div style={{ display:"grid", gap:12 }}>
              {[
                ["Split by date, not at random",
                 `Shuffling time-ordered data puts future days into training and inflates accuracy. Training ends ${split.cutoffDate}; everything after is held out. With ${dataset.tickers} stocks pooled, the split is applied to dates rather than rows — otherwise the same calendar day would land on both sides.`],
                ["Always compare against guessing",
                 `Prices rise slightly more often than they fall, so always predicting an increase scores ${pct(baseline.accuracy)}. Accuracy without that comparison makes a useless model look competent.`],
                ["Retrain as you walk forward",
                 "The backtest retrains periodically using only data available at that point in time, then predicts the next day. Nothing from the future reaches the training set."],
                ["Test across many stocks",
                 `Results ranged from ${pct1(Math.max(...byTicker.map(t=>t.accuracy)))} to ${pct1(Math.min(...byTicker.map(t=>t.accuracy)))}. On ${byTicker[0]?.days} days per stock that spread is normal random variation. One stock would have produced a convincing result that meant nothing.`],
                ["Report what happened",
                 "The models did not work. That is the finding, and this platform surfaces it rather than hiding it behind one flattering number."],
              ].map(([t,b]) => (
                <Panel key={t} style={{ padding:22 }}>
                  <p style={{ fontSize:14, fontWeight:600, margin:"0 0 8px" }}>{t}</p>
                  <p style={{ fontSize:13, color:C.dim, lineHeight:1.75, margin:0, maxWidth:700 }}>{b}</p>
                </Panel>
              ))}
            </div>
          )}

        </div>
      </main>
    </div>
  )
}

const Center = ({children}) => (
  <div style={{ minHeight:"100vh", background:C.bg, display:"grid", placeItems:"center" }}>
    <p className="mono" style={{ color:C.dim, fontSize:13 }}>{children}</p>
  </div>
)

const Panel = ({children, style}) => (
  <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:11, ...style }}>{children}</div>
)

const Field = ({label, children}) => (
  <div>
    <p style={{ fontSize:11.5, color:C.dim, margin:"0 0 6px" }}>{label}</p>
    {children}
  </div>
)