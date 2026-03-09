/**
 * ЗАМЕНА всех весов на правильные из parsed data
 */

const fs = require('fs');
const path = require('path');

// Читаем данные
const menuFinal = JSON.parse(fs.readFileSync(path.join(__dirname, '../menu-final.json'), 'utf8'));
const parsedData = JSON.parse(fs.readFileSync(path.join(__dirname, 'original-site-data/cleaned-menu.json'), 'utf8'));

console.log('🔄 Замена весов на правильные...\n');

// Создаем мапу весов из распарсенных данных (БЕРЕМ ТОЛЬКО С ВЕСАМИ)
const weightMap = new Map();
parsedData.products
    .filter(p => p.weight && p.title)
    .forEach(p => {
        // Очищаем название для поиска
        const cleanTitle = p.title
            .replace(/Артикул:.*$/i, '')
            .replace(/\d+р\.р\./gi, '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
        
        if (!weightMap.has(cleanTitle)) {
            weightMap.set(cleanTitle, { 
                weight: p.weight, 
                price: p.price, 
                originalTitle: p.title 
            });
        }
    });

console.log(`Найдено ${weightMap.size} товаров с весами\n`);

let replacedCount = 0;
let addedCount = 0;

// Проходим по всем категориям в menu
const categories = Object.keys(menuFinal.menu || {});

categories.forEach(categoryId => {
    const items = menuFinal.menu[categoryId];
    
    if (Array.isArray(items)) {
        items.forEach(item => {
            const itemTitleLower = item.title.toLowerCase();
            
            // Ищем совпадение по ключевым словам (20 символов)
            let foundWeight = null;
            
            for (const [mapTitle, data] of weightMap.entries()) {
                // Более точное совпадение - ищем по первым 15-20 символам
                if (itemTitleLower.length >= 15 && mapTitle.length >= 15) {
                    if (itemTitleLower.substring(0, 20) === mapTitle.substring(0, 20) ||
                        itemTitleLower.includes(mapTitle.substring(0, 15)) ||
                        mapTitle.includes(itemTitleLower.substring(0, 15))) {
                        foundWeight = data.weight;
                        break;
                    }
                }
            }
            
            // Обновляем если нашли
            if (foundWeight) {
                if (item.weight && item.weight !== foundWeight) {
                    console.log(`⚠️  ${item.title.substring(0, 40)}: ${item.weight}гр → ${foundWeight}гр`);
                    item.weight = foundWeight;
                    replacedCount++;
                } else if (!item.weight) {
                    console.log(`✅ ${item.title.substring(0, 40)}: добавлен вес ${foundWeight}гр`);
                    item.weight = foundWeight;
                    addedCount++;
                }
            }
        });
    }
});

console.log(`\n📊 ИТОГИ:`);
console.log(`   Заменено весов: ${replacedCount}`);
console.log(`   Добавлено весов: ${addedCount}`);
console.log(`   Всего обновлено: ${replacedCount + addedCount}`);

// Сохраняем
const backupPath = path.join(__dirname, '../menu-final.backup2.json');
fs.writeFileSync(backupPath, JSON.stringify(menuFinal, null, 2));
console.log(`\n💾 Бэкап: ${backupPath}`);

const outputPath = path.join(__dirname, '../menu-final.json');
fs.writeFileSync(outputPath, JSON.stringify(menuFinal, null, 2));
console.log(`💾 Обновлено: ${outputPath}`);

// Статистика по категориям
console.log('\n📊 СТАТИСТИКА ПО КАТЕГОРИЯМ:');
categories.forEach(categoryId => {
    const items = menuFinal.menu[categoryId];
    if (Array.isArray(items)) {
        const withWeight = items.filter(i => i.weight).length;
        const total = items.length;
        console.log(`   ${categoryId}: ${withWeight}/${total} с весами`);
    }
});
