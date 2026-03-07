#!/usr/bin/env node

/**
 * Скрипт для разделения товаров по типам на основе названий
 * Создает menu-final.json с правильными категориями
 */

const fs = require('fs');
const path = require('path');

// Пути к файлам
const sourcePath = path.join(__dirname, 'menu-complete.json');
const outputPath = path.join(__dirname, 'menu-final.json');

console.log('🔍 Чтение menu-complete.json...');
const menuData = JSON.parse(fs.readFileSync(sourcePath, 'utf-8'));

// Создаем новые категории
const newMenu = {
    metadata: {
        ...menuData.metadata,
        description: 'Финальное меню с разделением по типам товаров',
        processedAt: new Date().toISOString()
    },
    statistics: {},
    categories: [],
    menu: {}
};

// Вспомогательные функции для определения типа товара
function getSushiType(title) {
    const titleLower = title.toLowerCase();
    if (titleLower.includes('суши') || titleLower.includes('сашими')) return 'sushi';
    if (titleLower.includes('ролл') || titleLower.includes('маки')) return 'rolls';
    if (titleLower.includes('гункан')) return 'gunkan';
    return 'rolls'; // по умолчанию
}

function getBeverageType(title) {
    const titleLower = title.toLowerCase();
    if (titleLower.includes('морс')) return 'mors';
    if (titleLower.includes('сок')) return 'juice';
    if (titleLower.includes('вода')) return 'water';
    if (titleLower.includes('лимонад') || titleLower.includes('газиров')) return 'soda';
    if (titleLower.includes('чай')) return 'tea';
    if (titleLower.includes('кофе')) return 'coffee';
    return 'beverages'; // по умолчанию
}

function getBreadType(title) {
    const titleLower = title.toLowerCase();
    if (titleLower.includes('фокачча')) return 'focaccia';
    if (titleLower.includes('хлеб') || titleLower.includes('хлебушк')) return 'bread';
    return 'bread'; // по умолчанию
}

// Обрабатываем каждую категорию
Object.entries(menuData.menu).forEach(([category, products]) => {
    if (!Array.isArray(products)) return;
    
    console.log(`\n📦 Обработка категории: ${category} (${products.length} товаров)`);
    
    if (category === 'rolls') {
        // Разделяем Суши & Роллы на подкатегории
        const subcategories = {
            sushi: [],
            rolls: [],
            gunkan: []
        };
        
        products.forEach((product, index) => {
            const type = getSushiType(product.title);
            subcategories[type].push({
                ...product,
                category: `${category}-${type}`,
                id: product.id || (index + 1)
            });
        });
        
        // Добавляем в новое меню
        Object.entries(subcategories).forEach(([type, items]) => {
            if (items.length > 0) {
                const newCategory = `${category}-${type}`;
                newMenu.menu[newCategory] = items;
                newMenu.statistics[newCategory] = items.length;
                console.log(`   ✅ ${newCategory}: ${items.length} товаров`);
            }
        });
        
    } else if (category === 'beverages') {
        // Разделяем Напитки на подкатегории
        const subcategories = {
            mors: [],
            juice: [],
            water: [],
            soda: [],
            tea: [],
            coffee: [],
            beverages: [] // остальные
        };
        
        products.forEach((product, index) => {
            const type = getBeverageType(product.title);
            subcategories[type].push({
                ...product,
                category: type === 'beverages' ? 'beverages-other' : type,
                id: product.id || (index + 1)
            });
        });
        
        // Добавляем в новое меню
        Object.entries(subcategories).forEach(([type, items]) => {
            if (items.length > 0) {
                const newCategory = type === 'beverages' ? 'beverages-other' : type;
                newMenu.menu[newCategory] = items;
                newMenu.statistics[newCategory] = items.length;
                console.log(`   ✅ ${newCategory}: ${items.length} товаров`);
            }
        });
        
    } else if (category === 'bread-focaccia') {
        // Разделяем Хлеб и Фокачча на подкатегории
        const subcategories = {
            bread: [],
            focaccia: []
        };
        
        products.forEach((product, index) => {
            const type = getBreadType(product.title);
            subcategories[type].push({
                ...product,
                category: `${category}-${type}`,
                id: product.id || (index + 1)
            });
        });
        
        // Добавляем в новое меню
        Object.entries(subcategories).forEach(([type, items]) => {
            if (items.length > 0) {
                const newCategory = `${category}-${type}`;
                newMenu.menu[newCategory] = items;
                newMenu.statistics[newCategory] = items.length;
                console.log(`   ✅ ${newCategory}: ${items.length} товаров`);
            }
        });
        
    } else {
        // Остальные категории оставляем как есть
        newMenu.menu[category] = products.map((product, index) => ({
            ...product,
            id: product.id || (index + 1)
        }));
        newMenu.statistics[category] = products.length;
        console.log(`   ✅ ${category}: ${products.length} товаров (без изменений)`);
    }
});

