const fs = require('fs');

console.log('🔍 Парсим КОНДИТЕРСКИЕ ИЗДЕЛИЯ из menu.txt...\n');

const html = fs.readFileSync('./menu.txt', 'utf8');
console.log(`📄 Размер файла: ${(html.length / 1024).toFixed(2)} KB\n`);

const products = [];
const images = new Set();

// Ищем все товары в Tilda Store - улучшенный паттерн
let match;
let id = 1;

// Сначала находим все карточки товаров
const cardRegex = /data-product-uid="(\d+)"[\s\S]{0,3000}?js-store-prod-name[^>]*>([^<]+)<\/div>[\s\S]{0,1500}?data-product-price-def="(\d+)"/gi;

while ((match = cardRegex.exec(html)) !== null) {
    const uid = match[1];
    const title = match[2]?.trim();
    const price = parseInt(match[3]);
    
    // Ищем изображение в контексте этой карточки
    const cardContext = html.substring(match.index, Math.min(match.index + 3000, html.length));
    const imgMatch = cardContext.match(/data-original="(https:\/\/static\.tildacdn\.com\/[^"]+\.jpe?g[^"]*)"/i);
    const image = imgMatch ? imgMatch[1] : null;
    
    // Пропускаем заголовки и дубликаты
    if (title && 
        title.length > 2 && 
        title.length < 200 &&
        price > 0 &&
        !products.find(p => p.uid === uid)) {
        
        products.push({
            id: id++,
            uid: uid,
            title: title,
            description: '',
            price: price,
            category: 'confectionery',
            image: image
        });
        
        if (image) images.add(image);
    }
}

// Статистика
console.log('📊 РЕЗУЛЬТАТЫ:\n');
console.table({
    'Найдено товаров': products.length,
    'Изображений': images.size,
    'С фото': products.filter(p => p.image).length,
    'Без фото': products.filter(p => !p.image).length
});

if (products.length === 0) {
    console.log('\n⚠️ НЕ НАЙДЕНО ТОВАРОВ!\n');
    console.log('Возможно:');
    console.log('1. Неверный формат HTML');
    console.log('2. Категория пуста');
    console.log('3. Другая структура Tilda\n');
} else {
    console.log('\n🍰 КОНДИТЕРСКИЕ ИЗДЕЛИЯ:\n');
    products.forEach((p, i) => {
        const imgStr = p.image ? '✓' : '✗';
        console.log(`${i+1}. ${p.title} — ${p.price}₽ [${imgStr}]`);
    });
    
    // Сохраняем
    const result = {
        collectedAt: new Date().toISOString(),
        source: './menu.txt (Кондитерские изделия)',
        category: 'confectionery',
        totalProducts: products.length,
        products: products,
        images: Array.from(images),
        statistics: {
            withImages: products.filter(p => p.image).length,
            withoutImages: products.filter(p => !p.image).length
        }
    };
    
    fs.writeFileSync(
        './raw-content/confectionery-from-file.json',
        JSON.stringify(result, null, 2),
        'utf8'
    );
    
    console.log('\n💾 Сохранено в: ./raw-content/confectionery-from-file.json\n');
    console.log('✅ ГОТОВО!\n');
}
