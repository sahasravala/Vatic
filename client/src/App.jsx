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

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1>Vatic</h1>
      <p>Stock Forecasting & Model Evaluation Platform</p>

      <h2>Stocks</h2>
      {stocks.map(stock => (
        <div key={stock.id} style={{ border: "1px solid #ccc", padding: "10px", marginBottom: "10px" }}>
          <strong>{stock.symbol}</strong> — {stock.name}
        </div>
      ))}

      <h2>Predictions</h2>
      {predictions.map(prediction => (
        <div key={prediction.id} style={{ border: "1px solid #ccc", padding: "10px", marginBottom: "10px" }}>
          <strong>{prediction.symbol}</strong> — {prediction.predictedDirection} — {prediction.modelUsed} — {prediction.wasCorrect === true ? "✅ Correct" : prediction.wasCorrect === false ? "❌ Wrong" : "⏳ Pending"}
        </div>
      ))}
    </div>
  )
}

export default App