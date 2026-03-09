#!/usr/bin/env node
/**
 * Скрипт для сбора описаний товаров с сайта pizzanapolirsc.ru
 * 
 * Использование:
 * 1. Открыть сайт https://pizzanapolirsc.ru/
 * 2. Открыть DevTools Console (F12)
 * 3. Вставить этот код и нажать Enter
 * 4. Скопировать результат в файл descriptions-temp.json
 * 5. Запустить merge-descriptions.js для объединения
 */

console.log('🔍 Сбор описаний товаров с pizzanapolirsc.ru...\n');

// Функция для извлечения данных со страницы
function scrapeProductDescriptions() {
    const products = [];
    
    // Находим все карточки товаров на странице
    const productCards = document.querySelectorAll('.js-product-card, .product-item, [data-product-id], .t-store__card');
    
    console.log(`Найдено товаров: ${productCards.length}\n`);
    
    productCards.forEach((card, index) => {
        // Пробуем разные селекторы для названий
        const titleElement = card.querySelector('.js-product-title, .product-title, .t-store__card__title, h3, .name');
        const descElement = card.querySelector('.js-product-desc, .product-description, .t-store__card__desc, .description, p');
        const priceElement = card.querySelector('.js-product-price, .product-price, .t-store__card__price, .price');
        
        const title = titleElement ? titleElement.textContent.trim() : '';
        const description = descElement ? descElement.textContent.trim() : '';
        const price = priceElement ? priceElement.textContent.trim() : '';
        
        if (title) {
            products.push({
                title: title,
                description: description || '',
                price: price || '',
                category: 'unknown' // Нужно будет определить вручную
            });
            
            if (index < 5) {
                console.log(`${index + 1}. ${title}`);
                if (description) {
                    console.log(`   Описание: ${description.substring(0, 100)}...`);
                }
                console.log('');
            }
        }
    });
    
    console.log(`\n✅ Всего собрано: ${products.length} товаров`);
    console.log('\n💾 Скопируйте этот JSON и сохраните как descriptions-temp.json:\n');
    console.log(JSON.stringify(products, null, 2));
    
    return products;
}

// Запуск сбора данных
scrapeProductDescriptions();
