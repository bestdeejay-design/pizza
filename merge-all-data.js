/**
 * ОБЪЕДИНЕНИЕ ВЕСОВ И ОПИСАНИЙ В MENU-FINAL.JSON
 */

const fs = require('fs');

console.log('🔄 ОБЪЕДИНЕНИЕ ДАННЫХ\n');

// Загружаем menu-final.json
const menu = JSON.parse(fs.readFileSync('menu-final.json', 'utf8'));

// Загружаем веса из fast-collect.json
const fastCollect = JSON.parse(fs.readFileSync('parsers/original-site-data/fast-collect.json', 'utf8'));

// Загружаем описания из tilda-api
const tildaApi = JSON.parse(fs.readFileSync('parsers/original-site-data/tilda-api-collection.json', 'utf8'));

console.log(`Товаров в menu-final: ${countItems(menu)}`);
console.log(`Товаров с весами: ${fastCollect.total}`);
console.log(`Товаров с описаниями: ${tildaApi.total}\n`);

// Создаем карту весов
const weightsMap = new Map();
fastCollect.products.forEach(p => {
    // Очищаем название от CSS мусора
    const cleanTitle = extractCleanTitle(p.title);
    if (cleanTitle && p.weight) {
        weightsMap.set(normalizeTitle(cleanTitle), p.weight);
    }
});

console.log(`Загружено весов: ${weightsMap.size}\n`);

// Создаем карту описаний
const descriptionsMap = new Map();
tildaApi.products.forEach(p => {
    const title = normalizeTitle(p.title);
    const text = p.raw.text || '';
    
    if (text.length > 10) {
        descriptionsMap.set(title, text);
    }
});

console.log(`Загружено описаний: ${descriptionsMap.size}\n`);

// Обновляем menu-final.json
let updatedWeights = 0;
let updatedDescriptions = 0;
let notFoundWeights = 0;

Object.keys(menu.menu).forEach(categoryId => {
    const items = menu.menu[categoryId];
    
    if (!Array.isArray(items)) return;
    
    items.forEach(item => {
        const itemTitle = normalizeTitle(item.title);
        
        // Ищем вес
        let weight = weightsMap.get(itemTitle);
        
        // Если не нашли, ищем частичное совпадение
        if (!weight) {
            for (const [mapTitle, w] of weightsMap.entries()) {
                if (itemTitle.includes(mapTitle) || mapTitle.includes(itemTitle)) {
                    weight = w;
                    break;
                }
            }
        }
        
        if (weight) {
            item.weight = parseInt(weight);
            updatedWeights++;
        } else {
            notFoundWeights++;
        }
        
        // Ищем описание (если еще нет)
        if (!item.description || item.description.length < 20) {
            const description = descriptionsMap.get(itemTitle);
            
            if (description) {
                item.description = description;
                updatedDescriptions++;
            }
        }
    });
});

// Сохраняем
fs.writeFileSync('menu-final.json', JSON.stringify(menu, null, 2));

console.log('📊 РЕЗУЛЬТАТЫ:');
console.log(`   ✅ Обновлено весов: ${updatedWeights}`);
console.log(`   ✅ Обновлено описаний: ${updatedDescriptions}`);
console.log(`   ❌ Не найдено весов: ${notFoundWeights}`);
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

function extractCleanTitle(dirtyTitle) {
    // Убираем CSS селекторы
    let clean = dirtyTitle.replace(/#[\w-]+\s*\{[^}]*\}/g, '');
    
    // Ищем текст после "Артикул:" или перед ценой
    const match = clean.match(/(?:Артикул:|р\.р\.)\s*([\s\S]*?)(?:\d+р|$)/);
    if (match) {
        return match[1].trim().split('\n')[0].substring(0, 100);
    }
    
    // Или просто убираем весь CSS мусор
    clean = clean.replace(/#[\w-]+/g, '')
                 .replace(/\.t-[\w-]+/g, '')
                 .replace(/\{[^}]*\}/g, '')
                 .replace(/:[^;]+;/g, '')
                 .replace(/\s+/g, ' ')
                 .trim();
    
    return clean.substring(0, 100);
}
