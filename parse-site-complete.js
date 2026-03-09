const puppeteer = require('puppeteer');
const fs = require('fs');

console.log('🚀 Запускаю парсинг pizzanapolirsc.ru...\n');

(async () => {
    let browser;
    try {
        // Запускаем браузер
        console.log('🌐 Открываю сайт...');
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        
        // Открываем главную страницу
        console.log('📥 Загружаю https://pizzanapolirsc.ru/...');
        await page.goto('https://pizzanapolirsc.ru/', { 
            waitUntil: 'networkidle0',
            timeout: 60000 
        });
        
        // Ждём загрузки Tilda Store
        console.log('⏳ Жду загрузки товаров...');
        await page.waitForSelector('.js-store-prod-name', { timeout: 30000 });
        
        // Прокручиваем страницу для подгрузки всех товаров
        console.log('📜 Прокручиваю страницу...');
        await page.evaluate(async () => {
            await new Promise(resolve => {
                let total = 0;
                const interval = setInterval(() => {
                    window.scrollBy(0, 500);
                    total += 500;
                    if (total >= document.body.scrollHeight || total > 5000) {
                        clearInterval(interval);
                        resolve();
                    }
                }, 100);
            });
        });
        
        await new Promise(r => setTimeout(r, 2000));
        
        // Собираем все товары
        console.log('🔍 Собираю товары...\n');
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
                        
                        // Пропускаем заголовки и не товары
                        if (title && 
                            title.length > 2 && 
                            title.length < 200 &&
                            price > 0 &&
                            !/^пицц$|кальцоне|наш|отзыв|франш|статьи|акции|контакт|партнерств|бесплатно|мастер|комбо|набор/i.test(title)) {
                            
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
        
        console.log(`✅ Найдено товаров: ${products.length}\n`);
        
        // Категоризация
        console.log('📋 Распределяю по категориям...\n');
        function categorizeItem(title) {
            const t = title.toLowerCase();
            
            if (t.includes('кальцоне')) return 'calzone';
            if (t.includes('ролл') || t.includes('суши') || t.includes('маки') || t.includes('нигири') || t.includes('гункан') || t.includes('сашими')) return 'rolls';
            if (t.includes('салат')) return 'salads';
            if (t.includes('паста')) return 'pasta';
            if (t.includes('соус') && !t.includes('пицца')) return 'sauce';
            if (t.includes('фокачч')) return 'focaccia';
            if (t.includes('хлеб')) return 'bread';
            if (t.includes('масло') && !t.includes('пицца')) return 'oils';
            if (t.includes('заморожен')) return 'frozen';
            if (t.includes('напитк') || t.includes('кола') || t.includes('вода') || t.includes('сок') || t.includes('чай') || t.includes('кофе')) return 'beverages';
            if (t.includes('кондитер') || t.includes('десерт') || t.includes('печень') || t.includes('бискотти') || t.includes('трюфель')) return 'confectionery';
            if (t.includes('комбо') || t.includes('сет') || t.includes('набор')) return 'combos';
            if (t.includes('пицца') || t.includes('pizza') || t.includes('тесто') || t.includes('piccolo')) return 'pizza';
            
            return 'other';
        }
        
        const byCategory = {};
        products.forEach(p => {
            const cat = categorizeItem(p.title);
            if (!byCategory[cat]) byCategory[cat] = [];
            p.category = cat;
            byCategory[cat].push(p);
        });
        
        // Статистика
        console.log('📊 СТАТИСТИКА ПО КАТЕГОРИЯМ:\n');
        Object.keys(byCategory).sort().forEach(cat => {
            console.log(`${cat}: ${byCategory[cat].length}`);
        });
        
        // Создаём структуру меню
        const menuStructure = {
            'pizza-30cm': [],
            'piccolo-20cm': [],
            'calzone': [],
            'bread-focaccia': [],
            'sauce': [],
            'rolls': [],
            'combos': [],
            'confectionery': [],
            'beverages': [],
            'frozen': [],
            'oils': [],
            'masterclass': [],
            'franchise': []
        };
        
        // Распределяем товары
        let id = 1;
        byCategory.pizza?.forEach(p => {
            const isPiccolo = p.title.toLowerCase().includes('piccolo');
            const targetCat = isPiccolo ? 'piccolo-20cm' : 'pizza-30cm';
            menuStructure[targetCat].push({
                id: id++,
                title: p.title,
                price: p.price,
                image: p.image,
                category: targetCat
            });
        });
        
        byCategory.calzone?.forEach(p => {
            menuStructure.calzone.push({ id: id++, ...p, category: 'calzone' });
        });
        
        [...(byCategory.bread||[]), ...(byCategory.focaccia||[])].forEach(p => {
            menuStructure['bread-focaccia'].push({ id: id++, ...p, category: 'bread-focaccia' });
        });
        
        byCategory.sauce?.forEach(p => {
            menuStructure.sauce.push({ id: id++, ...p, category: 'sauce' });
        });
        
        byCategory.rolls?.forEach(p => {
            menuStructure.rolls.push({ id: id++, ...p, category: 'rolls' });
        });
        
        byCategory.combos?.forEach(p => {
            menuStructure.combos.push({ id: id++, ...p, category: 'combos' });
        });
        
        byCategory.confectionery?.forEach(p => {
            menuStructure.confectionery.push({ id: id++, ...p, category: 'confectionery' });
        });
        
        byCategory.beverages?.forEach(p => {
            menuStructure.beverages.push({ id: id++, ...p, category: 'beverages' });
        });
        
        byCategory.frozen?.forEach(p => {
            menuStructure.frozen.push({ id: id++, ...p, category: 'frozen' });
        });
        
        byCategory.oils?.forEach(p => {
            menuStructure.oils.push({ id: id++, ...p, category: 'oils' });
        });
        
        // Финальная статистика
        console.log('\n✅ ИТОГОВАЯ СТРУКТУРА:\n');
        Object.entries(menuStructure).forEach(([cat, items]) => {
            console.log(`${cat}: ${items.length} товаров`);
        });
        
        const totalProducts = Object.values(menuStructure).reduce((a,b) => a+b, 0);
        const withImages = Object.values(menuStructure).flat().filter(p => p.image).length;
        
        // Сохраняем результат
        const result = {
            metadata: {
                project: "Pizza Napoli RSC",
                source: "https://pizzanapolirsc.ru/",
                collectedAt: new Date().toISOString(),
                totalProducts: totalProducts,
                description: "Полное меню с официального сайта (автоматический парсинг)"
            },
            statistics: {},
            categories: [
                { id: "pizza-30cm", name: "Пицца 30 см", count: menuStructure['pizza-30cm'].length, description: "Классическая неаполитанская пицца диаметром 30 см" },
                { id: "piccolo-20cm", name: "Pizza Piccolo 20 см", count: menuStructure['piccolo-20cm'].length, description: "Мини пицца диаметром 20 см" },
                { id: "calzone", name: "Кальцоне", count: menuStructure.calzone.length, description: "Закрытая пицца с различными начинками" },
                { id: "bread-focaccia", name: "Хлеб и Фокачча", count: menuStructure['bread-focaccia'].length, description: "Неаполитанский хлеб и итальянская фокачча" },
                { id: "sauce", name: "Соус к корочкам", count: menuStructure.sauce.length, description: "Соусы для подачи с бортиками пиццы" },
                { id: "rolls", name: "Suchi & Rolls", count: menuStructure.rolls.length, description: "Японские роллы, суши, гунканы" },
                { id: "combos", name: "Комбо наборы", count: menuStructure.combos.length, description: "Наборы пицц и роллов" },
                { id: "confectionery", name: "Кондитерские изделия", count: menuStructure.confectionery.length, description: "Итальянские десерты и печенья" },
                { id: "beverages", name: "Напитки", count: menuStructure.beverages.length, description: "Безалкогольные напитки" },
                { id: "frozen", name: "Замороженная продукция", count: menuStructure.frozen.length, description: "Замороженные полуфабрикаты" },
                { id: "oils", name: "Ароматное масло", count: menuStructure.oils.length, description: "Ароматизированные масла" },
                { id: "masterclass", name: "Мастер класс", count: 0, description: "Обучение приготовлению пиццы" },
                { id: "franchise", name: "Франшиза", count: 0, description: "Информация о франшизе" }
            ],
            menu: menuStructure
        };
        
        // Заполняем статистику
        Object.entries(menuStructure).forEach(([k,v]) => {
            result.statistics[k] = v.length;
        });
        
        fs.writeFileSync('./raw-content/menu-from-site.json', JSON.stringify(result, null, 2));
        
        console.log('\n💾 Сохранено в: ./raw-content/menu-from-site.json\n');
        console.log(`✅ ВСЕГО ТОВАРОВ: ${totalProducts}`);
        console.log(`📸 С ФОТОГРАФИЯМИ: ${withImages} (${Math.round(withImages/totalProducts*100)}%)\n`);
        console.log('✨ ГОТОВО!\n');
        
    } catch (error) {
        console.error('❌ ОШИБКА:', error.message);
        process.exit(1);
    } finally {
        if (browser) await browser.close();
    }
})();
