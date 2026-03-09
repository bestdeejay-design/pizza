const fs = require('fs');

console.log('🔍 Анализирую файл 2.txt...\n');

const html = fs.readFileSync('./2.txt', 'utf8');
console.log(`📄 Размер файла: ${(html.length / 1024).toFixed(2)} KB\n`);

const products = [];
const images = new Set();

// Паттерн для извлечения всех товаров
const productRegex = /js-store-prod-name js-product-name[^>]*>([^<]+)<\/div>/gi;
let match;

while ((match = productRegex.exec(html)) !== null) {
    const title = match[1]?.trim();
    
    if (!title || title.length < 3 || title.length > 150) continue;
    
    // Ищем цену рядом с этим товаром
    const priceContext = html.substring(match.index, match.index + 1000);
    const priceMatch = priceContext.match(/data-product-price-def="(\d+)"/);
    const price = priceMatch ? parseInt(priceMatch[1]) : 0;
    
    // Ищем изображение
    const imgMatch = priceContext.match(/data-original=["'](https:\/\/static\.tildacdn\.com\/[^"']+\.jpe?g[^"']*)["']/i);
    const image = imgMatch ? imgMatch[1] : null;
    
    // Пропускаем заголовки категорий
    if (/^пицц$|^кальцоне$|^наш|^отзыв|^франш|^статьи|^акции|^контакт|^партнерств$/i.test(title)) {
        continue;
    }
    
    // Пропускаем дубликаты
    if (products.find(p => p.title === title)) continue;
    
    products.push({
        title: title,
        price: price,
        category: categorizeItem(title),
        image: image
    });
    
    if (image) images.add(image);
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
console.log('📊 РЕЗУЛЬТАТЫ:\n');
console.table({
    'Всего товаров': products.length,
    'Изображений': images.size
});

console.log('\n📋 КАТЕГОРИИ:');
const byCategory = {};
products.forEach(p => {
    byCategory[p.category] = (byCategory[p.category] || 0) + 1;
});
console.table(byCategory);

// Вывод по категориям
console.log('\n🍕 ПОЛНЫЙ СПИСОК:\n');

Object.keys(byCategory).sort().forEach(cat => {
    const catProducts = products.filter(p => p.category === cat);
    console.log(`\n${cat.toUpperCase()} (${catProducts.length}):`);
    catProducts.forEach((p, i) => {
        const priceStr = p.price > 0 ? `— ${p.price}₽` : '';
        console.log(`  ${i+1}. ${p.title} ${priceStr}`);
    });
});

// Сохраняем
const result = {
    collectedAt: new Date().toISOString(),
    source: './2.txt',
    totalProducts: products.length,
    products: products,
    images: Array.from(images),
    statistics: {
        byCategory: byCategory,
        totalImages: images.size
    }
};

fs.writeFileSync(
    './raw-content/menu-from-2.json',
    JSON.stringify(result, null, 2),
    'utf8'
);

console.log('\n\n💾 Сохранено в: ./raw-content/menu-from-2.json\n');
console.log('✅ ГОТОВО!\n');
