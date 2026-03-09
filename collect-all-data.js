/**
 * Сбор всех данных о товарах в один файл
 * Объединяет menu-final.json + данные из Яндекс Еды
 */

const fs = require('fs');
const path = require('path');

console.log('🍕 Сбор полных данных о товарах...\n');

// Читаем все источники
const menuFinal = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'menu-final.json'), 'utf8'));

const yandexDataPath = path.join(__dirname, 'yandex-data-clean.json');
const yandexModalPath = path.join(__dirname, 'yandex-modal-data.json');

let yandexClean = [];
let yandexModal = [];

if (fs.existsSync(yandexDataPath)) {
    yandexClean = JSON.parse(fs.readFileSync(yandexDataPath, 'utf8'));
    console.log(`✅ Yandex Eda (веса): ${yandexClean.length} товаров`);
} else {
    console.log('⚠️  yandex-data-clean.json не найден - пропускаем веса');
}

if (fs.existsSync(yandexModalPath)) {
    yandexModal = JSON.parse(fs.readFileSync(yandexModalPath, 'utf8'));
    console.log(`✅ Yandex Modal (состав + КБЖУ): ${yandexModal.length} товаров`);
} else {
    console.log('⚠️  yandex-modal-data.json не найден - пропускаем состав и КБЖУ');
}

// Создаем мапы для быстрого поиска
const yandexWeightMap = new Map();
yandexClean.forEach(item => {
    const key = item.title.toLowerCase().replace(/[^\w\sа-яё]/gi, '').replace(/\s+/g, ' ').trim();
    yandexWeightMap.set(key, item);
});

const yandexModalMap = new Map();
yandexModal.forEach(item => {
    const key = item.title.toLowerCase().replace(/[^\w\sа-яё]/gi, '').replace(/\s+/g, ' ').trim();
    yandexModalMap.set(key, item);
});

// Собираем полную информацию
const allProductsComplete = [];
let updatedCount = 0;

Object.keys(menuFinal.menu).forEach(categoryKey => {
    const items = menuFinal.menu[categoryKey];
    
    items.forEach(item => {
        // Нормализуем название для поиска
        const normalizedTitle = item.title.toLowerCase()
            .replace(/[^\w\sа-яё]/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
        
        // Ищем данные из Яндекс Еды
        const yandexItem = yandexWeightMap.get(normalizedTitle);
        const yandexModalItem = yandexModalMap.get(normalizedTitle);
        
        // Собираем полный объект
        const completeProduct = {
            // Основные данные (уже есть)
            id: item.id,
            title: item.title,
            price: item.price,
            category: categoryKey,
            
            // Вес (берем из Яндекс Еды если точнее)
            weight: yandexItem?.weight || item.weight,
            
            // Описание (уже есть)
            description: item.description,
            
            // Новые данные из модалки Яндекс Еды ⭐
            ingredients: yandexModalItem?.ingredients || null,
            nutrition: yandexModalItem?.nutrition || null,
            
            // Дополнительно
            image: item.image
        };
        
        // Проверяем добавились ли новые данные
        if (completeProduct.ingredients || completeProduct.nutrition) {
            updatedCount++;
        }
        
        allProductsComplete.push(completeProduct);
    });
});

console.log(`\n✅ Всего собрано товаров: ${allProductsComplete.length}`);
console.log(`✅ Обновлено данными из Яндекс Еды: ${updatedCount}`);

// Статистика
const withIngredients = allProductsComplete.filter(p => p.ingredients).length;
const withNutrition = allProductsComplete.filter(p => p.nutrition).length;

console.log(`\n📊 Итоговая статистика:`);
console.log(`   С составом (ingredients): ${withIngredients} (${Math.round(withIngredients/allProductsComplete.length*100)}%)`);
console.log(`   С КБЖУ (nutrition): ${withNutrition} (${Math.round(withNutrition/allProductsComplete.length*100)}%)`);

// Примеры
console.log(`\n📋 Примеры товаров с полными данными:`);
const examples = allProductsComplete.filter(p => p.ingredients && p.nutrition).slice(0, 5);
examples.forEach((p, i) => {
    console.log(`\n${i+1}. ${p.title} (${p.price}₽)`);
    console.log(`   Вес: ${p.weight} г`);
    if (p.ingredients) {
        console.log(`   Состав: ${p.ingredients.substring(0, 100)}...`);
    }
    if (p.nutrition) {
        console.log(`   КБЖУ: ${JSON.stringify(p.nutrition)}`);
    }
});

// Сохранение
console.log(`\n\n💾 Сохранение данных...`);

// 1. Полный список всех товаров
const outputFileComplete = path.join(__dirname, 'ALL-PRODUCTS-COMPLETE.json');
fs.writeFileSync(outputFileComplete, JSON.stringify({
    totalProducts: allProductsComplete.length,
    collectedAt: new Date().toISOString(),
    statistics: {
        withIngredients,
        withNutrition,
        percentWithFullData: Math.round((withIngredients + withNutrition) / 2 / allProductsComplete.length * 100)
    },
    products: allProductsComplete
}, null, 2));

console.log(`✅ Сохранено: ${outputFileComplete}`);

// 2. Только товары с полными данными (состав + КБЖУ)
const productsWithFullData = allProductsComplete.filter(p => p.ingredients && p.nutrition);
const outputFileFullOnly = path.join(__dirname, 'PRODUCTS-WITH-FULL-DATA.json');
fs.writeFileSync(outputFileFullOnly, JSON.stringify({
    totalProducts: productsWithFullData.length,
    collectedAt: new Date().toISOString(),
    products: productsWithFullData
}, null, 2));

console.log(`✅ Сохранено: ${outputFileFullOnly}`);

console.log(`\n✅ Сбор данных завершен!\n`);
console.log(`📁 Файлы с результатами:`);
console.log(`   1. ALL-PRODUCTS-COMPLETE.json - ВСЕ товары с данными из Яндекс Еды`);
console.log(`   2. PRODUCTS-WITH-FULL-DATA.json - только товары с составом и КБЖУ`);
