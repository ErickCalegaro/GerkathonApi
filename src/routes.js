const express = require('express');
const router = express.Router();
const manager = require('./manager');
const statusOk = 200;
const statusEr = 404;

// tables
// Endpoint para carga de tabelas single message
router.post('/batteryData', async (req, res) => {
    try {
        console.log('JSON recebido:', req.body);
        const response = await manager.processData(req.body, statusOk);
        console.log('JSON enviado:', JSON.stringify(response));
        res.status(response.status || statusOk).json(response);
    } catch (error) {
        console.error('Erro:', error);
        res.status(statusEr).json({ error: 'Recurso não implementado' });
    }
});

module.exports = router;