/**
 * ТЕСТОВЫЙ ПАРСЕР - сбор веса и описания
 * Открываем модалку в новом окне
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const CONFIG = {
    url: 'https://pizzanapolirsc.ru/?tfc_quantity[1271358691]=y&tfc_storepartuid[1271358691]=Пицца+30+см&tfc_div=:::',
    targetPizza: 'Пицца Пепперони', // Название для поиска
    outputFile: path.join(__dirname, 'original-site-data', 'test-single-pizza.json')
};

async function testSinglePizza() {
    console.log('🍕 ТЕСТ: Сбор данных для ОДНОЙ пиццы\n');
    console.log(`Цель: ${CONFIG.targetPizza}\n`);
    
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        
        console.log('1️⃣ Открываю сайт...');
        await page.goto(CONFIG.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await new Promise(r => setTimeout(r, 5000));
        
        // Находим целевую пиццу
        console.log('2️⃣ Ищу целевую пиццу...');
        
        const pizzaCard = await page.evaluate((targetName) => {
            const cards = document.querySelectorAll('.js-product[data-product-lid]');
            
            for (let card of cards) {
                const titleEl = card.querySelector('.js-product-name');
                if (titleEl) {
                    const title = titleEl.textContent.trim();
                    // Ищем точное совпадение (без 1/4)
                    if (title === targetName && !title.includes('1/4')) {
                        return {
                            lid: card.getAttribute('data-product-lid'),
                            title: title
                        };
                    }
                }
            }
            return null;
        }, CONFIG.targetPizza);
        
        if (!pizzaCard) {
            console.log('❌ Не нашел такую пиццу!');
            await browser.close();
            return;
        }
        
        console.log(`✅ Нашел: ${pizzaCard.title} (LID: ${pizzaCard.lid})\n`);
        
        // Открываем модалку КЛИКОМ
        console.log('3️⃣ Открываю модалку...');
        
        await page.evaluate((lid) => {
            const card = document.querySelector(`.js-product[data-product-lid="${lid}"]`);
            if (card) card.click();
        }, pizzaCard.lid);
        
        // Ждем открытия модалки и загрузки контента
        console.log('   Жду загрузки контента...');
        await new Promise(r => setTimeout(r, 10000)); // 10 секунд!
        
        // Собираем данные из модалки
        console.log('4️⃣ Собираю данные...\n');
        
        const modalData = await page.evaluate(() => {
            const modal = document.querySelector('.t-popup');
            if (!modal) {
                return { error: 'Модалка не открылась' };
            }
            
            const text = modal.textContent || '';
            
            // Вес
            const weightMatch = text.match(/вес[:\s]*(\d+)\s*(гр|г)/i);
            const weight = weightMatch ? parseInt(weightMatch[1]) : null;
            
            // Описание (между "описание" и "состав" или "пищевая")
            const descMatch = text.match(/описание[:\s]*([\s\S]*?)(?:состав|пищевая|кбжу|$)/i);
            const description = descMatch ? descMatch[1].trim().substring(0, 2000) : null;
            
            // Состав
            const ingrMatch = text.match(/состав[:\s]*([\s\S]*?)(?:пищевая|кбжу|$)/i);
            const ingredients = ingrMatch ? ingrMatch[1].trim().substring(0, 1000) : null;
            
            // Пищевая ценность
            const nutritionMatch = text.match(/(\d+)\s*ккал/i);
            const calories = nutritionMatch ? parseInt(nutritionMatch[1]) : null;
            
            return {
                weight,
                description,
                ingredients,
                calories,
                fullText: text.substring(0, 3000)
            };
        });
        
        console.log('📊 РЕЗУЛЬТАТЫ:');
        console.log(`   Вес: ${modalData.weight || 'не найден'} гр`);
        console.log(`   Описание: ${modalData.description ? modalData.description.substring(0, 100) + '...' : 'не найдено'}`);
        console.log(`   Калории: ${modalData.calories || 'не найдены'}`);
        
        // Сохраняем
        const result = {
            pizza: pizzaCard.title,
            lid: pizzaCard.lid,
            collectedAt: new Date().toISOString(),
            data: modalData
        };
        
        fs.writeFileSync(CONFIG.outputFile, JSON.stringify(result, null, 2));
        console.log(`\n💾 Сохранено: ${CONFIG.outputFile}`);
        
    } finally {
        await browser.close();
    }
}

testSinglePizza().catch(console.error);
