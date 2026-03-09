const https = require('https');
const fs = require('fs');
const path = require('path');

const URL = 'https://pizzanapolirsc.ru/';
const OUTPUT_DIR = './raw-content';

// Создаём папку для контента
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
}

console.log('🔄 Начинаем ПОЛНЫЙ сбор контента с pizzanapolirsc.ru...\n');

// Скачивание HTML
function fetchHtml(url) {
    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml'
            }
        };
        
        https.get(url, options, (res) => {
            let data = '';
            res.setEncoding('utf8');
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                // Сохраняем исходный HTML
                fs.writeFileSync(path.join(OUTPUT_DIR, 'source.html'), data, 'utf8');
                resolve(data);
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

// Извлечение ВСЕХ изображений
function extractAllImages(html) {
    const images = {
        logos: [],
        banners: [],
        products: [],
        backgrounds: [],
        icons: [],
        all: new Set()
    };
    
    // Все паттерны для изображений
    const patterns = [
        /data-original=["'](https:\/\/static\.tildacdn\.com\/[^"']+)[\"']/gi,
        /background-image:url\(['"]?(https:\/\/static\.tildacdn\.com\/[^)"']+)['"]?\)/gi,
        /src=["'](https:\/\/static\.tildacdn\.com\/[^"']+)[\"']/gi,
        /content=["'](https:\/\/static\.tildacdn\.com\/[^"']+)[\"']/gi,
        /href=["'](https:\/\/static\.tildacdn\.com\/[^"']+\.jpg)["']/gi,
        /href=["'](https:\/\/static\.tildacdn\.com\/[^"']+\.png)["']/gi,
        /href=["'](https:\/\/static\.tildacdn\.com\/[^"']+\.jpeg)["']/gi
    ];
    
    patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(html)) !== null) {
            let url = match[1];
            // Убираем resize Tilda
            url = url.replace('/-/resize/', '/').replace(/\/\d+x\//, '/');
            
            if (url.includes('tildacdn.com') && 
                !url.includes('.js') && 
                !url.includes('.css')) {
                images.all.add(url);
                
                // Классифицируем изображения
                if (url.includes('logo') || url.includes('favicon')) {
                    images.logos.push(url);
                } else if (url.includes('banner') || url.includes('promo') || url.includes('hero')) {
                    images.banners.push(url);
                } else if (url.includes('pizza') || url.includes('food') || url.match(/_\d+\./)) {
                    images.products.push(url);
                } else if (url.includes('bg') || url.includes('background')) {
                    images.backgrounds.push(url);
                } else {
                    images.icons.push(url);
                }
            }
        }
    });
    
    return {
        logos: [...new Set(images.logos)],
        banners: [...new Set(images.banners)],
        products: [...new Set(images.products)],
        backgrounds: [...new Set(images.backgrounds)],
        icons: [...new Set(images.icons)],
        all: [...images.all]
    };
}

// Извлечение ВСЕГО меню
function extractFullMenu(html) {
    const menuItems = [];
    
    // Ищем все карточки товаров Tilda
    // Паттерн 1: t-card__title + t-card__descr + цена
    const cardPattern1 = /t-card__title[^>]*>([^<]+)<\/div>[\s\S]{0,500}?t-card__descr[^>]*>([^<]+)<\/div>[\s\S]{0,500}?(?:t-btn|price|t-price)[^>]*>([^<]*(?:₽|руб|\d{3}\s*\d{2})[^<]*)/gi;
    
    let match;
    let id = 1;
    
    while ((match = cardPattern1.exec(html)) !== null) {
        const title = match[1]?.trim();
        const description = match[2]?.trim();
        const priceText = match[3]?.trim();
        const price = parseInt(priceText.replace(/[^\d]/g, ''));
        
        if (title && price > 0) {
            menuItems.push({
                id: id++,
                title: title,
                description: description || 'Классический рецепт',
                price: price,
                category: categorizeItem(title),
                image: null
            });
        }
    }
    
    // Паттерн 2: Ищем в блоках t772 (галерея товаров)
    const galleryPattern = /t772__title[^>]*>([^<]+)<\/div>[\s\S]{0,300}?t772__descr[^>]*>([^<]+)<\/div>/gi;
    
    while ((match = galleryPattern.exec(html)) !== null) {
        const title = match[1]?.trim();
        const description = match[2]?.trim();
        
        if (title && !menuItems.find(item => item.title === title)) {
            menuItems.push({
                id: id++,
                title: title,
                description: description || '',
                price: 0, // Цена будет найдена отдельно
                category: categorizeItem(title),
                image: null
            });
        }
    }
    
    return menuItems;
}

