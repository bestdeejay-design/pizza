/**
 * Простой парсер Яндекс Еды с использованием fetch + cheerio
 * Не требует браузера, работает быстрее
 */

const https = require('https');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const CONFIG = {
    url: 'https://eda.yandex.ru/r/pizza_napoli_bmroq',
    output: path.join(__dirname, 'yandex-data-simple.json'),
    timeout: 30000
};

function fetchPage(url) {
    return new Promise((resolve, reject) => {
        console.log(`📥 Загрузка ${url}...`);
        
        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
            }
        };
        
        https.get(url, options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                resolve(data);
            });
        }).on('error', (err) => {
            reject(err);
        });
        
        setTimeout(() => {
            reject(new Error('Timeout'));
        }, CONFIG.timeout);
    });
}

async function parseYandexEdaSimple() {
    console.log('🚀 Yandex Eda Simple Parser запущен...\n');
    
    try {
        // Загружаем HTML
        const html = await fetchPage(CONFIG.url);
        console.log(`✅ Загружено ${Math.round(html.length / 1024)} KB\n`);
        
        // Парсим через Cheerio
        console.log('🔍 Парсинг HTML...');
        const $ = cheerio.load(html);
        
        // Ищем карточки товаров
        let products = [];
        
        // Пробуем найти по ID
        $('[id*="product-card-v2-root"]').each((i, elem) => {
            const text = $(elem).text();
            const product = extractProductInfo(text);
            if (product.title) {
                products.push(product);
            }
        });
        
        // Если не найдено, пробуем по классу
        if (products.length === 0) {
            $('[class*="ProductCardV2_root"]').each((i, elem) => {
                const text = $(elem).text();
                const product = extractProductInfo(text);
                if (product.title) {
                    products.push(product);
                }
            });
        }
        
        console.log(`✅ Найдено товаров: ${products.length}\n`);
        
        // Статистика
        const withWeight = products.filter(p => p.weight).length;
        const withPrice = products.filter(p => p.price).length;
        
        console.log('📊 Статистика:');
        console.log(`   С весом: ${withWeight}/${products.length}`);
        console.log(`   С ценой: ${withPrice}/${products.length}\n`);
        
        // Примеры
        console.log('📋 Примеры данных:');
        products.slice(0, 5).forEach((p, i) => {
            console.log(`${i+1}. ${p.title}`);
            console.log(`   Вес: ${p.weight || 'нет'} г`);
            console.log(`   Цена: ${p.price || 'нет'} ₽\n`);
        });
        
        // Сохранение
        console.log(`💾 Сохранение в ${CONFIG.output}...`);
        fs.writeFileSync(CONFIG.output, JSON.stringify(products, null, 2));
        console.log('✅ Готово!\n');
        
        return products;
        
    } catch (error) {
        console.error('❌ Ошибка:', error.message);
        throw error;
    }
}

function extractProductInfo(text) {
    const lines = text.split('\n').filter(l => l.trim());
    
    let title = '';
    let weight = null;
    let price = null;
    
    for (const line of lines) {
        const cleanLine = line.replace(/^-?\d+%/, '').trim();
        
        // Ищем вес
        if (!weight && /(\\d+)\\s*(г|гр)/i.test(cleanLine)) {
            const match = cleanLine.match(/(\\d+)\\s*(г|гр)/i);
            if (match) {
                weight = parseInt(match[1]);
            }
        }
        
        // Ищем цену
        if (!price && /(\\d+)\\s*₽/.test(cleanLine)) {
            const match = cleanLine.match(/(\\d+)\\s*₽/);
            if (match) {
                price = parseInt(match[1]);
            }
        }
        
        // Ищем название
        if (!title && cleanLine.length > 5 && !/^\\d+\\s*₽/.test(cleanLine)) {
            if (cleanLine.includes(' г')) {
                const nameMatch = cleanLine.match(/^(.+?)\\s*\\d+\\s*г/);
                if (nameMatch) {
                    title = nameMatch[1].trim();
                }
            } else {
                title = cleanLine;
            }
        }
    }
    
    return { title, weight, price };
}

// Запуск
parseYandexEdaSimple()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
