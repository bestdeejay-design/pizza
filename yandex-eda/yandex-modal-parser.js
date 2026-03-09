/**
 * Yandex Eda Modal Parser
 * Парсит подробные описания, состав и КБЖУ из модалок Яндекс Еды
 * Открывает каждый товар и извлекает детальную информацию
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const CONFIG = {
    url: 'https://eda.yandex.ru/r/pizza_napoli_bmroq',
    output: path.join(__dirname, 'yandex-modal-data.json'),
    timeout: 300000, // 5 минут на весь парсинг
    delay: 12000, // 12 секунд - долгое ожидание перед началом
    scrollDelay: 1500 // 1.5 секунды между шагами скролла - медленно и плавно
};

async function parseYandexEdaModals() {
    console.log('🚀 Yandex Eda Modal Parser запущен...\n');
    
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
        
        // Переход на страницу
        console.log(`📍 Переход на ${CONFIG.url}...`);
        await page.goto(CONFIG.url, { 
            waitUntil: 'domcontentloaded',
            timeout: CONFIG.timeout 
        });
        
        console.log(`⏳ Ожидание загрузки (${CONFIG.delay}мс)...`);
        await new Promise(resolve => setTimeout(resolve, CONFIG.delay));
        
        // Прокрутка для загрузки всех товаров
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
        
        // Находим все карточки товаров
        const productCards = await page.evaluate(() => {
            let cards = document.querySelectorAll('[id*="product-card-v2-root"]');
            if (cards.length === 0) {
                cards = document.querySelectorAll('[class*="ProductCard"]');
            }
            
            console.log(`Найдено карточек: ${cards.length}`);
            
            // Собираем данные для клика
            return Array.from(cards).map((card, index) => {
                // Пробуем найти кнопку или ссылку для открытия модалки
                const clickableElement = card.querySelector('a, button, [role="button"], [onclick]');
                
                // Получаем название
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
                    title: title.substring(0, 100),
                    hasClickable: !!clickableElement
                };
            }).filter(p => p.title);
        });
        
        console.log(`✅ Найдено товаров с названиями: ${productCards.length}\n`);
        
        const modalData = [];
        
        // Проходим по каждому товару
        for (let i = 0; i < productCards.length; i++) {
            const product = productCards[i];
            
            try {
                console.log(`${i+1}/${productCards.length}. Обработка: ${product.title}`);
                
                // Кликаем на товар чтобы открыть модалку
                await page.evaluate((index) => {
                    let cards = document.querySelectorAll('[id*="product-card-v2-root"]');
                    if (cards.length === 0) {
                        cards = document.querySelectorAll('[class*="ProductCard"]');
                    }
                    
                    const card = cards[index];
                    if (card) {
                        const clickable = card.querySelector('a, button, [role="button"]');
                        if (clickable) {
                            clickable.click();
                        } else {
                            card.click();
                        }
                    }
                }, product.index);
                
                // Ждем открытия модалки - даем время на полную загрузку
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                // Извлекаем данные из модалки
                const modalInfo = await page.evaluate(() => {
                    // Ищем модалку
                    const modal = document.querySelector('[role="dialog"], [class*="modal"], .modal');
                    
                    if (!modal) {
                        return null;
                    }
                    
                    // Название
                    const titleEl = modal.querySelector('h1, h2, [class*="title"]');
                    const title = titleEl?.textContent?.trim() || '';
                    
                    // Описание
                    const descEl = modal.querySelector('[class*="description"], .description, p');
                    const description = descEl?.textContent?.trim() || '';
                    
                    // Состав (ингредиенты)
                    const ingredientsEl = modal.querySelector('[class*="ingredient"], .ingredients');
                    let ingredients = '';
                    if (ingredientsEl) {
                        ingredients = ingredientsEl.textContent?.trim() || '';
                    }
                    
                    // КБЖУ
                    const nutrition = {};
                    const nutritionEls = modal.querySelectorAll('[class*="nutrition"], [class*="kbsu"]');
                    nutritionEls.forEach(el => {
                        const text = el.textContent?.trim() || '';
                        const match = text.match(/(белки|жиры|углеводы|калории|ккал)[:\s]*(\d+)/i);
                        if (match) {
                            const key = match[1].toLowerCase();
                            nutrition[key] = parseInt(match[2]);
                        }
                    });
                    
                    // Вес (если есть в модалке)
                    const weightEl = modal.querySelector('[class*="weight"], .weight');
                    let weight = null;
                    if (weightEl) {
                        const weightText = weightEl.textContent?.trim() || '';
                        const weightMatch = weightText.match(/(\d+)\s*(г|гр)/i);
                        if (weightMatch) {
                            weight = parseInt(weightMatch[1]);
                        }
                    }
                    
                    return {
                        title,
                        description,
                        ingredients,
                        nutrition: Object.keys(nutrition).length > 0 ? nutrition : null,
                        weight
                    };
                });
                
                if (modalInfo) {
                    modalData.push({
                        title: product.title,
                        ...modalInfo
                    });
                    
                    console.log(`   ✅ Данные извлечены`);
                    if (modalInfo.description) {
                        console.log(`   Описание: ${modalInfo.description.substring(0, 50)}...`);
                    }
                } else {
                    console.log(`   ⚠️ Модалка не найдена`);
                }
                
                // Закрываем модалку
                await page.evaluate(() => {
                    const closeBtn = document.querySelector('[class*="close"], .close-modal, [aria-label="Закрыть"]');
                    if (closeBtn) {
                        closeBtn.click();
                    } else {
                        // Кликаем вне модалки
                        const overlay = document.querySelector('[class*="overlay"]');
                        if (overlay) {
                            overlay.click();
                        }
                    }
                });
                
                // Ждем закрытия - небольшая пауза
                await new Promise(resolve => setTimeout(resolve, 1500));
                
            } catch (error) {
                console.log(`   ❌ Ошибка: ${error.message}`);
                modalData.push({
                    title: product.title,
                    error: error.message
                });
            }
        }
        
        console.log(`\n✅ Обработано товаров: ${modalData.length}\n`);
        
        // Статистика
        const withDescription = modalData.filter(p => p.description).length;
        const withIngredients = modalData.filter(p => p.ingredients).length;
        const withNutrition = modalData.filter(p => p.nutrition).length;
        
        console.log('📊 Статистика:');
        console.log(`   С описанием: ${withDescription}/${modalData.length}`);
        console.log(`   С ингредиентами: ${withIngredients}/${modalData.length}`);
        console.log(`   С КБЖУ: ${withNutrition}/${modalData.length}\n`);
        
        // Примеры
        console.log('📋 Примеры данных:');
        modalData.slice(0, 3).forEach((p, i) => {
            console.log(`${i+1}. ${p.title}`);
            if (p.description) {
                console.log(`   Описание: ${p.description.substring(0, 80)}...`);
            }
            if (p.ingredients) {
                console.log(`   Ингредиенты: ${p.ingredients.substring(0, 60)}...`);
            }
            console.log();
        });
        
        // Сохранение
        console.log(`💾 Сохранение в ${CONFIG.output}...`);
        fs.writeFileSync(CONFIG.output, JSON.stringify(modalData, null, 2));
        console.log('✅ Готово!\n');
        
        return modalData;
        
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
parseYandexEdaModals()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
