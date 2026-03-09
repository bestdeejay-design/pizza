/**
 * МАССОВОЕ ОБНОВЛЕНИЕ ОПИСАНИЙ В MENU-FINAL.JSON
 * Только описания, ничего больше не трогаем
 */

const fs = require('fs');
const path = require('path');

console.log('🔄 ОБНОВЛЕНИЕ ВСЕХ ОПИСАНИЙ\n');

// Загружаем menu-final.json
const menuPath = path.join(__dirname, '..', 'menu-final.json');
const menu = JSON.parse(fs.readFileSync(menuPath, 'utf8'));

// Загружаем Tilda API данные
const apiPath = path.join(__dirname, 'original-site-data', 'tilda-api-collection.json');
const apiData = JSON.parse(fs.readFileSync(apiPath, 'utf8'));

console.log(`Товаров в menu-final.json: ${countItems(menu)}`);
console.log(`Товаров из Tilda API: ${apiData.total}\n`);

// Создаем умную карту соответствий
const descriptionMap = new Map();

apiData.products.forEach(product => {
    const title = normalizeTitle(product.title);
    const text = product.raw.text || '';
    
    if (text.length > 10) {
        // Прямое соответствие
        descriptionMap.set(title, text);
        
        // Варианты для поиска
        const variants = generateTitleVariants(product.title);
        variants.forEach(v => {
            const normalizedV = normalizeTitle(v);
            if (!descriptionMap.has(normalizedV)) {
                descriptionMap.set(normalizedV, text);
            }
        });
    }
});

console.log(`Создано словарных статей: ${descriptionMap.size}\n`);

// Обновляем описания
let updated = 0;
let notFound = 0;
const notFoundList = [];

Object.keys(menu.menu).forEach(categoryId => {
    const items = menu.menu[categoryId];
    
    if (!Array.isArray(items)) return;
    
    items.forEach(item => {
        const itemTitle = normalizeTitle(item.title);
        
        // Ищем описание
        let description = descriptionMap.get(itemTitle);
        
        // Если не нашли, ищем частичное совпадение
        if (!description) {
            for (const [mapTitle, desc] of descriptionMap.entries()) {
                if (itemTitle.includes(mapTitle) || mapTitle.includes(itemTitle)) {
                    description = desc;
                    break;
                }
            }
        }
        
        if (description) {
            item.description = description;
            updated++;
        } else {
            notFound++;
            notFoundList.push(item.title);
        }
    });
});

// Сохраняем
fs.writeFileSync(menuPath, JSON.stringify(menu, null, 2));

console.log('📊 РЕЗУЛЬТАТЫ:');
console.log(`   ✅ Обновлено: ${updated}`);
console.log(`   ❌ Не найдено: ${notFound}`);

if (notFound > 0 && notFound <= 20) {
    console.log('\nНе найдены:');
    notFoundList.slice(0, 10).forEach(t => console.log(`   • ${t.substring(0, 50)}`));
    if (notFound > 10) console.log(`   ... еще ${notFound - 10}`);
}

console.log('\n💾 menu-final.json обновлен!');

// Функции
function countItems(menu) {
    let count = 0;
    Object.keys(menu.menu).forEach(cat => {
        if (Array.isArray(menu.menu[cat])) {
            count += menu.menu[cat].length;
        }
    });
    return count;
}

function normalizeTitle(title) {
    return title.trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/[\[\]\(\)]/g, '')
        .replace(/[\""]/g, '');
}

function generateTitleVariants(fullTitle) {
    const variants = [fullTitle];
    
    // Убираем "Пицца " в начале
    if (fullTitle.toLowerCase().startsWith('пицца ')) {
        variants.push(fullTitle.substring(6));
    }
    
    // Убираем кавычки
    variants.push(fullTitle.replace(/[""]/g, ''));
    
    // Короткие версии до двоеточия
    if (fullTitle.includes(':')) {
        variants.push(fullTitle.split(':')[0].trim());
    }
    
    return variants;
}
