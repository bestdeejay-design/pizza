const https = require('https');
const fs = require('fs');

console.log('🔄 Собираем ПОЛНОЕ меню с pizzanapolirsc.ru...\n');

// Загружаем сохранённый HTML
const html = fs.readFileSync('./raw-content/source.html', 'utf8');

// Ищем данные каталога Tilda
function extractTildaCatalog(html) {
    const catalogData = {
        products: [],
        categories: [],
        images: new Set()
    };
    
    // Паттерн 1: Ищем в JSON внутри HTML (Tilda хранит данные в window.tcatalog)
    const jsonPatterns = [
        /window\.tcatalog\s*=\s*({[\s\S]*?});/i,
        /t.catalog\s*=\s*({[\s\S]*?});/i,
        /data-products=["']({[\s\S]*?})["']/i
    ];
    
    for (const pattern of jsonPatterns) {
        const match = html.match(pattern);
        if (match) {
            try {
                const data = JSON.parse(match[1].replace(/'/g, '"'));
                console.log('✅ Найдено данных в JSON:', Object.keys(data).length);
                return data;
            } catch (e) {
                console.log('⚠️ Не удалось распарсить JSON');
            }
        }
    }
    
    // Паттерн 2: Ищем карточки товаров в HTML
    // t-card__title, t-card__descr, t-btn, price
    const cardRegex = /t-card__title[^>]*>([^<]+)<\/div>[\s\S]{0,1000}?(?:t-card__descr|t772__descr)[^>]*>([^<]+)<\/div>[\s\S]{0,500}?(?:t-btn[^>]*>([^<]+)<\/div>|price[^>]*>([^<]+)<)/gi;
    
    let match;
    let id = 1;
    
    while ((match = cardRegex.exec(html)) !== null) {
        const title = match[1]?.trim();
        const description = match[2]?.trim();
        const priceText = match[3] || match[4];
        const price = priceText ? parseInt(priceText.replace(/[^\d]/g, '')) : 0;
        
        if (title && !catalogData.products.find(p => p.title === title)) {
            catalogData.products.push({
                id: id++,
                title: title,
                description: description || '',
                price: price,
                category: categorizeItem(title),
                image: null
            });
        }
    }
    
    // Паттерн 3: Ищем изображения в data-original
    const imgRegex = /data-original=["'](https:\/\/static\.tildacdn\.com\/[^"']+\.jpe?g[^"']*)["']/gi;
    while ((match = imgRegex.exec(html)) !== null) {
        catalogData.images.add(match[1]);
    }
    
    return catalogData;
}

function categorizeItem(title) {
    const lower = title.toLowerCase();
    if (lower.includes('кальцоне')) return 'calzone';
    if (lower.includes('салат')) return 'salad';
    if (lower.includes('соус')) return 'sauce';
    if (lower.includes('фокачч')) return 'focaccia';
    if (lower.includes('хлеб')) return 'bread';
    if (lower.includes('ролл') || lower.includes('суши')) return 'rolls';
    if (lower.includes('напитк') || lower.includes('кола')) return 'drinks';
    if (lower.includes('паста')) return 'pasta';
    if (lower.includes('десерт')) return 'dessert';
    return 'pizza';
}

// Сохраняем полное меню
function saveFullMenu(data) {
    const menuFile = {
        collectedAt: new Date().toISOString(),
        source: 'https://pizzanapolirsc.ru/',
        totalProducts: data.products?.length || 0,
        categories: [...new Set(data.products?.map(p => p.category))],
        products: data.products || [],
        images: Array.from(data.images || []),
        raw: data
    };
    
    fs.writeFileSync(
        './raw-content/full-menu.json',
        JSON.stringify(menuFile, null, 2),
        'utf8'
    );
    
    console.log('\n📊 СТАТИСТИКА:');
    console.table({
        'Позиций меню': menuFile.totalProducts,
        'Категорий': menuFile.categories.length,
        'Изображений': menuFile.images.length
    });
    
    console.log('\n📋 КАТЕГОРИИ:');
    const byCategory = {};
    (data.products || []).forEach(p => {
        byCategory[p.category] = (byCategory[p.category] || 0) + 1;
    });
    console.table(byCategory);
    
    console.log('\n💾 Сохранено в: ./raw-content/full-menu.json\n');
    
    // Выводим первые 10 позиций для проверки
    if (data.products && data.products.length > 0) {
        console.log('🍕 ПЕРВЫЕ 10 ПОЗИЦИЙ:');
        data.products.slice(0, 10).forEach((p, i) => {
            console.log(`${i+1}. ${p.title} — ${p.price}₽ (${p.category})`);
        });
        console.log(`\n... и ещё ${data.products.length - 10} позиций\n`);
    }
}

// Запуск
try {
    const data = extractTildaCatalog(html);
    
    if (!data.products || data.products.length === 0) {
        console.log('❌ Меню не найдено в HTML!');
        console.log('\n💡 Попробуем другой подход...');
        
        // Пробуем найти просто все названия
        const titles = [];
        const titleRegex = /t-card__title[^>]*>([^<]+)<\/div>/gi;
        let match;
        
        while ((match = titleRegex.exec(html)) !== null) {
            const title = match[1]?.trim();
            if (title && title.length > 2 && title.length < 100) {
                titles.push(title);
            }
        }
        
        console.log(`Найдено заголовков: ${titles.length}`);
        if (titles.length > 0) {
            console.log('\nЗаголовки:');
            titles.forEach((t, i) => console.log(`${i+1}. ${t}`));
        }
    } else {
        saveFullMenu(data);
    }
    
} catch (error) {
    console.error('❌ Ошибка:', error.message);
}
