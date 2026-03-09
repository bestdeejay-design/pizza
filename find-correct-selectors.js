/**
 * Find correct selectors for Yandex Eda product cards
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function findCorrectSelectors() {
    console.log('🔍 Ищем правильные селекторы для товаров...\n');
    
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        
        console.log('1. Открываем страницу...');
        await page.goto('https://eda.yandex.ru/r/pizza_napoli_bmroq', {
            waitUntil: 'domcontentloaded',
            timeout: 180000
        });
        
        console.log('   ⏳ Ждем 10 секунд для загрузки контента...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        console.log('\n2. Пробуем разные селекторы:\n');
        
        const selectors = [
            '[id*="product-card"]',
            '[class*="product"]',
            '[class*="Product"]',
            '[class*="card"]',
            '[class*="Card"]',
            '[data-testid*="product"]',
            'article',
            '.product-card',
            '.productCard',
            '.card'
        ];
        
        const results = await page.evaluate((selectors) => {
            return selectors.map(sel => ({
                selector: sel,
                count: document.querySelectorAll(sel).length
            }));
        }, selectors);
        
        results.forEach(result => {
            console.log(`   ${result.selector.padEnd(30)} → ${result.count} элементов`);
        });
        
        // Also check total number of clickable elements
        console.log('\n3. Проверяем структуру страницы:');
        const structure = await page.evaluate(() => {
            const allElements = document.querySelectorAll('*');
            const withRussianText = Array.from(allElements).filter(el => {
                const text = el.textContent?.trim();
                return text && /[а-яё]/i.test(text) && text.length > 20;
            });
            
            return {
                totalElements: allElements.length,
                elementsWithText: withRussianText.length,
                firstFewElements: withRussianText.slice(0, 5).map(el => ({
                    tag: el.tagName,
                    id: el.id?.substring(0, 50),
                    class: el.className?.substring(0, 100),
                    text: el.textContent?.trim().substring(0, 100)
                }))
            };
        });
        
        console.log(`   Всего элементов: ${structure.totalElements}`);
        console.log(`   С русским текстом: ${structure.elementsWithText}`);
        console.log('\n   Первые элементы с текстом:');
        structure.firstFewElements.forEach((el, i) => {
            console.log(`   ${i+1}) <${el.tag}> id="${el.id}" class="${el.class}"`);
            console.log(`      Текст: "${el.text}..."`);
        });
        
        // Save HTML for manual inspection
        const html = await page.content();
        const htmlFile = path.join(__dirname, 'page-structure.html');
        fs.writeFileSync(htmlFile, html);
        console.log(`\n💾 HTML сохранен в ${htmlFile}`);
        
    } catch (error) {
        console.error('❌ Ошибка:', error.message);
    } finally {
        if (browser) await browser.close();
    }
}

findCorrectSelectors();
