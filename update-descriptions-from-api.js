/**
 * ОБНОВЛЕНИЕ MENU-FINAL.JSON ОПИСАНИЯМИ ИЗ TILDA API
 */

const fs = require('fs');
const path = require('path');

console.log('🔄 ОБНОВЛЕНИЕ МЕНЮ ОПИСАНИЯМИ\n');

// Загружаем menu-final.json
const menuFinalPath = path.join(__dirname, '..', 'menu-final.json');
const menu = JSON.parse(fs.readFileSync(menuFinalPath, 'utf8'));

// Загружаем данные из API
const apiDataPath = path.join(__dirname, 'original-site-data', 'tilda-api-collection.json');
const apiData = JSON.parse(fs.readFileSync(apiDataPath, 'utf8'));

console.log(`Загружено товаров из API: ${apiData.products.length}`);

// Создаем словарь описаний по названиям
const descriptionsMap = {};

apiData.products.forEach(product => {
    const title = product.title.trim();
    const text = product.text || '';
    
    if (text && text.length > 10) {
        // Сохраняем в разных вариациях для лучшего поиска
        descriptionsMap[title] = text;
        
        // Без "Пицца " в начале
        const shortTitle = title.replace(/^Пицца\s+/i, '');
        if (shortTitle !== title) {
            descriptionsMap[shortTitle] = text;
        }
        
        // С кавычками и без
        const noQuotes = title.replace(/[""]/g, '');
        if (noQuotes !== title) {
            descriptionsMap[noQuotes] = text;
        }
    }
});

console.log(`Создано словарных статей: ${Object.keys(descriptionsMap).length}\n`);

// Обновляем menu-final.json
let updated = 0;
let notFound = 0;

Object.keys(menu.menu).forEach(categoryId => {
    const items = menu.menu[categoryId];
    
    if (!Array.isArray(items)) return;
    
    items.forEach(item => {
        const title = item.title.trim();
        
        // Ищем описание
        let description = null;
        
        // Прямое совпадение
        if (descriptionsMap[title]) {
            description = descriptionsMap[title];
        }
        
        // Если не нашли, пробуем частичное
        if (!description) {
            const foundKey = Object.keys(descriptionsMap).find(key => 
                title.toLowerCase().includes(key.toLowerCase()) ||
                key.toLowerCase().includes(title.toLowerCase())
            );
            
            if (foundKey) {
                description = descriptionsMap[foundKey];
            }
        }
        
        if (description) {
            item.description = description;
            updated++;
        } else {
            notFound++;
        }
    });
});

console.log('📊 РЕЗУЛЬТАТЫ:');
console.log(`   ✅ Обновлено описаний: ${updated}`);
console.log(`   ❌ Не найдено: ${notFound}`);

// Сохраняем
fs.writeFileSync(menuFinalPath, JSON.stringify(menu, null, 2));
console.log('\n💾 menu-final.json обновлен!');

// Показываем примеры
console.log('\n🍕 ПРИМЕРЫ ОБНОВЛЕННЫХ:');
let count = 0;

Object.keys(menu.menu).some(categoryId => {
    const items = menu.menu[categoryId];
    if (!Array.isArray(items)) return false;
    
    items.some(item => {
        if (item.description) {
            console.log(`\n   ${item.title.substring(0, 40)}:`);
            console.log(`   ${item.description.substring(0, 100)}...`);
            count++;
            return count >= 3;
        }
        return false;
    });
    
    return count >= 3;
});
