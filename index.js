const express = require('express')
const app = express()

app.use(express.json())

app.get('/', (req, res) => {
    res.json({ message: 'Vatic API is running' })
})

app.listen(3000, () => {
    console.log('Vatic server running on port 3000')
})