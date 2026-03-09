/**
 * ДИАГНОСТИКА - проверить что на странице
 */

const puppeteer = require('puppeteer');

const URL = 'https://pizzanapolirsc.ru/?tfc_quantity%5B1271358691%5D=y&tfc_storepartuid%5B1271358691%5D=Suchi+&+Rolls&tfc_div=:::';

async function diagnose() {
    console.log('🔍 ДИАГНОСТИКА СТРАНИЦЫ\n');
    
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        
        console.log('Открываю страницу...');
        await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await new Promise(r => setTimeout(r, 5000));
        
        // Проверяем заголовок
        const title = await page.title();
        console.log(`\nЗаголовок страницы: ${title}`);
        
        // Ищем товары
        const products = await page.evaluate(() => {
            const cards = document.querySelectorAll('.js-product[data-product-lid]');
            return Array.from(cards).map(card => {
                const titleEl = card.querySelector('.js-product-name');
                const priceEl = card.querySelector('.js-product-price');
                
                if (titleEl && priceEl) {
                    return {
                        lid: card.getAttribute('data-product-lid'),
                        title: titleEl.textContent.trim(),
                        price: priceEl.textContent.trim()
                    };
                }
                return null;
            }).filter(p => p);
        });
        
        console.log(`\nНайдено товаров: ${products.length}`);
        
        if (products.length > 0) {
            console.log('\nПервые 5 товаров:');
            products.slice(0, 5).forEach((p, i) => {
                console.log(`${i+1}. ${p.title} - ${p.price}`);
            });
        } else {
            // Пробуем другие селекторы
            console.log('\nПробую другие селекторы...');
            
            const altSelectors = await page.evaluate(() => {
                const selectors = [
                    { name: '.js-product', count: document.querySelectorAll('.js-product').length },
                    { name: '[data-product-lid]', count: document.querySelectorAll('[data-product-lid]').length },
                    { name: '.t-card', count: document.querySelectorAll('.t-card').length },
                    { name: '.product', count: document.querySelectorAll('.product').length }
                ];
                return selectors;
            });
            
            altSelectors.forEach(sel => {
                console.log(`   ${sel.name}: ${sel.count}`);
            });
        }
        
    } finally {
        await browser.close();
    }
}

diagnose().catch(console.error);
