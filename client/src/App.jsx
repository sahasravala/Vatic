import { useState, useEffect, useMemo } from "react"

const C = {
  bg: "#08090B",
  card: "#101114",
  cardHover: "#16171B",
  border: "rgba(255,255,255,0.07)",
  borderBright: "rgba(255,255,255,0.14)",
  text: "#EDEDEF",
  dim: "#8A8F98",
  accent: "#8B5CF6",
  up: "#4ADE80",
  down: "#F87171",
}

const ML_API = "http://localhost:8000"
const API = "http://localhost:8080"

const MARKET_FEATURES = ["marketReturn1d", "marketReturn5d", "vixLevel", "vixChange"]

const FEATURE_LABELS = {
  return1d: "1-day return", return2d: "2-day return", return5d: "5-day return",
  return10d: "10-day return", priceVsMa5: "Price vs 5-day avg",
  priceVsMa20: "Price vs 20-day avg", ma5VsMa20: "5-day avg vs 20-day avg",
  volatility5: "5-day volatility", volatility20: "20-day volatility",
  volumeVsAvg: "Volume vs average", intradayRange: "Intraday range",
  closePosition: "Close within range", gapOpen: "Overnight gap",
  marketReturn1d: "Market 1-day return", marketReturn5d: "Market 5-day return",
  excessReturn1d: "Excess return, 1 day", excessReturn5d: "Excess return, 5 days",
  relativeStrength20: "Relative strength, 20 days",
  vixLevel: "Volatility index level", vixChange: "Volatility index change",
}

const TICKERS = ["AAPL","MSFT","NVDA","GOOGL","AMZN","META","AMD","INTC","CRM","ORCL",
  "JPM","BAC","GS","V","JNJ","UNH","PFE","WMT","KO","PG","HD","CAT","XOM","CVX"]

