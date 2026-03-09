const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    console.log('🕷️ Запускаю грабер сайта pizzanapolirsc.ru...\n');
    
    let browser;
    try {
        // Запускаем браузер
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        // Устанавливаем User-Agent
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
        
        console.log('📥 Открываю сайт...');
        await page.goto('https://pizzanapolirsc.ru/', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        // Прокручиваем страницу для загрузки всего контента
        console.log('📜 Прокручиваю страницу для загрузки меню...');
        await page.evaluate(async () => {
            await new Promise(resolve => {
                let totalHeight = 0;
                const distance = 100;
                const timer = setInterval(() => {
                    window.scrollBy(0, distance);
                    totalHeight += distance;
                    if (totalHeight > document.body.scrollHeight || totalHeight > 5000) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 100);
                setTimeout(resolve, 5000);
            });
        });
        
        // Ждём загрузки каталога
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Собираем данные
        console.log('🍕 Собираю меню...\n');
        
        const menuData = await page.evaluate(() => {
            const products = [];
            const images = [];
            
            // Ищем карточки товаров Tilda
            const cards = document.querySelectorAll('[class*="t-card"], [class*="t772"]');
            
            cards.forEach(card => {
                const titleEl = card.querySelector('[class*="title"], .t-card__title');
                const descEl = card.querySelector('[class*="descr"], .t-card__descr');
                const priceEl = card.querySelector('[class*="price"], .t-btn, [class*="sum"]');
                const imgEl = card.querySelector('img[data-original], img[src]');
                
                const title = titleEl?.textContent?.trim();
                const description = descEl?.textContent?.trim();
                const priceText = priceEl?.textContent?.trim();
                const price = priceText ? parseInt(priceText.replace(/[^\d]/g, '')) : null;
                const image = imgEl?.getAttribute('data-original') || imgEl?.getAttribute('src');
                
                if (title && (price || description)) {
                    // Пропускаем заголовки разделов
                    if (!title.toLowerCase().includes('пицц') && 
                        !title.toLowerCase().includes('кальцоне') &&
                        !title.toLowerCase().includes('наш') &&
                        !title.toLowerCase().includes('отзыв') &&
                        !title.toLowerCase().includes('франш')) {
                        
                        products.push({
                            title,
                            description: description || '',
                            price: price || 0,
                            image: image || null
                        });
                        
                        if (image) images.push(image);
                    }
                }
            });
            
            // Собираем все изображения на странице
            document.querySelectorAll('img').forEach(img => {
                const src = img.getAttribute('data-original') || img.getAttribute('src');
                if (src && src.includes('tildacdn.com')) {
                    images.push(src);
                }
            });
            
            return {
                products: [...new Map(products.map(p => [p.title, p])).values()], // Убираем дубликаты
                images: [...new Set(images)]
            };
        });
        
        // Сохраняем результаты
        const result = {
            collectedAt: new Date().toISOString(),
            source: 'https://pizzanapolirsc.ru/',
            totalProducts: menuData.products.length,
            products: menuData.products,
            images: menuData.images,
            statistics: {
                uniqueProducts: menuData.products.length,
                totalImages: menuData.images.length,
                categories: [...new Set(menuData.products.map(p => {
                    const t = p.title.toLowerCase();
                    if (t.includes('кальцоне')) return 'calzone';
                    if (t.includes('салат')) return 'salad';
                    if (t.includes('соус')) return 'sauce';
                    if (t.includes('фокачч')) return 'focaccia';
                    if (t.includes('хлеб')) return 'bread';
                    if (t.includes('ролл') || t.includes('суши')) return 'rolls';
                    return 'pizza';
                }))]
            }
        };
        
        // Вывод статистики
        console.log('📊 СТАТИСТИКА:');
        console.table({
            'Позиций меню': result.totalProducts,
            'Изображений': result.images.length,
            'Категорий': result.statistics.categories.length
        });
        
        console.log('\n📋 КАТЕГОРИИ:');
        const byCategory = {};
        result.products.forEach(p => {
            const cat = result.statistics.categories.find(c => {
                const t = p.title.toLowerCase();
                if (c === 'calzone') return t.includes('кальцоне');
                if (c === 'salad') return t.includes('салат');
                if (c === 'sauce') return t.includes('соус');
                if (c === 'focaccia') return t.includes('фокачч');
                if (c === 'bread') return t.includes('хлеб');
                if (c === 'rolls') return t.includes('ролл') || t.includes('суши');
                return !t.includes('кальцоне') && !t.includes('салат') && !t.includes('соус');
            }) || 'pizza';
            byCategory[cat] = (byCategory[cat] || 0) + 1;
        });
        console.table(byCategory);
        
        console.log('\n🍕 ПЕРВЫЕ 15 ПОЗИЦИЙ:');
        result.products.slice(0, 15).forEach((p, i) => {
            console.log(`${i+1}. ${p.title} — ${p.price}₽`);
        });
        if (result.products.length > 15) {
            console.log(`\n... и ещё ${result.products.length - 15} позиций`);
        }
        
        // Сохраняем в файлы
        fs.writeFileSync('./raw-content/full-menu-puppeteer.json', JSON.stringify(result, null, 2), 'utf8');
        fs.writeFileSync('./raw-content/images-list.txt', result.images.join('\n'), 'utf8');
        
        console.log('\n💾 Сохранено в:');
        console.log('   ./raw-content/full-menu-puppeteer.json');
        console.log('   ./raw-content/images-list.txt\n');
        
    } catch (error) {
        console.error('❌ Ошибка:', error.message);
        console.log('\n💡 Попробуйте запустить ещё раз или используйте ручной сбор\n');
    } finally {
        if (browser) {
            await browser.close();
        }
    }
})();
