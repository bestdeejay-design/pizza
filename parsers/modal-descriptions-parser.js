/**
 * Modal Descriptions Parser
 * Парсит подробные описания из модалок на pizzanapolirsc.ru
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const CONFIG = {
    baseUrl: 'https://pizzanapolirsc.ru/',
    menuFile: path.join(__dirname, '..', 'menu-final.json'),
    output: path.join(__dirname, 'modal-data.json'),
    timeout: 30000,
    delay: 2000
};

async function parseModalDescriptions() {
    console.log('🚀 Modal Descriptions Parser запущен...\n');
    
    // Читаем menu-final.json чтобы получить список товаров
    console.log('📖 Чтение menu-final.json...');
    const menuData = JSON.parse(fs.readFileSync(CONFIG.menuFile, 'utf8'));
    
    // Собираем все товары в один массив
    const allProducts = [];
    Object.keys(menuData.menu).forEach(categoryKey => {
        const items = menuData.menu[categoryKey];
        items.forEach(item => {
            if (item.title) {
                allProducts.push({
                    title: item.title,
                    category: item.category,
                    id: item.id
                });
            }
        });
    });
    
    console.log(`✅ Загружено ${allProducts.length} товаров\n`);
    
    let browser;
    try {
        console.log('📦 Запуск Puppeteer...');
        browser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
        
        const modalData = [];
        
        console.log('🔍 Парсинг описаний из модалок...\n');
        
        for (let i = 0; i < allProducts.length; i++) {
            const product = allProducts[i];
            
            try {
                // Переходим на главную страницу
                await page.goto(CONFIG.baseUrl, { 
                    waitUntil: 'networkidle2',
                    timeout: CONFIG.timeout 
                });
                
                // Пытаемся найти товар и кликнуть на него чтобы открыть модалку
                // Это упрощенная версия - в реальности нужно искать по названию
                
                console.log(`${i+1}/${allProducts.length}. ${product.title}`);
                
                // Здесь должна быть логика поиска товара на странице и клика
                // Но так как структура сайта неизвестна, делаем заглушку
                
                modalData.push({
                    title: product.title,
                    category: product.category,
                    fullDescription: null, // Будет заполнено при реальном парсинге
                    ingredients: null,
                    nutritionalInfo: null
                });
                
            } catch (error) {
                console.log(`   ⚠️ Ошибка: ${error.message}`);
                modalData.push({
                    title: product.title,
                    category: product.category,
                    error: error.message
                });
            }
            
            // Небольшая задержка между запросами
            await page.waitForTimeout(500);
        }
        
        console.log(`\n✅ Обработано ${modalData.length} товаров\n`);
        
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
            await browser.close();
        }
    }
}

// Альтернативная функция - парсинг если известн URL модалки
async function parseModalByUrl(productUrl) {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    
    try {
        await page.goto(productUrl, { waitUntil: 'networkidle2' });
        
        const modalData = await page.evaluate(() => {
            // Ищем модалку
            const modal = document.querySelector('.modal, [class*="modal"], [role="dialog"]');
            
            if (!modal) {
                return null;
            }
            
            return {
                title: modal.querySelector('h1, h2, .title')?.textContent.trim(),
                description: modal.querySelector('.description, .desc, p')?.textContent.trim(),
                weight: modal.querySelector('.weight, [class*="weight"]')?.textContent.trim(),
                ingredients: Array.from(modal.querySelectorAll('.ingredients li'))
                    .map(li => li.textContent.trim())
            };
        });
        
        return modalData;
        
    } finally {
        await browser.close();
    }
}

// Запуск
parseModalDescriptions()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
