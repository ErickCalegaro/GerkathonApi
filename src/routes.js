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

// Rota para servir o logo
router.get('/argoenergy_logo.png', (req, res) => {
  res.sendFile(require('path').join(__dirname, '../argoenergy_logo.png'));
});

// Rota para servir o favicon
router.get('/favicon.png', (req, res) => {
  res.sendFile(require('path').join(__dirname, '../favicon.png'));
});

// Endpoint GET que exibe a documentação da API em HMTL
router.get('/batteryData', (req, res) => {
  const htmlDoc = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ARGOENERGY - Android Battery Log Parser & Tracker</title>
    <link rel="icon" type="image/png" href="/favicon.png">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; color: #333; line-height: 1.6; padding: 20px; }
        .container { max-width: 900px; margin: 0 auto; background: #fff; padding: 30px 40px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { display: flex; align-items: center; border-bottom: 2px solid #3498db; padding-bottom: 15px; margin-bottom: 20px; }
        h1 { color: #2c3e50; margin: 0; flex-grow: 1; text-align: center; }
        .logo { max-width: 140px; border-radius: 6px; }
        h2 { color: #2980b9; margin-top: 30px; display: flex; align-items: center; }
        pre { background: #282c34; color: #abb2bf; padding: 15px; border-radius: 5px; overflow-x: auto; font-family: 'Courier New', Courier, monospace; }
        .method { display: inline-block; background: #2ecc71; color: white; padding: 5px 10px; border-radius: 4px; font-weight: bold; margin-right: 15px; font-size: 0.8em; }
        .method.get { background: #3498db; }
        .endpoint { font-size: 1.1em; font-family: monospace; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 0.95em; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; color: #2c3e50; border-bottom: 2px solid #dee2e6; }
        tr:hover { background-color: #f1f3f5; }
        .badge { display: inline-block; padding: 3px 8px; font-size: 12px; font-weight: bold; border-radius: 4px; background: #e9ecef; color: #495057; border: 1px solid #ced4da; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="/argoenergy_logo.png" alt="ARGOENERGY Logo" class="logo">
            <h1>ARGOENERGY API</h1>
        </div>
        <p>Serviço central de captura e armazenamento de logs telemétricos de bateria do Android (<em>batterystats</em>).</p>

        <h2><span class="method get">GET</span><span class="endpoint">/batteryData</span></h2>
        <p>Exibe esta documentação visual orientativa com os esquemas esperados pela API.</p>

        <h2><span class="method">POST</span><span class="endpoint">/batteryData</span></h2>
        <p>Este endpoint aceita um envelope contendo o número de serie do terminal e um array de eventos de métricas processadas a partir dos logs de dumpsys do Android. Os dados são inseridos no banco de dados MySQL para análise telemétrica.</p>
        
        <pre><code>{
  "serial_number": "G000000000000001",
  "events": [
    {
      "timestamp": "2026-03-13T08:16:13.901Z",
      "metrics": {
        "battery_level_pct": 100,
        "temperature_celsius": 24.8,
        "voltage_mv": 4291,
        "current_ma": -4
      },
      "device_state": {
        "screen_on": true,
        "wifi_is_scanning": false,
        "cellular_high_power": true,
        "gps_on": true
      },
      "apps": {
        "top_app_in_screen": "com.google.android.apps.maps",
        "foreground_services_active": [
          "com.whatsapp"
        ],
        "background_jobs_active": [
          "com.microsoft.office.outlook/androidx.work.impl.background.systemjob.SystemJobService"
        ],
        "wake_locks_active": [
          "AudioIn"
        ]
      }
    }
  ]
}</code></pre>

        <h3>📋 Dicionário de Dados do Payload</h3>
        <table>
            <tr><th>Campo</th><th>Tipo de Dado</th><th>Descrição</th></tr>
            <tr><td><code>serial_number</code></td><td><span class="badge">String</span></td><td>Número de série único do terminal de pagamento ou dispositivo Android (Ex: G7D0...).</td></tr>
            <tr><td><code>events</code> *(array)*</td><td><span class="badge">Array&lt;Object&gt;</span></td><td>Lista contendo um ou múltiplos blocos de eventos de bateria.</td></tr>
            <tr><td><code>events[].timestamp</code></td><td><span class="badge">String (ISO)</span></td><td>Data e hora exata do evento na bateria, recomendável a formatação em padrão ISO-8601.</td></tr>
            <tr><td><code>events[].metrics.battery_level_pct</code></td><td><span class="badge">Integer</span></td><td>Nível da bateria em porcentagem (Escala de 0 a 100).</td></tr>
            <tr><td><code>events[].metrics.temperature_celsius</code></td><td><span class="badge">Float</span></td><td>Temperatura operante e atual do dispositivo celular em graus Celsius (°C).</td></tr>
            <tr><td><code>events[].metrics.voltage_mv</code></td><td><span class="badge">Integer</span></td><td>Tensão instantânea da bateria medida em milivolts.</td></tr>
            <tr><td><code>events[].metrics.current_ma</code></td><td><span class="badge">Integer</span></td><td>Corrente (mA). O dreno/descarga contínua é indicado por <strong>valores negativos</strong>. Valores positivos sinalizam evento de carregamento enraizado.</td></tr>
            <tr><td><code>events[].device_state.screen_on</code></td><td><span class="badge">Boolean</span></td><td>Informa se o hardware da tela do aparelho estava consumindo energia (aceso) no momento específico.</td></tr>
            <tr><td><code>events[].device_state.wifi_is_scanning</code></td><td><span class="badge">Boolean</span></td><td>Informa se o chip de WiFi do aparelho estava engatilhado e ativamente procurando/negociando redes pelo ambiente.</td></tr>
            <tr><td><code>events[].device_state.cellular_high_power</code></td><td><span class="badge">Boolean</span></td><td>Informa se a antena mobile do chip (3G/4G/5G) assumiu transmissão operante usando alta potência de voltagem.</td></tr>
            <tr><td><code>events[].device_state.gps_on</code></td><td><span class="badge">Boolean</span></td><td>Informa se o hardware do componente GNSS (Global Navigation) foi acionado capturando posições geográficas de latitude/longitude.</td></tr>
            <tr><td><code>events[].apps.top_app_in_screen</code></td><td><span class="badge">String | Null</span></td><td>Package do aplicativo primário que estava ocupando o foco total ou parcial da tela neste exato milissegundo.</td></tr>
            <tr><td><code>events[].apps.foreground_services_active</code> *(array)*</td><td><span class="badge">Array&lt;String&gt;</span></td><td>Lista de serviços bloqueantes e vitais em primeiro plano sem morte súbita (Ex: Chamada de vídeo, música tocando).</td></tr>
            <tr><td><code>events[].apps.background_jobs_active</code> *(array)*</td><td><span class="badge">Array&lt;String&gt;</span></td><td>Múltiplas sub-rotinas escondidas que o sistema operacional rodou (Ex: Uploading, Verificação de Emails).</td></tr>
            <tr><td><code>events[].apps.wake_locks_active</code> *(array)*</td><td><span class="badge">Array&lt;String&gt;</span></td><td>Lista de amarras "WakeLocks" disparadas e seguradas pelas aplicações forçando o CPU/Periférico a não dormir (Deep Sleep).</td></tr>
        </table>
    </div>
</body>
</html>
    `;
  res.status(200).send(htmlDoc);
});

module.exports = router;