#!/usr/bin/env node

/**
 * Скрипт для сбора описаний товаров из content-final.json
 * и добавления их в menu-complete.json
 */

const fs = require('fs');
const path = require('path');

// Пути к файлам
const contentFinalPath = path.join(__dirname, 'dok', 'content-final.json');
const menuCompletePath = path.join(__dirname, 'menu-complete.json');
const outputPath = path.join(__dirname, 'menu-complete-with-descriptions.json');

console.log('🔍 Чтение content-final.json...');
const contentFinal = JSON.parse(fs.readFileSync(contentFinalPath, 'utf-8'));

console.log('🔍 Чтение menu-complete.json...');
const menuComplete = JSON.parse(fs.readFileSync(menuCompletePath, 'utf-8'));

// Создаем мапу описаний из content-final
const descriptionsMap = new Map();
if (contentFinal.menu && Array.isArray(contentFinal.menu)) {
    contentFinal.menu.forEach(item => {
        if (item.title && item.description) {
            // Сохраняем описание по названию
            descriptionsMap.set(item.title.toLowerCase(), item.description);
        }
    });
    console.log(`✅ Найдено ${descriptionsMap.size} описаний товаров`);
} else {
    console.log('⚠️  В content-final.json нет меню с описаниями');
}

// Функция для поиска подходящего описания
function findDescription(title) {
    const titleLower = title.toLowerCase();
    
    // Прямое совпадение
    if (descriptionsMap.has(titleLower)) {
        return descriptionsMap.get(titleLower);
    }
    
    // Частичное совпадение по ключевым словам
    const keywords = {
        'маргарита': 'Томатный соус, моцарелла, базилик — классика неаполитанской пиццы',
        'пепперони': 'Томатный соус, моцарелла, пикантная колбаса пепперони',
        'четыре сыра': 'Моцарелла, пармезан, горгонзола, рикотта — насыщенный сливочный вкус',
        'диабло': 'Томатный соус, моцарелла, халапеньо, острая чоризо — для любителей острого',
        'bbq': 'Куриная грудка, соус BBQ, красный лук, моцарелла',
        'морепродукты': 'Креветки, мидии, кальмары, томатный соус, моцарелла',
        'кальцоне.*ветчина.*гриб': 'Закрытая пицца с ветчиной, шампиньонами, моцареллой и томатным соусом',
        'кальцоне.*рикотт': 'Рикотта, моцарелла, шпинат, кедровые орешки',
        'фокачча.*оливк': 'Итальянский хлеб с оливковым маслом, розмарином и морской солью',
        'фокачча.*томат': 'Фокачча с вялеными томатами, оливками и прованскими травами',
        'соус.*маринар': 'Фирменный томатный соус с чесноком и орегано',
        'соус.*альфред': 'Сливочный соус с пармезаном и чесноком'
    };
    
    for (const [pattern, description] of Object.entries(keywords)) {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(titleLower)) {
            return description;
        }
    }
    
    return '';
}

// Добавляем описания ко всем товарам
let addedCount = 0;
const categories = menuComplete.menu;

for (const category in categories) {
    if (Array.isArray(categories[category])) {
        categories[category].forEach(product => {
            if (!product.description || product.description === '') {
                const description = findDescription(product.title);
                if (description) {
                    product.description = description;
                    addedCount++;
                }
            }
        });
    }
}

console.log(`✅ Добавлено ${addedCount} описаний`);

// Сохраняем результат
console.log('💾 Сохранение в menu-complete-with-descriptions.json...');
fs.writeFileSync(outputPath, JSON.stringify(menuComplete, null, 2), 'utf-8');
console.log(`✅ Файл сохранен: ${outputPath}`);

console.log('\n📊 Статистика:');
console.log(`   Всего товаров: ${menuComplete.statistics ? Object.values(menuComplete.statistics).reduce((a, b) => a + b, 0) : 'N/A'}`);
console.log(`   Добавлено описаний: ${addedCount}`);
console.log(`   Процент описаний: ${((addedCount / (menuComplete.statistics ? Object.values(menuComplete.statistics).reduce((a, b) => a + b, 0) : 1)) * 100).toFixed(1)}%`);
