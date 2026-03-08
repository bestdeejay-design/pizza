const puppeteer = require('puppeteer');

(async () => {
    console.log('🚀 Запуск браузера для парсинга Яндекс Еды...');
    
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    
    // Устанавливаем User-Agent чтобы не заблокировали
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log('📍 Переход на страницу...');
    await page.goto('https://eda.yandex.ru/r/pizza_napoli_bmroq?placeSlug=pizza_napoli_g45hc', { 
        waitUntil: 'networkidle2',
        timeout: 60000 
    });
    
    // Ждем загрузки товаров
    console.log('⏳ Ожидание загрузки товаров...');
    await page.waitForSelector('[data-testid="product-card"]', { timeout: 10000 }).catch(() => {
        console.log('⚠️ Не найдены товары с data-testid="product-card", пробуем другие селекторы...');
    });
    
    // Собираем все карточки товаров
    const products = await page.evaluate(() => {
        const cards = document.querySelectorAll('[data-testid="product-card"], .product-card, .catalog-productCard');
        
        return Array.from(cards).map(card => {
            const title = card.querySelector('h3, .product-name, .catalog-productCard__title')?.textContent.trim();
            const weight = card.querySelector('.product-weight, .weight, [class*="weight"]')?.textContent.trim();
            const description = card.querySelector('.product-description, .description, [class*="description"]')?.textContent.trim();
            
            return { title, weight, description };
        }).filter(p => p.title);
    });
    
    console.log(`✅ Найдено товаров: ${products.length}`);
    console.log('\nПримеры:');
    products.slice(0, 5).forEach((p, i) => {
        console.log(`${i+1}. ${p.title} | ${p.weight || 'нет веса'} | ${p.description ? p.description.substring(0, 50) + '...' : 'нет описания'}`);
    });
    
    // Сохраняем в JSON
    const fs = require('fs');
    fs.writeFileSync('yandex-weights.json', JSON.stringify(products, null, 2));
    console.log('\n💾 Сохранено в yandex-weights.json');
    
    await browser.close();
    console.log('👋 Браузер закрыт');
})();
