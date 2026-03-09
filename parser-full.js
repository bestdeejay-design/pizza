const https = require('https');
const fs = require('fs');

const URL = 'https://pizzanapolirsc.ru/';

console.log('🔄 Начинаем сбор контента с pizzanapolirsc.ru...\n');

// Скачивание HTML
function fetchHtml(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.setEncoding('utf8');
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

// Извлечение всех изображений
function extractImages(html) {
    const images = new Set();
    
    // Ищем все изображения Tilda CDN
    const patterns = [
        /data-original=["'](https:\/\/static\.tildacdn\.com\/[^"']+)[\"']/gi,
        /background-image:url\(['"]?(https:\/\/static\.tildacdn\.com\/[^)"']+)['"]?\)/gi,
        /src=["'](https:\/\/static\.tildacdn\.com\/[^"']+)[\"']/gi,
        /content=["'](https:\/\/static\.tildacdn\.com\/[^"']+)[\"']/gi
    ];
    
    patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(html)) !== null) {
            const url = match[1].replace('/-/resize/', '/').replace(/\/\d+x\//, '/');
            if (url.includes('tildacdn.com') && !images.has(url)) {
                images.add(url);
            }
        }
    });
    
    return Array.from(images);
}

// Извлечение текстов
function extractTexts(html) {
    const texts = {
        title: extractMeta(html, 'og:title'),
        description: extractMeta(html, 'description'),
        phone: extractPhone(html),
        address: extractAddress(html),
        hours: extractHours(html),
        promo: extractPromo(html)
    };
    return texts;
}

function extractMeta(html, name) {
    const regex = new RegExp(`<meta[^>]*${name}=["']([^"']*)["'][^>]*>`, 'i');
    const match = html.match(regex);
    return match ? match[1] : null;
}

function extractPhone(html) {
    const match = html.match(/href=["']tel:([^"']+)["']/i);
    return match ? match[1] : null;
}

function extractAddress(html) {
    const match = html.match(/Санкт-Петербург[^<]*/i);
    return match ? match[0].trim() : 'Не указано';
}

function extractHours(html) {
    const match = html.match(/\d{2}:\d{2}\s*-\s*\d{2}:\d{2}/g);
    return match ? match[0] : '11:00 - 23:00';
}

function extractPromo(html) {
    const match = html.match(/Каждая \d+-[яй] пицца.*?БЕСПЛАТНО/si);
    return match ? match[0].trim() : 'Акция: Каждая 13-я пицца бесплатно!';
}

// Извлечение меню
function extractMenu(html) {
    const menuItems = [];
    
    // Ищем карточки товаров Tilda
    const cardRegex = /t-card__title[^>]*>([^<]+)<\/div>[\s\S]*?t-card__descr[^>]*>([^<]+)<\/div>[\s\S]*?(?:t-btn|price)[^>]*>([^<]+(?:₽|руб)[^<]*)/gi;
    let match;
    
    while ((match = cardRegex.exec(html)) !== null) {
        const title = match[1]?.trim();
        const description = match[2]?.trim();
        const priceText = match[3]?.trim();
        const price = parseInt(priceText.replace(/[^\d]/g, ''));
        
        if (title && price) {
            menuItems.push({
                id: menuItems.length + 1,
                title: title,
                description: description || 'Классический рецепт',
                price: price,
                category: categorizeItem(title),
                image: null // Будет заполнено позже
            });
        }
    }
    
    return menuItems;
}

function categorizeItem(title) {
    const lower = title.toLowerCase();
    if (lower.includes('кальцоне')) return 'calzone';
    if (lower.includes('салат') || lower.includes('закус')) return 'sides';
    return 'pizza';
}

// Извлечение зон доставки
function extractDeliveryZones(html) {
    const zonesMatch = html.match(/zones\s*=\s*\[([\s\S]*?)\];/);
    if (!zonesMatch) return null;
    
    const zones = [];
    const zoneRegex = /\{\s*id:\s*["']([^"']+)["'],\s*name:\s*["']([^"']+)["'],\s*cost:\s*(\d+),\s*freeFrom:\s*(\d+)/gi;
    let match;
    
    while ((match = zoneRegex.exec(html)) !== null) {
        zones.push({
            id: match[1],
            name: match[2],
            cost: parseInt(match[3]),
            freeFrom: parseInt(match[4])
        });
    }
    
    return zones;
}

// Сохранение данных
async function saveContent() {
    try {
        console.log('📥 Загрузка страницы...');
        const html = await fetchHtml(URL);
        
        console.log('🖼️  Поиск изображений...');
        const images = extractImages(html);
        console.log(`   Найдено: ${images.length} изображений`);
        
        console.log('📝 Извлечение текстов...');
        const texts = extractTexts(html);
        
        console.log('🍕 Извлечение меню...');
        const menu = extractMenu(html);
        console.log(`   Найдено: ${menu.length} позиций`);
        
        console.log('🚚 Извлечение зон доставки...');
        const zones = extractDeliveryZones(html);
        console.log(`   Найдено: ${zones ? zones.length : 0} зон`);
        
        // Распределяем изображения по меню
        const foodImages = images.filter(img => 
            img.includes('pizza') || img.includes('food') || img.includes('_1.jpg')
        );
        
        menu.forEach((item, index) => {
            if (foodImages[index]) {
                item.image = foodImages[index];
            } else {
                // Используем placeholder если нет фото
                item.image = `https://source.unsplash.com/600x400/?pizza,${item.category}`;
            }
        });
        
        const content = {
            collectedAt: new Date().toISOString(),
            source: URL,
            general: {
                title: texts.title,
                description: texts.description,
                promo: texts.promo
            },
            contacts: {
                phone: texts.phone,
                address: texts.address,
                hours: texts.hours
            },
            menu: menu,
            delivery: {
                zones: zones || []
            },
            images: {
                all: images,
                hero: images[0] || 'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=1200',
                menu: foodImages
            }
        };
        
        // Сохраняем в JSON
        fs.writeFileSync('content-full.json', JSON.stringify(content, null, 2), 'utf8');
        console.log('\n✅ Данные сохранены в content-full.json\n');
        
        // Вывод статистики
        console.log('📊 СТАТИСТИКА:');
        console.table({
            'Изображений': images.length,
            'Позиций меню': menu.length,
            'Зон доставки': zones ? zones.length : 0,
            'Заголовок': texts.title ? '✓' : '✗',
            'Телефон': texts.phone ? '✓' : '✗',
            'Адрес': texts.address ? '✓' : '✗'
        });
        
        console.log('\n📋 МЕНЮ:');
        menu.forEach(item => {
            console.log(`   ${item.id}. ${item.title} — ${item.price} ₽`);
        });
        
        if (zones && zones.length > 0) {
            console.log('\n🚚 ДОСТАВКА:');
            zones.forEach(zone => {
                console.log(`   ${zone.name}: ${zone.cost} ₽ (бесплатно от ${zone.freeFrom} ₽)`);
            });
        }
        
        console.log('\n💡 Следующий шаг:');
        console.log('   Откройте content-full.json и используйте данные для обновления сайта\n');
        
    } catch (error) {
        console.error('❌ Ошибка:', error.message);
        console.log('\nПопробуйте открыть сайт вручную и скопировать данные\n');
    }
}

saveContent();
