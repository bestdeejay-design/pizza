const puppeteer = require('puppeteer');
const fs = require('fs');

console.log('🚀 Парсим ФРАНШИЗА с pizzanapolirsc.ru...\n');

(async () => {
    let browser;
    try {
        console.log('🌐 Открываю категорию Франшиза...');
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        
        const url = 'https://pizzanapolirsc.ru/?tfc_quantity%5B1271358691%5D=y&tfc_storepartuid%5B1271358691%5D=Франшиза&tfc_div=:::';
        console.log(`📥 Загружаю: ${url}...`);
        await page.goto(url, { 
            waitUntil: 'networkidle0',
            timeout: 60000 
        });
        
        console.log('⏳ Жду загрузки товаров...');
        try {
            await page.waitForSelector('.js-store-prod-name', { timeout: 30000 });
        } catch(e) {
            console.log('⚠️ Товары не найдены\n');
        }
        
        console.log('📜 Прокручиваю страницу...');
        await page.evaluate(async () => {
            await new Promise(resolve => {
                let total = 0;
                const interval = setInterval(() => {
                    window.scrollBy(0, 300);
                    total += 300;
                    if (total >= document.body.scrollHeight || total > 3000) {
                        clearInterval(interval);
                        resolve();
                    }
                }, 100);
            });
        });
        
        await new Promise(r => setTimeout(r, 2000));
        
        console.log('💼 Собираю франшизу...\n');
        const products = await page.evaluate(() => {
            const items = [];
            const productCards = document.querySelectorAll('[data-product-uid]');
            
            productCards.forEach(card => {
                try {
                    const nameEl = card.querySelector('.js-store-prod-name');
                    const priceEl = card.querySelector('[data-product-price-def]');
                    const imgEl = card.querySelector('img[data-original]') || card.querySelector('[data-original]');
                    
                    if (nameEl && priceEl) {
                        const title = nameEl.textContent.trim();
                        const priceStr = priceEl.getAttribute('data-product-price-def') || '0';
                        const price = parseInt(priceStr);
                        const image = imgEl ? imgEl.getAttribute('data-original') : null;
                        
                        if (title && title.length > 2 && title.length < 200 && price > 0) {
                            items.push({
                                title: title,
                                price: price,
                                image: image,
                                uid: card.getAttribute('data-product-uid') || ''
                            });
                        }
                    }
                } catch(e) {}
            });
            
            return items;
        });
        
        console.log(`✅ Найдено товаров: ${products.length}\n`);
        
        if (products.length === 0) {
            console.log('⚠️ Франшиза не найдена!\n');
        } else {
            console.log('💼 ФРАНШИЗА:\n');
            products.forEach((p, i) => {
                const imgStr = p.image ? '✓' : '✗';
                console.log(`${i+1}. ${p.title} — ${p.price}₽ [${imgStr}]`);
            });
        }
        
        const result = {
            collectedAt: new Date().toISOString(),
            source: url,
            category: 'franchise',
            totalProducts: products.length,
            products: products.map(p => ({
                id: products.indexOf(p) + 1,
                uid: p.uid,
                title: p.title,
                description: '',
                price: p.price,
                category: 'franchise',
                image: p.image
            })),
            images: [...new Set(products.map(p => p.image).filter(Boolean))],
            statistics: {
                withImages: products.filter(p => p.image).length,
                withoutImages: products.filter(p => !p.image).length
            }
        };
        
        fs.writeFileSync(
            './raw-content/franchise-from-site.json',
            JSON.stringify(result, null, 2),
            'utf8'
        );
        
        console.log('\n💾 Сохранено в: ./raw-content/franchise-from-site.json\n');
        console.log(`📸 С фото: ${products.filter(p => p.image).length} из ${products.length}`);
        console.log('\n✨ ГОТОВО!\n');
        
    } catch (error) {
        console.error('❌ ОШИБКА:', error.message);
        process.exit(1);
    } finally {
        if (browser) await browser.close();
    }
})();
