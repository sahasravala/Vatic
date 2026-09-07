import { useState, useEffect } from "react"

function App() {
  const [stocks, setStocks] = useState([])
  const [predictions, setPredictions] = useState([])

  useEffect(() => {
    fetch("http://localhost:8080/stocks")
      .then(res => res.json())
      .then(data => setStocks(data))
    fetch("http://localhost:8080/predictions")
      .then(res => res.json())
      .then(data => setPredictions(data))
  }, [])

  const accuracy = predictions.length > 0
    ? Math.round((predictions.filter(p => p.wasCorrect === true).length / predictions.filter(p => p.wasCorrect !== null).length) * 100)
    : null

  return (
    <div className="min-h-screen bg-black text-white">

      {/* Top nav */}
      <nav className="border-b border-white/10 px-8 py-4 flex items-center justify-between backdrop-blur-sm sticky top-0 bg-black/80 z-10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
          <span className="text-white font-semibold tracking-wide text-lg">VATIC</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-white/40">
          <span className="text-white/70">Dashboard</span>
          <span>Models</span>
          <span>History</span>
          <span>Leaderboard</span>
        </div>
        <div className="text-white/30 text-xs">
          {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-8 py-10">

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Stocks Tracked</p>
            <p className="text-3xl font-light text-white">{stocks.length}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Predictions Made</p>
            <p className="text-3xl font-light text-white">{predictions.length}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Model Accuracy</p>
            <p className="text-3xl font-light text-white">{accuracy !== null ? `${accuracy}%` : "—"}</p>
          </div>
        </div>

        {/* Watchlist */}
        <div className="mb-10">
          <p className="text-white/40 text-xs uppercase tracking-widest mb-4">Watchlist</p>
          <div className="grid grid-cols-3 gap-3">
            {stocks.map(stock => (
              <div key={stock.id} className="bg-white/5 hover:bg-white/8 border border-white/10 rounded-2xl p-5 cursor-pointer transition-all duration-200 group">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-white font-semibold text-lg">{stock.symbol}</span>
                  <span className="text-emerald-400 text-xs bg-emerald-400/10 px-2 py-1 rounded-full">Active</span>
                </div>
                <p className="text-white/40 text-sm">{stock.name}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Predictions */}
        <div>
          <p className="text-white/40 text-xs uppercase tracking-widest mb-4">Recent Predictions</p>
          <div className="space-y-2">
            {predictions.map(prediction => (
              <div key={prediction.id} className="bg-white/5 hover:bg-white/8 border border-white/10 rounded-2xl px-6 py-4 flex items-center justify-between transition-all duration-200">
                <div className="flex items-center gap-5">
                  <span className="text-white font-semibold w-14">{prediction.symbol}</span>
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                    prediction.predictedDirection === "UP"
                      ? "bg-emerald-400/10 text-emerald-400"
                      : "bg-red-400/10 text-red-400"
                  }`}>
                    <span>{prediction.predictedDirection === "UP" ? "↑" : "↓"}</span>
                    <span>{prediction.predictedDirection}</span>
                  </div>
                  <span className="text-white/30 text-xs">{prediction.modelUsed.replace("_", " ")}</span>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-white/30 text-xs mb-0.5">Confidence</p>
                    <p className="text-white text-sm">{(prediction.confidence * 100).toFixed(0)}%</p>
                  </div>
                  <div className={`text-xs font-medium px-3 py-1 rounded-full ${
                    prediction.wasCorrect === true
                      ? "bg-emerald-400/10 text-emerald-400"
                      : prediction.wasCorrect === false
                      ? "bg-red-400/10 text-red-400"
                      : "bg-white/5 text-white/30"
                  }`}>
                    {prediction.wasCorrect === true ? "✓ Correct" : prediction.wasCorrect === false ? "✗ Wrong" : "Pending"}
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