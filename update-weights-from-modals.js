/**
 * АККУРАТНОЕ ОБНОВЛЕНИЕ ВЕСОВ ИЗ MODAL DATA
 */

const fs = require('fs');

console.log('🔄 ОБНОВЛЕНИЕ ВЕСОВ В MENU-FINAL.JSON\n');

// Загружаем данные
const menu = JSON.parse(fs.readFileSync('menu-final.json', 'utf8'));
const modalData = JSON.parse(fs.readFileSync('parsers/all-modal-data-merged.json', 'utf8'));

console.log(`Товаров в menu-final: ${countItems(menu)}`);
console.log(`Весов из модалок: ${modalData.filter(r => r.weight).length}\n`);

// Создаем карту весов по названиям
const weightMap = new Map();

modalData.forEach(item => {
    if (item.weight) {
        const title = normalizeTitle(item.title);
        weightMap.set(title, item.weight);
        
        // Добавляем варианты без "Пицца "
        const shortTitle = title.replace(/^пицца\s+/i, '');
        if (shortTitle !== title) {
            weightMap.set(shortTitle, item.weight);
        }
        
        // Варианты до двоеточия
        if (title.includes(':')) {
            const beforeColon = title.split(':')[0].trim();
            if (!weightMap.has(beforeColon)) {
                weightMap.set(beforeColon, item.weight);
            }
        }
    }
});

console.log(`Создано словарных статей: ${weightMap.size}\n`);

// Обновляем веса
let updated = 0;
let notFound = [];
let changed = [];

Object.keys(menu.menu).forEach(categoryId => {
    const items = menu.menu[categoryId];
    
    if (!Array.isArray(items)) return;
    
    items.forEach(item => {
        const itemTitle = normalizeTitle(item.title);
        
        // Ищем вес - прямое совпадение
        let weight = weightMap.get(itemTitle);
        
        // Если не нашли, ищем частичное
        if (!weight) {
            for (const [mapTitle, w] of weightMap.entries()) {
                if (itemTitle.includes(mapTitle) || mapTitle.includes(itemTitle)) {
                    weight = w;
                    break;
                }
            }
        }
        
        if (weight) {
            // Проверяем отличается ли вес
            const oldWeight = item.weight;
            const newWeight = parseInt(weight.replace(/\D/g, ''));
            
            if (oldWeight !== newWeight) {
                item.weight = newWeight;
                changed.push({
                    title: item.title,
                    old: oldWeight,
                    new: newWeight
                });
                updated++;
            }
        } else {
            notFound.push({
                category: categoryId,
                title: item.title,
                currentWeight: item.weight
            });
        }
    });
});

// Сохраняем
fs.writeFileSync('menu-final.json', JSON.stringify(menu, null, 2));

console.log('📊 РЕЗУЛЬТАТЫ:');
console.log(`   ✅ Обновлено весов: ${updated}`);
console.log(`   ℹ️  Найдено совпадений: ${changed.length}`);
console.log(`   ❌ Не найдено: ${notFound.length}\n`);

if (changed.length > 0 && changed.length <= 20) {
    console.log('📝 ИЗМЕНЕНИЯ:');
    changed.forEach(c => {
        console.log(`   • ${c.title.substring(0, 50)}... : ${c.old}г → ${c.new}г`);
    });
    console.log();
}

if (notFound.length > 0) {
    console.log('📋 НЕ НАЙДЕНЫ (остались старые веса):');
    notFound.slice(0, 20).forEach(item => {
        console.log(`   [${item.category}] ${item.title} (${item.currentWeight}г)`);
    });
    if (notFound.length > 20) {
        console.log(`   ... и еще ${notFound.length - 20} товаров`);
    }
    console.log();
}

console.log('💾 menu-final.json обновлен!');

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
