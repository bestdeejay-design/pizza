const fs = require('fs');

console.log('🔍 Парсим КОМБО НАБОРЫ из HTML...\n');

// Читаем HTML файл (предполагаем что вы сохранили как combos.html или combos.txt)
let html;
try {
    html = fs.readFileSync('./combos.html', 'utf8');
} catch(e) {
    try {
        html = fs.readFileSync('./combos.txt', 'utf8');
    } catch(e2) {
        console.log('❌ НЕТ ФАЙЛА!');
        console.log('\n💡 СОХРАНИТЕ HTML СТРАНИЦЫ:');
        console.log('1. Откройте https://pizzanapolirsc.ru/?tfc_quantity%5B1271358691%5D=y&tfc_page%5B1271358691%5D=5&tfc_storepartuid%5B1271358691%5D=Комбо+наборы&tfc_div=:::#rec1271358691');
        console.log('2. Cmd+S (или Ctrl+S)');
        console.log('3. Выберите "Веб-страница полностью" или "HTML"');
        console.log('4. Сохраните как combos.html в папку проекта');
        console.log('5. Запустите этот скрипт снова\n');
        process.exit(0);
    }
}

console.log(`📄 Размер файла: ${(html.length / 1024).toFixed(2)} KB\n`);

const products = [];
const images = new Set();

// Ищем все товары в Tilda Store
const productRegex = /data-product-uid="(\d+)"[^>]*>[\s\S]{0,3000}?js-store-prod-name js-product-name[^>]*>([^<]+)<\/div>[\s\S]{0,1000}?data-product-price-def="(\d+)"[\s\S]{0,1000}?(?:data-original=["'](https:\/\/static\.tildacdn\.com\/[^"']+\.jpe?g[^"']*)["'])?/gi;

let match;
let id = 1;

while ((match = productRegex.exec(html)) !== null) {
    const uid = match[1];
    const title = match[2]?.trim();
    const price = parseInt(match[3]);
    const image = match[4] || null;
    
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
            category: 'combos',
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
    console.log('2. Категория пуста на сайте');
    console.log('3. Динамическая подгрузка (нужен Puppeteer)\n');
} else {
    console.log('\n🎁 КОМБО НАБОРЫ:\n');
    products.forEach((p, i) => {
        const imgStr = p.image ? '✓' : '✗';
        console.log(`${i+1}. ${p.title} — ${p.price}₽ [${imgStr}]`);
    });
    
    // Сохраняем
    const result = {
        collectedAt: new Date().toISOString(),
        source: 'Комбо наборы с pizzanapolirsc.ru',
        category: 'combos',
        totalProducts: products.length,
        products: products,
        images: Array.from(images),
        statistics: {
            withImages: products.filter(p => p.image).length,
            withoutImages: products.filter(p => !p.image).length
        }
    };
    
    fs.writeFileSync(
        './raw-content/combos-parsed.json',
        JSON.stringify(result, null, 2),
        'utf8'
    );
    
    console.log('\n💾 Сохранено в: ./raw-content/combos-parsed.json\n');
    console.log('✅ ГОТОВО!\n');
}
