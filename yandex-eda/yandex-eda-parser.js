/**
 * Yandex Eda Parser
 * Парсит веса и описания товаров с Яндекс Еды
 * https://eda.yandex.ru/r/pizza_napoli_bmroq
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const CONFIG = {
    url: 'https://eda.yandex.ru/r/pizza_napoli_bmroq',
    output: path.join(__dirname, 'yandex-data.json'),
    timeout: 180000, // 3 минуты
    delay: 15000, // 15 секунд - долгое ожидание перед парсингом
    scrollDelay: 1500 // 1.5 секунды между шагами скролла - медленно и плавно
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
        
        // Устанавливаем User-Agent и viewport
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1920, height: 1080 });
        
        // Переход на страницу
        console.log(`📍 Переход на ${CONFIG.url}...`);
        await page.goto(CONFIG.url, { 
            waitUntil: 'domcontentloaded',
            timeout: CONFIG.timeout 
        });
        
        console.log(`⏳ Ожидание загрузки (${CONFIG.delay}мс)...`);
        await new Promise(resolve => setTimeout(resolve, CONFIG.delay));
        
        // Прокручиваем страницу вниз чтобы загрузить все товары
        console.log('📜 Прокрутка страницы для загрузки всех товаров...');
        await page.evaluate(async (scrollDelay) => {
            const scrollStep = window.innerHeight;
            let scrollHeight = document.documentElement.scrollHeight;
            
            for (let y = 0; y < scrollHeight; y += scrollStep) {
                window.scrollTo(0, y);
                await new Promise(resolve => setTimeout(resolve, scrollDelay));
            }
            
            // Возвращаемся наверх
            window.scrollTo(0, 0);
        }, CONFIG.scrollDelay);
        
        console.log('✅ Страница полностью загружена');
        
        // Дополнительная задержка после скролла - даем время на подгрузку контента
        console.log(`⏳ Финальная задержка 5 секунд...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Парсинг товаров
        console.log('🔍 Парсинг товаров...\n');
        
        const products = await page.evaluate(() => {
            // Используем несколько подходов для поиска карточек
            let cards = document.querySelectorAll('[id*="product-card-v2-root"]');
            
            // Если не найдено, пробуем по классу с частичным совпадением
            if (cards.length === 0) {
                cards = document.querySelectorAll('[class*="ProductCard"]');
            }
            
            console.log(`Найдено карточек по ID: ${document.querySelectorAll('[id*="product-card-v2-root"]').length}`);
            console.log(`Найдено карточек по классу ProductCard: ${document.querySelectorAll('[class*="ProductCard"]').length}`);
            console.log(`Всего карточек: ${cards.length}`);
            
            return Array.from(cards).map(card => {
                // Название - ищем текст с названием товара
                let title = '';
                let weight = null;
                let price = null;
                let description = null;
                
                // Получаем весь текст карточки, заменяя специальные пробелы на обычные
                let textContent = card.textContent || '';
                textContent = textContent
                    .replace(/\u202f/g, ' ')  // Тонкий пробел
                    .replace(/\u00a0/g, ' ')  // Неразрывный пробел
                    .replace(/\s+/g, ' ')     // Множественные пробелы в один
                    .trim();
                
                const lines = textContent.split('\n').filter(l => l.trim());
                
                // Ищем цену - обычно число с ₽
                for (const line of lines) {
                    const cleanLine = line.trim();
                    
                    // Цена (основная, не старая)
                    if (!price && /\d+\s*₽/.test(cleanLine) && !cleanLine.includes('старая')) {
                        const match = cleanLine.match(/(\d+)\s*₽/);
                        if (match) {
                            price = parseInt(match[1]);
                        }
                    }
                    
                    // Вес (число + г)
                    if (!weight && /\d+\s*г/.test(cleanLine)) {
                        const match = cleanLine.match(/(\d+)\s*г/);
                        if (match) {
                            weight = parseInt(match[1]);
                        }
                    }
                    
                    // Название - если строка содержит вес и не является ценой
                    if (!title && cleanLine.length > 5 && !/^\d+\s*₽/.test(cleanLine)) {
                        if (cleanLine.includes(' г')) {
                            // Извлекаем название до веса
                            const nameMatch = cleanLine.match(/^(.+?)\s*\d+\s*г/);
                            if (nameMatch) {
                                title = nameMatch[1].trim();
                            }
                        } else if (cleanLine.includes('₽') === false) {
                            // Просто текст без цены
                            title = cleanLine;
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

// Запуск с повторной попыткой
async function runWithRetry(maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            console.log(`\n🔄 Попытка ${i+1} из ${maxRetries}`);
            const products = await parseYandexEda();
            return products;
        } catch (error) {
            console.error(`⚠️ Попытка ${i+1} не удалась: ${error.message}`);
            if (i === maxRetries - 1) {
                console.error('\n❌ Все попытки исчерпаны');
                throw error;
            }
            // Ждем перед следующей попыткой
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
}

runWithRetry()
    .then(() => {
        console.log('\n✅ Парсинг успешно завершен!');
        process.exit(0);
    })
    .catch(err => {
        console.error('\n💥 Критическая ошибка:', err.message);
        process.exit(1);
    });
