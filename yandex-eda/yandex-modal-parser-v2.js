/**
 * Yandex Eda Modal Parser v2 - Улучшенная версия
 * Исправлены селекторы для работы с текущей версией сайта
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const CONFIG = {
    url: 'https://eda.yandex.ru/r/pizza_napoli_bmroq',
    output: path.join(__dirname, 'yandex-modal-data-v2.json'),
    timeout: 300000,
    delay: 12000,
    scrollDelay: 1500
};

async function parseYandexEdaModalsV2() {
    console.log('🚀 Yandex Eda Modal Parser V2 запущен...\n');
    
    let browser;
    try {
        console.log('📦 Запуск Puppeteer...');
        browser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        await page.setViewport({ width: 1920, height: 1080 });
        
        console.log(`📍 Переход на ${CONFIG.url}...`);
        await page.goto(CONFIG.url, { 
            waitUntil: 'domcontentloaded',
            timeout: CONFIG.timeout 
        });
        
        console.log(`⏳ Ожидание загрузки (${CONFIG.delay}мс)...`);
        await new Promise(resolve => setTimeout(resolve, CONFIG.delay));
        
        console.log('📜 Прокрутка страницы...');
        await page.evaluate(async (scrollDelay) => {
            const scrollStep = window.innerHeight;
            let scrollHeight = document.documentElement.scrollHeight;
            
            for (let y = 0; y < scrollHeight; y += scrollStep) {
                window.scrollTo(0, y);
                await new Promise(resolve => setTimeout(resolve, scrollDelay));
            }
            
            window.scrollTo(0, 0);
        }, CONFIG.scrollDelay);
        
        console.log('✅ Страница полностью загружена\n');
        
        // Находим все карточки
        const productCards = await page.evaluate(() => {
            let cards = document.querySelectorAll('[id*="product-card-v2-root"]');
            if (cards.length === 0) {
                cards = document.querySelectorAll('[class*="ProductCard"]');
            }
            
            return Array.from(cards).map((card, index) => {
                const textContent = card.textContent || '';
                const lines = textContent.split('\n').filter(l => l.trim());
                let title = '';
                
                for (const line of lines) {
                    const cleanLine = line.replace(/^-?\d+%/, '').trim();
                    if (cleanLine.length > 5 && !/^\d+\s*₽/.test(cleanLine)) {
                        if (cleanLine.includes(' г') && !/^\d+\s*г$/.test(cleanLine)) {
                            const nameMatch = cleanLine.match(/^(.+?)\s*\d+\s*г/);
                            if (nameMatch) {
                                title = nameMatch[1].trim();
                                break;
                            }
                        } else {
                            title = cleanLine;
                            break;
                        }
                    }
                }
                
                return {
                    index,
                    title: title.substring(0, 100)
                };
            }).filter(p => p.title);
        });
        
        console.log(`✅ Найдено товаров: ${productCards.length}\n`);
        
        const modalData = [];
        
        for (let i = 0; i < productCards.length; i++) {
            const product = productCards[i];
            
            try {
                console.log(`${i+1}/${productCards.length}. ${product.title}`);
                
                // Кликаем на карточку
                await page.evaluate((index) => {
                    let cards = document.querySelectorAll('[id*="product-card-v2-root"]');
                    if (cards.length === 0) {
                        cards = document.querySelectorAll('[class*="ProductCard"]');
                    }
                    
                    const card = cards[index];
                    if (card) {
                        // Пробуем разные способы клика
                        const button = card.querySelector('button, a, [role="button"]');
                        if (button) {
                            button.click();
                        } else {
                            card.click();
                        }
                    }
                }, product.index);
                
                // Ждем открытия модалки
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                // Проверяем открылась ли модалка
                const modalOpened = await page.evaluate(() => {
                    const dialog = document.querySelector('[role="dialog"]');
                    const overlay = document.querySelector('[class*="overlay"]');
                    const modal = document.querySelector('.modal, [class*="modal-content"]');
                    return !!(dialog || overlay || modal);
                });
                
                if (!modalOpened) {
                    console.log(`   ⚠️ Модалка не открылась`);
                    modalData.push({
                        title: product.title,
                        error: 'Modal did not open'
                    });
                    continue;
                }
                
                // Извлекаем данные
                const modalInfo = await page.evaluate(() => {
                    // Ищем ЛЮБОЙ элемент похожий на модалку
                    const selectors = [
                        '[role="dialog"]',
                        '[class*="overlay"]',
                        '.modal',
                        '[class*="modal-content"]',
                        '[class*="Modal"]',
                        'body > div:last-child'
                    ];
                    
                    let modal = null;
                    for (const selector of selectors) {
                        modal = document.querySelector(selector);
                        if (modal) break;
                    }
                    
                    if (!modal) {
                        // Если модалку не нашли, берем последний добавленный div
                        const allDivs = document.querySelectorAll('div');
                        modal = allDivs[allDivs.length - 1];
                    }
                    
                    if (!modal) return null;
                    
                    // Название
                    const titleEl = modal.querySelector('h1, h2, h3, [class*="title"], [class*="name"]');
                    const title = titleEl?.textContent?.trim() || '';
                    
                    // Описание
                    const descSelectors = [
                        '[class*="description"]',
                        '[class*="desc"]',
                        '.description',
                        'p',
                        '[class*="text"]'
                    ];
                    
                    let description = '';
                    for (const selector of descSelectors) {
                        const el = modal.querySelector(selector);
                        if (el && el.textContent.length > 50) {
                            description = el.textContent.trim();
                            break;
                        }
                    }
                    
                    // Ингредиенты
                    const ingrSelectors = [
                        '[class*="ingredient"]',
                        '[class*="ingr"]',
                        '[class*="composition"]',
                        '[class*="состав"]',
                        '.ingredients'
                    ];
                    
                    let ingredients = '';
                    for (const selector of ingrSelectors) {
                        const el = modal.querySelector(selector);
                        if (el) {
                            ingredients = el.textContent.trim();
                            break;
                        }
                    }
                    
                    // КБЖУ
                    const nutrition = {};
                    const nutritionText = modal.textContent || '';
                    
                    // Ищем паттерны КБЖУ в тексте
                    const proteinMatch = nutritionText.match(/белки[:\s]*(\d+(?:\.\d+)?)/i);
                    const fatMatch = nutritionText.match(/жиры[:\s]*(\d+(?:\.\d+)?)/i);
                    const carbMatch = nutritionText.match(/углеводы[:\s]*(\d+(?:\.\d+)?)/i);
                    const kcalMatch = nutritionText.match(/(?:калории|ккал|энергетическая ценность)[:\s]*(\d+(?:\.\d+)?)/i);
                    
                    if (proteinMatch) nutrition.белки = parseFloat(proteinMatch[1]);
                    if (fatMatch) nutrition.жиры = parseFloat(fatMatch[1]);
                    if (carbMatch) nutrition.углеводы = parseFloat(carbMatch[1]);
                    if (kcalMatch) nutrition.ккал = parseFloat(kcalMatch[1]);
                    
                    // Вес
                    const weightSelectors = [
                        '[class*="weight"]',
                        '[class*="gram"]',
                        '.weight'
                    ];
                    
                    let weight = null;
                    for (const selector of weightSelectors) {
                        const el = modal.querySelector(selector);
                        if (el) {
                            const weightText = el.textContent.trim();
                            const weightMatch = weightText.match(/(\d+)\s*(г|гр)/i);
                            if (weightMatch) {
                                weight = parseInt(weightMatch[1]);
                                break;
                            }
                        }
                    }
                    
                    return {
                        title: title.substring(0, 100),
                        description: description.substring(0, 500),
                        ingredients: ingredients.substring(0, 500),
                        nutrition: Object.keys(nutrition).length > 0 ? nutrition : null,
                        weight
                    };
                });
                
                if (modalInfo && (modalInfo.description || modalInfo.ingredients || modalInfo.nutrition)) {
                    modalData.push({
                        title: product.title,
                        ...modalInfo
                    });
                    console.log(`   ✅ Данные получены`);
                    if (modalInfo.ingredients) {
                        console.log(`      Состав: ${modalInfo.ingredients.substring(0, 60)}...`);
                    }
                } else {
                    console.log(`   ⚠️ Пустая модалка`);
                    modalData.push({
                        title: product.title,
                        ...modalInfo,
                        error: 'Empty modal'
                    });
                }
                
                // Закрываем модалку
                await page.evaluate(() => {
                    const closeBtn = document.querySelector('[class*="close"], [aria-label*="Закрыть"], .close-modal, button:last-child');
                    if (closeBtn) {
                        closeBtn.click();
                    }
                    
                    // Или клик вне модалки
                    const overlay = document.querySelector('[class*="overlay"]');
                    if (overlay) {
                        overlay.click();
                    }
                    
                    // Или Escape
                    document.dispatchEvent(new KeyboardEvent('keydown', {'key': 'Escape'}));
                });
                
                await new Promise(resolve => setTimeout(resolve, 1500));
                
            } catch (error) {
                console.log(`   ❌ Ошибка: ${error.message}`);
                modalData.push({
                    title: product.title,
                    error: error.message
                });
            }
        }
        
        console.log(`\n✅ Обработано: ${modalData.length}`);
        
        // Статистика
        const withDescription = modalData.filter(p => p.description && p.description.length > 20).length;
        const withIngredients = modalData.filter(p => p.ingredients && p.ingredients.length > 20).length;
        const withNutrition = modalData.filter(p => p.nutrition).length;
        
        console.log('\n📊 Статистика:');
        console.log(`   С описанием: ${withDescription}/${modalData.length}`);
        console.log(`   С ингредиентами: ${withIngredients}/${modalData.length}`);
        console.log(`   С КБЖУ: ${withNutrition}/${modalData.length}`);
        
        // Примеры
        console.log('\n📋 Примеры:');
        modalData.filter(p => p.ingredients).slice(0, 3).forEach((p, i) => {
            console.log(`${i+1}. ${p.title}`);
            console.log(`   Состав: ${p.ingredients.substring(0, 80)}...`);
        });
        
        // Сохранение
        console.log(`\n💾 Сохранение в ${CONFIG.output}...`);
        fs.writeFileSync(CONFIG.output, JSON.stringify(modalData, null, 2));
        console.log('✅ Готово!\n');
        
        return modalData;
        
    } catch (error) {
        console.error('❌ Ошибка:', error.message);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Запуск
parseYandexEdaModalsV2()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
