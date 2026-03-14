const mysql = require('mysql2/promise');

// Credenciais do banco (mesmas do import script)
const credentials = {
    host: 'localhost',
    user: 'ubuntu',
    password: 'root',
    database: 'server',
};

//Public
// Realiza o gerenciamento da carga das tabelas
async function processData(jsonSend, status) {
    if (status !== 200) {
        return {
            status: status,
            message: 'Recurso não implementado',
            data: {}
        };
    }

    let connection;
    try {
        // Conectar ao banco a cada requisição (ou usar pool se for o caso futuramente)
        connection = await mysql.createConnection({
            ...credentials,
            multipleStatements: true
        });

        // Garantir que a tabela existe
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS battery_events (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                device_id VARCHAR(50) DEFAULT 'default_device', 
                event_timestamp DATETIME(3) NOT NULL,
                
                battery_level_pct TINYINT UNSIGNED,
                temperature_celsius DECIMAL(5,2),
                voltage_mv INT,
                current_ma INT,
                
                screen_on BOOLEAN DEFAULT FALSE,
                wifi_is_scanning BOOLEAN DEFAULT FALSE,
                cellular_high_power BOOLEAN DEFAULT FALSE,
                gps_on BOOLEAN DEFAULT FALSE,
                
                top_app_in_screen VARCHAR(255),
                
                foreground_services JSON,
                background_jobs JSON,
                wake_locks JSON,
                
                INDEX idx_timestamp (event_timestamp),
                INDEX idx_top_app (top_app_in_screen)
            );
        `;
        await connection.query(createTableQuery);

        // O Express parser transforma o json em request body pra gente (objeto ou lista)
        // O formato esperado agora é: { "serial_number": "...", "events": [...] }
        const serialNumber = jsonSend.serial_number || 'default_device';
        const events = Array.isArray(jsonSend.events) ? jsonSend.events : (Array.isArray(jsonSend) ? jsonSend : [jsonSend]);

        if (events.length === 0) {
            await connection.end();
            return {
                status: 200,
                message: 'Nenhum dado enviado na requisição',
                data: {}
            };
        }

        // Fazer o translate dos dados do JSON para a matriz do VALUES do Insert
        const valuesList = events.map(evt => {
            // Formatar a data se ela vier no padrão ISO (caso contrário não mexe, ou pega atual)
            const timestamp = evt.timestamp || new Date().toISOString();
            const formattedTimestamp = timestamp.replace('T', ' ').replace('Z', '');
            
            return [
                serialNumber, 
                formattedTimestamp,
                
                evt.metrics?.battery_level_pct ?? null,
                evt.metrics?.temperature_celsius ?? null,
                evt.metrics?.voltage_mv ?? null,
                evt.metrics?.current_ma ?? null,
                
                evt.device_state?.screen_on ? 1 : 0,
                evt.device_state?.wifi_is_scanning ? 1 : 0,
                evt.device_state?.cellular_high_power ? 1 : 0,
                evt.device_state?.gps_on ? 1 : 0,
                
                evt.apps?.top_app_in_screen || null,
                JSON.stringify(evt.apps?.foreground_services_active || []),
                JSON.stringify(evt.apps?.background_jobs_active || []),
                JSON.stringify(evt.apps?.wake_locks_active || [])
            ];
        });

        const insertSQL = `
            INSERT INTO battery_events (
                device_id, event_timestamp, 
                battery_level_pct, temperature_celsius, voltage_mv, current_ma,
                screen_on, wifi_is_scanning, cellular_high_power, gps_on,
                top_app_in_screen, foreground_services, background_jobs, wake_locks
            ) VALUES ?
        `;

        await connection.query(insertSQL, [valuesList]);
        await connection.end();

        return {
            status: 200,
            message: 'Dados traduzidos e inseridos no banco com sucesso',
            data: { 
                inserted_rows: valuesList.length
            }
        };

    } catch (error) {
        console.error("Erro no processamento pro banco de dados:", error);
        if (connection) {
            await connection.end();
        }
        
        // Em caso de erro estouramos 500 informando o que deu errado
        return {
            status: 500,
            message: 'Falha ao processar insersão no banco',
            data: error.message
        };
    }
}

// Exportando funções
module.exports = {
    processData
};