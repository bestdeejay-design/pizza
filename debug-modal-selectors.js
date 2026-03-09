/**
 * Debug script to find correct modal selectors on Yandex Eda
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function debugModals() {
    console.log('🔍 Ищем правильные селекторы для модалок...\n');
    
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
            timeout: 60000
        });
        
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        console.log('2. Находим первый товар и кликаем...');
        await page.evaluate(() => {
            const cards = document.querySelectorAll('[id*="product-card"]');
            if (cards.length > 0) {
                cards[0].click();
                console.log(`   Кликнули по карте: ${cards[0].textContent?.substring(0, 50)}`);
            }
        });
        
        console.log('3. Ждем открытия модалки...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('4. Ищем модалку разными способами...\n');
        
        const modalInfo = await page.evaluate(() => {
            const results = {};
            
            // Try different modal selectors
            results['[role="dialog"]'] = document.querySelector('[role="dialog"]')?.textContent?.length || 0;
            results['.modal'] = document.querySelector('.modal')?.textContent?.length || 0;
            results['[class*="Modal"]'] = document.querySelector('[class*="Modal"]')?.textContent?.length || 0;
            results['[class*="modal"]'] = document.querySelector('[class*="modal"]')?.textContent?.length || 0;
            
            // Find all elements with Russian text
            const russianElements = Array.from(document.querySelectorAll('*')).filter(el => {
                const text = el.textContent?.trim();
                return text && /[а-яё]/i.test(text) && text.length > 50 && text.length < 2000;
            });
            
            results.potentialContent = russianElements.slice(0, 5).map(el => ({
                tag: el.tagName,
                class: el.className?.substring(0, 100),
                text: el.textContent?.trim().substring(0, 200)
            }));
            
            // Look for specific keywords
            const allText = document.body.textContent;
            results.hasComposition = allText.includes('Состав');
            results.hasDescription = allText.includes('Описание');
            results.hasNutrition = allText.includes('Пищевая ценность') || allText.includes('КБЖУ');
            
            return results;
        });
        
        console.log('📊 Размеры контента в разных селекторах:');
        Object.entries(modalInfo).forEach(([key, value]) => {
            if (key !== 'potentialContent' && typeof value === 'boolean') {
                console.log(`   ${key}: ${value ? '✅' : '❌'}`);
            } else if (typeof value === 'number') {
                console.log(`   ${key}: ${value} символов`);
            }
        });
        
        console.log('\n📝 Потенциальный контент с русским текстом:');
        modalInfo.potentialContent.forEach((item, i) => {
            console.log(`\n   ${i+1}) <${item.tag}> class="${item.class}"`);
            console.log(`      Текст: "${item.text}..."`);
        });
        
        // Save full HTML for analysis
        const html = await page.content();
        const htmlFile = path.join(__dirname, 'modal-debug.html');
        fs.writeFileSync(htmlFile, html);
        console.log(`\n💾 Полный HTML сохранен в ${htmlFile}`);
        
    } catch (error) {
        console.error('❌ Ошибка:', error.message);
    } finally {
        if (browser) await browser.close();
    }
}

debugModals();
