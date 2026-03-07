// Скрипт для объединения длинных описаний с menu-final.json
// Использование: node merge-long-descriptions.js

const fs = require('fs');

console.log('📝 Объединение длинных описаний...\n');

// Проверяем наличие файла с длинными описаниями
if (!fs.existsSync('long-descriptions-temp.json')) {
  console.log('❌ Файл long-descriptions-temp.json не найден!');
  console.log('\n💡 Инструкция:');
  console.log('   1. Откройте pizzanapolirsc.ru');
  console.log('   2. Откройте модалки товаров');
  console.log('   3. Скопируйте длинные описания');
  console.log('   4. Сохраните в long-descriptions-temp.json');
  console.log('   5. Запустите этот скрипт снова\n');
  process.exit(1);
}

const menuData = JSON.parse(fs.readFileSync('menu-final.json', 'utf8'));
const longDescriptions = JSON.parse(fs.readFileSync('long-descriptions-temp.json', 'utf8'));

console.log(`Загружено menu-final.json: ${Object.keys(menuData.menu).length} категорий`);
console.log(`Загружено длинных описаний: ${longDescriptions.length}\n`);

let matchedCount = 0;
const notFoundTitles = [];

// Создаем мапу длинных описаний по названиям
const descMap = new Map();
longDescriptions.forEach(item => {
  if (item.title && item.longDescription) {
    descMap.set(item.title.toLowerCase().trim(), item.longDescription);
  }
});

// Проходим по всем товарам и добавляем длинные описания
Object.keys(menuData.menu).forEach(category => {
  menuData.menu[category].forEach(product => {
    const titleNormalized = product.title.toLowerCase().trim();
    
    // Ищем совпадение по названию
    let foundDesc = null;
    
    // Прямое совпадение
    if (descMap.has(titleNormalized)) {
      foundDesc = descMap.get(titleNormalized);
    } else {
      // Частичное совпадение
      for (const [mapTitle, mapDesc] of descMap.entries()) {
        if (titleNormalized.includes(mapTitle) || mapTitle.includes(titleNormalized)) {
          foundDesc = mapDesc;
          break;
        }
      }
    }
    
    if (foundDesc) {
      // Добавляем длинное описание
      product.fullDescription = foundDesc;
      matchedCount++;
      
      if (matchedCount <= 5) {
        console.log(`✅ "${product.title}" → добавлено длинное описание`);
      }
    }
  });
});

console.log('\n' + '='.repeat(70));
console.log('📊 РЕЗУЛЬТАТЫ:');
console.log('='.repeat(70));
console.log(`✅ Найдено совпадений: ${matchedCount}`);
console.log(`ℹ️  Всего товаров: ${Object.values(menuData.menu).flat().length}`);
console.log(`📈 Процент покрытия: ${(matchedCount / Object.values(menuData.menu).flat().length * 100).toFixed(1)}%`);

if (notFoundTitles.length > 0) {
  console.log(`\n⚠️  Не найдены описания для:`);
  notFoundTitles.slice(0, 10).forEach(name => console.log(`   - ${name}`));
}

// Сохраняем
const outputPath = 'menu-final-with-long-descriptions.json';
fs.writeFileSync(outputPath, JSON.stringify(menuData, null, 2));

console.log(`\n💾 Сохранено в ${outputPath}`);
console.log(`📦 Размер: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);

console.log('\n✨ Готово!');
console.log('\nСледующий шаг:');
console.log('  Проверьте menu-final-with-long-descriptions.json');
console.log('  Если всё правильно - замените menu-final.json');
