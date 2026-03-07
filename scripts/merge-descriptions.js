// Скрипт для объединения собранных описаний с menu-final.json
// Использование: node merge-descriptions.js

const fs = require('fs');

console.log('🔍 Слияние описаний...\n');

// Проверяем наличие файлов
if (!fs.existsSync('descriptions-temp.json')) {
    console.log('❌ Файл descriptions-temp.json не найден!');
    console.log('💡 Сначала запустите scrape-descriptions.js на сайте заказчика');
    process.exit(1);
}

const menuData = JSON.parse(fs.readFileSync('menu-final.json', 'utf8'));
const scrapedDescriptions = JSON.parse(fs.readFileSync('descriptions-temp.json', 'utf8'));

console.log(`Загружено menu-final.json: ${Object.keys(menuData.menu).length} категорий`);
console.log(`Загружено описаний с сайта: ${scrapedDescriptions.length}\n`);

let matchedCount = 0;
let notFoundCount = 0;
const notFoundProducts = [];

// Проходим по всем товарам в меню
Object.keys(menuData.menu).forEach(category => {
    menuData.menu[category].forEach(product => {
        // Ищем совпадение по названию (нормализуем для сравнения)
        const productNameNormalized = product.title.toLowerCase().trim();
        
        const matched = scrapedDescriptions.find(scraped => {
            const scrapedNormalized = scraped.title.toLowerCase().trim();
            // Полное совпадение или частичное (>50% схожести)
            return scrapedNormalized === productNameNormalized || 
                   (productNameNormalized.length > 5 && scrapedNormalized.includes(productNameNormalized));
        });
        
        if (matched) {
            product.description = matched.description;
            matchedCount++;
            
            if (matchedCount <= 3) {
                console.log(`✅ "${product.title}" → найдено описание`);
            }
        } else {
            notFoundCount++;
            if (notFoundProducts.length < 10) {
                notFoundProducts.push(product.title);
            }
        }
    });
});

console.log(`\n📊 Результаты:`);
console.log(`✅ Найдено описаний: ${matchedCount}`);
console.log(`❌ Не найдено: ${notFoundCount}`);

if (notFoundProducts.length > 0) {
    console.log(`\n⚠️  Примеры товаров без описаний:`);
    notFoundProducts.forEach(name => console.log(`   - ${name}`));
}

// Сохраняем результат
const outputPath = 'menu-final-with-descriptions.json';
fs.writeFileSync(outputPath, JSON.stringify(menuData, null, 2));

console.log(`\n💾 Сохранено в ${outputPath}`);
console.log(`📦 Размер: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);

console.log('\n✨ Готово! Проверьте файл и замените menu-final.json если всё правильно');
