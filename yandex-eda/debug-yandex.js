/**
 * Debug Parser - для исследования структуры Яндекс Еды
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

async function debugYandexEda() {
    console.log('🔍 Debug mode...\n');
    
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log('📍 Loading https://eda.yandex.ru/r/pizza_napoli_bmroq...');
    await page.goto('https://eda.yandex.ru/r/pizza_napoli_bmroq', { 
        waitUntil: 'domcontentloaded',
        timeout: 120000 
    });
    
    console.log('⏳ Waiting 15 seconds for full load (slow for anti-bot)...');
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    // Исследуем структуру
    const structure = await page.evaluate(() => {
        // Ищем все карточки товаров
        const allCards = document.querySelectorAll('[data-testid], [class*="card"], [class*="product"]');
        
        console.log(`Всего элементов с card/product/testid: ${allCards.length}`);
        
        // Собираем информацию о первых 10 элементах
        const elements = Array.from(allCards).slice(0, 10).map((el, i) => {
            return {
                tag: el.tagName,
                id: el.id || null,
                className: typeof el.className === 'string' ? el.className.substring(0, 100) : (el.getAttribute('class') || '').substring(0, 100),
                testId: el.getAttribute('data-testid'),
                textPreview: el.textContent?.substring(0, 50)?.trim()
            };
        });
        
        // Проверяем конкретные селекторы
        const selectors = {
            '[data-testid="product-card"]': document.querySelectorAll('[data-testid="product-card"]').length,
            '.product-card': document.querySelectorAll('.product-card').length,
            '[class*="productCard"]': document.querySelectorAll('[class*="productCard"]').length,
            '[class*="ProductCard"]': document.querySelectorAll('[class*="ProductCard"]').length,
            '[data-aut="product-card"]': document.querySelectorAll('[data-aut="product-card"]').length
        };
        
        return { elements, selectors, totalCards: allCards.length };
    });
    
    console.log('\n📊 Structure analysis:');
    console.log('Total cards found:', structure.totalCards);
    console.log('\nSelector matches:', structure.selectors);
    console.log('\nFirst 10 elements:');
    structure.elements.forEach((el, i) => {
        console.log(`${i+1}. ${el.tag} | ${el.testId || 'no-testid'} | ${el.className?.substring(0, 50)} | "${el.textPreview}"`);
    });
    
    // Сохраняем полный HTML для анализа
    const html = await page.content();
    fs.writeFileSync('/Users/admin/Documents/GitHub/pizza/parsers/yandex-debug.html', html);
    console.log('\n💾 Full HTML saved to yandex-debug.html');
    
    await browser.close();
}

debugYandexEda()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
