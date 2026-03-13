# Gerkathon API - Android Battery Log Parser & Tracker

Esta é a API central responsável por receber, traduzir e armazenar os dados de consumo de bateria (extraídos via log do *batterystats* do Android) em um banco de dados **MySQL**.

A solução permite decodificar as extensas linhas do histórico da bateria do Android em um formato amigável (JSON), processar métricas importantes, status do dispositivo, apps em primeiro/segundo plano, wakelocks e carregar isso de forma eficiente em um banco local facilitando integrações de monitoramento futuro (como com o Grafana, por exemplo).

## 🚀 Arquitetura do Projeto

*   **`parse_batterystats.js`**: Script utilitário em Node dedicado a ler os logs nativos do `batterystats.txt` (gerado por dumpsys no Android) e formatá-los para um arquivo JSON organizado.
*   **`import_to_mysql.js`**: Ferramenta de **Bulk Insert** que conecta ao banco de dados e insere massivamente os eventos exportados pelo parser para dentro do MySQL. Excelente para carregar dados históricos e analisar no Grafana de imediato.
*   **Servidor Express HTTP** (`src/index.js`, `src/routes.js` e `src/manager.js`): Serviço online ouvindo requisições na porta **9000** que recebe envios de dados de bateria de forma contínua (`/batteryData`) e já realiza de imediato a conversão e Inserção SQL mantendo o banco alimentado em tempo real.

---

## ⚙️ Pré-requisitos

1.  **Node.js**: Versão **14.17.4** ou superior (recomenda-se utilizar versões compatíveis com MySQL2@2 em diante, caso seu Node seja muito antigo).
2.  **MySQL Database**: Um servidor relacional MySQL rodando e acessível com a tabela principal permitindo as transações.

---

## 🛠️ Como configurar e rodar

### 1. Instruções para Clone e Dependências
```bash
git clone https://github.com/erickcalegaro/GerkathonApi.git
cd GerkathonApi
npm install
```

### 2. Configurações de Banco de Dados
A API vem pré-configurada apontando para as credenciais locais em `manager.js` e `import_to_mysql.js`:
*   **Host**: localhost
*   **User**: ubuntu
*   **Password**: root
*   **Database**: server

*Certifique-se de configurar o seu banco local de testes com as mesmas ou ajustar essas variáveis nestes dois arquivos de carga.*
*A tabela `battery_events` é criada **automaticamente** caso não exista em sua primeira inserção ou inicialização de script.*

### 3. Rodando o Servidor de API (Modo Real Time)
Para ativar o servidor que fica à espera do endpoint de carga:
```bash
npm start
```
O servidor ficará de prontidão na porta:
**`http://localhost:9000`**

Para enviar dados contínuos, basta fazer um **POST** para a rota `/batteryData`, passando um JSON único ou array com o payload da bateria. Ele gerará e retornará os HTTP Respective status adequados se houver falhas com o banco.

---

## 📊 Estrutura do Endpoint HTTP

**Rota:** `POST /batteryData`

**Exemplo de Payload esperado no Body:**
```json
[
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
      "top_app_in_screen": null,
      "foreground_services_active": [],
      "background_jobs_active": [
        "com.microsoft.office.outlook/androidx.work.impl.background.systemjob.SystemJobService"
      ],
      "wake_locks_active": [null]
    }
  }
]
```
*Seu request irá processar, injetar ao banco e responder 200 de imediato se validado.*

---

## 💡 Entendendo o `batterystats.txt` do Android

Os logs de histórico gerados pelo comando `dumpsys batterystats --history` detalham exatamente o que estava acontecendo no dispositivo, milissegundo a milissegundo.

### Estrutura da Linha de Log
Uma linha típica de evento se parece com isso:
`03-13 08:16:14.306 100 status=discharging current=-1629 temp=248 +cellular_high_tx_power -video`

*   **Timestamp**: `03-13 08:16:14.306` (Mês-Dia Hora:Minuto:Segundo.Milissegundo).
*   **Nível da bateria**: `100` ou `099` (Porcentagem).
*   **Métricas Chave-Valor**:
    *   `temp=248`: Temperatura em décimos de grau Celsius (24.8 ºC).
    *   `volt=4291`: Voltagem em milivolts.
    *   `current=-1629`: Corrente em miliamperes (negativo é dreno, positivo é carga).
*   **Eventos Delta**:
    *   **`+` (Ativado)**: Um serviço ou hardware iniciou (ex: `+wifi_scan`, `+gps`).
    *   **`-` (Desativado)**: Um serviço ou hardware encerrou (ex: `-screen`, `-video`).

---

## ⚙️ Estratégia de Parsing (State Tracking)

O log do Android utiliza **compressão delta**: ele não imprime tudo que está acontecendo a cada instante, apenas o que **MUDOU**.

Para um parsing correto, o motor da API utiliza **State Tracking**:
1.  Se o Wi-Fi for ligado na linha 10 (`+wifi`), o parser assume que ele permanece ligado em todas as linhas subsequentes.
2.  Ele só é marcado como desligado quando uma linha futura contiver explicitamente `-wifi`.
3.  Isso permite reconstruir o estado completo do dispositivo para cada milissegundo do log.

---

## 📊 Visualização no Grafana

Com os dados processados e salvos na tabela `battery_events`, você pode criar dashboards de diagnóstico avançado:

1.  **Top Drenadores (Bar Chart)**: Agregação da métrica `current_ma` agrupada por `top_app_in_screen`. Identifica qual app consome mais energia enquanto está em uso.
2.  **Vilões em Background**: Filtro onde `screen_on` é `false` mas `current_ma` está alto, agrupando por `background_jobs_active` ou `wake_locks_active`.
3.  **Timeline de Sensores (State Timeline)**: Gráfico de "pílulas" correlacionando o uso de GPS, WiFi Scanning e Cellular Power com as quedas na porcentagem da bateria.
4.  **Correlação Térmica**: Gráfico de linha dupla comparando `temperature_celsius` com `current_ma` para identificar superaquecimento causado por processamento intenso.

---

## 📈 Tabela MySQL (`battery_events`)

A tabela é otimizada para consultas de séries temporais:
*   `event_timestamp DATETIME(3)`: Suporte a precisão de milissegundos.
*   `current_ma INT`: Valores instantâneos de corrente.
*   `top_app_in_screen VARCHAR(255)`: O aplicativo que estava visível no momento do log.
*   `wake_locks`, `background_jobs`, `foreground_services`: Colunas tipo **JSON** para armazenar múltiplos eventos simultâneos.

---

## 💡 Informações Secundárias e Contato

*   **Logs Gigantes**: Arquivos `batterystats.txt` podem passar de milhões de linhas. Recomenda-se processar em chunks ou utilizar o script de importação massiva.
*   **Gitignore**: Os arquivos de log brutos e o JSON parseado de cache não são versionados para manter o repositório leve.
