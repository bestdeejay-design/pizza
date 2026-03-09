/**
 * ФИНАЛЬНЫЙ ПАРСЕР для pizzanapolirsc.ru
 * Правильные URL + открытие модалок + сбор всех данных
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
    outputFile: 'final-menu.json'
};

async function parseFinal() {
    console.log('🍕 ФИНАЛЬНЫЙ ПАРСИНГ...\n');
    
    if (!fs.existsSync(CONFIG.outputFolder)) {
        fs.mkdirSync(CONFIG.outputFolder, { recursive: true });
    }
    
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        
        const allProducts = [];
        
        for (const category of CONFIG.categories) {
            console.log(`\n📁 ${category.name}`);
            
            await page.goto(category.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await new Promise(r => setTimeout(r, 5000));
            
            // Находим товары
            const products = await page.evaluate(() => {
                const cards = document.querySelectorAll('.js-product[data-product-lid]');
                return Array.from(cards).map(card => {
                    const title = card.querySelector('.js-product-name')?.textContent?.trim();
                    const price = card.querySelector('.js-product-price')?.textContent?.trim();
                    
                    if (title && title.length > 3) {
                        return { title, price };
                    }
                    return null;
                }).filter(p => p);
            });
            
            console.log(`   Найдено: ${products.length}`);
            
            // Обрабатываем каждый товар
            for (let i = 0; i < products.length; i++) {
                const product = products[i];
                console.log(`   ${i+1}/${products.length} ${product.title.substring(0, 40)}`);
                
                try {
                    // Кликаем - открываем модалку
                    await page.evaluate((idx) => {
                        const cards = document.querySelectorAll('.js-product[data-product-lid]');
                        if (cards[idx]) cards[idx].click();
                    }, i);
                    
                    await new Promise(r => setTimeout(r, 4000));
                    
                    // Читаем данные из модалки
                    const modalData = await page.evaluate(() => {
                        const modal = document.querySelector('.t-popup');
                        if (!modal) return {};
                        
                        const text = modal.textContent || '';
                        
                        // Вес
                        const weightMatch = text.match(/вес[:\s]*(\d+)\s*(гр|г)/i);
                        const weight = weightMatch ? parseInt(weightMatch[1]) : null;
                        
                        // Описание
                        const descMatch = text.match(/описание[:\s]*([\s\S]*?)(?:состав|пищевая|$)/i);
                        const description = descMatch ? descMatch[1].trim().substring(0, 1000) : null;
                        
                        // Состав
                        const ingrMatch = text.match(/состав[:\s]*([\s\S]*?)(?:пищевая|кбжу|$)/i);
                        const ingredients = ingrMatch ? ingrMatch[1].trim().substring(0, 1000) : null;
                        
                        return { weight, description, ingredients };
                    });
                    
                    allProducts.push({ ...product, ...modalData, category: category.name });
                    
                    // Закрываем модалку перезагрузкой
                    await page.reload({ waitUntil: 'domcontentloaded' });
                    await new Promise(r => setTimeout(r, 2000));
                    
                } catch (e) {
                    console.log(`      ❌ ${e.message}`);
                    allProducts.push({ ...product, error: e.message, category: category.name });
                }
            }
            
            // Сохраняем после категории
            fs.writeFileSync(
                path.join(CONFIG.outputFolder, CONFIG.outputFile),
                JSON.stringify({ collectedAt: new Date().toISOString(), products: allProducts }, null, 2)
            );
        }
        
        // ИТОГИ
        console.log('\n📊 РЕЗУЛЬТАТЫ:');
        console.log(`   Всего: ${allProducts.length}`);
        console.log(`   С весами: ${allProducts.filter(p => p.weight).length}`);
        console.log(`   С описанием: ${allProducts.filter(p => p.description).length}`);
        console.log(`   С составом: ${allProducts.filter(p => p.ingredients).length}`);
        
    } finally {
        await browser.close();
    }
}

parseFinal();
