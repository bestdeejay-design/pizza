const fs = require('fs');

console.log('🔍 Извлекаю товары с точными фото из 2.txt...\n');

const html = fs.readFileSync('./2.txt', 'utf8');

const products = [];

// Паттерн для каждого товара в Tilda Store
const productPattern = /js-product[^>]*data-product-img="(https:\/\/static\.tildacdn\.com\/[^"]+)"[^>]*>[\s\S]*?js-store-prod-name[^>]*>([^<]+)<\/div>[\s\S]*?data-product-price-def="(\d+)"/gi;

let match;
let counter = 0;

while ((match = productPattern.exec(html)) !== null) {
    counter++;
    
    const image = match[1];
    const title = match[2].trim();
    const price = parseInt(match[3]);
    
    // Пропускаем заголовки и дубликаты
    if (/^пицц$|^кальцоне$|^наш|^отзыв|^франш|^статьи|^акции|^контакт|^партнерств$/i.test(title)) {
        continue;
    }
    
    if (products.find(p => p.title === title)) {
        continue;
    }
    
    products.push({
        title: title,
        price: price,
        category: categorizeItem(title),
        image: image
    });
    
    console.log(`✓ ${counter}. ${title.substring(0, 60)}... → ${image.substring(0, 70)}...`);
}

function categorizeItem(title) {
    const t = title.toLowerCase();
    if (t.includes('кальцоне')) return 'calzone';
    if (t.includes('салат')) return 'salad';
    if (t.includes('паста')) return 'pasta';
    if (t.includes('соус')) return 'sauce';
    if (t.includes('фокачч')) return 'focaccia';
    if (t.includes('хлеб')) return 'bread';
    if (t.includes('ролл') || t.includes('суши') || t.includes('маки')) return 'rolls';
    if (t.includes('напитк') || t.includes('кола') || t.includes('трюфель') || t.includes('печень')) return 'drinks';
    if (t.includes('пицца') || t.includes('pizza') || t.includes('суп') || t.includes('тесто')) return 'pizza';
    return 'other';
}

// Статистика
console.log('\n📊 РЕЗУЛЬТАТЫ:\n');
console.table({
    'Всего товаров': products.length,
    'С фото': products.filter(p => p.image).length
});

console.log('\n📋 КАТЕГОРИИ:');
const byCategory = {};
products.forEach(p => {
    byCategory[p.category] = (byCategory[p.category] || 0) + 1;
});
console.table(byCategory);

// Сохраняем
const result = {
    collectedAt: new Date().toISOString(),
    source: './2.txt (точное извлечение)',
    totalProducts: products.length,
    products: products,
    statistics: {
        byCategory: byCategory,
        withImages: products.filter(p => p.image).length
    }
};

fs.writeFileSync(
    './raw-content/menu-from-2-accurate.json',
    JSON.stringify(result, null, 2),
    'utf8'
);

console.log('\n\n💾 Сохранено в: ./raw-content/menu-from-2-accurate.json\n');
console.log('✅ ГОТОВО!\n');
