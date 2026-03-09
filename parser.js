const fs = require('fs');
const https = require('https');
const http = require('http');

const URL = 'https://pizzanapolirsc.ru/';

// Скачивание HTML
function fetchHtml(url) {
    return new Promise((resolve, reject) => {
        const lib = url.startsWith('https') ? https : http;
        lib.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

// Парсинг данных
async function parseContent() {
    console.log('🔄 Загрузка контента...');
    const html = await fetchHtml(URL);
    
    const content = {
        title: extractMeta(html, 'og:title'),
        description: extractMeta(html, 'description'),
        images: extractImages(html),
        menu: extractMenuItems(html),
        promo: extractPromo(html),
        contacts: extractContacts(html),
        deliveryZones: extractDeliveryZones(html)
    };
    
    // Сохранение в JSON
    fs.writeFileSync('content.json', JSON.stringify(content, null, 2));
    console.log('✅ Контент сохранён в content.json');
    console.log('\n📊 Структура контента:');
    console.table({
        'Заголовок': content.title,
        'Описание': content.description?.substring(0, 100) + '...',
        'Изображений': content.images.length,
        'Позиций меню': content.menu.length,
        'Контакты': Object.keys(content.contacts).join(', ')
    });
}

function extractMeta(html, name) {
    const match = html.match(new RegExp(`<meta[^>]*${name}="([^"]*)"[^>]*>`));
    return match ? match[1] : null;
}

function extractImages(html) {
    const images = [];
    const matches = html.matchAll(/data-original=['"](https:\/\/static\.tildacdn\.com\/[^'"]+)['"]/g);
    for (const match of matches) {
        if (!images.includes(match[1])) {
            images.push(match[1]);
        }
    }
    return images;
}

function extractMenuItems(html) {
    const items = [];
    // Извлекаем названия пицц и цены из карточек товаров
    const cardRegex = /t-card__title[^>]*>([^<]+)<\/div>.*?t-card__descr[^>]*>([^<]+)<\/div>.*?t-btn[^>]*>([^<]+)<\/div>/gs;
    let match;
    
    while ((match = cardRegex.exec(html)) !== null) {
        items.push({
            title: match[1]?.trim(),
            description: match[2]?.trim(),
            price: match[3]?.trim()
        });
    }
    
    return items;
}

function extractPromo(html) {
    const promoMatch = html.match(/Каждая 13-я пицца.*?БЕСПЛАТНО/s);
    return promoMatch ? promoMatch[0] : null;
}

function extractContacts(html) {
    const phone = html.match(/tel:[+\d()\- ]+/)?.[0]?.replace('tel:', '');
    const address = html.match(/<[^>]*>[^<]*ул\.[^<]*<\/[^>]*>/)?.[0];
    return { phone, address };
}

function extractDeliveryZones(html) {
    const zonesMatch = html.match(/zones = \[([\s\S]*?)\];/);
    return zonesMatch ? zonesMatch[0] : null;
}

parseContent().catch(console.error);
