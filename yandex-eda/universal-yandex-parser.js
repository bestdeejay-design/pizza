/**
 * Универсальный парсер Яндекс Еды
 * Работает с ЛЮБЫМ рестораном
 * Собирает все данные по каждому товару
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// КОНФИГУРАЦИЯ - меняем URL на свой ресторан
const CONFIG = {
    url: 'https://eda.yandex.ru/r/pizza_napoli_bmroq', // <-- ВСТАВЬТЕ СВОЙ URL
    outputFolder: path.join(__dirname, 'results'),
    delayBetweenItems: 2000, // 2 секунды между товарами
    delayAfterClick: 3000,   // 3 секунды на открытие модалки
    saveAfterEachItem: true  // Сохранять после каждого товара
};

async function parseYandexEdaUniversal() {
    console.log('🍕 Универсальный парсер Яндекс Еды\n');
    console.log(`📍 Ресторан: ${CONFIG.url}\n`);
    
    // Создаем папку для результатов
    if (!fs.existsSync(CONFIG.outputFolder)) {
        fs.mkdirSync(CONFIG.outputFolder);
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = path.join(CONFIG.outputFolder, `yandex-data-${timestamp}.json`);
    
    let browser;
    try {
        // Запуск браузера
        console.log('🚀 Запуск Puppeteer...');
        browser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        await page.setViewport({ width: 1920, height: 1080 });
        
        // Шаг 1: Открываем страницу ресторана
        console.log('\n📖 ШАГ 1: Открываем страницу ресторана...');
        await page.goto(CONFIG.url, { 
            waitUntil: 'domcontentloaded',
            timeout: 60000 
        });
        console.log('   ✅ Страница загружена\n');
        
        // Шаг 2: Ждем загрузки контента
        console.log('⏳ ШАГ 2: Ждем загрузки товаров...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Шаг 3: Находим все товары
        console.log('🔍 ШАГ 3: Ищем товары на странице...\n');
        
        const products = await page.evaluate(() => {
            // Пробуем разные селекторы
            const selectors = [
                '[id*="product-card-v2-root"]',
                '[class*="ProductCard"]',
                '[data-testid="product-card"]'
            ];
            
            let cards = [];
            for (const selector of selectors) {
                cards = document.querySelectorAll(selector);
                if (cards.length > 0) {
                    console.log(`   Найдено по селектору "${selector}": ${cards.length}`);
                    break;
                }
            }
            
            if (cards.length === 0) {
                console.log('   ⚠️ Товары не найдены! Проверьте URL ресторана.');
                return [];
            }
            
            // Извлекаем информацию о каждом товаре
            return Array.from(cards).map((card, index) => {
                const text = card.textContent || '';
                
                // Разбиваем текст на строки
                const lines = text.split('\n').filter(l => l.trim());
                
                // Ищем название (первая осмысленная строка без цены)
                let title = '';
                let price = null;
                let weight = null;
                
                for (const line of lines) {
                    const clean = line.replace(/^-?\d+%/, '').trim();
                    
                    // Цена
                    if (!price && /(\d+)\s*₽/.test(clean)) {
                        const match = clean.match(/(\d+)\s*₽/);
                        if (match) price = parseInt(match[1]);
                    }
                    
                    // Вес
                    if (!weight && /(\d+)\s*(г|гр)/i.test(clean)) {
                        const match = clean.match(/(\d+)\s*(г|гр)/i);
                        if (match) weight = parseInt(match[1]);
                    }
                    
                    // Название
                    if (!title && clean.length > 3 && !/^\d+\s*₽/.test(clean) && !/^\d+\s*г$/.test(clean)) {
                        title = clean;
                    }
                }
                
                return {
                    index: index,
                    title: title.substring(0, 150),
                    price: price,
                    weight: weight,
                    preview: text.substring(0, 100)
                };
            }).filter(p => p.title);
        });
        
        console.log(`\n✅ Найдено товаров: ${products.length}\n`);
        
        if (products.length === 0) {
            console.log('❌ Товары не найдены. Проверьте:\n');
            console.log('   1. Правильность URL ресторана');
            console.log('   2. Работает ли сайт вручную');
            console.log('   3. Не блокирует ли Яндекс парсинг\n');
            return [];
        }
        
        // Шаг 4: Проходим по КАЖДОМУ товару
        console.log('🎯 ШАГ 4: Обрабатываем каждый товар...\n');
        
        const results = [];
        
        for (let i = 0; i < products.length; i++) {
            const product = products[i];
            
            console.log(`${i+1}/${products.length}. ${product.title}`);
            console.log(`   💰 Цена: ${product.price || '?'} ₽`);
            console.log(`   ⚖️  Вес: ${product.weight || '?'} г`);
            
            try {
                // 4.1: Кликаем на товар
                console.log('   📍 Кликаем для открытия модалки...');
                
                await page.evaluate((index) => {
                    const selectors = [
                        '[id*="product-card-v2-root"]',
                        '[class*="ProductCard"]',
                        '[data-testid="product-card"]'
                    ];
                    
                    let cards = [];
                    for (const selector of selectors) {
                        cards = document.querySelectorAll(selector);
                        if (cards.length > 0) break;
                    }
                    
                    const card = cards[index];
                    if (card) {
                        const button = card.querySelector('button, a, [role="button"]');
                        if (button) {
                            button.click();
                        } else {
                            card.click();
                        }
                    }
                }, product.index);
                
                // Ждем открытия модалки
                await new Promise(resolve => setTimeout(resolve, CONFIG.delayAfterClick));
                console.log('   ✅ Модалка открыта');
                
                // 4.2: Берем ВЕСЬ текст из модалки
                console.log('   📝 Считываем данные из модалки...');
                
                const modalData = await page.evaluate(() => {
                    // Ищем модалку
                    const modalSelectors = [
                        '[role="dialog"]',
                        '[class*="modal"]',
                        '.modal',
                        '[class*="Modal"]'
                    ];
                    
                    let modal = null;
                    for (const selector of modalSelectors) {
                        modal = document.querySelector(selector);
                        if (modal) break;
                    }
                    
                    if (!modal) {
                        return {
                            fullText: document.body.textContent,
                            warning: 'Modal not found, using body text'
                        };
                    }
                    
                    // Берем весь текст
                    const fullText = modal.textContent || '';
                    
                    // Пытаемся найти описание
                    const descriptionMatch = fullText.match(/(?:описание|состав|ингредиенты)[:\s]*([\s\S]{10,500}?)(?:пищевая ценность|кбжу|вес|$)/i);
                    const description = descriptionMatch ? descriptionMatch[1].trim() : '';
                    
                    // Пытаемся найти состав
                    const ingredientsMatch = fullText.match(/(?:состав|ингредиенты)[:\s]*([\s\S]{10,500}?)(?:пищевая ценность|кбжу|вес|$)/i);
                    const ingredients = ingredientsMatch ? ingredientsMatch[1].trim() : '';
                    
                    // Пытаемся найти КБЖУ
                    const nutrition = {};
                    const proteinMatch = fullText.match(/белки[:\s]*(\d+(?:\.\d+)?)/i);
                    const fatMatch = fullText.match(/жиры[:\s]*(\d+(?:\.\d+)?)/i);
                    const carbMatch = fullText.match(/углеводы[:\s]*(\d+(?:\.\d+)?)/i);
                    const kcalMatch = fullText.match(/(?:калории|ккал|энергетическая ценность)[:\s]*(\d+(?:\.\d+)?)/i);
                    
                    if (proteinMatch) nutrition.белки = parseFloat(proteinMatch[1]);
                    if (fatMatch) nutrition.жиры = parseFloat(fatMatch[1]);
                    if (carbMatch) nutrition.углеводы = parseFloat(carbMatch[1]);
                    if (kcalMatch) nutrition.ккал = parseFloat(kcalMatch[1]);
                    
                    // Пытаемся найти вес в модалке
                    const weightMatch = fullText.match(/(\d+)\s*(г|гр)/i);
                    const modalWeight = weightMatch ? parseInt(weightMatch[1]) : null;
                    
                    return {
                        fullText: fullText.substring(0, 2000),
                        description: description.substring(0, 500),
                        ingredients: ingredients.substring(0, 500),
                        nutrition: Object.keys(nutrition).length > 0 ? nutrition : null,
                        modalWeight: modalWeight,
                        textLength: fullText.length
                    };
                });
                
                // 4.3: Сохраняем результат
                const itemData = {
                    id: i + 1,
                    title: product.title,
                    priceFromCard: product.price,
                    weightFromCard: product.weight,
                    modalData: modalData,
                    collectedAt: new Date().toISOString()
                };
                
                results.push(itemData);
                
                if (CONFIG.saveAfterEachItem) {
                    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2), 'utf8');
                    console.log(`   💾 Сохранено (${results.length} товаров)`);
                }
                
                // 4.4: Закрываем модалку
                console.log('   ❌ Закрываем модалку...');
                
                await page.evaluate(() => {
                    const closeBtn = document.querySelector('[class*="close"], button[aria-label*="Закрыть"]');
                    if (closeBtn) {
                        closeBtn.click();
                    } else {
                        document.dispatchEvent(new KeyboardEvent('keydown', {'key': 'Escape'}));
                    }
                });
                
                await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenItems));
                console.log('   ✅ Готово\n');
                
            } catch (error) {
                console.log(`   ❌ Ошибка: ${error.message}\n`);
                results.push({
                    id: i + 1,
                    title: product.title,
                    error: error.message
                });
            }
        }
        
        // Финальное сохранение
        console.log('\n📊 ИТОГИ:');
        console.log(`   Обработано товаров: ${results.length}`);
        console.log(`   С данными из модалки: ${results.filter(r => r.modalData && !r.modalData.warning).length}`);
        console.log(`   С ошибками: ${results.filter(r => r.error).length}`);
        console.log(`\n💾 Файл сохранен: ${outputFile}`);
        console.log('\n✨ Парсинг завершен! Теперь можно проверить файл глазками.\n');
        
        return results;
        
    } catch (error) {
        console.error('❌ Критическая ошибка:', error.message);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Запуск
parseYandexEdaUniversal()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
