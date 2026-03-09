/**
 * Parser for pizzanapolirsc.ru with CORRECT modal opening
 * Opens each product modal and extracts ALL data
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const CONFIG = {
    categories: [
        { 
            name: 'pizza-30cm', 
            url: 'https://pizzanapolirsc.ru/?tfc_quantity[1271358691]=y&tfc_storepartuid[1271358691]=Пицца+30+см&tfc_div=:::' 
        },
        { 
            name: 'pizza-piccolo-20cm', 
            url: 'https://pizzanapolirsc.ru/?tfc_quantity[1271358691]=y&tfc_storepartuid[1271358691]=Pizza+Piccolo+20+см&tfc_div=:::' 
        }
    ],
    outputFolder: path.join(__dirname, 'original-site-data'),
    delayAfterModalOpen: 4000,
    delayAfterClose: 1500
};

async function parseWithModals() {
    console.log('🍕 Парсинг с открытием МОДАЛОК...\n');
    
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
        
        const allProducts = [];
        
        for (const category of CONFIG.categories) {
            console.log(`\n📁 Категория: ${category.name}`);
            console.log(`   URL: ${category.url}`);
            
            try {
                await page.goto(category.url, {
                    waitUntil: 'domcontentloaded',
                    timeout: 60000
                });
                
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                // Находим ВСЕ карточки товаров
                const products = await page.evaluate(() => {
                    const cards = document.querySelectorAll('.js-product[data-product-lid]');
                    console.log(`   Найдено карточек: ${cards.length}`);
                    
                    return Array.from(cards).map((card, idx) => {
                        const lid = card.getAttribute('data-product-lid');
                        const uid = card.getAttribute('data-product-uid');
                        
                        const titleEl = card.querySelector('.js-product-name, [class*="name"]');
                        const priceEl = card.querySelector('.js-product-price, [class*="price"]');
                        const imageEl = card.querySelector('img');
                        
                        const title = titleEl?.textContent?.trim() || '';
                        const price = priceEl?.textContent?.trim() || '';
                        const image = imageEl?.src || imageEl?.getAttribute('data-original') || '';
                        
                        // Ищем вес в тексте карточки
                        const text = card.textContent || '';
                        const weightMatch = text.match(/(\d+)\s*(гр|г)/i);
                        const weightFromCard = weightMatch ? parseInt(weightMatch[1]) : null;
                        
                        if (title && title.length > 3) {
                            return { 
                                index: idx,
                                lid, 
                                uid, 
                                title, 
                                price, 
                                weightFromCard,
                                image 
                            };
                        }
                        return null;
                    }).filter(p => p !== null);
                });
                
                console.log(`   ✅ Товаров в категории: ${products.length}\n`);
                
                // Обрабатываем КАЖДЫЙ товар с открытием модалки
                for (let i = 0; i < products.length; i++) {
                    const product = products[i];
                    console.log(`   ${i+1}/${products.length}. ${product.title}`);
                    
                    try {
                        // СКРОЛЛИМ к элементу и КЛИКАЕМ
                        await page.evaluate((index) => {
                            const cards = document.querySelectorAll('.js-product[data-product-lid]');
                            if (cards[index]) {
                                cards[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                        }, product.index);
                        
                        await new Promise(resolve => setTimeout(resolve, 500));
                        
                        // Кликаем по товару
                        await page.evaluate((index) => {
                            const cards = document.querySelectorAll('.js-product[data-product-lid]');
                            if (cards[index]) {
                                cards[index].click();
                            }
                        }, product.index);
                        
                        // Ждем ОТКРЫТИЯ модалки
                        await new Promise(resolve => setTimeout(resolve, CONFIG.delayAfterModalOpen));
                        
                        // Извлекаем данные из ОТКРЫТОЙ модалки
                        const modalData = await page.evaluate(() => {
                            // Ищем модалку Tilda
                            const modal = document.querySelector('.t-popup') || 
                                         document.querySelector('[class*="modal"]') ||
                                         document.querySelector('body > div:last-child');
                            
                            if (!modal) {
                                return { error: 'Модалка не найдена' };
                            }
                            
                            const fullText = modal.textContent || '';
                            
                            // === ИЗВЛЕКАЕМ ВЕС ===
                            // Вариант 1: "Вес: 500 гр"
                            const weightPattern1 = /вес[:\s]*(\d+)\s*(гр|г)/i;
                            // Вариант 2: "500 г," или "500 гр."
                            const weightPattern2 = /(\d+)\s*(гр|г)[\.,\)]/i;
                            // Вариант 3: просто число с гр в конце
                            const weightPattern3 = /\b(\d{2,4})\s*(гр|г)\b/i;
                            
                            let weight = null;
                            const match1 = fullText.match(weightPattern1);
                            const match2 = fullText.match(weightPattern2);
                            const match3 = fullText.match(weightPattern3);
                            
                            if (match1) {
                                weight = parseInt(match1[1]);
                            } else if (match2) {
                                weight = parseInt(match2[1]);
                            } else if (match3) {
                                weight = parseInt(match3[1]);
                            }
                            
                            // === ИЗВЛЕКАЕМ ОПИСАНИЕ ===
                            let description = null;
                            const descMatch = fullText.match(/описание[:\s]*([\s\S]*?)(?:состав|пищевая|кбжу|$)/i);
                            if (descMatch && descMatch[1].trim().length > 10) {
                                description = descMatch[1].trim().substring(0, 1000);
                            }
                            
                            // === ИЗВЛЕКАЕМ СОСТАВ ===
                            let ingredients = null;
                            const ingrMatch = fullText.match(/состав[:\s]*([\s\S]*?)(?:пищевая|кбжу|$)/i);
                            if (ingrMatch && ingrMatch[1].trim().length > 10) {
                                ingredients = ingrMatch[1].trim().substring(0, 1000);
                            }
                            
                            // === ИЗВЛЕКАЕМ КБЖУ ===
                            let nutrition = null;
                            const nutrMatch = fullText.match(/(?:пищевая ценность|кбжу)[:\s]*([\s\S]*?)$/i);
                            if (nutrMatch && nutrMatch[1].trim().length > 5) {
                                nutrition = nutrMatch[1].trim().substring(0, 500);
                            }
                            
                            return {
                                weight,
                                description,
                                ingredients,
                                nutrition,
                                fullText: fullText.substring(0, 3000)
                            };
                        });
                        
                        // Сохраняем полные данные
                        const completeProduct = {
                            ...product,
                            ...modalData,
                            category: category.name
                        };
                        
                        allProducts.push(completeProduct);
                        
                        // Печатаем результат
                        if (modalData.weight) {
                            console.log(`      ✅ Вес: ${modalData.weight}гр`);
                        }
                        if (modalData.description) {
                            console.log(`      ✅ Описание: есть (${modalData.description.length} симв.)`);
                        }
                        if (modalData.ingredients) {
                            console.log(`      ✅ Состав: есть (${modalData.ingredients.length} симв.)`);
                        }
                        
                        // === ЗАКРЫВАЕМ МОДАЛКУ ===
                        // Просто перезагружаем страницу - это надежнее
                        await page.reload({ waitUntil: 'domcontentloaded' });
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        
                    } catch (error) {
                        console.log(`      ❌ Ошибка модалки: ${error.message}`);
                        allProducts.push({
                            ...product,
                            error: error.message,
                            category: category.name
                        });
                    }
                }
                
                // Сохраняем после каждой категории
                const outputFile = path.join(CONFIG.outputFolder, 'complete-menu.json');
                fs.writeFileSync(outputFile, JSON.stringify({
                    source: 'pizzanapolirsc.ru',
                    collectedAt: new Date().toISOString(),
                    totalProducts: allProducts.length,
                    statistics: {
                        withWeight: allProducts.filter(p => p.weight).length,
                        withDescription: allProducts.filter(p => p.description).length,
                        withIngredients: allProducts.filter(p => p.ingredients).length
                    },
                    products: allProducts
                }, null, 2));
                
                console.log(`\n💾 Промежуточный результат сохранен`);
                
            } catch (error) {
                console.log(`   ❌ Ошибка категории: ${error.message}`);
            }
        }
        
        // ФИНАЛЬНЫЙ РЕЗУЛЬТАТ
        console.log('\n📊 === ИТОГИ ===');
        console.log(`   Всего товаров: ${allProducts.length}`);
        console.log(`   С весами: ${allProducts.filter(p => p.weight).length}`);
        console.log(`   С описаниями: ${allProducts.filter(p => p.description).length}`);
        console.log(`   С составами: ${allProducts.filter(p => p.ingredients).length}`);
        
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
        
        console.log(`\n✅ ГОТОВО! Файл: ${finalFile}`);
        
    } catch (error) {
        console.error('❌ Критическая ошибка:', error.message);
    } finally {
        if (browser) await browser.close();
    }
}

parseWithModals();
