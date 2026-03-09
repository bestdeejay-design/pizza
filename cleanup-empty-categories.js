const fs = require('fs');

console.log('🗑️ Удаляю пустые категории из menu-complete.json...\n');

// Читаем меню
const menuData = JSON.parse(fs.readFileSync('./menu-complete.json', 'utf8'));

console.log('📊 ДО очистки:');
console.log('- Категорий:', menuData.categories.length);
console.log('- Статистика:', Object.keys(menuData.statistics).length);
console.log('- Разделов меню:', Object.keys(menuData.menu).length);

// Удаляем пустые категории
const emptyCategories = ['combos', 'oils'];

// 1. Очищаем statistics
emptyCategories.forEach(cat => {
    delete menuData.statistics[cat];
});

// 2. Очищаем menu
emptyCategories.forEach(cat => {
    delete menuData.menu[cat];
});

// 3. Очищаем categories array
menuData.categories = menuData.categories.filter(cat => !emptyCategories.includes(cat.id));

// 4. Пересчитываем общее количество товаров
menuData.metadata.totalProducts = Object.values(menuData.menu)
    .flat()
    .filter(item => item && typeof item === 'object')
    .length;

console.log('\n📊 ПОСЛЕ очистки:');
console.log('- Категорий:', menuData.categories.length);
console.log('- Статистика:', Object.keys(menuData.statistics).length);
console.log('- Разделов меню:', Object.keys(menuData.menu).length);

console.log('\n✅ Удалённые категории:');
emptyCategories.forEach(cat => console.log('   - ' + cat));

console.log('\n💾 Сохраняю...');
fs.writeFileSync(
    './menu-complete.json',
    JSON.stringify(menuData, null, 2),
    'utf8'
);

console.log('\n📋 ИТОГОВЫЕ КАТЕГОРИИ:\n');
menuData.categories.forEach((c, i) => {
    const stat = menuData.statistics[c.id] || 0;
    console.log(`${i+1}. ${c.name} (${c.id}) — ${stat} тов.`);
});

console.log(`\n✨ ВСЕГО: ${menuData.metadata.totalProducts} товаров\n`);
console.log('✅ ГОТОВО!\n');