function Sparkline({ data, color = C.accent, width = 880, height = 120 }) {
  if (!data || data.length < 2) return <div style={{ height }} />
  const min = Math.min(...data), max = Math.max(...data)
  const range = max - min || 1
  const step = width / (data.length - 1)
  const pts = data.map((d, i) => `${i * step},${height - ((d - min) / range) * height}`).join(" ")
  return (
    <svg width={width} height={height} style={{ display: "block", maxWidth: "100%" }} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

function AccuracyChart({ series, baseline, width = 840, height = 180 }) {
  if (!series || series.length < 2) return null
  const vals = series.map(s => s.accuracy)
  const lo = Math.min(...vals, baseline) - 0.03
  const hi = Math.max(...vals, baseline) + 0.03
  const range = hi - lo || 1
  const step = width / (series.length - 1)
  const y = v => height - ((v - lo) / range) * height
  const pts = series.map((s, i) => `${i * step},${y(s.accuracy)}`).join(" ")
  const baseY = y(baseline)

  return (
    <svg width={width} height={height} style={{ display: "block", maxWidth: "100%" }} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <line x1="0" y1={baseY} x2={width} y2={baseY} stroke={C.dim} strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
      <polyline points={pts} fill="none" stroke={C.accent} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  )
}

export default function App() {
  const [evalData, setEvalData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState("overview")
  const [selected, setSelected] = useState(null)
  const [history, setHistory] = useState(null)
  const [sortBy, setSortBy] = useState("accuracy")
  const [query, setQuery] = useState("")

  // backtest state
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
    fetch(`${API}/stocks/${selected.symbol}/history/saved`)
      .then(r => r.json())
      .then(d => setHistory([...d].sort((a,b) => new Date(a.date) - new Date(b.date)).slice(-250)))
      .catch(() => {})
  }, [selected])

  const runBacktest = async () => {
    setBtRunning(true); setBtError(null); setBtResult(null)
    try {
      const res = await fetch(`${ML_API}/backtest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: btSymbol, startDate: btStart, endDate: btEnd,
          model: btModel, retrainEvery: Number(btRetrain), minTrainSize: 250,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || "Backtest failed")
      setBtResult(data)
    } catch (e) {
      setBtError(e.message === "Failed to fetch"
        ? "Cannot reach the ML service. Make sure it is running on port 8000."
        : e.message)
    } finally {
      setBtRunning(false)
    }
  }

  const tickers = useMemo(() => {
    if (!evalData?.byTicker) return []
    let list = [...evalData.byTicker]
    if (query.trim()) list = list.filter(t => t.symbol.toLowerCase().includes(query.toLowerCase()))
    list.sort(sortBy === "accuracy" ? (a,b) => b.accuracy - a.accuracy : (a,b) => a.symbol.localeCompare(b.symbol))
    return list
  }, [evalData, sortBy, query])

  if (loading) return <Center>Loading evaluation</Center>
  if (!evalData || evalData.error) return <Center>No evaluation results. Run train_model.py.</Center>

  const { dataset, split, models, featureImportance, byTicker } = evalData
  const maxImp = Math.max(...featureImportance.map(f => f.importance))
  const marketShare = featureImportance.filter(f => MARKET_FEATURES.includes(f.feature))
    .reduce((s,f) => s + f.importance, 0)
  const baseline = models.find(m => m.name.startsWith("Baseline"))
  const best = models.filter(m => !m.name.startsWith("Baseline")).reduce((a,b) => a.accuracy > b.accuracy ? a : b)

  const pct = n => `${(n*100).toFixed(2)}%`
  const pct1 = n => `${(n*100).toFixed(1)}%`
  const signed = n => `${n >= 0 ? "+" : ""}${(n*100).toFixed(2)}`

  const closes = history?.map(h => h.close) || []
  const yearChange = closes.length ? (closes[closes.length-1] - closes[0]) / closes[0] : 0

  const NAV = [["overview","Overview"],["backtest","Backtest"],["models","Models"],
    ["features","Signals"],["tickers","Tickers"],["method","Method"]]

  const inputStyle = {
    background: C.card, border: `1px solid ${C.border}`, borderRadius: 7,
    padding: "7px 10px", color: C.text, fontSize: 13, fontFamily: "inherit", outline: "none",
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text }}>

      <aside style={{ position: "fixed", left: 0, top: 0, bottom: 0, width: 200,
        borderRight: `1px solid ${C.border}`, padding: "20px 12px", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 8px", marginBottom: 28 }}>
          <div style={{ width: 18, height: 18, borderRadius: 5, background: `linear-gradient(135deg, ${C.accent}, #6366F1)` }} />
          <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em" }}>Vatic</span>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {NAV.map(([id, label]) => (
            <button key={id} onClick={() => { setView(id); setSelected(null) }}
              style={{ textAlign: "left", padding: "7px 8px", borderRadius: 6, border: "none",
                background: view === id ? "rgba(255,255,255,0.05)" : "transparent",
                color: view === id ? C.text : C.dim, fontSize: 13, fontFamily: "inherit",
                cursor: "pointer", transition: "background 120ms, color 120ms" }}>
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

      <main style={{ marginLeft: 200, padding: "48px 56px", maxWidth: 1000 }}>

        {view === "overview" && (
          <>
            <H1>Can tomorrow's direction be predicted?</H1>
            <Lead>Vatic trains models on {dataset.tickers} stocks over five years, then tests them on a
              period they have never seen. Every number here is measured against a baseline that simply
              guesses the more common outcome.</Lead>

            <Card style={{ padding: 24, marginBottom: 32 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 10 }}>
                <span style={{ fontSize: 17, fontWeight: 600 }}>Neither model beat guessing.</span>
                <span className="mono" style={{ fontSize: 12, color: C.down }}>{signed(best.vsBaseline)}pp</span>
              </div>
              <p style={{ color: C.dim, fontSize: 13.5, lineHeight: 1.7, margin: 0, maxWidth: 620 }}>
                The best model reached {pct(best.accuracy)} against a baseline of {pct(baseline.accuracy)}.
                Of everything it weighted, {pct1(marketShare)} went to market-wide variables rather than
                anything specific to the individual stock. It was effectively trying to forecast the
                entire market each day.
              </p>
            </Card>

            <StatRow items={[
              ["Examples", dataset.totalExamples.toLocaleString()],
              ["Stocks", dataset.tickers],
              ["Years", `${dataset.startDate.slice(0,4)}–${dataset.endDate.slice(0,4)}`],
              ["Held-out days", split.testSize.toLocaleString()],
            ]} />

            <H2>Results</H2>
            <ModelTable models={models} pct={pct} signed={signed} />
            <Note>Training data ends {split.cutoffDate}. Everything after that date was held out entirely.</Note>
          </>
        )}

        {view === "backtest" && (
          <>
            <H1 small>Backtest</H1>
            <Lead>Walk forward through a period one day at a time. At each step the model is trained only
              on data from before that day, so it never sees the future. This is stricter than a single
              train/test split and closer to how the model would actually have been used.</Lead>

            <Card style={{ padding: 20, marginBottom: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1.3fr 1fr", gap: 12, alignItems: "end" }}>
                <Field label="Stock">
                  <select value={btSymbol} onChange={e => setBtSymbol(e.target.value)} style={{ ...inputStyle, width: "100%" }}>
                    {TICKERS.map(t => <option key={t} value={t} style={{ background: C.card }}>{t}</option>)}
                  </select>
                </Field>
                <Field label="From">
                  <input type="date" value={btStart} onChange={e => setBtStart(e.target.value)} style={{ ...inputStyle, width: "100%" }} />
                </Field>
                <Field label="To">
                  <input type="date" value={btEnd} onChange={e => setBtEnd(e.target.value)} style={{ ...inputStyle, width: "100%" }} />
                </Field>
                <Field label="Model">
                  <select value={btModel} onChange={e => setBtModel(e.target.value)} style={{ ...inputStyle, width: "100%" }}>
                    <option value="random_forest" style={{ background: C.card }}>Random Forest</option>
                    <option value="logistic_regression" style={{ background: C.card }}>Logistic Regression</option>
                  </select>
                </Field>
                <Field label="Retrain every">
                  <select value={btRetrain} onChange={e => setBtRetrain(e.target.value)} style={{ ...inputStyle, width: "100%" }}>
                    {[1,5,21,63].map(d => <option key={d} value={d} style={{ background: C.card }}>{d} days</option>)}
                  </select>
                </Field>
              </div>

              <button onClick={runBacktest} disabled={btRunning}
                style={{ marginTop: 16, background: btRunning ? "rgba(139,92,246,0.4)" : C.accent,
                  border: "none", borderRadius: 7, padding: "8px 16px", color: "#fff",
                  fontSize: 13, fontWeight: 500, fontFamily: "inherit",
                  cursor: btRunning ? "default" : "pointer", transition: "background 120ms" }}>
                {btRunning ? "Running…" : "Run backtest"}
              </button>

              {btRunning && (
                <p style={{ fontSize: 12, color: C.dim, marginTop: 10, marginBottom: 0 }}>
                  Retraining the model repeatedly across the period. This takes a few seconds.
                </p>
              )}
              {btError && (
                <p style={{ fontSize: 13, color: C.down, marginTop: 12, marginBottom: 0 }}>{btError}</p>
              )}
            </Card>

            {btResult && (
              <>
                <StatRow items={[
                  ["Accuracy", pct(btResult.accuracy)],
                  ["Baseline", pct(btResult.baseline)],
                  ["Difference", `${btResult.vsBaseline >= 0 ? "+" : ""}${(btResult.vsBaseline*100).toFixed(2)}pp`],
                  ["Days tested", btResult.totalDays],
                ]} />

                <H2>Accuracy over time</H2>
                <Card style={{ padding: "22px 24px 16px" }}>
                  <AccuracyChart series={btResult.runningAccuracy} baseline={btResult.baseline} />
                  <div style={{ display: "flex", gap: 20, marginTop: 14 }}>
                    <Legend color={C.accent}>Running accuracy</Legend>
                    <Legend color={C.dim} dashed>Baseline ({pct(btResult.baseline)})</Legend>
                  </div>
                </Card>
                <Note>Early swings are small-sample noise. The line settles as more days accumulate.</Note>

                <H2>Day by day</H2>
                <Card style={{ padding: 0, maxHeight: 380, overflowY: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead style={{ position: "sticky", top: 0, background: C.card }}>
                      <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                        {["Date","Predicted","Actual","Confidence","Result"].map((h,i) => (
                          <th key={h} style={{ textAlign: i === 0 ? "left" : "right", padding: "10px 18px",
                            fontSize: 12, fontWeight: 500, color: C.dim }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {btResult.predictions.map(p => (
                        <tr key={p.date} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                          <td className="mono" style={{ padding: "9px 18px", fontSize: 12.5, color: C.dim }}>{p.date}</td>
                          <td style={{ padding: "9px 18px", fontSize: 12.5, textAlign: "right", color: C.text }}>{p.predicted}</td>
                          <td style={{ padding: "9px 18px", fontSize: 12.5, textAlign: "right", color: C.dim }}>{p.actual}</td>
                          <td className="mono" style={{ padding: "9px 18px", fontSize: 12.5, textAlign: "right", color: C.dim }}>
                            {(p.confidence*100).toFixed(1)}%
                          </td>
                          <td style={{ padding: "9px 18px", fontSize: 12.5, textAlign: "right",
                            color: p.correct ? C.up : C.down }}>
                            {p.correct ? "Correct" : "Wrong"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              </>
            )}
          </>
        )}

        {view === "models" && (
          <>
            <H1 small>Models</H1>
            <Lead>Three approaches, evaluated on identical held-out data.</Lead>
            <ModelTable models={models} pct={pct} signed={signed} />
            <div style={{ marginTop: 28, display: "grid", gap: 10 }}>
              {models.map(m => (
                <Card key={m.name} style={{ padding: 18 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, margin: "0 0 6px" }}>{m.name}</p>
                  <p style={{ fontSize: 13, color: C.dim, lineHeight: 1.7, margin: 0 }}>
                    {m.name.startsWith("Baseline")
                      ? "Predicts the more common outcome every single day. Any model that cannot beat this has learned nothing useful."
                      : `Predicted an increase ${pct1(m.predictedUpRate)} of the time, against an actual rate of ${pct1(split.testUpRate)}.`}
                  </p>
                </Card>
              ))}
            </div>
          </>
        )}

        {view === "features" && (
          <>
            <H1 small>Signals</H1>
            <Lead>How much each input influenced the Random Forest. Market-wide inputs are shown in violet
              and account for {pct1(marketShare)} of the total. What an individual stock did yesterday
              barely registers next to what the whole market did.</Lead>
            <Card style={{ padding: "18px 20px" }}>
              {featureImportance.map(f => {
                const isMarket = MARKET_FEATURES.includes(f.feature)
                return (
                  <div key={f.feature} style={{ display: "flex", alignItems: "center", gap: 14, padding: "7px 0" }}>
                    <span style={{ fontSize: 13, width: 210, flexShrink: 0, color: isMarket ? C.text : C.dim }}>
                      {FEATURE_LABELS[f.feature] || f.feature}
                    </span>
                    <div style={{ flex: 1, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.04)", overflow: "hidden" }}>
                      <div style={{ width: `${(f.importance/maxImp)*100}%`, height: "100%", borderRadius: 3,
                        background: isMarket ? C.accent : "rgba(255,255,255,0.18)",
                        transition: "width 400ms cubic-bezier(0.4,0,0.2,1)" }} />
                    </div>
                    <span className="mono" style={{ fontSize: 12, width: 44, textAlign: "right", color: isMarket ? C.text : C.dim }}>
                      {f.importance.toFixed(3)}
                    </span>
                  </div>
                )
              })}
            </Card>
          </>
        )}

        {view === "tickers" && !selected && (
          <>
            <H1 small>Tickers</H1>
            <Lead>Model accuracy on each stock during the held-out period. Select one to see its price history.</Lead>
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search"
                style={{ ...inputStyle, flex: 1, maxWidth: 240 }} />
              {[["accuracy","By accuracy"],["symbol","A–Z"]].map(([id,label]) => (
                <button key={id} onClick={() => setSortBy(id)}
                  style={{ background: sortBy === id ? "rgba(255,255,255,0.06)" : C.card,
                    border: `1px solid ${sortBy === id ? C.borderBright : C.border}`, borderRadius: 7,
                    padding: "7px 12px", fontSize: 13, color: sortBy === id ? C.text : C.dim,
                    cursor: "pointer", fontFamily: "inherit" }}>{label}</button>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
              {tickers.map(t => (
                <button key={t.symbol} onClick={() => setSelected(t)}
                  style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 9,
                    padding: "14px 16px", textAlign: "left", cursor: "pointer", fontFamily: "inherit",
                    transition: "background 120ms, border-color 120ms" }}
                  onMouseEnter={e => { e.currentTarget.style.background = C.cardHover; e.currentTarget.style.borderColor = C.borderBright }}
                  onMouseLeave={e => { e.currentTarget.style.background = C.card; e.currentTarget.style.borderColor = C.border }}>
                  <p style={{ fontSize: 13, fontWeight: 600, margin: "0 0 4px" }}>{t.symbol}</p>
                  <p className="mono" style={{ fontSize: 15, margin: 0, color: t.accuracy >= 0.5 ? C.text : C.dim }}>{pct1(t.accuracy)}</p>
                </button>
              ))}
            </div>
            <Note>With {byTicker[0]?.days} test days each, random chance alone moves these numbers by roughly
              six points in either direction. The spread here is noise, not a per-stock effect.</Note>
          </>
        )}

        {view === "tickers" && selected && (
          <>
            <button onClick={() => setSelected(null)}
              style={{ background: "none", border: "none", color: C.dim, fontSize: 13,
                cursor: "pointer", padding: 0, marginBottom: 20, fontFamily: "inherit" }}>
              Back to all tickers
            </button>
            <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 20 }}>
              <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", margin: 0 }}>{selected.symbol}</h1>
              {closes.length > 0 && (
                <>
                  <span className="mono" style={{ fontSize: 18 }}>${closes[closes.length-1].toFixed(2)}</span>
                  <span className="mono" style={{ fontSize: 13, color: yearChange >= 0 ? C.up : C.down }}>
                    {yearChange >= 0 ? "+" : ""}{(yearChange*100).toFixed(1)}%
                  </span>
                </>
              )}
            </div>
            <Card style={{ padding: 24, marginBottom: 20 }}>
              {closes.length
                ? <Sparkline data={closes} color={yearChange >= 0 ? C.up : C.down} />
                : <p className="mono" style={{ fontSize: 12, color: C.dim, margin: 0 }}>Loading price history</p>}
            </Card>
            <StatRow items={[
              ["Model accuracy", pct1(selected.accuracy)],
              ["Test days", selected.days],
              ["vs baseline", `${((selected.accuracy - baseline.accuracy)*100).toFixed(1)}pp`],
            ]} cols={3} />
          </>
        )}

        {view === "method" && (
          <>
            <H1 small>Method</H1>
            <Lead>Most of the difficulty in this problem is not the model. It is making sure the evaluation is honest.</Lead>
            {[
              ["Split by date, not at random",
               `Financial data is ordered in time. Shuffling it puts future days into training and past days into testing, which inflates accuracy dramatically. Training here ends ${split.cutoffDate}; every day after is held out. Because ${dataset.tickers} stocks are pooled, the split is applied to dates rather than rows — otherwise the same calendar day would appear on both sides for different stocks.`],
              ["Always compare against guessing",
               `Prices rise slightly more often than they fall, so a model that always predicts an increase scores ${pct(baseline.accuracy)} here. Reporting accuracy without that comparison makes a useless model look competent.`],
              ["Retrain as you walk forward",
               "The backtest goes further than a single split: it retrains periodically using only data available at that point in time, then predicts the next day. Nothing from the future ever reaches the training set."],
              ["Test across many stocks",
               `Individual results ranged from ${pct1(Math.max(...byTicker.map(t=>t.accuracy)))} down to ${pct1(Math.min(...byTicker.map(t=>t.accuracy)))}. On ${byTicker[0]?.days} days per stock that entire spread fits inside normal random variation. Testing one stock would have produced a convincing-looking result that meant nothing.`],
              ["Report what happened",
               "The models did not work. That is the finding, and the platform is built to surface it rather than hide it behind a single flattering number."],
            ].map(([title, body]) => (
              <Card key={title} style={{ padding: 20, marginBottom: 10 }}>
                <p style={{ fontSize: 14, fontWeight: 600, margin: "0 0 8px" }}>{title}</p>
                <p style={{ fontSize: 13, color: C.dim, lineHeight: 1.75, margin: 0, maxWidth: 640 }}>{body}</p>
              </Card>
            ))}
          </>
        )}

      </main>
    </div>
  )
}

/* ---------- small components ---------- */

const Center = ({ children }) => (
  <div style={{ minHeight: "100vh", background: C.bg, display: "grid", placeItems: "center" }}>
    <p className="mono" style={{ color: C.dim, fontSize: 13 }}>{children}</p>
  </div>
)

const Card = ({ children, style }) => (
  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, ...style }}>{children}</div>
)

const H1 = ({ children, small }) => (
  <h1 style={{ fontSize: small ? 24 : 30, fontWeight: 600, letterSpacing: "-0.02em", margin: "0 0 10px" }}>{children}</h1>
)

const H2 = ({ children }) => (
  <h2 style={{ fontSize: 15, fontWeight: 600, margin: "32px 0 14px" }}>{children}</h2>
)

const Lead = ({ children }) => (
  <p style={{ color: C.dim, fontSize: 14, lineHeight: 1.65, maxWidth: 580, margin: "0 0 32px" }}>{children}</p>
)

const Note = ({ children }) => (
  <p style={{ fontSize: 12, color: C.dim, marginTop: 12, lineHeight: 1.7, maxWidth: 640 }}>{children}</p>
)

const Field = ({ label, children }) => (
  <div>
    <p style={{ fontSize: 12, color: C.dim, margin: "0 0 6px" }}>{label}</p>
    {children}
  </div>
)

const Legend = ({ color, dashed, children }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
    <div style={{ width: 14, height: 2, background: dashed ? "transparent" : color,
      borderTop: dashed ? `2px dashed ${color}` : "none" }} />
    <span style={{ fontSize: 12, color: C.dim }}>{children}</span>
  </div>
)

const StatRow = ({ items, cols = 4 }) => (
  <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols},1fr)`, gap: 1,
    background: C.border, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", marginTop: 20 }}>
    {items.map(([label, val]) => (
      <div key={label} style={{ background: C.card, padding: "16px 18px" }}>
        <p style={{ fontSize: 12, color: C.dim, margin: "0 0 6px" }}>{label}</p>
        <p className="mono" style={{ fontSize: 19, margin: 0, fontWeight: 500 }}>{val}</p>
      </div>
    ))}
  </div>
)

function ModelTable({ models, pct, signed }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${C.border}` }}>
            {["Model","Accuracy","vs baseline","Predicted up"].map((h,i) => (
              <th key={h} style={{ textAlign: i === 0 ? "left" : "right", padding: "11px 18px",
                fontSize: 12, fontWeight: 500, color: C.dim }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {models.map(m => {
            const isBase = m.name.startsWith("Baseline")
            return (
              <tr key={m.name} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <td style={{ padding: "13px 18px", fontSize: 13.5, color: isBase ? C.dim : C.text }}>{m.name}</td>
                <td className="mono" style={{ padding: "13px 18px", fontSize: 13, textAlign: "right" }}>{pct(m.accuracy)}</td>
                <td className="mono" style={{ padding: "13px 18px", fontSize: 13, textAlign: "right",
                  color: isBase ? C.dim : m.vsBaseline > 0 ? C.up : C.down }}>
                  {isBase ? "—" : `${signed(m.vsBaseline)}pp`}
                </td>
                <td className="mono" style={{ padding: "13px 18px", fontSize: 13, textAlign: "right", color: C.dim }}>
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