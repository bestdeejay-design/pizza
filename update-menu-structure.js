const fs = require('fs');

console.log('🔄 Приводим меню в соответствие с сайтом...\n');

const menuData = JSON.parse(fs.readFileSync('./menu-complete.json', 'utf8'));

// Разделяем пиццу на 2 категории
const allPizza = menuData.menu.pizza;
const pizza30cm = allPizza.filter(p => 
    !p.title.toLowerCase().includes('piccolo') && 
    !p.title.toLowerCase().includes('тесто')
);
const piccolo20cm = allPizza.filter(p => 
    p.title.toLowerCase().includes('piccolo')
);

// Объединяем хлеб и фокаччу
const breadAndFocaccia = [...menuData.menu.bread, ...menuData.menu.focaccia];

// Обновляем структуру меню
menuData.menu = {
    'pizza-30cm': pizza30cm.map(p => ({...p, category: 'pizza-30cm'})),
    'piccolo-20cm': piccolo20cm.map(p => ({...p, category: 'piccolo-20cm'})),
    'calzone': menuData.menu.calzone.map(p => ({...p, category: 'calzone'})),
    'bread-focaccia': breadAndFocaccia.map(p => ({...p, category: 'bread-focaccia'})),
    'sauce': menuData.menu.sauce.map(p => ({...p, category: 'sauce'})),
    'rolls': menuData.menu.rolls.map(p => ({...p, category: 'rolls'})),
    'confectionery': menuData.menu.drinks || [],
    'combos': [],
    'beverages': [],
    'frozen': [],
    'oils': [],
    'masterclass': [],
    'franchise': []
};

// Обновляем статистику
menuData.statistics = {
    'pizza-30cm': pizza30cm.length,
    'piccolo-20cm': piccolo20cm.length,
    'calzone': menuData.menu.calzone.length,
    'bread-focaccia': breadAndFocaccia.length,
    'sauce': menuData.menu.sauce.length,
    'rolls': menuData.menu.rolls.length,
    'confectionery': (menuData.menu.drinks || []).length,
    'combos': 0,
    'beverages': 0,
    'frozen': 0,
    'oils': 0,
    'masterclass': 0,
    'franchise': 0
};

// Обновляем metadata
menuData.metadata.totalProducts = Object.values(menuData.statistics).reduce((a,b) => a+b, 0);

// Статистика
console.log('📊 НОВАЯ СТРУКТУРА МЕНЮ:\n');
console.table({
    'Пицца 30 см': menuData.statistics['pizza-30cm'],
    'Pizza Piccolo 20 см': menuData.statistics['piccolo-20cm'],
    'Кальцоне': menuData.statistics['calzone'],
    'Хлеб и Фокачча': menuData.statistics['bread-focaccia'],
    'Соус к корочкам': menuData.statistics['sauce'],
    'Suchi & Rolls': menuData.statistics['rolls'],
    'Кондитерские изделия': menuData.statistics['confectionery'],
    'Комбо наборы': menuData.statistics['combos'],
    'Напитки': menuData.statistics['beverages'],
    'Замороженная продукция': menuData.statistics['frozen'],
    'Ароматное масло': menuData.statistics['oils'],
    'Мастер класс': menuData.statistics['masterclass'],
    'Франшиза': menuData.statistics['franchise']
});

console.log('\n✅ ВСЕГО ТОВАРОВ:', menuData.metadata.totalProducts);

// Сохраняем
fs.writeFileSync(
    './menu-complete.json',
    JSON.stringify(menuData, null, 2),
    'utf8'
);

console.log('\n💾 Сохранено в: menu-complete.json\n');
console.log('✅ ГОТОВО! Меню приведено в соответствие с сайтом заказчика.\n');
