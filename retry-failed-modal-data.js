/**
 * ПОВТОРНЫЙ СБОР ДЛЯ ПРОДУКТОВ С ОШИБКАМИ
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

// Загружаем данные и фильтруем продукты с ошибками
const allData = JSON.parse(fs.readFileSync('parsers/missing-modal-data-final.json', 'utf8'));
const failedProducts = allData.filter(p => p.error);

console.log(`📊 ПОВТОРНЫЙ СБОР ДЛЯ ${failedProducts.length} ПРОДУКТОВ С ОШИБКАМИ\n`);
console.log('🚀 ЗАПУСК...\n');

async function collectFailedData() {
    const results = [];
    
    const browser = await puppeteer.launch({
        headless: false,
        slowMo: 50
    });
    
    for (let i = 0; i < failedProducts.length; i++) {
        const product = failedProducts[i];
        const url = product.url;
        
        console.log(`\n[${i+1}/${failedProducts.length}] ${product.title}`);
        
        try {
            const page = await browser.newPage();
            
            await page.goto(url, { 
                waitUntil: 'networkidle0',
                timeout: 30000
            });
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const textContent = await page.evaluate(() => {
                return document.body.innerText;
            });
            
            // Вес
            const weightMatch = textContent.match(/Вес[:\s]*([\d.,]+)\s*(?:г|g)/i);
            const weight = weightMatch ? `${weightMatch[1]} г` : null;
            
            results.push({
                title: product.title,
                url: url,
                weight: weight
            });
            
            console.log(`   ✅ Вес: ${weight || '?'}`);
            
            await page.close();
            
        } catch (error) {
            console.log(`   ❌ ОШИБКА: ${error.message}`);
            
            results.push({
                title: product.title,
                url: url,
                error: error.message
            });
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Сохраняем каждые 5 продуктов
        if ((i + 1) % 5 === 0) {
            fs.writeFileSync('parsers/retry-modal-data.json', JSON.stringify(results, null, 2));
            console.log(`   💾 Промежуточное сохранение... (${i+1}/${failedProducts.length})`);
        }
    }
    
    await browser.close();
    
    fs.writeFileSync('parsers/retry-modal-data-final.json', JSON.stringify(results, null, 2));
    
    console.log('\n\n💾 ВСЕ ДАННЫЕ СОХРАНЕНЫ: parsers/retry-modal-data-final.json\n');
    
    // Статистика
    const withWeight = results.filter(r => r.weight).length;
    console.log(`📊 СТАТИСТИКА:`);
    console.log(`   Всего: ${results.length}`);
    console.log(`   С весом: ${withWeight}`);
}

collectFailedData().catch(console.error);
