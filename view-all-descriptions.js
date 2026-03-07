// Показать все уникальные описания в menu-final.json
const fs = require('fs');

const menuData = JSON.parse(fs.readFileSync('menu-final.json', 'utf8'));
const allProducts = Object.values(menuData.menu).flat();

console.log('=' .repeat(80));
console.log('📋 ВСЕ УНИКАЛЬНЫЕ ОПИСАНИЯ В MENU-FINAL.JSON');
console.log('=' .repeat(80));
console.log(`Всего товаров: ${allProducts.length}`);
console.log(`С описаниями: ${allProducts.filter(p => p.description).length}\n`);

// Собираем уникальные описания
const uniqueDescriptions = new Map();

allProducts.forEach(product => {
  if (product.description) {
    const desc = product.description.trim();
    if (!uniqueDescriptions.has(desc)) {
      uniqueDescriptions.set(desc, []);
    }
    uniqueDescriptions.get(desc).push(product.title);
  }
});

console.log('=' .repeat(80));
console.log(`НАЙДЕНО УНИКАЛЬНЫХ ОПИСАНИЙ: ${uniqueDescriptions.size}`);
console.log('=' .repeat(80));
console.log();

let counter = 1;
for (const [description, products] of uniqueDescriptions.entries()) {
  console.log(`${counter}. 📝 Описание (${products.length} товаров):`);
  console.log(`   "${description}"`);
  console.log(`   Товары: ${products.slice(0, 5).join(', ')}`);
  if (products.length > 5) {
    console.log(`   ... и еще ${products.length - 5}`);
  }
  console.log();
  counter++;
}

console.log('=' .repeat(80));
console.log('✨ ГОТОВО!');
console.log('=' .repeat(80));
