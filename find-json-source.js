/**
 * ИЩУ JSON С ДАННЫМИ - Tilda хранит данные в JSON
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

async function findJSONData() {
    console.log('🔍 ПОИК JSON С ДАННЫМИ\n');
    
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // Перехватываем все запросы
        const requests = [];
        page.on('request', request => {
            const url = request.url();
            if (url.includes('.json') || url.includes('api') || url.includes('catalog')) {
                requests.push(url);
                console.log(`\n📡 НАЙДЕН ЗАПРОС:`);
                console.log(`   ${url}`);
            }
        });
        
        // Перехватываем ответы
        const responses = [];
        page.on('response', async response => {
            const url = response.url();
            const contentType = response.headers()['content-type'] || '';
            
            if (contentType.includes('application/json')) {
                console.log(`\n💎 JSON ОТВЕТ:`);
                console.log(`   URL: ${url}`);
                
                try {
                    const json = await response.json();
                    const jsonStr = JSON.stringify(json);
                    console.log(`   Размер: ${jsonStr.length} символов`);
                    
                    // Проверяем есть ли там продукты
                    if (jsonStr.toLowerCase().includes('пицца') || 
                        jsonStr.toLowerCase().includes('product') ||
                        jsonStr.toLowerCase().includes('weight')) {
                        console.log(`   ✅ СОДЕРЖИТ ПРОДУКТЫ!`);
                        
                        // Сохраняем
                        const filename = `parsers/original-site-data/found-json-${Date.now()}.json`;
                        fs.writeFileSync(filename, jsonStr);
                        console.log(`   💾 Сохранено: ${filename}`);
                        
                        responses.push({ url, json });
                    }
                } catch (e) {
                    console.log(`   ❌ Не распарсилось: ${e.message}`);
                }
            }
        });
        
        console.log('Открываю сайт...');
        await page.goto('https://pizzanapolirsc.ru/?tfc_quantity[1271358691]=y&tfc_storepartuid[1271358691]=Пицца+30+см&tfc_div=:::', {
            waitUntil: 'networkidle0',
            timeout: 60000
        });
        
        // Ждем пока все загрузится
        await new Promise(r => setTimeout(r, 10000));
        
        console.log(`\n\n📊 ИТОГИ:`);
        console.log(`   Найдено JSON запросов: ${requests.length}`);
        console.log(`   Найдено JSON ответов с продуктами: ${responses.length}`);
        
    } finally {
        await browser.close();
    }
}

findJSONData().catch(console.error);
