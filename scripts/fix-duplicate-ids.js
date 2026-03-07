// Скрипт для исправления дубликатов ID в menu-final.json
// Запуск: node fix-duplicate-ids.js

const fs = require('fs');

console.log('🔍 Чтение menu-final.json...');
const menuData = JSON.parse(fs.readFileSync('menu-final.json', 'utf8'));

// Подсчет товаров по категориям
let stats = {};
Object.keys(menuData.menu).forEach(category => {
    stats[category] = menuData.menu[category].length;
});

console.log('\n📊 Текущее состояние:');
console.log('Категорий:', Object.keys(menuData.menu).length);
console.log('Всего товаров:', Object.values(stats).reduce((a, b) => a + b, 0));
console.log('По категориям:', stats);

// Проверка на дубликаты
const allProducts = Object.values(menuData.menu).flat();
const ids = allProducts.map(p => p.id);
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);

console.log('\n❌ Найдено дубликатов ID:', duplicates.length);
if (duplicates.length > 0) {
    console.log('Дубликаты:', [...new Set(duplicates)].sort((a, b) => a - b));
}

// Исправление: присваиваем уникальные ID по порядку
console.log('\n🔧 Исправление ID...');

let globalId = 1;
const categoryRanges = {};

Object.keys(menuData.menu).forEach(category => {
    const startId = globalId;
    
    menuData.menu[category].forEach(product => {
        const oldId = product.id;
        product.id = globalId++;
        
        if (oldId !== product.id && globalId <= 20) { // Показать первые 20 изменений
            console.log(`  ${category}: ID ${oldId} → ${product.id}`);
        }
    });
    
    const endId = globalId - 1;
    categoryRanges[category] = `${startId}-${endId}`;
    console.log(`  ✅ ${category}: ID ${startId} → ${endId} (${menuData.menu[category].length} товаров)`);
});

// Финальная проверка
const newIds = Object.values(menuData.menu).flat().map(p => p.id);
const newDuplicates = newIds.filter((id, index) => newIds.indexOf(id) !== index);

console.log('\n✅ Проверка после исправления:');
console.log('Дубликатов ID:', newDuplicates.length);
console.log('Последний ID:', Math.max(...newIds));
console.log('Всего уникальных ID:', new Set(newIds).size);

// Сохранение
const outputPath = 'menu-final-fixed.json';
fs.writeFileSync(outputPath, JSON.stringify(menuData, null, 2));

console.log(`\n💾 Сохранено в ${outputPath}`);
console.log(`📦 Размер: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);

console.log('\n📊 Диапазоны ID по категориям:');
Object.entries(categoryRanges).forEach(([cat, range]) => {
    console.log(`  ${cat}: ${range}`);
});

console.log('\n✨ Готово!');
console.log('\nСледующие шаги:');
console.log('1. Проверить корректность данных');
console.log('2. Заменить menu-final.json на menu-final-fixed.json');
console.log('3. Протестировать работу сайта');
