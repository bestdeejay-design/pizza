/**
 * Parser for original site pizzanapolirsc.ru
 * Extracts ALL data from modals: ID, title, price, weight, description, ingredients, nutrition
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const CONFIG = {
    baseUrl: 'https://pizzanapolirsc.ru/',
    outputFolder: path.join(__dirname, 'original-site-data'),
    delayBetweenItems: 2000,
    delayAfterModalOpen: 3000,
    saveAfterEachItem: true
};

async function parseOriginalSite() {
    console.log('🍕 Парсинг оригинального сайта pizzanapolirsc.ru...\n');
    
    // Создаем папку для результатов
    if (!fs.existsSync(CONFIG.outputFolder)) {
        fs.mkdirSync(CONFIG.outputFolder, { recursive: true });
    }
    
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        
        console.log('1. Открываем главную страницу...');
        await page.goto(CONFIG.baseUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 180000
        });
        
        console.log('   ⏳ Ждем загрузки контента...');
        await new Promise(resolve => setTimeout(resolve, 8000));
        
        console.log('\n2. Ищем категории меню...');
        const categories = await page.evaluate(() => {
            // Ищем ссылки на категории в меню
            const links = Array.from(document.querySelectorAll('a[href*="#"]'));
            const categories = [];
            
            links.forEach(link => {
                const href = link.getAttribute('href');
                const text = link.textContent?.trim();
                
                if (href && href.startsWith('#') && text && text.length > 2) {
                    categories.push({
                        name: text,
                        selector: href.substring(1)
                    });
                }
            });
            
            return categories.filter(c => c.name && c.selector);
        });
        
        console.log(`   Найдено категорий: ${categories.length}`);
        categories.forEach((cat, i) => {
            console.log(`   ${i+1}) ${cat.name} (#${cat.selector})`);
        });
        
        const allProducts = [];
        
        // Проходим по каждой категории
        for (const category of categories) {
            console.log(`\n📁 Категория: ${category.name}`);
            
            try {
                // Скроллим к категории
                await page.evaluate((selector) => {
                    const element = document.getElementById(selector);
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth' });
                    }
                }, category.selector);
                
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Находим все карточки товаров в категории
                const products = await page.evaluate(() => {
                    const cards = document.querySelectorAll('[data-product-card], .product-card, [class*="product"]');
                    
                    return Array.from(cards).map(card => {
                        const title = card.querySelector('[class*="title"], h3, h4')?.textContent?.trim();
                        const price = card.querySelector('[class*="price"]')?.textContent?.trim();
                        const image = card.querySelector('img')?.src;
                        
                        // Пробуем найти вес
                        const text = card.textContent || '';
                        const weightMatch = text.match(/(\d+)\s*(гр|г)/i);
                        const weight = weightMatch ? parseInt(weightMatch[1]) : null;
                        
                        if (title && title.length > 3) {
                            return { title, price, weight, image };
                        }
                        return null;
                    }).filter(p => p !== null);
                });
                
                console.log(`   ✅ Найдено товаров: ${products.length}`);
                
                // Обрабатываем каждый товар - открываем модалку
                for (let i = 0; i < products.length; i++) {
                    const product = products[i];
                    console.log(`   ${i+1}/${products.length}. ${product.title}`);
                    
                    try {
                        // Кликаем по товару чтобы открыть модалку
                        await page.evaluate((index) => {
                            const cards = document.querySelectorAll('[data-product-card], .product-card, [class*="product"]');
                            if (cards[index]) {
                                cards[index].click();
                            }
                        }, i);
                        
                        // Ждем открытия модалки
                        await new Promise(resolve => setTimeout(resolve, CONFIG.delayAfterModalOpen));
                        
                        // Извлекаем данные из модалки
                        const modalData = await page.evaluate(() => {
                            const modal = document.querySelector('[role="dialog"], .modal, [class*="modal"], .popup') || 
                                         document.querySelector('body > div:last-child');
                            
                            if (!modal) return null;
                            
                            const text = modal.textContent || '';
                            
                            // Ищем ID товара
                            const idMatch = text.match(/ID:\s*(\d+)/i) || text.match(/Артикул:\s*(\d+)/i);
                            const productId = idMatch ? idMatch[1] : null;
                            
                            // Ищем точный вес
                            const weightMatch = text.match(/Вес:\s*(\d+)\s*(гр|г)/i) || 
                                              text.match(/(\d+)\s*(гр|г)\s*[,\.]/i);
                            const weight = weightMatch ? parseInt(weightMatch[1]) : null;
                            
                            // Ищем описание
                            const descriptionMatch = text.match(/Описание[:\s]+([^]*?)(?:Состав|$)/i);
                            const description = descriptionMatch ? descriptionMatch[1].trim() : null;
                            
                            // Ищем состав
                            const ingredientsMatch = text.match(/Состав[:\s]+([^]*?)(?:Пищевая|КБЖУ|$)/i);
                            const ingredients = ingredientsMatch ? ingredientsMatch[1].trim() : null;
                            
                            // Ищем КБЖУ
                            const nutritionMatch = text.match(/(?:Пищевая ценность|КБЖУ)[:\s]+([^]*?)$/i);
                            const nutrition = nutritionMatch ? nutritionMatch[1].trim() : null;
                            
                            return {
                                productId,
                                weight,
                                description,
                                ingredients,
                                nutrition,
                                fullText: text.substring(0, 3000)
                            };
                        });
                        
                        // Сохраняем результат
                        const completeProduct = {
                            ...product,
                            ...modalData,
                            category: category.name
                        };
                        
                        allProducts.push(completeProduct);
                        
                        // Сохраняем после каждого товара
                        if (CONFIG.saveAfterEachItem) {
                            const outputFile = path.join(CONFIG.outputFolder, 'all-products.json');
                            fs.writeFileSync(outputFile, JSON.stringify({
                                collectedAt: new Date().toISOString(),
                                totalProducts: allProducts.length,
                                products: allProducts
                            }, null, 2));
                        }
                        
                        // Закрываем модалку несколькими способами
                        await page.evaluate(() => {
                            // Способ 1: Ищем явную кнопку закрытия
                            let closeBtn = document.querySelector('[class*="close"], .close-modal, [aria-label="Закрыть"]');
                            
                            // Способ 2: Если не нашли, ищем крестик в модалке
                            if (!closeBtn) {
                                const modal = document.querySelector('[role="dialog"], .modal, [class*="modal"]');
                                if (modal) {
                                    closeBtn = modal.querySelector('svg, span[style*="cursor: pointer"], button');
                                }
                            }
                            
                            // Способ 3: Клик по оверлею (фону затемнения)
                            if (!closeBtn) {
                                const overlay = document.querySelector('[class*="overlay"], .modal-overlay');
                                if (overlay) {
                                    overlay.click();
                                    return;
                                }
                            }
                            
                            // Способ 4: Просто клик по body (должен закрыть модалку)
                            if (closeBtn) {
                                closeBtn.click();
                            } else {
                                document.body.click();
                            }
                        });
                        
                        await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenItems));
                        
                    } catch (error) {
                        console.log(`      ❌ Ошибка модалки: ${error.message}`);
                        allProducts.push({
                            ...product,
                            error: error.message
                        });
                    }
                }
                
            } catch (error) {
                console.log(`   ❌ Ошибка категории: ${error.message}`);
            }
        }
        
        console.log('\n📊 ИТОГИ:');
        console.log(`   Всего товаров: ${allProducts.length}`);
        console.log(`   С данными из модалок: ${allProducts.filter(p => p.description || p.ingredients).length}`);
        
        const finalFile = path.join(CONFIG.outputFolder, 'complete-menu.json');
        fs.writeFileSync(finalFile, JSON.stringify({
            source: 'pizzanapolirsc.ru',
            collectedAt: new Date().toISOString(),
            totalProducts: allProducts.length,
            statistics: {
                withWeight: allProducts.filter(p => p.weight).length,
                withDescription: allProducts.filter(p => p.description).length,
                withIngredients: allProducts.filter(p => p.ingredients).length,
                withNutrition: allProducts.filter(p => p.nutrition).length
            },
            products: allProducts
        }, null, 2));
        
        console.log(`\n💾 Сохранено в ${finalFile}`);
        
    } catch (error) {
        console.error('❌ Критическая ошибка:', error.message);
    } finally {
        if (browser) await browser.close();
    }
}

parseOriginalSite();
