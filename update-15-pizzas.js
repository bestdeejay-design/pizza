/**
 * Обновление 15 пицц весами из cleaned-menu.json
 */

const fs = require('fs');
const path = require('path');

const menuFinal = JSON.parse(fs.readFileSync(path.join(__dirname, '../menu-final.json'), 'utf8'));
const cleanedData = JSON.parse(fs.readFileSync(path.join(__dirname, 'original-site-data/cleaned-menu.json'), 'utf8'));

console.log('🔄 Обновление 15 пицц...\n');

// Создаем мапу весов
const weightMap = new Map();
cleanedData.products
    .filter(p => p.weight && p.title)
    .forEach(p => {
        const cleanTitle = p.title
            .replace(/Артикул.*$/i, '')
            .replace(/\d+р\.р\./gi, '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
        
        if (!weightMap.has(cleanTitle)) {
            weightMap.set(cleanTitle, p.weight);
        }
    });

// Список пицц которые нужно обновить
const targetPizzas = [
    'Пицца кура/перец 1/4',
    'Я сам Шеф',
    'Salvata Mila',
    'Chicken BBQ',
    'Пицца "4 сыра"',
    'с мясными шариками',
    'Вегетариано',
    'Реджина',
    'Лососем и сыром Бри',
    'Сицилийская',
    'Уткой и Фуа гра',
    'форелью, шпинатом',
    'Piccola alla Diavola',
    'Piccola с Уткой',
    'мраморной говядиной'
];

let updated = 0;

// Ищем в pizza-30cm и piccolo-20cm
['pizza-30cm', 'piccolo-20cm'].forEach(catId => {
    const items = menuFinal.menu[catId];
    if (Array.isArray(items)) {
        items.forEach(item => {
            const titleLower = item.title.toLowerCase();
            
            // Проверяем входит ли пицца в список целей
            const isTarget = targetPizzas.some(target => 
                titleLower.includes(target.toLowerCase())
            );
            
            if (isTarget) {
                // Ищем вес в распарсенных данных
                let foundWeight = null;
                
                for (const [mapTitle, weight] of weightMap.entries()) {
                    if (titleLower.includes(mapTitle.substring(0, 20)) || mapTitle.includes(titleLower.substring(0, 20))) {
                        foundWeight = weight;
                        break;
                    }
                }
                
                if (foundWeight && foundWeight !== item.weight) {
                    console.log(`${item.title.substring(0, 40)}: ${item.weight}гр → ${foundWeight}гр`);
                    item.weight = foundWeight;
                    updated++;
                }
            }
        });
    }
});

console.log(`\n✅ Обновлено: ${updated} пицц`);

// Сохраняем
fs.writeFileSync(path.join(__dirname, '../menu-final.json'), JSON.stringify(menuFinal, null, 2));
console.log('💾 menu-final.json обновлен');