function categorizeItem(title) {
    const lower = title.toLowerCase();
    if (lower.includes('кальцоне')) return 'calzone';
    if (lower.includes('салат')) return 'salad';
    if (lower.includes('соус')) return 'sauce';
    if (lower.includes('фокачч')) return 'focaccia';
    if (lower.includes('хлеб')) return 'bread';
    if (lower.includes('ролл') || lower.includes('суши')) return 'rolls';
    if (lower.includes('напитк') || lower.includes('кола') || lower.includes('чай')) return 'drinks';
    return 'pizza';
}

// Извлечение текстов
function extractAllTexts(html) {
    const texts = {};
    
    // Заголовки
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    texts.title = titleMatch ? titleMatch[1].trim() : null;
    
    // Meta description
    const descMatch = html.match(/<meta[^>]*description["'][^>]*content=["']([^"']*)["'][^>]*>/i);
    texts.description = descMatch ? descMatch[1] : null;
    
    // OG tags
    const ogTitle = html.match(/<meta[^>]*og:title["'][^>]*content=["']([^"']*)["'][^>]*>/i);
    texts.ogTitle = ogTitle ? ogTitle[1] : null;
    
    // Телефоны
    const phones = [];
    const phonePattern = /tel:([+\d()\- ]+)/gi;
    let phoneMatch;
    while ((phoneMatch = phonePattern.exec(html)) !== null) {
        phones.push(phoneMatch[1]);
    }
    texts.phones = [...new Set(phones)];
    
    // Адреса
    const addressPattern = /(Санкт-Петербург[^<]{0,100}?ул\.[^<]{0,50}?)/gi;
    const addressMatch = html.match(addressPattern);
    texts.address = addressMatch ? addressMatch[0].trim() : null;
    
    // Время работы
    const hoursPattern = /(\d{2}:\d{2}\s*[-–]\s*\d{2}:\d{2})/gi;
    const hoursMatch = html.match(hoursPattern);
    texts.hours = hoursMatch ? hoursMatch[0] : null;
    
    // Акция
    const promoPattern = /(Каждая \d+-[яй].*?БЕСПЛАТНО)/si;
    const promoMatch = html.match(promoPattern);
    texts.promo = promoMatch ? promoMatch[1].trim() : null;
    
    // Все заголовки h1, h2, h3
    const headings = [];
    const headingPattern = /<(h[1-6])[^>]*>([^<]+)<\/\1>/gi;
    let headingMatch;
    while ((headingMatch = headingPattern.exec(html)) !== null) {
        headings.push({
            level: headingMatch[1],
            text: headingMatch[2].trim()
        });
    }
    texts.headings = headings;
    
    return texts;
}

// Извлечение зон доставки
function extractDeliveryZones(html) {
    const zones = [];
    
    // Ищем массив zones в JavaScript
    const zonesMatch = html.match(/zones\s*=\s*\[([\s\S]*?)\];/);
    if (zonesMatch) {
        const zonePattern = /\{\s*id:\s*["']([^"']+)["'],\s*name:\s*["']([^"']+)["'],\s*cost:\s*(\d+),\s*freeFrom:\s*(\d+)/gi;
        let match;
        
        while ((match = zonePattern.exec(zonesMatch[1])) !== null) {
            zones.push({
                id: match[1],
                name: match[2],
                cost: parseInt(match[3]),
                freeFrom: parseInt(match[4])
            });
        }
    }
    
    return zones;
}

// Сохранение всего контента
async function saveAllContent() {
    try {
        console.log('📥 Загрузка полной страницы...');
        const html = await fetchHtml(URL);
        console.log(`   Размер HTML: ${(html.length / 1024).toFixed(2)} KB\n`);
        
        console.log('🖼️  Поиск ВСЕХ изображений...');
        const images = extractAllImages(html);
        console.log(`   Найдено изображений: ${images.all.length}`);
        console.log(`   - Логотипы: ${images.logos.length}`);
        console.log(`   - Баннеры: ${images.banners.length}`);
        console.log(`   - Товары: ${images.products.length}`);
        console.log(`   - Фоны: ${images.backgrounds.length}`);
        console.log(`   - Иконки: ${images.icons.length}\n`);
        
        console.log('🍕 Извлечение ВСЕГО меню...');
        const menu = extractFullMenu(html);
        console.log(`   Найдено позиций: ${menu.length}\n`);
        
        console.log('📝 Извлечение всех текстов...');
        const texts = extractAllTexts(html);
        
        console.log('🚚 Извлечение зон доставки...');
        const zones = extractDeliveryZones(html);
        console.log(`   Найдено зон: ${zones.length}\n`);
        
        // Сопоставляем изображения с меню
        const productImages = images.products.filter(img => 
            img.includes('pizza') || img.includes('food') || img.match(/_\d+\./)
        );
        
        menu.forEach((item, index) => {
            if (productImages[index]) {
                item.image = productImages[index];
            }
        });
        
        // Формируем полный контент
        const fullContent = {
            collectedAt: new Date().toISOString(),
            source: URL,
            general: {
                title: texts.title,
                description: texts.description,
                ogTitle: texts.ogTitle,
                promo: texts.promo,
                headings: texts.headings
            },
            contacts: {
                phones: texts.phones,
                address: texts.address,
                hours: texts.hours
            },
            menu: {
                items: menu,
                total: menu.length,
                categories: [...new Set(menu.map(item => item.category))]
            },
            delivery: {
                zones: zones
            },
            images: {
                logos: images.logos,
                banners: images.banners,
                products: images.products,
                backgrounds: images.backgrounds,
                icons: images.icons,
                all: images.all,
                hero: images.banners[0] || images.products[0] || images.all[0]
            },
            statistics: {
                totalImages: images.all.length,
                totalMenuItems: menu.length,
                totalDeliveryZones: zones.length,
                hasPromo: !!texts.promo,
                hasContacts: texts.phones.length > 0
            }
        };
        
        // Сохраняем JSON
        fs.writeFileSync(
            path.join(OUTPUT_DIR, 'full-content.json'),
            JSON.stringify(fullContent, null, 2),
            'utf8'
        );
        
        // Сохраняем изображения списком
        fs.writeFileSync(
            path.join(OUTPUT_DIR, 'image-list.txt'),
            images.all.join('\n'),
            'utf8'
        );
        
        console.log('✅ ДАННЫЕ СОХРАНЕНЫ В:');
        console.log(`   📄 ${OUTPUT_DIR}/source.html (исходный HTML)`);
        console.log(`   📄 ${OUTPUT_DIR}/full-content.json (все данные)`);
        console.log(`   📄 ${OUTPUT_DIR}/image-list.txt (список изображений)\n`);
        
        console.log('📊 СТАТИСТИКА:');
        console.table({
            'Изображений': images.all.length,
            'Позиций меню': menu.length,
            'Зон доставки': zones.length,
            'Логотипов': images.logos.length,
            'Баннеров': images.banners.length,
            'Товарных фото': images.products.length
        });
        
        console.log('\n📋 КАТЕГОРИИ МЕНЮ:');
        const categories = {};
        menu.forEach(item => {
            categories[item.category] = (categories[item.category] || 0) + 1;
        });
        console.table(categories);
        
        console.log('\n💡 Следующий шаг:');
        console.log('   Откройте ' + OUTPUT_DIR + '/full-content.json и используйте ВСЕ данные для создания сайта\n');
        
    } catch (error) {
        console.error('❌ Ошибка:', error.message);
        console.log('\nПопробуйте открыть сайт вручную и скопировать данные\n');
    }
}

saveAllContent();
