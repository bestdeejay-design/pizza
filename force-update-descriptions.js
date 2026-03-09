/**
 * ПОЛНАЯ ЗАМЕНА ВСЕХ ОПИСАНИЙ ИЗ TILDA API
 */

const fs = require('fs');

console.log('🔄 ПОЛНАЯ ЗАМЕНА ОПИСАНИЙ\n');

// Загружаем menu-final.json
const menu = JSON.parse(fs.readFileSync('menu-final.json', 'utf8'));

// Загружаем Tilda API данные
const tildaApi = JSON.parse(fs.readFileSync('parsers/original-site-data/tilda-api-collection.json', 'utf8'));

console.log(`Товаров в menu-final: ${countItems(menu)}`);
console.log(`Товаров из Tilda API: ${tildaApi.total}\n`);

// Создаем карту описаний по названиям
const descriptionsMap = new Map();

tildaApi.products.forEach(product => {
    const title = normalizeTitle(product.title);
    const text = product.raw.text || '';
    
    if (text.length > 10) {
        // Сохраняем в разных вариациях
        descriptionsMap.set(title, text);
        
        // Без "Пицца " в начале
        const shortTitle = title.replace(/^пицца\s+/i, '');
        if (shortTitle !== title) {
            descriptionsMap.set(shortTitle, text);
        }
        
        // Короткие версии до двоеточия
        if (title.includes(':')) {
            const beforeColon = title.split(':')[0].trim();
            if (!descriptionsMap.has(beforeColon)) {
                descriptionsMap.set(beforeColon, text);
            }
        }
    }
});

console.log(`Создано словарных статей: ${descriptionsMap.size}\n`);

// Заменяем ВСЕ описания
let replaced = 0;
let notFound = [];

Object.keys(menu.menu).forEach(categoryId => {
    const items = menu.menu[categoryId];
    
    if (!Array.isArray(items)) return;
    
    items.forEach(item => {
        const itemTitle = normalizeTitle(item.title);
        
        // Ищем описание - прямое совпадение
        let description = descriptionsMap.get(itemTitle);
        
        // Если не нашли, ищем частичное
        if (!description) {
            for (const [mapTitle, desc] of descriptionsMap.entries()) {
                if (itemTitle.includes(mapTitle) || mapTitle.includes(itemTitle)) {
                    description = desc;
                    break;
                }
            }
        }
        
        if (description) {
            item.description = description;
            replaced++;
        } else {
            notFound.push({
                category: categoryId,
                title: item.title
            });
        }
    });
});

// Сохраняем
fs.writeFileSync('menu-final.json', JSON.stringify(menu, null, 2));

console.log('📊 РЕЗУЛЬТАТЫ:');
console.log(`   ✅ Заменено описаний: ${replaced}`);
console.log(`   ❌ Не найдено: ${notFound.length}\n`);

if (notFound.length > 0) {
    console.log('📋 ТОВАРЫ БЕЗ ОПИСАНИЙ:\n');
    notFound.forEach((item, i) => {
        console.log(`${i+1}. [${item.category}] ${item.title}`);
    });
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
