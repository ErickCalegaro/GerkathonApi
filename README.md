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
git clone <url_do_seu_repositorio>
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

## 💡 Informações Secundárias e Contato

*   **Evitar o track file gigange**: Os logs cruéis nativos como o `batterystats.txt` que passam de milhões de de linhas não são versionados devido as travas criadas agora no `gitignore`.
*   **Dúvidas/Suporte**: Desenvolvedor responsável / Mantenedor do projeto pode ser posicionado e contactado no [Linkedin](https://www.linkedin.com/in/erick-calegaro/).