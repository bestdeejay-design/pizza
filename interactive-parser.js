/**
 * ИНТЕРАКТИВНЫЙ ПАРСЕР с ручной помощью
 * Ты открываешь модалки - парсер собирает данные
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const CONFIG = {
    url: 'https://pizzanapolirsc.ru/?tfc_quantity[1271358691]=y&tfc_storepartuid[1271358691]=Пицца+30+см&tfc_div=:::',
    outputFile: path.join(__dirname, 'original-site-data', 'interactive-menu.json'),
    delayAfterOpen: 3000
};

async function interactiveParse() {
    console.log('🍕 ИНТЕРАКТИВНЫЙ ПАРСИНГ\n');
    console.log('Инструкция:');
    console.log('1. Откроется браузер');
    console.log('2. ТЫ вручную открывай модалки кликом по товарам');
    console.log('3. Парсер сам соберет данные через 3 секунды');
    console.log('4. Закрывай модалку и переходи к следующему товару');
    console.log('5. Напиши "ok" в консоли когда закончишь\n');
    
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    console.log('📂 Открываю сайт...');
    await page.goto(CONFIG.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise(r => setTimeout(r, 5000));
    
    // Считаем товары
    const productsCount = await page.evaluate(() => {
        return document.querySelectorAll('.js-product[data-product-lid]').length;
    });
    
    console.log(`✅ Найдено товаров: ${productsCount}`);
    console.log('👉 НАЧИНАЙ КЛИКАТЬ ПО ТОВАРАМ!\n');
    
    const collectedData = [];
    let lastModalText = '';
    
    // Создаем интерфейс для ввода
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    // Функция сбора данных из текущей модалки
    async function collectFromModal() {
        try {
            const data = await page.evaluate(() => {
                const modal = document.querySelector('.t-popup');
                if (!modal) return null;
                
                const text = modal.textContent || '';
                
                // Извлекаем данные
                const titleMatch = text.match(/^([^\n\r]+)/);
                const title = titleMatch ? titleMatch[1].trim() : '';
                
                const weightMatch = text.match(/вес[:\s]*(\d+)\s*(гр|г)/i);
                const weight = weightMatch ? parseInt(weightMatch[1]) : null;
                
                const priceMatch = text.match(/(\d+)\s*р\.?/i);
                const price = priceMatch ? parseInt(priceMatch[1]) : null;
                
                const descMatch = text.match(/описание[:\s]*([\s\S]*?)(?:состав|пищевая|$)/i);
                const description = descMatch ? descMatch[1].trim().substring(0, 1000) : null;
                
                const ingrMatch = text.match(/состав[:\s]*([\s\S]*?)(?:пищевая|кбжу|$)/i);
                const ingredients = ingrMatch ? ingrMatch[1].trim().substring(0, 1000) : null;
                
                return { title, weight, price, description, ingredients, fullText: text.substring(0, 2000) };
            });
            
            if (data && data.title && data.title.length > 3) {
                collectedData.push(data);
                console.log(`✅ Собрано: ${data.title.substring(0, 40)} | Вес: ${data.weight || 'нет'}гр`);
                
                // Сохраняем после каждого товара
                fs.writeFileSync(
                    CONFIG.outputFile,
                    JSON.stringify({
                        collectedAt: new Date().toISOString(),
                        total: collectedData.length,
                        products: collectedData
                    }, null, 2)
                );
                
                lastModalText = data.fullText;
            }
        } catch (e) {
            console.log(`❌ Ошибка сбора: ${e.message}`);
        }
    }
    
    // Запускаем цикл проверки модалок
    console.log('🔄 Сканирование модалок запущено...\n');
    
    const scanInterval = setInterval(async () => {
        const hasModal = await page.evaluate(() => {
            return !!document.querySelector('.t-popup');
        });
        
        if (hasModal) {
            await collectFromModal();
        }
    }, 3500); // Проверяем каждые 3.5 секунды
    
    // Ждем команды от пользователя
    rl.question('Напиши "ok" когда закончишь собирать все товары: ', (answer) => {
        clearInterval(scanInterval);
        rl.close();
        
        console.log('\n📊 ИТОГИ:');
        console.log(`   Собрано товаров: ${collectedData.length}`);
        console.log(`   С весами: ${collectedData.filter(p => p.weight).length}`);
        console.log(`   С описанием: ${collectedData.filter(p => p.description).length}`);
        console.log(`\n💾 Файл: ${CONFIG.outputFile}`);
        
        browser.close();
        process.exit(0);
    });
}

interactiveParse().catch(console.error);
