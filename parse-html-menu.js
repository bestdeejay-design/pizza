const fs = require('fs');

console.log('🔍 Обрабатываю HTML файл с меню...\n');

// Читаем файл
const html = fs.readFileSync('./pizza.txt', 'utf8');
console.log(`📄 Размер файла: ${(html.length / 1024).toFixed(2)} KB\n`);

// Ищем карточки товаров
const products = [];
const images = new Set();

// Паттерн для поиска карточек Tilda
const cardPattern = /t-card__title[^>]*>([^<]+)<\/div>[\s\S]{0,1500}?(?:t-card__descr|t772__descr)[^>]*>([^<]+)<\/div>[\s\S]{0,1000}?(?:t-btn[^>]*>([^<]+)<\/div>|price[^>]*>([^<]+)<)/gi;

let match;
let id = 1;

while ((match = cardPattern.exec(html)) !== null) {
    const title = match[1]?.trim();
    const description = match[2]?.trim();
    const priceText = match[3] || match[4];
    const price = priceText ? parseInt(priceText.replace(/[^\d]/g, '')) : null;
    
    // Пропускаем заголовки разделов и служебные тексты
    if (title && 
        !title.match(/пицц|кальцоне|наш|отзыв|франш|статьи|акции|контакт|партнерств/i) &&
        title.length > 2 && 
        title.length < 100 &&
        price) {
        
        products.push({
            id: id++,
            title: title,
            description: description || '',
            price: price,
            category: categorizeItem(title),
            image: null
        });
    }
}

// Ищем изображения
const imgPattern = /data-original=["'](https:\/\/static\.tildacdn\.com\/[^"']+\.jpe?g[^"']*)["']/gi;
while ((match = imgPattern.exec(html)) !== null) {
    images.add(match[1]);
}

function categorizeItem(title) {
    const t = title.toLowerCase();
    if (t.includes('кальцоне')) return 'calzone';
    if (t.includes('салат')) return 'salad';
    if (t.includes('соус')) return 'sauce';
    if (t.includes('фокачч')) return 'focaccia';
    if (t.includes('хлеб')) return 'bread';
    if (t.includes('ролл') || t.includes('суши')) return 'rolls';
    if (t.includes('напитк') || t.includes('кола')) return 'drinks';
    return 'pizza';
}

// Распределяем изображения по товарам
const productImages = Array.from(images).filter(img => 
    img.includes('pizza') || img.includes('food') || img.match(/_\d+\./)
);

products.forEach((item, index) => {
    if (productImages[index]) {
        item.image = productImages[index];
    }
});

// Вывод статистики
console.log('📊 РЕЗУЛЬТАТЫ ПАРСИНГА:\n');
console.table({
    'Позиций меню': products.length,
    'Изображений': images.size,
    'Уникальных фото товаров': productImages.length
});

console.log('\n📋 КАТЕГОРИИ:');
const byCategory = {};
products.forEach(p => {
    byCategory[p.category] = (byCategory[p.category] || 0) + 1;
});
console.table(byCategory);

console.log('\n🍕 ВСЁ МЕНЮ ПО КАТЕГОРИЯМ:\n');

const categories = [...new Set(products.map(p => p.category))];
categories.forEach(cat => {
    const catProducts = products.filter(p => p.category === cat);
    console.log(`${cat.toUpperCase()}: (${catProducts.length} поз.)`);
    catProducts.forEach((p, i) => {
        console.log(`  ${i+1}. ${p.title} — ${p.price}₽`);
    });
    console.log('');
});

// Сохраняем результат
const result = {
    collectedAt: new Date().toISOString(),
    source: './pizza.txt (HTML копия страницы)',
    blockId: 'rec1271358691',
    totalProducts: products.length,
    products: products,
    images: {
        all: Array.from(images),
        products: productImages
    },
    statistics: {
        byCategory: byCategory,
        totalImages: images.size
    }
};

fs.writeFileSync(
    './raw-content/menu-from-html.json',
    JSON.stringify(result, null, 2),
    'utf8'
);

console.log('💾 Сохранено в: ./raw-content/menu-from-html.json\n');
console.log('✅ Готово к интеграции в сайт!\n');
