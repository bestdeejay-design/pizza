/**
 * Умный парсер для pizzanapolirsc.ru
 * Работает с конкретными категориями меню через Tilda store API
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const CONFIG = {
    baseUrl: 'https://pizzanapolirsc.ru/',
    outputFolder: path.join(__dirname, 'original-site-data'),
    categories: [
        { name: 'pizza', url: '#!/tstore/r/1271358691/c/259057491112' },
        { name: 'pizza-piccolo', url: '#!/tstore/r/1271358691/c/565496509512' },
        { name: 'calzone', url: '#!/tstore/r/1271358691/c/403766184352' },
        { name: 'bread', url: '#!/tstore/r/1271358691/c/965202048502' },
        { name: 'focaccia', url: '#!/tstore/r/1271358691/c/866298244052' }
    ]
};

async function parseSmart() {
    console.log('🍕 Умный парсинг pizzanapolirsc.ru...\n');
    
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
            
            try {
                // Открываем категорию
                const fullUrl = CONFIG.baseUrl + category.url;
                console.log(`   Переходим: ${fullUrl}`);
                
                await page.goto(fullUrl, {
                    waitUntil: 'domcontentloaded',
                    timeout: 60000
                });
                
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                // Находим товары в этой категории
                const products = await page.evaluate(() => {
                    const cards = document.querySelectorAll('.js-product[data-product-lid]');
                    
                    return Array.from(cards).map(card => {
                        const lid = card.getAttribute('data-product-lid');
                        const uid = card.getAttribute('data-product-uid');
                        const title = card.querySelector('.js-product-name')?.textContent?.trim();
                        const price = card.querySelector('.js-product-price')?.textContent?.trim();
                        
                        // Ищем вес в тексте карточки
                        const text = card.textContent || '';
                        const weightMatch = text.match(/(\d+)\s*(гр|г)/i);
                        const weight = weightMatch ? parseInt(weightMatch[1]) : null;
                        
                        const image = card.querySelector('img')?.src || 
                                     card.querySelector('[bgimgfield]')?.getAttribute('data-original');
                        
                        if (title && title.length > 3) {
                            return { lid, uid, title, price, weight, image };
                        }
                        return null;
                    }).filter(p => p !== null);
                });
                
                console.log(`   ✅ Найдено товаров: ${products.length}`);
                
                // Обрабатываем каждый товар
                for (let i = 0; i < products.length; i++) {
                    const product = products[i];
                    console.log(`   ${i+1}/${products.length}. ${product.title}`);
                    
                    try {
                        // Кликаем по товару
                        await page.evaluate((index) => {
                            const cards = document.querySelectorAll('.js-product[data-product-lid]');
                            if (cards[index]) {
                                cards[index].scrollIntoView();
                                setTimeout(() => cards[index].click(), 300);
                            }
                        }, i);
                        
                        await new Promise(resolve => setTimeout(resolve, 3000));
                        
                        // Извлекаем данные из модалки
                        const modalData = await page.evaluate(() => {
                            function extractSection(text, startRegex, endRegex) {
                                const match = text.match(new RegExp(startRegex.source + '([^]*?)' + endRegex.source, 'i'));
                                return match ? match[1]?.trim() : null;
                            }
                            
                            // Ищем модалку по характерным классам Tilda
                            const modal = document.querySelector('.t-popup') || 
                                         document.querySelector('[class*="popup"]') ||
                                         document.querySelector('body > div:last-child');
                            
                            if (!modal) return null;
                            
                            const text = modal.textContent || '';
                            
                            // Данные из модалки
                            const description = extractSection(text, /описание[:\s]+/i, /состав|пищевая|кбжу/i);
                            const ingredients = extractSection(text, /состав[:\s]+/i, /пищевая|кбжу/i);
                            const nutrition = extractSection(text, /(?:пищевая ценность|кбжу)[:\s]+/i, /$/i);
                            
                            // Вес из модалки (более точный поиск)
                            const weightMatch = text.match(/вес[:\s]*(\d+)\s*(гр|г)/i) ||
                                              text.match(/(\d+)\s*(гр|г)\s*[,.\)]/i);
                            const weight = weightMatch ? parseInt(weightMatch[1]) : null;
                            
                            return {
                                weight,
                                description: description?.substring(0, 500),
                                ingredients: ingredients?.substring(0, 500),
                                nutrition: nutrition?.substring(0, 500),
                                fullText: text.substring(0, 2000)
                            };
                        });
                        
                        // Сохраняем
                        const completeProduct = {
                            ...product,
                            ...modalData,
                            category: category.name
                        };
                        
                        allProducts.push(completeProduct);
                        
                        // Перезагружаем страницу чтобы закрыть модалку
                        await page.reload({ waitUntil: 'domcontentloaded' });
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        
                    } catch (error) {
                        console.log(`      ❌ Ошибка: ${error.message}`);
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
        
        // Финальное сохранение
        console.log('\n📊 ИТОГИ:');
        console.log(`   Всего товаров: ${allProducts.length}`);
        console.log(`   С весами: ${allProducts.filter(p => p.weight).length}`);
        console.log(`   С описаниями: ${allProducts.filter(p => p.description).length}`);
        
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

function extractSection(text, startRegex, endRegex) {
    const match = text.match(new RegExp(startRegex.source + '([^]*?)' + endRegex.source, 'i'));
    return match ? match[1]?.trim() : null;
}

parseSmart();
