/**
 * Правильный парсер Яндекс Еды - пошаговый, с правильными селекторами
 * Работает напрямую с DOM после полной загрузки
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const CONFIG = {
    url: 'https://eda.yandex.ru/r/pizza_napoli_bmroq',
    output: path.join(__dirname, 'yandex-final-products.json'),
    delayBetweenItems: 3000,
    delayAfterClick: 5000,  // Увеличили до 5 секунд
    delayBeforeStart: 8000  // Ждем полную загрузку страницы
};

async function parseYandexEdaCorrectly() {
    console.log('🍕 Парсим Яндекс Еду правильно...\n');
    
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        
        console.log('1. Открываем страницу ресторана...');
        await page.goto(CONFIG.url, {
            waitUntil: 'domcontentloaded',  // Don't wait for all resources
            timeout: 180000  // 3 minutes
        });
        
        console.log(`   ⏳ Ждем ${CONFIG.delayBeforeStart/1000} секунд для полной загрузки...`);
        await new Promise(resolve => setTimeout(resolve, CONFIG.delayBeforeStart));
        
        console.log('2. Находим все карточки товаров...');
        const productCards = await page.evaluate(() => {
            // Используем правильный селектор!
            const cards = document.querySelectorAll('[data-testid*="product"]');
            console.log(`   Найдено карточек: ${cards.length}`);
            
            return Array.from(cards).map((card, index) => {
                const text = card.textContent?.trim().replace(/\s+/g, ' ');
                // Извлекаем название (первые 2-3 строки)
                const lines = text.split('\n').filter(l => l.trim());
                const title = lines.slice(0, 3).join(' ').substring(0, 100);
                
                // Ищем вес (число + г)
                const weightMatch = text.match(/(\d+)\s*г/);
                const weight = weightMatch ? parseInt(weightMatch[1]) : null;
                
                // Ищем цену (число + ₽)
                const priceMatch = text.match(/(\d+)\s*₽/);
                const price = priceMatch ? parseInt(priceMatch[1]) : null;
                
                return { index, title, weight, price };
            }).filter(c => c.title && c.title.length > 3);
        });
        
        console.log(`   ✅ Найдено ${productCards.length} товаров\n`);
        
        const results = [];
        
        console.log('3. Обрабатываем каждый товар по очереди...\n');
        
        for (let i = 0; i < productCards.length; i++) {
            const card = productCards[i];
            console.log(`${i+1}/${productCards.length}. ${card.title}`);
            
            try {
                // Кликаем по карточке
                await page.evaluate((index) => {
                    const cards = document.querySelectorAll('[data-testid*="product"]');
                    if (cards[index]) {
                        cards[index].scrollIntoView({ behavior: 'smooth' });
                        setTimeout(() => cards[index].click(), 500);
                    }
                }, card.index);
                
                // Ждем открытия модалки и загрузки контента
                await new Promise(resolve => setTimeout(resolve, CONFIG.delayAfterClick));
                
                // Пытаемся найти модалку и взять из нее данные
                const modalData = await page.evaluate(() => {
                    // Ищем по разным признакам
                    const modal = document.querySelector('[role="dialog"]') || 
                                  document.querySelector('.modal') ||
                                  document.querySelector('[class*="Modal"]') ||
                                  document.querySelector('body > div:last-child');
                    
                    if (!modal) return null;
                    
                    const text = modal.textContent?.trim();
                    
                    // Ищем структурированные данные
                    const data = {
                        fullText: text,
                        description: null,
                        ingredients: null,
                        nutrition: null
                    };
                    
                    // Пробуем найти секции
                    const sections = {
                        'Состав': /Состав[:\s]+([^]*?)(?:Пищевая|КБЖУ|$)/i,
                        'Описание': /Описание[:\s]+([^]*?)(?:Состав|$)/i,
                        'Пищевая ценность': /(?:Пищевая ценность|КБЖУ)[:\s]+([^]*?)$/i
                    };
                    
                    for (const [key, regex] of Object.entries(sections)) {
                        const match = text.match(regex);
                        if (match && match[1]) {
                            data[key.toLowerCase()] = match[1].trim().substring(0, 500);
                        }
                    }
                    
                    return data;
                });
                
                // Закрываем модалку (клик по оверлею или кнопке закрытия)
                await page.evaluate(() => {
                    const closeBtn = document.querySelector('[class*="close"], [aria-label="Закрыть"]');
                    if (closeBtn) {
                        closeBtn.click();
                    } else {
                        // Клик по центру экрана должен закрыть модалку
                        document.body.click();
                    }
                });
                
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                results.push({
                    id: i + 1,
                    title: card.title,
                    priceFromCard: card.price,
                    weightFromCard: card.weight,
                    modalData: modalData
                });
                
                console.log(`   ✅ Данные сохранены`);
                
            } catch (error) {
                console.log(`   ❌ Ошибка: ${error.message}`);
                results.push({
                    id: i + 1,
                    title: card.title,
                    error: error.message
                });
            }
        }
        
        console.log(`\n📊 ИТОГИ:`);
        console.log(`   Обработано: ${results.length}`);
        console.log(`   С данными из модалки: ${results.filter(r => r.modalData).length}`);
        
        const outputFile = CONFIG.output;
        fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
        console.log(`\n💾 Сохранено в ${outputFile}`);
        
    } catch (error) {
        console.error('❌ Критическая ошибка:', error.message);
    } finally {
        if (browser) await browser.close();
    }
}

parseYandexEdaCorrectly();
