const https = require('https');

// Пытаемся получить данные через API Яндекс Еды
// Это упрощенный вариант - иногда работает лучше чем браузер

const options = {
    hostname: 'eda.yandex.ru',
    path: '/api/v1/catalog/pizza_napoli_bmroq',
    method: 'GET',
    headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json',
    }
};

const req = https.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        try {
            const jsonData = JSON.parse(data);
            console.log('✅ Получены данные от API');
            console.log(JSON.stringify(jsonData, null, 2).substring(0, 500));
        } catch(e) {
            console.log('❌ Не удалось распарсить JSON');
            console.log('Ответ:', data.substring(0, 200));
        }
    });
});

req.on('error', (e) => {
    console.log('❌ Ошибка:', e.message);
});

req.end();
