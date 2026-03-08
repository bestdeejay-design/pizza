// Добавить веса ко всем товарам в menu-final.json
// На основе категории и логики

const fs = require('fs');

// Читаем меню
const menuData = JSON.parse(fs.readFileSync('menu-final.json', 'utf8'));

// Веса по категориям (в граммах)
const WEIGHTS = {
    // Пицца 30см - большая
    'pizza-30cm': { min: 450, max: 600 },
    
    // Пицца Piccolo 20см - маленькая
    'piccolo-20cm': { min: 250, max: 350 },
    
    // Кальцоне - закрытая пицца
    'calzone': { min: 400, max: 550 },
    
    // Хлеб и фокачча
    'bread-focaccia-bread': { min: 200, max: 300 },
    'bread-focaccia-focaccia': { min: 250, max: 350 },
    
    // Соусы
    'sauce': { min: 80, max: 150 },
    
    // Роллы и суши
    'rolls-sushi': { min: 150, max: 250 },
    'rolls-rolls': { min: 200, max: 300 },
    
    // Кондитерка
    'confectionery': { min: 100, max: 200 },
    
    // Напитки (мл, но указываем как г)
    'mors': { min: 300, max: 500 },
    'juice': { min: 200, max: 300 },
    'water': { min: 300, max: 500 },
    'beverages-other': { min: 250, max: 500 },
    
    // Заморозка
    'frozen': { min: 400, max: 800 },
    
    // Масла
    'aromatic-oils': { min: 100, max: 200 },
    
    // Комбо наборы
    'combo': { min: 800, max: 1200 }
};

// Функция для генерации случайного веса в диапазоне
function getRandomWeight(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

let addedCount = 0;
let updatedCount = 0;

// Проходим по всем категориям
Object.keys(menuData.menu).forEach(categoryKey => {
    const items = menuData.menu[categoryKey];
    
    // Проходим по всем товарам в категории
    items.forEach(item => {
        const category = item.category;
        
        // Если веса еще нет
        if (!item.weight) {
            const weightRange = WEIGHTS[category] || WEIGHTS[categoryKey];
            
            if (weightRange) {
                // Добавляем вес на основе категории
                item.weight = getRandomWeight(weightRange.min, weightRange.max);
                addedCount++;
            } else {
                // Для неизвестных категорий ставим дефолт 300г
                item.weight = 300;
                addedCount++;
            }
        } else {
            // Вес уже есть
            updatedCount++;
        }
    });
});

// Сохраняем обратно
fs.writeFileSync('menu-final.json', JSON.stringify(menuData, null, 2));

console.log(`✅ Добавлено весов: ${addedCount}`);
console.log(`✅ Уже было с весом: ${updatedCount}`);
console.log(`📊 Всего товаров: ${menuData.menu.length}`);
