import { useState, useEffect } from "react"

function App() {
  const [stocks, setStocks] = useState([])
  const [predictions, setPredictions] = useState([])
  const [accuracy, setAccuracy] = useState({})
  const [prices, setPrices] = useState({})

  useEffect(() => {
    fetch("http://localhost:8080/stocks")
      .then(res => res.json())
      .then(data => {
        setStocks(data)
        data.forEach(stock => {
          fetch(`http://localhost:8080/stocks/${stock.symbol}/price`)
            .then(res => res.json())
            .then(priceData => {
              const quote = priceData["Global Quote"]
              if (quote && quote["05. price"]) {
                setPrices(prev => ({
                  ...prev,
                  [stock.symbol]: {
                    price: parseFloat(quote["05. price"]).toFixed(2),
                    change: parseFloat(quote["09. change"]).toFixed(2),
                    changePercent: quote["10. change percent"]
                  }
                }))
              }
            })
        })
      })

    fetch("http://localhost:8080/predictions")
      .then(res => res.json())
      .then(data => setPredictions(data))

    fetch("http://localhost:8080/predictions/accuracy")
      .then(res => res.json())
      .then(data => setAccuracy(data))
  }, [])

  const totalCorrect = predictions.filter(p => p.wasCorrect === true).length
  const totalScored = predictions.filter(p => p.wasCorrect !== null).length
  const overallAccuracy = totalScored > 0 ? Math.round((totalCorrect / totalScored) * 100) : null

  return (
    <div className="min-h-screen text-white" style={{background: "radial-gradient(ellipse at top, #0a0f1e 0%, #000000 70%)"}}>

      {/* Nav */}
      <nav className="px-8 py-4 flex items-center justify-between sticky top-0 z-10" style={{background: "rgba(0,0,0,0.8)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(0,200,255,0.1)"}}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-cyan-400" style={{boxShadow: "0 0 8px #00d4ff, 0 0 20px #00d4ff"}}></div>
          <span className="font-bold tracking-widest text-lg" style={{background: "linear-gradient(90deg, #fff, #00d4ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"}}>VATIC</span>
        </div>
        <div className="flex items-center gap-8 text-sm">
          <span className="text-cyan-400 border-b border-cyan-400 pb-0.5">Dashboard</span>
          <span className="text-white/30 hover:text-white/60 cursor-pointer transition-colors">Models</span>
          <span className="text-white/30 hover:text-white/60 cursor-pointer transition-colors">History</span>
          <span className="text-white/30 hover:text-white/60 cursor-pointer transition-colors">Leaderboard</span>
        </div>
        <div className="text-white/20 text-xs font-mono">
          {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </div>
      </nav>

      {/* Hero */}
      <div className="px-8 pt-12 pb-8 max-w-5xl mx-auto">
        <p className="text-cyan-400/60 text-xs uppercase tracking-widest mb-2 font-mono">Market Intelligence Platform</p>
        <h1 className="text-4xl font-light text-white mb-1">Predictive Analytics</h1>
        <p className="text-white/30 text-sm">ML-powered forecasting with real-time accuracy tracking</p>
      </div>

      <div className="max-w-5xl mx-auto px-8 pb-10">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { label: "Stocks Tracked", value: stocks.length },
            { label: "Predictions Made", value: predictions.length },
            { label: "Overall Accuracy", value: overallAccuracy !== null ? `${overallAccuracy}%` : "—" }
          ].map((stat, i) => (
            <div key={i} className="rounded-2xl p-6 relative overflow-hidden" style={{background: "linear-gradient(135deg, rgba(0,212,255,0.05) 0%, rgba(0,0,0,0) 100%)", border: "1px solid rgba(0,212,255,0.15)", boxShadow: "inset 0 1px 0 rgba(0,212,255,0.1)"}}>
              <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10" style={{background: "radial-gradient(circle, #00d4ff, transparent)", transform: "translate(30%, -30%)"}}></div>
              <p className="text-white/30 text-xs uppercase tracking-widest mb-3 font-mono">{stat.label}</p>
              <p className="text-4xl font-light text-white font-mono">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Model Performance */}
        <div className="mb-10">
          <p className="text-white/30 text-xs uppercase tracking-widest mb-4 font-mono">Model Performance</p>
          <div className="rounded-2xl overflow-hidden" style={{border: "1px solid rgba(0,212,255,0.1)", background: "rgba(0,212,255,0.02)"}}>
            <table className="w-full">
              <thead>
                <tr style={{borderBottom: "1px solid rgba(0,212,255,0.1)"}}>
                  <th className="text-left px-6 py-3 text-white/30 text-xs uppercase tracking-widest font-mono font-normal">Model</th>
                  <th className="text-right px-6 py-3 text-white/30 text-xs uppercase tracking-widest font-mono font-normal">Correct</th>
                  <th className="text-right px-6 py-3 text-white/30 text-xs uppercase tracking-widest font-mono font-normal">Total</th>
                  <th className="text-right px-6 py-3 text-white/30 text-xs uppercase tracking-widest font-mono font-normal">Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(accuracy).map(([model, stats]) => (
                  <tr key={model} style={{borderBottom: "1px solid rgba(255,255,255,0.03)"}}>
                    <td className="px-6 py-4 text-white text-sm font-mono">{model.replace("_", " ")}</td>
                    <td className="px-6 py-4 text-right text-cyan-400 text-sm font-mono">{stats.correct}</td>
                    <td className="px-6 py-4 text-right text-white/30 text-sm font-mono">{stats.total}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-mono font-medium" style={{color: parseInt(stats.accuracy) >= 50 ? "#00d4ff" : "#ff4d6d", textShadow: parseInt(stats.accuracy) >= 50 ? "0 0 10px rgba(0,212,255,0.5)" : "0 0 10px rgba(255,77,109,0.5)"}}>
                        {stats.accuracy}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Watchlist */}
        <div className="mb-10">
          <p className="text-white/30 text-xs uppercase tracking-widest mb-4 font-mono">Watchlist</p>
          <div className="grid grid-cols-3 gap-3">
            {stocks.map(stock => {
              const price = prices[stock.symbol]
              const isPositive = price && parseFloat(price.change) >= 0
              return (
                <div key={stock.id} className="rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:scale-105" style={{background: "linear-gradient(135deg, rgba(0,212,255,0.05), rgba(0,0,0,0))", border: "1px solid rgba(0,212,255,0.12)", boxShadow: "0 4px 24px rgba(0,0,0,0.4)"}}>
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-white font-bold text-xl font-mono">{stock.symbol}</span>
                    {price && (
                      <span className="text-xs px-2 py-1 rounded-full font-mono" style={{background: isPositive ? "rgba(0,212,255,0.1)" : "rgba(255,77,109,0.1)", color: isPositive ? "#00d4ff" : "#ff4d6d"}}>
                        {isPositive ? "+" : ""}{price.changePercent}
                      </span>
                    )}
                  </div>
                  <p className="text-white/30 text-xs mb-4 font-mono">{stock.name}</p>
                  {price ? (
                    <div>
                      <p className="text-white text-3xl font-light font-mono">${price.price}</p>
                      <p className="text-xs mt-1 font-mono" style={{color: isPositive ? "#00d4ff" : "#ff4d6d"}}>
                        {isPositive ? "▲" : "▼"} ${Math.abs(price.change)}
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/40 animate-pulse"></div>
                      <p className="text-white/20 text-xs font-mono">fetching price</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Predictions */}
        <div>
          <p className="text-white/30 text-xs uppercase tracking-widest mb-4 font-mono">Recent Predictions</p>
          <div className="space-y-2">
            {predictions.map(prediction => (
              <div key={prediction.id} className="rounded-2xl px-6 py-4 flex items-center justify-between transition-all duration-200 hover:scale-[1.01]" style={{background: "rgba(0,212,255,0.02)", border: "1px solid rgba(0,212,255,0.08)"}}>
                <div className="flex items-center gap-5">
                  <span className="text-white font-bold w-14 font-mono">{prediction.symbol}</span>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono" style={{
                    background: prediction.predictedDirection === "UP" ? "rgba(0,212,255,0.1)" : "rgba(255,77,109,0.1)",
                    color: prediction.predictedDirection === "UP" ? "#00d4ff" : "#ff4d6d",
                    border: `1px solid ${prediction.predictedDirection === "UP" ? "rgba(0,212,255,0.2)" : "rgba(255,77,109,0.2)"}`
                  }}>
                    <span>{prediction.predictedDirection === "UP" ? "↑" : "↓"}</span>
                    <span>{prediction.predictedDirection}</span>
                  </div>
                  <span className="text-white/20 text-xs font-mono">{prediction.modelUsed.replace("_", " ")}</span>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-white/20 text-xs mb-0.5 font-mono">confidence</p>
                    <p className="text-white text-sm font-mono">{(prediction.confidence * 100).toFixed(0)}%</p>
                  </div>
                  <div className="text-xs font-mono px-3 py-1 rounded-full" style={{
                    background: prediction.wasCorrect === true ? "rgba(0,212,255,0.1)" : prediction.wasCorrect === false ? "rgba(255,77,109,0.1)" : "rgba(255,255,255,0.05)",
                    color: prediction.wasCorrect === true ? "#00d4ff" : prediction.wasCorrect === false ? "#ff4d6d" : "rgba(255,255,255,0.2)",
                    textShadow: prediction.wasCorrect === true ? "0 0 10px rgba(0,212,255,0.5)" : prediction.wasCorrect === false ? "0 0 10px rgba(255,77,109,0.5)" : "none"
                  }}>
                    {prediction.wasCorrect === true ? "✓ CORRECT" : prediction.wasCorrect === false ? "✗ WRONG" : "PENDING"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

export default App