const puppeteer = require('puppeteer');
const fs = require('fs');

console.log('🚀 Парсим КОМБО НАБОРЫ с pizzanapolirsc.ru...\n');

(async () => {
    let browser;
    try {
        // Запускаем браузер
        console.log('🌐 Открываю категорию Комбо наборы...');
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        
        // Открываем категорию Комбо наборы
        const url = 'https://pizzanapolirsc.ru/?tfc_quantity%5B1271358691%5D=y&tfc_page%5B1271358691%5D=5&tfc_storepartuid%5B1271358691%5D=Комбо+наборы&tfc_div=:::#rec1271358691';
        console.log(`📥 Загружаю: ${url}...`);
        await page.goto(url, { 
            waitUntil: 'networkidle0',
            timeout: 60000 
        });
        
        // Ждём загрузки Tilda Store
        console.log('⏳ Жду загрузки товаров...');
        try {
            await page.waitForSelector('.js-store-prod-name', { timeout: 30000 });
        } catch(e) {
            console.log('⚠️ Товары не найдены - категория может быть пустой или скрытой');
            
            // Проверяем есть ли вообще товары на странице
            const hasProducts = await page.evaluate(() => {
                return document.querySelectorAll('[data-product-uid]').length > 0;
            });
            
            if (!hasProducts) {
                console.log('\n❌ КАТЕГОРИЯ ПУСТАЯ или НЕДОСТУПНА');
                console.log('Возможно комбо наборы временно отсутствуют на сайте\n');
                
                // Создаём пустой файл
                const emptyResult = {
                    collectedAt: new Date().toISOString(),
                    source: url,
                    category: 'combos',
                    totalProducts: 0,
                    products: [],
                    images: [],
                    message: 'Категория пуста или недоступна для парсинга'
                };
                
                fs.writeFileSync(
                    './raw-content/combos-empty.json',
                    JSON.stringify(emptyResult, null, 2),
                    'utf8'
                );
                
                console.log('💾 Сохранено в: ./raw-content/combos-empty.json\n');
                process.exit(0);
            }
        }
        
        // Прокручиваем страницу для подгрузки всех товаров
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
        
        // Собираем все товары
        console.log('🔍 Собираю комбо наборы...\n');
        const combos = await page.evaluate(() => {
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
                        
                        // Пропускаем заголовки и не товары
                        if (title && 
                            title.length > 2 && 
                            title.length < 200 &&
                            price > 0) {
                            
                            items.push({
                                title: title,
                                price: price,
                                image: image,
                                uid: card.getAttribute('data-product-uid') || ''
                            });
                        }
                    }
                } catch(e) {
                    console.error('Ошибка обработки карточки:', e);
                }
            });
            
            return items;
        });
        
        console.log(`✅ Найдено комбо наборов: ${combos.length}\n`);
        
        if (combos.length === 0) {
            console.log('⚠️ Комбо наборы не найдены!\n');
            console.log('Возможные причины:');
            console.log('1. Категория пуста на сайте');
            console.log('2. Динамическая подгрузка не сработала');
            console.log('3. Требуется авторизация или особые условия\n');
        } else {
            console.log('🎁 КОМБО НАБОРЫ:\n');
            combos.forEach((c, i) => {
                const imgStr = c.image ? '✓' : '✗';
                console.log(`${i+1}. ${c.title} — ${c.price}₽ [${imgStr}]`);
            });
        }
        
        // Сохраняем результат
        const result = {
            collectedAt: new Date().toISOString(),
            source: url,
            category: 'combos',
            totalProducts: combos.length,
            products: combos.map(c => ({
                id: combos.indexOf(c) + 1,
                uid: c.uid,
                title: c.title,
                description: '',
                price: c.price,
                category: 'combos',
                image: c.image
            })),
            images: [...new Set(combos.map(c => c.image).filter(Boolean))],
            statistics: {
                withImages: combos.filter(c => c.image).length,
                withoutImages: combos.filter(c => !c.image).length
            }
        };
        
        fs.writeFileSync(
            './raw-content/combos-from-site.json',
            JSON.stringify(result, null, 2),
            'utf8'
        );
        
        console.log('\n💾 Сохранено в: ./raw-content/combos-from-site.json\n');
        console.log(`📸 С фото: ${combos.filter(c => c.image).length} из ${combos.length}`);
        console.log('\n✨ ГОТОВО!\n');
        
        if (combos.length > 0) {
            console.log('📝 Для добавления в menu-complete.json выполните:');
            console.log('   node merge-combos.js\n');
        }
        
    } catch (error) {
        console.error('❌ ОШИБКА:', error.message);
        if (error.message.includes('net::ERR_ABORTED')) {
            console.log('\n💡 Страница не загрузилась. Проверьте:');
            console.log('   - Доступность сайта pizzanapolirsc.ru');
            console.log('   - Корректность URL категории\n');
        }
        process.exit(1);
    } finally {
        if (browser) await browser.close();
    }
})();
