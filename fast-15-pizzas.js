/**
 * БЫСТРЫЙ ПАРСЕР для 15 пицц
 * Собирает данные мгновенно при открытии модалки
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const CONFIG = {
    url: 'https://pizzanapolirsc.ru/?tfc_quantity[1271358691]=y&tfc_storepartuid[1271358691]=Пицца+30+см&tfc_div=:::',
    outputFile: path.join(__dirname, 'original-site-data', 'fast-collect.json')
};

async function fastParse() {
    console.log('🚀 БЫСТРЫЙ ПАРСИНГ 15 ПИЦЦ\n');
    console.log('Просто КЛИКАЙ по пиццам из списка!');
    console.log('Парсер собирает моментально!\n');
    
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    await page.goto(CONFIG.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise(r => setTimeout(r, 3000));
    
    const collectedData = [];
    let lastCollectedTime = 0;
    
    // Подписка на изменения в DOM - МОМЕНТАЛЬНАЯ реакция
    await page.exposeFunction('onModalOpen', async (data) => {
        const now = Date.now();
        
        // Защита от дублей (не чаще 1 сек)
        if (now - lastCollectedTime < 1000) return;
        
        if (data && data.weight) {
            lastCollectedTime = now;
            collectedData.push(data);
            
            console.log(`✅ ${data.title.substring(0, 40)} = ${data.weight}гр`);
            
            // Сохраняем сразу
            fs.writeFileSync(
                CONFIG.outputFile,
                JSON.stringify({
                    collectedAt: new Date().toISOString(),
                    total: collectedData.length,
                    products: collectedData
                }, null, 2)
            );
        }
    });
    
    // Наблюдаем за модалками через MutationObserver
    await page.evaluate(() => {
        const observer = new MutationObserver(() => {
            const modal = document.querySelector('.t-popup');
            if (modal && modal.style.display !== 'none') {
                const text = modal.textContent || '';
                
                const titleMatch = text.match(/^([^\n\r]+)/);
                const title = titleMatch ? titleMatch[1].trim() : '';
                
                const weightMatch = text.match(/вес[:\s]*(\d+)\s*(гр|г)/i);
                const weight = weightMatch ? parseInt(weightMatch[1]) : null;
                
                const priceMatch = text.match(/(\d+)\s*р\.?/i);
                const price = priceMatch ? parseInt(priceMatch[1]) : null;
                
                if (window.onModalOpen && title && weight) {
                    window.onModalOpen({ title, weight, price });
                }
            }
        });
        
        observer.observe(document.body, { 
            childList: true, 
            subtree: true,
            attributes: true 
        });
        
        console.log('🔍 НАБЛЮДЕНИЕ ЗА МОДАЛКАМИ ЗАПУЩЕНО!');
        console.log('Кликай по пиццам!\n');
    });
    
    // Ждем пока пользователь закончит
    console.log('Нажми Ctrl+C когда закончишь...\n');
    
    process.on('SIGINT', () => {
        console.log(`\n\n📊 ИТОГИ:`);
        console.log(`   Собрано: ${collectedData.length} пицц`);
        
        if (collectedData.length > 0) {
            console.log('\n✅ ВЕСА:');
            collectedData.forEach(p => {
                console.log(`   ${p.title} - ${p.weight}гр`);
            });
        }
        
        console.log(`\n💾 Файл: ${CONFIG.outputFile}`);
        browser.close();
        process.exit(0);
    });
}

fastParse().catch(console.error);
