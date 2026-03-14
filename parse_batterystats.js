const fs = require('fs');
const readline = require('readline');

// Função auxiliar para quebrar a linha não dividindo pelos espaços dentro de aspas
function tokenizeAttributes(str) {
    const tokens = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (char === '"') {
            inQuotes = !inQuotes;
            current += char;
        } else if (char === ' ' && !inQuotes) {
            if (current.length > 0) {
                tokens.push(current);
                current = '';
            }
        } else {
            current += char;
        }
    }
    if (current.length > 0) tokens.push(current);
    return tokens;
}

async function parseBatteryStats(filePath) {
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({ input: fileStream });

    const timeline = [];

    // Estado persistente entre as linhas
    const metrics = {
        battery_level_pct: null,
        temperature_celsius: null,
        voltage_mv: null,
        current_ma: null
    };

    const device_state = {
        screen_on: false,
        wifi_is_scanning: false,
        cellular_high_power: false,
        gps_on: false
    };

    const apps = {
        top_app_in_screen: null,
        foreground_services_active: new Set(),
        background_jobs_active: new Set(),
        wake_locks_active: new Set()
    };

    // Linhas geralmente são: "  03-13 08:16:14.306 100 status=discharging ..."
    const regexLine = /^\s*(\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2}\.\d{3})\s+(\d{3})\s*(.*)$/;

    for await (const line of rl) {
        const match = line.match(regexLine);
        if (!match) continue; // Pular linhas que não sejam as principais de status

        const monthDay = match[1]; // Ex: 03-13
        const time = match[2];     // Ex: 08:16:14.306
        const level = parseInt(match[3], 10);
        const remainder = match[4].trim();

        // Considerando o ano 2026 como o ano base, como você mencionou
        const timestamp = `2026-${monthDay}T${time}Z`;

        metrics.battery_level_pct = level;

        const tokens = tokenizeAttributes(remainder);
        let changed = false;

        for (const token of tokens) {
            let key, value;
            if (token.includes('=')) {
                const idx = token.indexOf('=');
                key = token.slice(0, idx);
                value = token.slice(idx + 1);
                
                // Tratando valores com aspas: ex: u0a253:"com.google.android.apps.maps"
                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.slice(1, -1);
                } else if (value.includes(':"')) {
                    const parts = value.split(':"');
                    value = parts[1].slice(0, -1); // Pegamos apenas o pacote ou nome
                }
            } else {
                key = token;
                value = null;
            }

            // Aplicando o parse no estado!
            if (key === 'temp') {
                metrics.temperature_celsius = parseInt(value, 10) / 10;
                changed = true;
            } else if (key === 'volt') {
                metrics.voltage_mv = parseInt(value, 10);
                changed = true;
            } else if (key === 'current') {
                metrics.current_ma = parseInt(value, 10);
                changed = true;
            } 
            // Estado do Hardware
            else if (key === '+screen') { device_state.screen_on = true; changed = true; }
            else if (key === '-screen') { device_state.screen_on = false; changed = true; }
            else if (key === '+wifi_scan') { device_state.wifi_is_scanning = true; changed = true; }
            else if (key === '-wifi_scan') { device_state.wifi_is_scanning = false; changed = true; }
            else if (key === '+cellular_high_tx_power') { device_state.cellular_high_power = true; changed = true; }
            else if (key === '-cellular_high_tx_power') { device_state.cellular_high_power = false; changed = true; }
            else if (key === '+gps') { device_state.gps_on = true; changed = true; }
            else if (key === '-gps') { device_state.gps_on = false; changed = true; }

            // Estado dos Aplicativos e Jobs
            else if (key === '+top') { apps.top_app_in_screen = value; changed = true; }
            else if (key === '-top') { 
                if (apps.top_app_in_screen === value) apps.top_app_in_screen = null; 
                changed = true; 
            }
            else if (key === '+fg') { apps.foreground_services_active.add(value); changed = true; }
            else if (key === '-fg') { apps.foreground_services_active.delete(value); changed = true; }
            else if (key === '+job') { apps.background_jobs_active.add(value); changed = true; }
            else if (key === '-job') { apps.background_jobs_active.delete(value); changed = true; }
            else if (key === '+wake_lock') { apps.wake_locks_active.add(value); changed = true; }
            else if (key === '-wake_lock') { apps.wake_locks_active.delete(value); changed = true; }
        }

        // Se identificamos que houve ao menos uma mudança que monitoramos, vamos gerar um evento para o Grafana!
        if (changed) {
            timeline.push({
                timestamp: timestamp,
                metrics: { ...metrics },
                device_state: { ...device_state },
                apps: {
                    top_app_in_screen: apps.top_app_in_screen,
                    foreground_services_active: Array.from(apps.foreground_services_active),
                    background_jobs_active: Array.from(apps.background_jobs_active),
                    wake_locks_active: Array.from(apps.wake_locks_active)
                }
            });
        }
    }

    return timeline;
}

// Simulando a execução e gerando o output json
async function main() {
    const inputFilePath = 'batterystats.txt';
    const outputFilePath = 'batterystats_parsed.json';

    console.log('Iniciando parser do batterystats...');
    const data = await parseBatteryStats(inputFilePath);
    
    fs.writeFileSync(outputFilePath, JSON.stringify(data, null, 2));
    console.log(`Sucesso! ${data.length} estados processados (eventos que registraram mudanças no nosso radar).`);
    console.log(`Arquivo salvo em: ${outputFilePath}`);
}

main().catch(console.error);
