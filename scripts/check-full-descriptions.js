const fs = require('fs');

console.log('🔍 Проверка файлов с полными описаниями...\n');

const files = [
  'dok/raw-content/full-content.json',
  'dok/raw-content/content-full.json',
  'dok/raw-content/menu-full-parsed.json'
];

files.forEach(file => {
  if (!fs.existsSync(file)) {
    console.log(`❌ ${file} - не найден`);
    return;
  }
  
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  console.log(`\n📁 ${file}:`);
  console.log(`   Размер: ${(fs.statSync(file).size / 1024).toFixed(1)} KB`);
  console.log(`   Ключи: ${Object.keys(data).slice(0, 5).join(', ')}`);
  
  // Ищем меню
  const menu = data.menu || data.products || data.items || data;
  
  if (Array.isArray(menu)) {
    console.log(`   Товаров: ${menu.length}`);
    if (menu[0]) {
      const p = menu[0];
      console.log(`   Пример: ${p.title || p.name || 'без названия'}`);
      console.log(`   Есть description: ${p.description ? '✅' : '❌'}`);
      console.log(`   Есть fullDescription: ${p.fullDescription || p.longDescription ? '✅' : '❌'}`);
    }
  } else if (typeof menu === 'object') {
    const categories = Object.keys(menu);
    console.log(`   Категорий: ${categories.length}`);
    
    let totalItems = 0;
    let withLongDesc = 0;
    
    categories.forEach(cat => {
      const items = Array.isArray(menu[cat]) ? menu[cat] : [];
      totalItems += items.length;
      
      items.forEach(p => {
        if (p.fullDescription || p.longDescription) {
          withLongDesc++;
        }
      });
    });
    
    console.log(`   Всего товаров: ${totalItems}`);
    console.log(`   С длинными описаниями: ${withLongDesc}`);
    
    // Показываем первый товар с длинным описанием
    for (const cat of categories) {
      const items = Array.isArray(menu[cat]) ? menu[cat] : [];
      const withDesc = items.find(p => p.fullDescription || p.longDescription);
      if (withDesc) {
        console.log(`\n   📝 Пример товара с длинным описанием (${cat}):`);
        console.log(`      Название: ${withDesc.title || withDesc.name}`);
        const longDesc = withDesc.fullDescription || withDesc.longDescription || '';
        console.log(`      Длинное: ${longDesc.substring(0, 150)}...`);
        break;
      }
    }
  }
});

console.log('\n✨ Проверка завершена!\n');
