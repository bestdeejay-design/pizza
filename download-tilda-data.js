const https = require('https');
const fs = require('fs');

console.log('🔄 Скачиваем JS файл с данными каталога Tilda...\n');

const jsUrl = 'https://static.tildacdn.com/ws/project8241972/tilda-blocks-page75494536.min.js?t=1772208413';

https.get(jsUrl, (res) => {
    let data = '';
    res.setEncoding('utf8');
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        // Сохраняем JS файл
        fs.writeFileSync('./raw-content/tilda-catalog.js', data);
        console.log(`✅ JS файл сохранён (${(data.length / 1024).toFixed(2)} KB)\n`);
        
        // Ищем названия товаров в JS
        const patterns = [
            /name:"([^"]*(?:пицца|кальцоне|фокачча|хлеб|соус)[^"]*)"/gi,
            /title:"([^"]+)"/gi,
        ];
        
        const products = new Set();
        
        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(data)) !== null) {
                const name = match[1];
                if (name && name.length > 2 && name.length < 100) {
                    products.add(name);
                }
            }
        });
        
        if (products.size > 0) {
            console.log(`🍕 НАЙДЕНО ПОЗИЦИЙ: ${products.size}\n`);
            console.log('Список:');
            Array.from(products).forEach((p, i) => {
                console.log(`${i+1}. ${p}`);
            });
            
            // Сохраняем список
            fs.writeFileSync(
                './raw-content/products-from-js.txt',
                Array.from(products).join('\n'),
                'utf8'
            );
            console.log('\n💾 Сохранено в: ./raw-content/products-from-js.txt\n');
        } else {
            console.log('❌ Товары не найдены в JS файле');
        }
    });
}).on('error', (err) => {
    console.error('❌ Ошибка:', err.message);
});
