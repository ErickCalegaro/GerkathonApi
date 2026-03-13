const express = require('express');
const bodyParser = require('body-parser');
const routes = require('./routes');
const app = express();
const port = 9000;

// Middleware para fazer o parsing do corpo da requisição como JSON
app.use(bodyParser.json());

// Usando as rotas exportadas
app.use('/', routes);

// Iniciar o servidor
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});