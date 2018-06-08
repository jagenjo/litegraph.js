const express = require('express')
const app = express()

app.use('/css', express.static('css'))
app.use('/src', express.static('src'))
app.use('/external', express.static('external'))
app.use('/demo', express.static('demo'))
app.use('/', express.static('demo'))

app.listen(80, () => console.log('Example app listening on port 80!'))