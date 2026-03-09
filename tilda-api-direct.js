/**
 * ПРЯМОЙ ЗАПРОС К TILDA STORE API
 * Получаем ВСЕ данные напрямую из API
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// API endpoints для разных категорий
const CATEGORIES = {
    'pizza-30cm': 'https://store.tildaapi.com/api/getproductslist/?storepartuid=650553740242&recid=1271358691&c=1773005339881&getparts=true&getoptions=true&slice=1&filters%5Bquantity%5D=y&filters%5Bstorepartuid%5D%5B0%5D=%D0%9F%D0%B8%D1%86%D1%86%D0%B0%2030%20%D1%81%D0%BC&size=100',
    'pizza-piccolo-20cm': 'https://store.tildaapi.com/api/getproductslist/?storepartuid=650553740242&recid=1271358691&c=1773005339881&getparts=true&getoptions=true&slice=1&filters%5Bquantity%5D=y&filters%5Bstorepartuid%5D%5B0%5D=Pizza%20Piccolo%2020%20%D1%81%D0%BC&size=100',
    'suchi-rolls': 'https://store.tildaapi.com/api/getproductslist/?storepartuid=650553740242&recid=1271358691&c=1773005339881&getparts=true&getoptions=true&slice=1&filters%5Bquantity%5D=y&filters%5Bstorepartuid%5D%5B0%5D=Suchi%20%26%20Rolls&size=100'
};

async function fetchFromAPI(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', chunk => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json);
                } catch (e) {
                    reject(new Error(`Не распарсилось: ${e.message}`));
                }
            });
        }).on('error', reject);
    });
}

async function collectAllCategories() {
    console.log('🚀 СБОР ДАННЫХ ЧЕРЕЗ TILDA STORE API\n');
    
    const outputFolder = path.join(__dirname, 'original-site-data');
    if (!fs.existsSync(outputFolder)) {
        fs.mkdirSync(outputFolder, { recursive: true });
    }
    
    const allProducts = [];
    
    for (const [catName, url] of Object.entries(CATEGORIES)) {
        console.log(`\n📁 КАТЕГОРИЯ: ${catName}`);
        
        try {
            const data = await fetchFromAPI(url);
            
            console.log(`✅ Получено данных`);
            console.log(`   Размер ответа: ${JSON.stringify(data).length} символов`);
            
            // Проверяем структуру
            if (data.products && Array.isArray(data.products)) {
                console.log(`   Товаров: ${data.products.length}`);
                
                // Обрабатываем каждый продукт
                data.products.forEach(product => {
                    const processed = {
                        category: catName,
                        id: product.id,
                        lid: product.lid,
                        title: product.name || product.title,
                        price: product.price,
                        weight: product.weight || null,
                        description: product.description || null,
                        ingredients: product.ingredients || null,
                        nutrition: product.nutrition || null,
                        options: product.options || null,
                        raw: product // Сохраняем всё сырым
                    };
                    
                    allProducts.push(processed);
                });
                
                // Сохраняем сырой JSON
                const rawFile = path.join(outputFolder, `${catName}-raw.json`);
                fs.writeFileSync(rawFile, JSON.stringify(data, null, 2));
                console.log(`   💾 Сырой JSON: ${rawFile}`);
                
            } else {
                console.log(`   ⚠️  Структура не стандартная`);
                console.log(`   Ключи: ${Object.keys(data).join(', ')}`);
                
                // Всё равно сохраняем
                const rawFile = path.join(outputFolder, `${catName}-raw.json`);
                fs.writeFileSync(rawFile, JSON.stringify(data, null, 2));
                console.log(`   💾 Сохранено: ${rawFile}`);
            }
            
        } catch (e) {
            console.log(`   ❌ Ошибка: ${e.message}`);
        }
    }
    
    // ИТОГИ
    console.log('\n\n📊 ИТОГИ:');
    console.log(`   Всего собрано продуктов: ${allProducts.length}`);
    console.log(`   С весом: ${allProducts.filter(p => p.weight).length}`);
    console.log(`   С описанием: ${allProducts.filter(p => p.description).length}`);
    console.log(`   С составом: ${allProducts.filter(p => p.ingredients).length}`);
    
    // Сохраняем все продукты вместе
    const finalFile = path.join(outputFolder, 'tilda-api-collection.json');
    fs.writeFileSync(finalFile, JSON.stringify({
        collectedAt: new Date().toISOString(),
        total: allProducts.length,
        products: allProducts
    }, null, 2));
    
    console.log(`\n💾 Финальный файл: ${finalFile}`);
    
    // Показываем первые 5 продуктов для примера
    console.log('\n🍕 ПРИМЕР ПРОДУКТОВ:');
    allProducts.slice(0, 5).forEach(p => {
        console.log(`   • ${p.title.substring(0, 40)} - ${p.price}р. | Вес: ${p.weight || '?'}гр`);
    });
}

collectAllCategories().catch(console.error);
