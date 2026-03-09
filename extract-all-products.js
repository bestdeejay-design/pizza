const fs = require('fs');

console.log('🔍 Извлекаю ВСЕ товары из HTML...\n');

const html = fs.readFileSync('./pizza.txt', 'utf8');

const products = [];
const images = new Set();

// Паттерн для извлечения всех товаров
const productRegex = /js-store-prod-name js-product-name[^>]*>([^<]+)<\/div>[\s\S]{0,600}?data-product-price-def="(\d+)"[\s\S]{0,600}?(?:data-original=["'](https:\/\/static\.tildacdn\.com\/[^"']+\.jpe?g[^"']*)["'])?/gi;

let match;
let id = 1;
const seenTitles = new Set();

while ((match = productRegex.exec(html)) !== null) {
    const title = match[1]?.trim();
    const price = parseInt(match[2]);
    const image = match[3] || null;
    
    // Фильтры
    if (!title) continue;
    if (title.length < 3 || title.length > 150) continue;
    if (price === 0) continue;
    if (seenTitles.has(title)) continue;
    
    // Пропускаем заголовки категорий
    if (/пицц|кальцоне|наш|отзыв|франш|статьи|акции|контакт|партнерств/i.test(title)) {
        continue;
    }
    
    seenTitles.add(title);
    
    products.push({
        id: id++,
        title: title,
        price: price,
        category: categorizeItem(title),
        description: '',
        image: image
    });
    
    if (image) images.add(image);
}

function categorizeItem(title) {
    const t = title.toLowerCase();
    if (t.includes('кальцоне')) return 'calzone';
    if (t.includes('салат')) return 'salad';
    if (t.includes('соус')) return 'sauce';
    if (t.includes('фокачч')) return 'focaccia';
    if (t.includes('хлеб')) return 'bread';
    if (t.includes('ролл') || t.includes('суши')) return 'rolls';
    if (t.includes('напитк') || t.includes('кола') || t.includes('трюфель')) return 'drinks';
    if (t.includes('пицца') || t.includes('pizza') || t.includes('суп') || t.includes('печень') || t.includes('тесто')) return 'pizza';
    return 'other';
}

// Статистика
console.log('📊 РЕЗУЛЬТАТЫ:\n');
console.table({
    'Всего товаров': products.length,
    'Изображений': images.size,
    'Уникальных позиций': seenTitles.size
});

console.log('\n📋 КАТЕГОРИИ:');
const byCategory = {};
products.forEach(p => {
    byCategory[p.category] = (byCategory[p.category] || 0) + 1;
});
console.table(byCategory);

console.log('\n🍕 ПОЛНЫЙ СПИСОК:\n');

const categories = [...new Set(products.map(p => p.category))].sort();
categories.forEach(cat => {
    const catProducts = products.filter(p => p.category === cat);
    console.log(`\n${cat.toUpperCase()} (${catProducts.length}):`);
    catProducts.forEach((p, i) => {
        console.log(`  ${i+1}. ${p.title} — ${p.price}₽`);
    });
});

// Сохраняем
const result = {
    collectedAt: new Date().toISOString(),
    source: './pizza.txt (полный HTML)',
    totalProducts: products.length,
    products: products,
    images: Array.from(images),
    statistics: {
        byCategory: byCategory,
        totalImages: images.size
    }
};

fs.writeFileSync(
    './raw-content/complete-menu.json',
    JSON.stringify(result, null, 2),
    'utf8'
);

console.log('\n\n💾 Сохранено в: ./raw-content/complete-menu.json\n');
console.log('✅ ГОТОВО! Найдено ВСЕГО товаров:', products.length, '\n');