// Генерируем описания категорий
const categoryDescriptions = {
    'pizza-30cm': 'Классическая неаполитанская пицца диаметром 30 см',
    'piccolo-20cm': 'Мини пицца диаметром 20 см',
    'calzone': 'Закрытая пицца с различными начинками',
    'bread-focaccia-bread': 'Неаполитанский хлеб различных видов',
    'bread-focaccia-focaccia': 'Итальянская фокачча с разными начинками',
    'sauce': 'Соусы для подачи с бортиками пиццы',
    'sushi': 'Традиционные японские суши и сашими',
    'rolls': 'Классические и авторские роллы',
    'gunkan': 'Роллы в формате гункан',
    'combo': 'Наборы пицц и роллов',
    'confectionery': 'Итальянские десерты и печенья',
    'mors': 'Натуральные морсы собственного производства',
    'juice': 'Свежевыжатые и пакетированные соки',
    'water': 'Минеральная и столовая вода',
    'soda': 'Лимонады и газированные напитки',
    'tea': 'Чай горячий и холодный',
    'coffee': 'Кофе эспрессо и авторский',
    'beverages-other': 'Другие напитки',
    'frozen': 'Замороженные полуфабрикаты',
    'aromatic-oils': 'Ароматизированные масла',
    'masterclass': 'Обучение приготовлению пиццы',
    'franchise': 'Информация о франшизе'
};

// Создаем список категорий
Object.entries(newMenu.statistics).forEach(([id, count]) => {
    const namesMap = {
        'pizza-30cm': 'Пицца 30 см',
        'piccolo-20cm': 'Pizza Piccolo 20 см',
        'calzone': 'Кальцоне',
        'bread-focaccia-bread': 'Хлеб',
        'bread-focaccia-focaccia': 'Фокачча',
        'sauce': 'Соус к корочкам',
        'sushi': 'Суши',
        'rolls': 'Роллы',
        'gunkan': 'Гунканы',
        'combo': 'Комбо наборы',
        'confectionery': 'Кондитерские изделия',
        'mors': 'Морсы',
        'juice': 'Соки',
        'water': 'Вода',
        'soda': 'Газировка',
        'tea': 'Чай',
        'coffee': 'Кофе',
        'beverages-other': 'Другие напитки',
        'frozen': 'Замороженная продукция',
        'aromatic-oils': 'Ароматное масло',
        'masterclass': 'Мастер класс',
        'franchise': 'Франшиза'
    };
    
    newMenu.categories.push({
        id,
        name: namesMap[id] || id,
        count,
        description: categoryDescriptions[id] || ''
    });
});

// Сортируем категории
newMenu.categories.sort((a, b) => a.name.localeCompare(b.name));

// Сохраняем результат
console.log('\n💾 Сохранение в menu-final.json...');
fs.writeFileSync(outputPath, JSON.stringify(newMenu, null, 2), 'utf-8');

console.log('\n📊 Статистика:');
console.log(`   Всего категорий: ${Object.keys(newMenu.menu).length}`);
console.log(`   Всего товаров: ${Object.values(newMenu.statistics).reduce((a, b) => a + b, 0)}`);
console.log(`\n✅ Файл сохранен: ${outputPath}`);

// Выводим структуру
console.log('\n📋 Структура меню:');
Object.entries(newMenu.statistics).forEach(([cat, count]) => {
    console.log(`   ${cat}: ${count}`);
});
