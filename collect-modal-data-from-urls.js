/**
 * СБОР ДАННЫХ ИЗ МОДАЛОК TILDA
 * Открываем каждую модалку и собираем: вес, состав, КБЖУ
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

// Загружаем URL продуктов из Tilda API
const tildaApi = JSON.parse(fs.readFileSync('parsers/original-site-data/tilda-api-collection.json', 'utf8'));

console.log(`📊 ВСЕГО ПРОДУКТОВ: ${tildaApi.products.length}\n`);

// Берем первые 10 для теста
const testProducts = tildaApi.products.slice(0, 10);

async function collectFromModals() {
    const results = [];
    
    console.log('🚀 ЗАПУСК PUPPETEER...\n');
    
    const browser = await puppeteer.launch({
        headless: false,
        slowMo: 100
    });
    
    for (let i = 0; i < testProducts.length; i++) {
        const product = testProducts[i];
        const url = product.raw.url;
        
        console.log(`\n[${i+1}/${testProducts.length}] ${product.title}`);
        console.log(`   URL: ${url}`);
        
        try {
            const page = await browser.newPage();
            
            // Переходим на страницу продукта
            await page.goto(url, { 
                waitUntil: 'networkidle0',
                timeout: 30000
            });
            
            // Ждем пока загрузится контент (3 секунды)
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Собираем данные из HTML страницы
            const html = await page.content();
            
            // Извлекаем текст
            const textContent = await page.evaluate(() => {
                return document.body.innerText;
            });
            
            // Парсим вес
            const weightMatch = textContent.match(/Вес[:\s]*([\d.,]+)\s*(?:г|g)/i);
            const weight = weightMatch ? `${weightMatch[1]} г` : null;
            
            // Парсим состав (ищем после слова "Состав")
            let ingredients = null;
            const ingredientsIndex = textContent.indexOf('Состав');
            if (ingredientsIndex !== -1) {
                // Берем следующий кусок текста после "Состав"
                const afterIngredients = textContent.substring(ingredientsIndex);
                const match = afterIngredients.match(/Состав[:\s]*([^\.]+)/i);
                if (match) {
                    ingredients = match[1].trim();
                }
            }
            
            // Парсим КБЖУ
            const proteinsMatch = textContent.match(/Белки[:\s]*([\d.]+(?:\s*г)?)/i);
            const fatsMatch = textContent.match(/Жиры[:\s]*([\d.]+(?:\s*г)?)/i);
            const carbsMatch = textContent.match(/Углеводы[:\s]*([\d.]+(?:\s*г)?)/i);
            const caloriesMatch = textContent.match(/(?:Калории|ккал)[:\s]*([\d.]+)/i);
            
            const nutrition = (proteinsMatch || fatsMatch || carbsMatch || caloriesMatch) ? {
                proteins: proteinsMatch ? proteinsMatch[1] : null,
                fats: fatsMatch ? fatsMatch[1] : null,
                carbs: carbsMatch ? carbsMatch[1] : null,
                calories: caloriesMatch ? caloriesMatch[1] : null
            } : null;
            
            // Парсим описание (полное)
            const description = textContent.substring(0, 1000); // Берем первый кусок текста
            
            results.push({
                title: product.title,
                url: url,
                weight: weight,
                ingredients: ingredients,
                nutrition: nutrition,
                description: description
            });
            
            console.log(`   ✅ Вес: ${weight || 'не найден'}`);
            console.log(`   ✅ Состав: ${ingredients ? 'найден' : 'не найден'}`);
            console.log(`   ✅ КБЖУ: ${nutrition ? 'найдено' : 'не найдено'}`);
            
            await page.close();
            
        } catch (error) {
            console.log(`   ❌ ОШИБКА: ${error.message}`);
            
            results.push({
                title: product.title,
                url: url,
                error: error.message
            });
        }
        
        // Небольшая пауза между запросами
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    await browser.close();
    
    // Сохраняем результаты
    fs.writeFileSync(
        'parsers/modal-data-from-urls.json',
        JSON.stringify(results, null, 2)
    );
    
    console.log('\n\n💾 РЕЗУЛЬТАТЫ СОХРАНЕНЫ В: parsers/modal-data-from-urls.json\n');
    
    // Показываем статистику
    const withWeight = results.filter(r => r.weight).length;
    const withIngredients = results.filter(r => r.ingredients).length;
    const withNutrition = results.filter(r => r.nutrition).length;
    
    console.log('📊 СТАТИСТИКА:');
    console.log(`   Всего обработано: ${results.length}`);
    console.log(`   С весом: ${withWeight}`);
    console.log(`   С составом: ${withIngredients}`);
    console.log(`   С КБЖУ: ${withNutrition}`);
}

collectFromModals().catch(console.error);
