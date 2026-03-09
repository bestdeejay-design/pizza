/**
 * ПАРСЕР для 15 пицц без точных весов
 * Ты кликаешь по товарам - парсер собирает веса
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const CONFIG = {
    url: 'https://pizzanapolirsc.ru/?tfc_quantity[1271358691]=y&tfc_storepartuid[1271358691]=Пицца+30+см&tfc_div=:::',
    outputFile: path.join(__dirname, 'original-site-data', 'missing-weights.json'),
    
    // Список пицц которые нужно собрать
    targetPizzas: [
        'Пицца кура/перец 1/4',
        'Пицца "Я сам Шеф"',
        'Pizza Salvata Mila',
        'Pizza Chicken BBQ',
        'Пицца "4 сыра"',
        'Пицца с мясными шариками',
        'Пицца "Вегетариано"',
        'Пицца "Реджина"',
        'Пицца с Лососем и сыром Бри',
        'Пицца "Сицилийская"',
        'Пицца с Уткой и Фуа гра',
        'Пицца с форелью, шпинатом',
        'Pizza Piccola alla Diavola',
        'Pizza Piccola с Уткой',
        'Пицца с мраморной говядиной'
    ]
};

async function parseMissingWeights() {
    console.log('🍕 ПАРСИНГ 15 ПИЦЦ БЕЗ ВЕСОВ\n');
    console.log('Инструкция:');
    console.log('1. Откроется браузер с сайтом');
    console.log('2. НАЙДИ и КЛИКАЙ по этим пиццам:');
    CONFIG.targetPizzas.forEach((pizza, i) => {
        console.log(`   ${i+1}. ${pizza}`);
    });
    console.log('\n3. Парсер сам соберет вес через 3 секунды');
    console.log('4. Закрывай модалку и кликай следующую');
    console.log('5. Напиши "ok" когда закончишь\n');
    
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    console.log('📂 Открываю сайт...');
    await page.goto(CONFIG.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise(r => setTimeout(r, 5000));
    
    // Считаем товары
    const productsCount = await page.evaluate(() => {
        return document.querySelectorAll('.js-product[data-product-lid]').length;
    });
    
    console.log(`✅ Найдено товаров на странице: ${productsCount}`);
    console.log('👉 НАЧИНАЙ КЛИКАТЬ ПО СПИСКУ ВЫШЕ!\n');
    
    const collectedData = [];
    
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    // Функция сбора данных из модалки
    async function collectFromModal() {
        try {
            const data = await page.evaluate(() => {
                const modal = document.querySelector('.t-popup');
                if (!modal) return null;
                
                const text = modal.textContent || '';
                
                // Извлекаем данные
                const titleMatch = text.match(/^([^\n\r]+)/);
                const title = titleMatch ? titleMatch[1].trim() : '';
                
                const weightMatch = text.match(/вес[:\s]*(\d+)\s*(гр|г)/i);
                const weight = weightMatch ? parseInt(weightMatch[1]) : null;
                
                const priceMatch = text.match(/(\d+)\s*р\.?/i);
                const price = priceMatch ? parseInt(priceMatch[1]) : null;
                
                return { title, weight, price };
            });
            
            if (data && data.title && data.title.length > 3 && data.weight) {
                // Проверяем есть ли уже такой
                const exists = collectedData.some(d => d.title.includes(data.title.substring(0, 20)));
                
                if (!exists) {
                    collectedData.push(data);
                    console.log(`✅ СОБРАНО: ${data.title.substring(0, 40)} = ${data.weight}гр`);
                    
                    // Сохраняем после каждого товара
                    fs.writeFileSync(
                        CONFIG.outputFile,
                        JSON.stringify({
                            collectedAt: new Date().toISOString(),
                            total: collectedData.length,
                            needed: CONFIG.targetPizzas.length,
                            products: collectedData
                        }, null, 2)
                    );
                }
            }
        } catch (e) {
            // Игнорируем ошибки
        }
    }
    
    // Запускаем цикл проверки модалок
    console.log('🔄 Сканирование запущено...\n');
    
    const scanInterval = setInterval(async () => {
        const hasModal = await page.evaluate(() => {
            return !!document.querySelector('.t-popup');
        });
        
        if (hasModal) {
            await collectFromModal();
        }
    }, 3000);
    
    // Ждем команду от пользователя
    rl.question('Напиши "ok" когда соберешь все 15 пицц: ', (answer) => {
        clearInterval(scanInterval);
        rl.close();
        
        console.log('\n📊 ИТОГИ:');
        console.log(`   Собрано: ${collectedData.length} из ${CONFIG.targetPizzas.length}`);
        
        if (collectedData.length > 0) {
            console.log('\n✅ СОБРАННЫЕ ВЕСА:');
            collectedData.forEach(p => {
                console.log(`   ${p.title.substring(0, 50)} - ${p.weight}гр`);
            });
        }
        
        console.log(`\n💾 Файл: ${CONFIG.outputFile}`);
        
        browser.close();
        process.exit(0);
    });
}

parseMissingWeights().catch(console.error);
