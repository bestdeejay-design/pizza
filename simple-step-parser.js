/**
 * Простой пошаговый парсер Яндекс Еды
 * БЕРЕМ КАЖДЫЙ товар по очереди, открываем модалку, сохраняем данные
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const CONFIG = {
    url: 'https://eda.yandex.ru/r/pizza_napoli_bmroq',
    output: path.join(__dirname, 'yandex-step-by-step.json'),
    delay: 3000 // 3 секунды между действиями
};

async function parseStepByStep() {
    console.log('🍕 Пошаговый парсинг Яндекс Еды...\n');
    
    let browser;
    try {
        // Запуск браузера
        browser = await puppeteer.launch({
            headless: false, // Видим браузер
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        await page.setViewport({ width: 1920, height: 1080 });
        
        // Открываем страницу
        console.log(`1️⃣ Открываем страницу...`);
        await page.goto(CONFIG.url, { waitUntil: 'domcontentloaded' });
        console.log(`   ✅ Страница загружена\n`);
        
        // Ждем загрузки контента
        console.log(`2️⃣ Ждем загрузки товаров (${CONFIG.delay}мс)...`);
        await new Promise(resolve => setTimeout(resolve, CONFIG.delay));
        
        // Находим ВСЕ карточки товаров
        console.log(`3️⃣ Ищем товары на странице...`);
        const products = await page.evaluate(() => {
            // Пробуем разные селекторы по порядку
            let cards = document.querySelectorAll('[id*="product-card-v2-root"]');
            
            if (cards.length === 0) {
                cards = document.querySelectorAll('[class*="ProductCard"]');
            }
            
            if (cards.length === 0) {
                cards = document.querySelectorAll('[data-testid="product-card"]');
            }
            
            console.log(`   Найдено карточек: ${cards.length}`);
            
            // Возвращаем список товаров
            return Array.from(cards).map((card, index) => {
                // Получаем текст карточки
                const text = card.textContent || '';
                
                // Извлекаем название (просто берем первую осмысленную строку)
                const lines = text.split('\n').filter(l => l.trim());
                let title = '';
                for (const line of lines) {
                    const clean = line.replace(/^-?\d+%/, '').trim();
                    if (clean.length > 3 && !/^\d+\s*₽/.test(clean)) {
                        title = clean;
                        break;
                    }
                }
                
                return {
                    index: index,
                    title: title.substring(0, 100)
                };
            }).filter(p => p.title);
        });
        
        console.log(`   ✅ Найдено товаров: ${products.length}\n`);
        
        // Массив для результатов
        const results = [];
        
        // Проходим по КАЖДОМУ товару
        for (let i = 0; i < products.length; i++) {
            const product = products[i];
            
            console.log(`\n${i+1}/${products.length}. ${product.title}`);
            
            try {
                // ШАГ 1: Кликаем на товар чтобы открыть модалку
                console.log(`   📍 Кликаем на товар...`);
                await page.evaluate((index) => {
                    const cards = document.querySelectorAll('[class*="ProductCard"]');
                    const card = cards[index];
                    if (card) {
                        card.click();
                    }
                }, product.index);
                
                // Ждем открытия модалки
                await new Promise(resolve => setTimeout(resolve, CONFIG.delay));
                console.log(`   ✅ Модалка должна открыться`);
                
                // ШАГ 2: Берем ВЕСЬ текст из модалки
                console.log(`   📝 Берем весь текст из модалки...`);
                const modalText = await page.evaluate(() => {
                    // Ищем модалку
                    const modal = document.querySelector('[role="dialog"], [class*="modal"], .modal');
                    if (!modal) {
                        // Если не нашли, берем весь текст со страницы
                        return document.body.textContent;
                    }
                    return modal.textContent || '';
                });
                
                // ШАГ 3: Сохраняем сырые данные
                const rawData = {
                    id: i + 1,
                    title: product.title,
                    fullModalText: modalText,
                    timestamp: new Date().toISOString()
                };
                
                results.push(rawData);
                
                // Сохраняем после КАЖДОГО товара (на случай сбоя)
                fs.writeFileSync(CONFIG.output, JSON.stringify(results, null, 2), 'utf8');
                console.log(`   💾 Сохранено в yandex-step-by-step.json`);
                
                // ШАГ 4: Закрываем модалку
                console.log(`   ❌ Закрываем модалку...`);
                await page.evaluate(() => {
                    // Пробуем закрыть кнопкой
                    const closeBtn = document.querySelector('[class*="close"], button[aria-label*="Закрыть"]');
                    if (closeBtn) {
                        closeBtn.click();
                    } else {
                        // Или Escape
                        document.dispatchEvent(new KeyboardEvent('keydown', {'key': 'Escape'}));
                    }
                });
                
                // Ждем закрытия
                await new Promise(resolve => setTimeout(resolve, CONFIG.delay));
                console.log(`   ✅ Модалка закрыта, пауза перед следующим...\n`);
                
            } catch (error) {
                console.log(`   ❌ Ошибка: ${error.message}`);
                results.push({
                    id: i + 1,
                    title: product.title,
                    error: error.message
                });
            }
        }
        
        console.log(`\n✅ ВСЁ! Обработано ${results.length} товаров`);
        console.log(`📁 Файл: ${CONFIG.output}`);
        
        return results;
        
    } catch (error) {
        console.error('❌ Общая ошибка:', error.message);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Запуск
parseStepByStep()
    .then(() => {
        console.log('\n✨ Парсинг завершен! Можно проверить файл и продолжить.\n');
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
