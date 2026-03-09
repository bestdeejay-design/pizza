const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    console.log('🕷️ Парсим конкретный блок меню...\n');
    
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
        
        // Открываем главную + ждём загрузки конкретного блока
        console.log('📥 Открываю страницу с блоком #rec1271358691...');
        await page.goto('https://pizzanapolirsc.ru/#rec1271358691', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        // Прокручиваем до блока
        console.log('📜 Ищу блок rec1271358691...');
        await page.evaluate(() => {
            const block = document.getElementById('rec1271358691');
            if (block) {
                block.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
        
        // Ждём загрузки контента
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Собираем данные из этого блока
        console.log('🍕 Собираю товары из блока...\n');
        
        const menuData = await page.evaluate(() => {
            const products = [];
            const images = [];
            
            // Ищем карточки внутри блока rec1271358691
            const block = document.getElementById('rec1271358691');
            if (!block) return { products: [], images: [] };
            
            // Находим все карточки товаров в блоке
            const cards = block.querySelectorAll('[class*="t-card"], [class*="t772__col"]');
            
            cards.forEach(card => {
                const titleEl = card.querySelector('[class*="title"]');
                const descEl = card.querySelector('[class*="descr"]');
                const priceEl = card.querySelector('.t-btn, [class*="price"], [class*="sum"]');
                const imgEl = card.querySelector('img[data-original]');
                
                const title = titleEl?.textContent?.trim();
                const description = descEl?.textContent?.trim();
                const priceText = priceEl?.textContent?.trim();
                const price = priceText ? parseInt(priceText.replace(/[^\d]/g, '')) : null;
                const image = imgEl?.getAttribute('data-original');
                
                // Пропускаем заголовки разделов
                if (title && !title.match(/пицц|кальцоне|наш|отзыв|франш|статьи/i)) {
                    if (title.length > 2 && title.length < 100) {
                        products.push({
                            title: title,
                            description: description || '',
                            price: price || 0,
                            image: image || null,
                            category: categorizeItem(title)
                        });
                        
                        if (image) images.push(image);
                    }
                }
            });
            
            return {
                products: [...new Map(products.map(p => [p.title, p])).values()],
                images: [...new Set(images)]
            };
        });
        
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
        
        // Вывод статистики
        console.log('📊 РЕЗУЛЬТАТЫ:');
        console.table({
            'Позиций меню': menuData.products.length,
            'Изображений': menuData.images.length
        });
        
        console.log('\n📋 КАТЕГОРИИ:');
        const byCategory = {};
        menuData.products.forEach(p => {
            byCategory[p.category] = (byCategory[p.category] || 0) + 1;
        });
        console.table(byCategory);
        
        console.log('\n🍕 ВСЁ МЕНЮ:');
        menuData.products.forEach((p, i) => {
            console.log(`${i+1}. ${p.title} — ${p.price}₽ (${p.category})`);
        });
        
        // Сохраняем
        const result = {
            collectedAt: new Date().toISOString(),
            source: 'https://pizzanapolirsc.ru/#rec1271358691',
            blockId: 'rec1271358691',
            totalProducts: menuData.products.length,
            products: menuData.products,
            images: menuData.images
        };
        
        fs.writeFileSync(
            './raw-content/menu-from-block.json',
            JSON.stringify(result, null, 2),
            'utf8'
        );
        
        console.log('\n💾 Сохранено в: ./raw-content/menu-from-block.json\n');
        
    } catch (error) {
        console.error('❌ Ошибка:', error.message);
    } finally {
        if (browser) await browser.close();
    }
})();
