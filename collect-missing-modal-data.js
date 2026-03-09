/**
 * СБОР ДАННЫХ ИЗ МОДАЛОК TILDA - ТОЛЬКО ПРОПУЩЕННЫЕ ПРОДУКТЫ
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

const missingProducts = JSON.parse(fs.readFileSync('parsers/missing-products.json', 'utf8'));

console.log(`📊 ВСЕГО ПРОПУЩЕННЫХ ПРОДУКТОВ: ${missingProducts.length}\n`);
console.log('🚀 ЗАПУСК СБОРА ДАННЫХ ДЛЯ ПРОПУЩЕННЫХ ПРОДУКТОВ...\n');

async function collectMissingData() {
    const results = [];
    
    const browser = await puppeteer.launch({
        headless: false,
        slowMo: 50
    });
    
    for (let i = 0; i < missingProducts.length; i++) {
        const product = missingProducts[i];
        const url = product.url;
        
        console.log(`\n[${i+1}/${missingProducts.length}] ${product.title}`);
        
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
            
            // Состав
            let ingredients = null;
            const ingIndex = textContent.indexOf('Состав');
            if (ingIndex !== -1) {
                const afterIng = textContent.substring(ingIndex);
                const match = afterIng.match(/Состав[:\s]*([^\.]+)/i);
                if (match) ingredients = match[1].trim();
            }
            
            // КБЖУ
            const proteinsMatch = textContent.match(/Белки[:\s]*([\d.]+)/i);
            const fatsMatch = textContent.match(/Жиры[:\s]*([\d.]+)/i);
            const carbsMatch = textContent.match(/Углеводы[:\s]*([\d.]+)/i);
            
            const nutrition = {
                proteins: proteinsMatch ? proteinsMatch[1] : null,
                fats: fatsMatch ? fatsMatch[1] : null,
                carbs: carbsMatch ? carbsMatch[1] : null
            };
            
            results.push({
                title: product.title,
                url: url,
                weight: weight,
                ingredients: ingredients,
                nutrition: nutrition
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
        
        // Сохраняем каждые 10 продуктов
        if ((i + 1) % 10 === 0) {
            fs.writeFileSync('parsers/missing-modal-data.json', JSON.stringify(results, null, 2));
            console.log(`   💾 Промежуточное сохранение... (${i+1}/${missingProducts.length})`);
        }
    }
    
    await browser.close();
    
    fs.writeFileSync('parsers/missing-modal-data-final.json', JSON.stringify(results, null, 2));
    
    console.log('\n\n💾 ВСЕ ДАННЫЕ СОХРАНЕНЫ: parsers/missing-modal-data-final.json\n');
    
    // Статистика
    const withWeight = results.filter(r => r.weight).length;
    const withIngredients = results.filter(r => r.ingredients).length;
    const withNutrition = results.filter(r => r.nutrition && (r.nutrition.proteins || r.nutrition.fats)).length;
    
    console.log('📊 СТАТИСТИКА:');
    console.log(`   Всего: ${results.length}`);
    console.log(`   С весом: ${withWeight}`);
    console.log(`   С составом: ${withIngredients}`);
    console.log(`   С КБЖУ: ${withNutrition}`);
}

collectMissingData().catch(console.error);
