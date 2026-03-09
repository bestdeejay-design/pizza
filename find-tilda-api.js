const fs = require('fs');
const https = require('https');

console.log('🔄 Пытаюсь скачать данные каталога Tilda Store...\n');

const html = fs.readFileSync('./pizza.txt', 'utf8');

// Ищем идентификатор каталога
const catalogMatch = html.match(/data-store-catalog-id="([^"]+)"/);
const recId = html.match(/id="rec(\d+)"/);

console.log('🔍 Поиск идентификаторов...');

// Ищем URL API Tilda для загрузки товаров
const apiUrls = [];

// Паттерн 1: /tstore/catalog/...
const tstorePattern = /\/tstore\/catalog\/[^"'\s]+/gi;
let match;
while ((match = tstorePattern.exec(html)) !== null) {
    apiUrls.push(match[0]);
}

// Паттерн 2: JSON с товарами
const jsonPattern = /{"id":\d+,"title":"[^"]+","price":\d+/gi;
if (jsonPattern.test(html)) {
    console.log('✅ Найден JSON с товарами в HTML!');
}

// Паттерн 3: Скрипты с данными
const scriptSrcs = [];
const scriptPattern = /src=["'](https:\/\/static\.tildacdn\.com\/[^"']+\.js[^"']*)["']/gi;
while ((match = scriptPattern.exec(html)) !== null) {
    scriptSrcs.push(match[1]);
}

console.log('\n📊 НАЙДЕНО:');
console.table({
    'Tilda Store каталогов': apiUrls.length,
    'JS файлов со скриптами': scriptSrcs.length,
    'REC ID': recId ? recId[1] : 'не найден'
});

if (apiUrls.length > 0) {
    console.log('\n📥 Каталог Tilda Store:');
    apiUrls.forEach((url, i) => {
        console.log(`${i+1}. ${url}`);
    });
}

if (scriptSrcs.length > 0) {
    console.log('\n💾 JS файлы:');
    scriptSrcs.slice(0, 5).forEach((src, i) => {
        console.log(`${i+1}. ${src}`);
    });
}

// Пробуем скачать первый JS файл
if (scriptSrcs.length > 0) {
    const testJsUrl = scriptSrcs[0];
    console.log(`\n📥 Скачиваю тестовый JS: ${testJsUrl}`);
    
    https.get(testJsUrl, (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            fs.writeFileSync('./raw-content/tilda-script.js', data);
            console.log(`✅ JS сохранён (${(data.length / 1024).toFixed(2)} KB)`);
            
            // Ищем товары в JS
            const productsInJs = data.match(/"title":"([^"]+(?:пицца|кальцоне|хлеб)[^"]+)"/gi);
            if (productsInJs) {
                console.log(`\n🍕 Найдено товаров в JS: ${productsInJs.length}`);
                productsInJs.slice(0, 10).forEach(p => console.log(p));
            }
        });
    }).on('error', err => {
        console.error('❌ Ошибка:', err.message);
    });
}
