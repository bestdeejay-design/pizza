const fs = require('fs');

console.log('🔍 Парсим каталог Tilda Store...\n');

const html = fs.readFileSync('./pizza.txt', 'utf8');
console.log(`📄 Размер файла: ${(html.length / 1024).toFixed(2)} KB\n`);

const products = [];
const images = new Set();

// Ищем все товары в каталоге
// Паттерн: data-product-uid + название + цена
const productPattern = /data-product-uid="(\d+)"[^>]*>[\s\S]{0,3000}?js-store-prod-name js-product-name[^>]*>([^<]+)<\/div>[\s\S]{0,500}?data-product-price-def="(\d+)"[\s\S]{0,1000}?data-original=["'](https:\/\/static\.tildacdn\.com\/[^"']+\.jpe?g[^"']*)["']/gi;

let match;
let id = 1;

while ((match = productPattern.exec(html)) !== null) {
    const uid = match[1];
    const title = match[2]?.trim();
    const price = parseInt(match[3]);
    const image = match[4];
    
    // Пропускаем заголовки категорий и дубликаты
    if (title && 
        !title.match(/пицц|кальцоне|наш|отзыв|франш|статьи|акции|контакт|партнерств|бесплатно/i) &&
        title.length > 2 && 
        title.length < 100 &&
        price > 0 &&
        !products.find(p => p.uid === uid)) {
        
        products.push({
            id: id++,
            uid: uid,
            title: title,
            description: '',
            price: price,
            category: categorizeItem(title),
            image: image || null
        });
        
        if (image) images.add(image);
    }
}

// Если не нашли с картинками, ищем без них
if (products.length === 0) {
    console.log('🔄 Ищу товары без изображений...\n');
    
    const simplePattern = /js-store-prod-name js-product-name[^>]*>([^<]+)<\/div>[\s\S]{0,500}?data-product-price-def="(\d+)"/gi;
    id = 1;
    
    while ((match = simplePattern.exec(html)) !== null) {
        const title = match[1]?.trim();
        const price = parseInt(match[2]);
        
        if (title && 
            !title.match(/пицц|кальцоне|наш|отзыв|франш|статьи|акции|контакт|партнерств|бесплатно/i) &&
            title.length > 2 && 
            title.length < 100 &&
            price > 0 &&
            !products.find(p => p.title === title)) {
            
            products.push({
                id: id++,
                uid: '',
                title: title,
                description: '',
                price: price,
                category: categorizeItem(title),
                image: null
            });
        }
    }
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
    if (t.includes('пицца') || t.includes('pizza')) return 'pizza';
    return 'pizza';
}

// Вывод статистики
console.log('📊 РЕЗУЛЬТАТЫ ПАРСИНГА:\n');
console.table({
    'Позиций меню': products.length,
    'Изображений': images.size
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
        total: images.size
    },
    statistics: {
        byCategory: byCategory
    }
};

fs.writeFileSync(
    './raw-content/menu-from-store.json',
    JSON.stringify(result, null, 2),
    'utf8'
);

console.log('💾 Сохранено в: ./raw-content/menu-from-store.json\n');
console.log('✅ Готово к интеграции в сайт!\n');
