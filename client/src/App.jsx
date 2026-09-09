import { useState, useEffect, useMemo } from "react"

const C = {
  bg: "#08090B",
  card: "#101114",
  cardHover: "#16171B",
  border: "rgba(255,255,255,0.07)",
  borderBright: "rgba(255,255,255,0.14)",
  text: "#EDEDEF",
  dim: "#8A8F98",
  faint: "#5A5F68",
  accent: "#8B5CF6",
  accentDim: "rgba(139,92,246,0.12)",
  up: "#4ADE80",
  down: "#F87171",
}

const MARKET_FEATURES = ["marketReturn1d", "marketReturn5d", "vixLevel", "vixChange"]

const FEATURE_LABELS = {
  return1d: "1-day return",
  return2d: "2-day return",
  return5d: "5-day return",
  return10d: "10-day return",
  priceVsMa5: "Price vs 5-day avg",
  priceVsMa20: "Price vs 20-day avg",
  ma5VsMa20: "5-day avg vs 20-day avg",
  volatility5: "5-day volatility",
  volatility20: "20-day volatility",
  volumeVsAvg: "Volume vs average",
  intradayRange: "Intraday range",
  closePosition: "Close within range",
  gapOpen: "Overnight gap",
  marketReturn1d: "Market 1-day return",
  marketReturn5d: "Market 5-day return",
  excessReturn1d: "Excess return, 1 day",
  excessReturn5d: "Excess return, 5 days",
  relativeStrength20: "Relative strength, 20 days",
  vixLevel: "Volatility index level",
  vixChange: "Volatility index change",
}

