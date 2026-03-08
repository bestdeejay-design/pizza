/**
 * Yandex Eda Parser
 * Парсит веса и описания товаров с Яндекс Еды
 * https://eda.yandex.ru/r/pizza_napoli_bmroq
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const CONFIG = {
    url: 'https://eda.yandex.ru/r/pizza_napoli_bmroq?placeSlug=pizza_napoli_g45hc',
    output: path.join(__dirname, 'yandex-data.json'),
    timeout: 60000,
    delay: 3000 // Задержка перед парсингом чтобы всё загрузилось
};

async function parseYandexEda() {
    console.log('🚀 Yandex Eda Parser запущен...\n');
    
    let browser;
    try {
        // Запуск браузера
        console.log('📦 Запуск Puppeteer...');
        browser = await puppeteer.launch({
            headless: false, // Показываем браузер для отладки
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        // Устанавливаем User-Agent
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // Переход на страницу
        console.log(`📍 Переход на ${CONFIG.url}...`);
        await page.goto(CONFIG.url, { 
            waitUntil: 'networkidle2',
            timeout: CONFIG.timeout 
        });
        
        console.log(`⏳ Ожидание загрузки (${CONFIG.delay}мс)...`);
        await page.waitForTimeout(CONFIG.delay);
        
        // Парсинг товаров
        console.log('🔍 Парсинг товаров...\n');
        
        const products = await page.evaluate(() => {
            // Пробуем разные селекторы
            const selectors = [
                '[data-testid="product-card"]',
                '.product-card',
                '.catalog-productCard',
                '[data-aut="product-card"]'
            ];
            
            let cards = [];
            for (const selector of selectors) {
                cards = document.querySelectorAll(selector);
                if (cards.length > 0) break;
            }
            
            console.log(`Найдено карточек: ${cards.length}`);
            
            return Array.from(cards).map(card => {
                // Название
                const titleSelectors = [
                    'h3',
                    '.product-name',
                    '.catalog-productCard__title',
                    '[data-aut="product-card-title"]',
                    '.product-card__name'
                ];
                
                let title = '';
                for (const selector of titleSelectors) {
                    const el = card.querySelector(selector);
                    if (el?.textContent) {
                        title = el.textContent.trim();
                        break;
                    }
                }
                
                // Вес
                const weightSelectors = [
                    '.product-weight',
                    '.weight',
                    '[class*="weight"]',
                    '[class*="gram"]',
                    '.product-card__weight',
                    '.product-info__weight'
                ];
                
                let weight = null;
                for (const selector of weightSelectors) {
                    const el = card.querySelector(selector);
                    if (el?.textContent) {
                        const text = el.textContent.trim();
                        // Извлекаем число из текста типа "500 г" или "вес: 500г"
                        const match = text.match(/(\d+)\s*(г|гр|g)/i);
                        if (match) {
                            weight = parseInt(match[1]);
                            break;
                        }
                    }
                }
                
                // Описание
                const descSelectors = [
                    '.product-description',
                    '.description',
                    '[class*="description"]',
                    '.product-card__description',
                    '.product-info__desc'
                ];
                
                let description = null;
                for (const selector of descSelectors) {
                    const el = card.querySelector(selector);
                    if (el?.textContent) {
                        description = el.textContent.trim();
                        break;
                    }
                }
                
                // Цена
                const priceSelectors = [
                    '.price',
                    '[class*="price"]',
                    '.product-card__price',
                    '.product-info__price'
                ];
                
                let price = null;
                for (const selector of priceSelectors) {
                    const el = card.querySelector(selector);
                    if (el?.textContent) {
                        const text = el.textContent.trim();
                        const match = text.match(/(\d+)/);
                        if (match) {
                            price = parseInt(match[1]);
                            break;
                        }
                    }
                }
                
                return { title, weight, description, price };
            }).filter(p => p.title);
        });
        
        console.log(`✅ Найдено товаров: ${products.length}\n`);
        
        // Статистика
        const withWeight = products.filter(p => p.weight).length;
        const withDesc = products.filter(p => p.description).length;
        const withPrice = products.filter(p => p.price).length;
        
        console.log('📊 Статистика:');
        console.log(`   С весом: ${withWeight}/${products.length}`);
        console.log(`   С описанием: ${withDesc}/${products.length}`);
        console.log(`   С ценой: ${withPrice}/${products.length}\n`);
        
        // Примеры
        console.log('📋 Примеры данных:');
        products.slice(0, 5).forEach((p, i) => {
            console.log(`${i+1}. ${p.title}`);
            console.log(`   Вес: ${p.weight || 'нет'} г`);
            console.log(`   Цена: ${p.price || 'нет'} ₽`);
            console.log(`   Описание: ${p.description ? p.description.substring(0, 60) + '...' : 'нет'}\n`);
        });
        
        // Сохранение
        console.log(`💾 Сохранение в ${CONFIG.output}...`);
        fs.writeFileSync(CONFIG.output, JSON.stringify(products, null, 2));
        console.log('✅ Готово!\n');
        
        return products;
        
    } catch (error) {
        console.error('❌ Ошибка:', error.message);
        throw error;
    } finally {
        if (browser) {
            console.log('👋 Закрытие браузера...');
            await browser.close();
        }
    }
}

// Запуск
parseYandexEda()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
