const fs = require('fs');

console.log('🔍 Анализирую menu.txt...\n');

const html = fs.readFileSync('./menu.txt', 'utf8');
console.log(`📄 Размер файла: ${(html.length / 1024 / 1024).toFixed(2)} MB\n`);

const products = [];
const images = new Set();

// Паттерн для извлечения всех товаров Tilda Store
const productRegex = /js-store-prod-name js-product-name[^>]*>([^<]+)<\/div>/gi;
let match;

while ((match = productRegex.exec(html)) !== null) {
    const title = match[1]?.trim();
    
    if (!title || title.length < 3 || title.length > 200) continue;
    
    // Ищем цену рядом с этим товаром
    const priceContext = html.substring(match.index, match.index + 1500);
    const priceMatch = priceContext.match(/data-product-price-def="(\d+)"/);
    const price = priceMatch ? parseInt(priceMatch[1]) : 0;
    
    // Ищем изображение
    const imgMatch = priceContext.match(/data-original=["'](https:\/\/static\.tildacdn\.com\/[^"']+\.jpe?g[^"']*)["']/i);
    const image = imgMatch ? imgMatch[1] : null;
    
    // Пропускаем заголовки категорий и инфо-блоки
    if (/^пицц$|^кальцоне$|^наш|^отзыв|^франш|^статьи|^акции|^контакт|^партнерств|^мастер|^комбо|^набор|^суши|^rolls$/i.test(title)) {
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
    
    // Сначала проверяем очевидные категории
    if (t.includes('кальцоне')) return 'calzone';
    if (t.includes('ролл') || t.includes('суши') || t.includes('маки') || t.includes('нигири') || t.includes('гункан') || t.includes('сашими')) return 'rolls';
    if (t.includes('салат')) return 'salads';
    if (t.includes('паста')) return 'pasta';
    if (t.includes('соус') && !t.includes('пицца')) return 'sauces';
    if (t.includes('фокачч')) return 'focaccia';
    if (t.includes('хлеб')) return 'bread';
    if (t.includes('масло') && !t.includes('пицца')) return 'oils';
    if (t.includes('заморожен')) return 'frozen';
    if (t.includes('напитк') || t.includes('кола') || t.includes('вода') || t.includes('сок') || t.includes('чай') || t.includes('кофе')) return 'beverages';
    if (t.includes('кондитер') || t.includes('десерт') || t.includes('печень') || t.includes('бискотти') || t.includes('трюфель')) return 'confectionery';
    if (t.includes('комбо') || t.includes('сет') || t.includes('набор')) return 'combos';
    
    // Пицца - ВСЁ что содержит "пицца", "pizza" или "тесто"
    if (t.includes('пицца') || t.includes('pizza') || t.includes('тесто') || t.includes('piccolo')) return 'pizza';
    
    return 'other';
}

// Статистика
console.log('📊 РЕЗУЛЬТАТЫ:\n');
console.table({
    'Всего товаров': products.length,
    'Изображений': images.size,
    'Товаров с фото': products.filter(p => p.image).length,
    'Без фото': products.filter(p => !p.image).length
});

console.log('\n📋 КАТЕГОРИИ:');
const byCategory = {};
products.forEach(p => {
    byCategory[p.category] = (byCategory[p.category] || 0) + 1;
});
console.table(byCategory);

// Вывод по категориям
console.log('\n🍕 ПОЛНЫЙ СПИСОК ПО КАТЕГОРИЯМ:\n');

Object.keys(byCategory).sort().forEach(cat => {
    const catProducts = products.filter(p => p.category === cat);
    console.log(`\n${cat.toUpperCase()} (${catProducts.length}):`);
    catProducts.slice(0, 15).forEach((p, i) => {
        const priceStr = p.price > 0 ? `— ${p.price}₽` : '';
        const imgStr = p.image ? '✓' : '✗';
        console.log(`  ${i+1}. ${p.title} ${priceStr} [${imgStr}]`);
    });
    if (catProducts.length > 15) {
        console.log(`  ... и ещё ${catProducts.length - 15}`);
    }
});

// Сохраняем
const result = {
    collectedAt: new Date().toISOString(),
    source: './menu.txt (полная версия)',
    totalProducts: products.length,
    products: products,
    images: Array.from(images),
    statistics: {
        byCategory: byCategory,
        totalImages: images.size,
        withImages: products.filter(p => p.image).length,
        withoutImages: products.filter(p => !p.image).length
    }
};

fs.writeFileSync(
    './raw-content/menu-full-parsed.json',
    JSON.stringify(result, null, 2),
    'utf8'
);

console.log('\n\n💾 Сохранено в: ./raw-content/menu-full-parsed.json\n');
console.log('✅ ГОТОВО!\n');