function Sparkline({ data, color = "#8B5CF6", width = 260, height = 48 }) {
  if (!data || data.length < 2) return <div style={{ height }} />
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const step = width / (data.length - 1)
  const points = data.map((d, i) => `${i * step},${height - ((d - min) / range) * height}`).join(" ")
  return (
    <svg width={width} height={height} style={{ display: "block", overflow: "visible" }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
    </svg>
  )
}

export default function App() {
  const [evalData, setEvalData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState("overview")
  const [selected, setSelected] = useState(null)
  const [history, setHistory] = useState(null)
  const [histLoading, setHistLoading] = useState(false)
  const [sortBy, setSortBy] = useState("accuracy")
  const [query, setQuery] = useState("")

  useEffect(() => {
    fetch("http://localhost:8080/evaluation")
      .then(r => r.json())
      .then(d => { setEvalData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selected) return
    setHistLoading(true)
    setHistory(null)
    fetch(`http://localhost:8080/stocks/${selected.symbol}/history/saved`)
      .then(r => r.json())
      .then(d => {
        const sorted = [...d].sort((a, b) => new Date(a.date) - new Date(b.date))
        setHistory(sorted.slice(-250))
        setHistLoading(false)
      })
      .catch(() => setHistLoading(false))
  }, [selected])

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setSelected(null) }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const tickers = useMemo(() => {
    if (!evalData?.byTicker) return []
    let list = [...evalData.byTicker]
    if (query.trim()) list = list.filter(t => t.symbol.toLowerCase().includes(query.toLowerCase()))
    if (sortBy === "accuracy") list.sort((a, b) => b.accuracy - a.accuracy)
    if (sortBy === "symbol") list.sort((a, b) => a.symbol.localeCompare(b.symbol))
    return list
  }, [evalData, sortBy, query])

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "grid", placeItems: "center" }}>
        <p className="mono" style={{ color: C.dim, fontSize: 13 }}>Loading evaluation</p>
      </div>
    )
  }

  if (!evalData || evalData.error) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "grid", placeItems: "center", padding: 24 }}>
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <p style={{ color: C.text, fontSize: 15, marginBottom: 8 }}>No evaluation results yet</p>
          <p style={{ color: C.dim, fontSize: 13, lineHeight: 1.6 }}>
            Run the training script to generate results, then reload this page.
          </p>
        </div>
      </div>
    )
  }

  const { dataset, split, models, featureImportance, byTicker } = evalData
  const maxImp = Math.max(...featureImportance.map(f => f.importance))
  const marketShare = featureImportance
    .filter(f => MARKET_FEATURES.includes(f.feature))
    .reduce((s, f) => s + f.importance, 0)
  const baseline = models.find(m => m.name.startsWith("Baseline"))
  const best = models.filter(m => !m.name.startsWith("Baseline"))
    .reduce((a, b) => (a.accuracy > b.accuracy ? a : b))

  const pct = n => `${(n * 100).toFixed(2)}%`
  const pct1 = n => `${(n * 100).toFixed(1)}%`
  const signed = n => `${n >= 0 ? "+" : ""}${(n * 100).toFixed(2)}`

  const closes = history?.map(h => h.close) || []
  const firstClose = closes[0]
  const lastClose = closes[closes.length - 1]
  const yearChange = firstClose ? (lastClose - firstClose) / firstClose : 0

  const NAV = [
    ["overview", "Overview"],
    ["models", "Models"],
    ["features", "Signals"],
    ["tickers", "Tickers"],
    ["method", "Method"],
  ]

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text }}>

      {/* Sidebar */}
      <aside style={{
        position: "fixed", left: 0, top: 0, bottom: 0, width: 200,
        borderRight: `1px solid ${C.border}`, padding: "20px 12px",
        display: "flex", flexDirection: "column",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 8px", marginBottom: 28 }}>
          <div style={{ width: 18, height: 18, borderRadius: 5, background: `linear-gradient(135deg, ${C.accent}, #6366F1)` }} />
          <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em" }}>Vatic</span>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {NAV.map(([id, label]) => (
            <button key={id} onClick={() => { setView(id); setSelected(null) }}
              style={{
                textAlign: "left", padding: "7px 8px", borderRadius: 6, border: "none",
                background: view === id ? "rgba(255,255,255,0.05)" : "transparent",
                color: view === id ? C.text : C.dim,
                fontSize: 13, fontFamily: "inherit", cursor: "pointer",
                transition: "background 120ms, color 120ms",
              }}
              onMouseEnter={e => { if (view !== id) e.currentTarget.style.color = C.text }}
              onMouseLeave={e => { if (view !== id) e.currentTarget.style.color = C.dim }}>
              {label}
            </button>
          ))}
        </nav>

        <div style={{ marginTop: "auto", padding: "0 8px" }}>
          <p style={{ fontSize: 11, color: C.dim, lineHeight: 1.5 }}>
            Last evaluated<br />
            <span className="mono">{new Date(evalData.generatedAt).toLocaleDateString()}</span>
          </p>
        </div>
      </aside>

      {/* Main */}
      <main style={{ marginLeft: 200, padding: "48px 56px", maxWidth: 1000 }}>

        {view === "overview" && (
          <>
            <h1 style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-0.02em", margin: "0 0 10px" }}>
              Can tomorrow's direction be predicted?
            </h1>
            <p style={{ color: C.dim, fontSize: 14, lineHeight: 1.65, maxWidth: 560, margin: "0 0 36px" }}>
              Vatic trains models on {dataset.tickers} stocks over five years, then tests them on a
              period they have never seen. Every number here is measured against a baseline that
              simply guesses the more common outcome.
            </p>

            <div style={{
              background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
              padding: 24, marginBottom: 32,
            }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 10 }}>
                <span style={{ fontSize: 17, fontWeight: 600 }}>
                  Neither model beat guessing.
                </span>
                <span className="mono" style={{ fontSize: 12, color: C.down }}>
                  {signed(best.vsBaseline)}pp
                </span>
              </div>
              <p style={{ color: C.dim, fontSize: 13.5, lineHeight: 1.7, margin: 0, maxWidth: 620 }}>
                The best model reached {pct(best.accuracy)} against a baseline of {pct(baseline.accuracy)}.
                Looking at what the model weighted most, {pct1(marketShare)} of its attention went to
                market-wide variables rather than anything specific to the individual stock. It was
                effectively trying to forecast the entire market each day.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 1, background: C.border, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", marginBottom: 40 }}>
              {[
                ["Examples", dataset.totalExamples.toLocaleString()],
                ["Stocks", dataset.tickers],
                ["Years", `${dataset.startDate.slice(0,4)}–${dataset.endDate.slice(0,4)}`],
                ["Held-out days", split.testSize.toLocaleString()],
              ].map(([label, val]) => (
                <div key={label} style={{ background: C.card, padding: "16px 18px" }}>
                  <p style={{ fontSize: 12, color: C.dim, margin: "0 0 6px" }}>{label}</p>
                  <p className="mono" style={{ fontSize: 19, margin: 0, fontWeight: 500 }}>{val}</p>
                </div>
              ))}
            </div>

            <h2 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 14px" }}>Results</h2>
            <ModelTable models={models} pct={pct} signed={signed} />
            <p style={{ fontSize: 12, color: C.dim, marginTop: 12, lineHeight: 1.6 }}>
              Training data ends {split.cutoffDate}. Everything after that date was held out entirely.
            </p>
          </>
        )}

        {view === "models" && (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", margin: "0 0 10px" }}>Models</h1>
            <p style={{ color: C.dim, fontSize: 14, lineHeight: 1.65, maxWidth: 560, margin: "0 0 32px" }}>
              Three approaches, evaluated on identical held-out data.
            </p>
            <ModelTable models={models} pct={pct} signed={signed} />

            <div style={{ marginTop: 28, display: "grid", gap: 12 }}>
              {models.map(m => {
                const isBase = m.name.startsWith("Baseline")
                return (
                  <div key={m.name} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 18 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, margin: "0 0 6px" }}>{m.name}</p>
                    <p style={{ fontSize: 13, color: C.dim, lineHeight: 1.7, margin: 0 }}>
                      {isBase
                        ? "Predicts the more common outcome every single day. Any model that cannot beat this has learned nothing useful."
                        : m.name.includes("Forest")
                        ? `An ensemble of decision trees. Predicted an increase ${pct1(m.predictedUpRate)} of the time, against an actual rate of ${pct1(split.testUpRate)}.`
                        : `A linear model over standardised inputs. Predicted an increase ${pct1(m.predictedUpRate)} of the time, against an actual rate of ${pct1(split.testUpRate)}.`}
                    </p>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {view === "features" && (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", margin: "0 0 10px" }}>Signals</h1>
            <p style={{ color: C.dim, fontSize: 14, lineHeight: 1.65, maxWidth: 600, margin: "0 0 8px" }}>
              How much each input influenced the Random Forest. Market-wide inputs are shown in violet
              and account for {pct1(marketShare)} of the total.
            </p>
            <p style={{ color: C.dim, fontSize: 13, lineHeight: 1.65, maxWidth: 600, margin: "0 0 32px" }}>
              This is the clearest result in the project: what an individual stock did yesterday barely
              registers next to what the whole market did.
            </p>

            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "18px 20px" }}>
              {featureImportance.map(f => {
                const isMarket = MARKET_FEATURES.includes(f.feature)
                return (
                  <div key={f.feature} style={{ display: "flex", alignItems: "center", gap: 14, padding: "7px 0" }}>
                    <span style={{ fontSize: 13, width: 210, flexShrink: 0, color: isMarket ? C.text : C.dim }}>
                      {FEATURE_LABELS[f.feature] || f.feature}
                    </span>
                    <div style={{ flex: 1, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.04)", overflow: "hidden" }}>
                      <div style={{
                        width: `${(f.importance / maxImp) * 100}%`, height: "100%", borderRadius: 3,
                        background: isMarket ? C.accent : "rgba(255,255,255,0.18)",
                        transition: "width 400ms cubic-bezier(0.4,0,0.2,1)",
                      }} />
                    </div>
                    <span className="mono" style={{ fontSize: 12, width: 44, textAlign: "right", color: isMarket ? C.text : C.dim }}>
                      {f.importance.toFixed(3)}
                    </span>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {view === "tickers" && !selected && (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", margin: "0 0 10px" }}>Tickers</h1>
            <p style={{ color: C.dim, fontSize: 14, lineHeight: 1.65, maxWidth: 600, margin: "0 0 24px" }}>
              Model accuracy on each stock during the held-out period. Select one to see its price history.
            </p>

            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search"
                style={{
                  flex: 1, maxWidth: 240, background: C.card, border: `1px solid ${C.border}`,
                  borderRadius: 7, padding: "7px 11px", color: C.text, fontSize: 13,
                  fontFamily: "inherit", outline: "none",
                }}
                onFocus={e => e.target.style.borderColor = C.borderBright}
                onBlur={e => e.target.style.borderColor = C.border}
              />
              {[["accuracy", "By accuracy"], ["symbol", "A–Z"]].map(([id, label]) => (
                <button key={id} onClick={() => setSortBy(id)}
                  style={{
                    background: sortBy === id ? "rgba(255,255,255,0.06)" : C.card,
                    border: `1px solid ${sortBy === id ? C.borderBright : C.border}`,
                    borderRadius: 7, padding: "7px 12px", fontSize: 13,
                    color: sortBy === id ? C.text : C.dim, cursor: "pointer", fontFamily: "inherit",
                    transition: "all 120ms",
                  }}>
                  {label}
                </button>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
              {tickers.map(t => (
                <button key={t.symbol} onClick={() => setSelected(t)}
                  style={{
                    background: C.card, border: `1px solid ${C.border}`, borderRadius: 9,
                    padding: "14px 16px", textAlign: "left", cursor: "pointer",
                    fontFamily: "inherit", transition: "background 120ms, border-color 120ms",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = C.cardHover; e.currentTarget.style.borderColor = C.borderBright }}
                  onMouseLeave={e => { e.currentTarget.style.background = C.card; e.currentTarget.style.borderColor = C.border }}>
                  <p style={{ fontSize: 13, fontWeight: 600, margin: "0 0 4px", color: C.text }}>{t.symbol}</p>
                  <p className="mono" style={{ fontSize: 15, margin: 0, color: t.accuracy >= 0.5 ? C.text : C.dim }}>
                    {pct1(t.accuracy)}
                  </p>
                </button>
              ))}
            </div>

            <p style={{ fontSize: 12, color: C.dim, marginTop: 20, lineHeight: 1.7, maxWidth: 620 }}>
              With {byTicker[0]?.days} test days each, random chance alone moves these numbers by roughly
              six points in either direction. The spread here is noise, not a per-stock effect — which is
              exactly why testing one stock in isolation would have been misleading.
            </p>
          </>
        )}

        {view === "tickers" && selected && (
          <>
            <button onClick={() => setSelected(null)}
              style={{ background: "none", border: "none", color: C.dim, fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 20, fontFamily: "inherit" }}>
              Back to all tickers
            </button>

            <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 6 }}>
              <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", margin: 0 }}>{selected.symbol}</h1>
              {lastClose && (
                <span className="mono" style={{ fontSize: 18, color: C.text }}>${lastClose.toFixed(2)}</span>
              )}
              {firstClose && (
                <span className="mono" style={{ fontSize: 13, color: yearChange >= 0 ? C.up : C.down }}>
                  {yearChange >= 0 ? "+" : ""}{(yearChange * 100).toFixed(1)}% over the test window
                </span>
              )}
            </div>

            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 24, marginTop: 20, marginBottom: 20 }}>
              {histLoading ? (
                <p className="mono" style={{ fontSize: 12, color: C.dim, margin: 0 }}>Loading price history</p>
              ) : closes.length ? (
                <Sparkline data={closes} color={yearChange >= 0 ? C.up : C.down} width={880} height={120} />
              ) : (
                <p style={{ fontSize: 13, color: C.dim, margin: 0 }}>No price history stored for this ticker.</p>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 1, background: C.border, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
              {[
                ["Model accuracy", pct1(selected.accuracy)],
                ["Test days", selected.days],
                ["vs baseline", `${((selected.accuracy - baseline.accuracy) * 100).toFixed(1)}pp`],
              ].map(([label, val]) => (
                <div key={label} style={{ background: C.card, padding: "16px 18px" }}>
                  <p style={{ fontSize: 12, color: C.dim, margin: "0 0 6px" }}>{label}</p>
                  <p className="mono" style={{ fontSize: 18, margin: 0 }}>{val}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {view === "method" && (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", margin: "0 0 10px" }}>Method</h1>
            <p style={{ color: C.dim, fontSize: 14, lineHeight: 1.65, maxWidth: 580, margin: "0 0 32px" }}>
              Most of the difficulty in this problem is not the model. It is making sure the evaluation
              is honest.
            </p>

            {[
              ["Split by date, not at random",
               `Financial data is ordered in time. Shuffling it puts future days into training and past days into testing, which inflates accuracy dramatically. Training here ends ${split.cutoffDate}; every day after is held out. Because ${dataset.tickers} stocks are pooled, the split is applied to dates rather than rows — otherwise the same calendar day would appear on both sides for different stocks.`],
              ["Always compare against guessing",
               `Prices rise slightly more often than they fall, so a model that always predicts an increase scores ${pct(baseline.accuracy)} here. Reporting accuracy without that comparison makes a useless model look competent.`],
              ["Test across many stocks",
               `Individual results ranged from ${pct1(Math.max(...byTicker.map(t => t.accuracy)))} down to ${pct1(Math.min(...byTicker.map(t => t.accuracy)))}. On ${byTicker[0]?.days} days per stock that entire spread fits inside normal random variation. Testing one stock would have produced a convincing-looking result that meant nothing.`],
              ["Report what happened",
               "The models did not work. That is the finding, and the platform is built to surface it rather than hide it behind a single flattering number."],
            ].map(([title, body]) => (
              <div key={title} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 20, marginBottom: 10 }}>
                <p style={{ fontSize: 14, fontWeight: 600, margin: "0 0 8px" }}>{title}</p>
                <p style={{ fontSize: 13, color: C.dim, lineHeight: 1.75, margin: 0, maxWidth: 640 }}>{body}</p>
              </div>
            ))}
          </>
        )}

      </main>
    </div>
  )
}

function ModelTable({ models, pct, signed }) {
  const C2 = { card: "#101114", border: "rgba(255,255,255,0.07)", text: "#EDEDEF", dim: "#8A8F98", down: "#F87171", up: "#4ADE80" }
  return (
    <div style={{ background: C2.card, border: `1px solid ${C2.border}`, borderRadius: 10, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${C2.border}` }}>
            {["Model", "Accuracy", "vs baseline", "Predicted up"].map((h, i) => (
              <th key={h} style={{
                textAlign: i === 0 ? "left" : "right", padding: "11px 18px",
                fontSize: 12, fontWeight: 500, color: C2.dim,
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {models.map(m => {
            const isBase = m.name.startsWith("Baseline")
            return (
              <tr key={m.name} style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                <td style={{ padding: "13px 18px", fontSize: 13.5, color: isBase ? C2.dim : C2.text }}>
                  {m.name}
                </td>
                <td className="mono" style={{ padding: "13px 18px", fontSize: 13, textAlign: "right", color: C2.text }}>
                  {pct(m.accuracy)}
                </td>
                <td className="mono" style={{
                  padding: "13px 18px", fontSize: 13, textAlign: "right",
                  color: isBase ? C2.dim : m.vsBaseline > 0 ? C2.up : C2.down,
                }}>
                  {isBase ? "—" : `${signed(m.vsBaseline)}pp`}
                </td>
                <td className="mono" style={{ padding: "13px 18px", fontSize: 13, textAlign: "right", color: C2.dim }}>
                  {pct(m.predictedUpRate)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}