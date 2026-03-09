const fs = require('fs');

console.log('🔧 Исправляю категоризацию...\n');

const menuData = JSON.parse(fs.readFileSync('./menu-complete.json', 'utf8'));

// Собираем все товары
const allProducts = [
    ...menuData.menu.pizza,
    ...menuData.menu.calzone,
    ...menuData.menu.rollss || menuData.menu.rolls,
    ...menuData.menu.bread,
    ...menuData.menu.focaccia,
    ...menuData.menu.sauce,
    ...menuData.menu.drinks || []
];

// ПРАВИЛЬНАЯ категоризация
function categorizeItem(title) {
    const t = title.toLowerCase();
    
    // Сначала проверяем очевидные не-пицца категории
    if (t.includes('кальцоне')) return 'calzone';
    if (t.includes('салат')) return 'salad';
    if (t.includes('паста')) return 'pasta';
    if (t.includes('фокачч')) return 'focaccia';
    if (t.includes('хлеб')) return 'bread';
    if (t.includes('ролл') || t.includes('суши') || t.includes('маки')) return 'rolls';
    if (t.includes('напитк') || t.includes('кола') || t.includes('трюфель') || t.includes('печень')) return 'drinks';
    
    // Соусы - ТОЛЬКО если это НЕ пицца и НЕ ролл
    if ((t.includes('соус') || t.includes('васаби') || t.includes('имбирь')) && 
        !t.includes('пицца') && !t.includes('pizza') && !t.includes('ролл')) {
        return 'sauce';
    }
    
    // Пицца - ВСЁ что содержит "пицца", "pizza" или "тесто"
    if (t.includes('пицца') || t.includes('pizza') || t.includes('тесто') || 
        t.includes('piccolo') || t.includes('суп')) {
        return 'pizza';
    }
    
    // По умолчанию - пицца (для итальянских блюд)
    return 'pizza';
}

// Перераспределяем по категориям
const menu = {
    pizza: [],
    calzone: [],
    rolls: [],
    bread: [],
    focaccia: [],
    sauce: [],
    drinks: [],
    salad: [],
    pasta: [],
    other: []
};

let recategorized = 0;

allProducts.forEach(p => {
    const correctCategory = categorizeItem(p.title);
    
    if (p.category !== correctCategory) {
        console.log(`🔄 ${p.title.substring(0, 50)}... : ${p.category} → ${correctCategory}`);
        recategorized++;
    }
    
    p.category = correctCategory;
    
    if (menu[correctCategory]) {
        menu[correctCategory].push(p);
    } else {
        console.log(`⚠️ Неизвестная категория: ${p.title}`);
        menu.other.push(p);
    }
});

console.log(`\n📊 ИСПРАВЛЕНО КАТЕГОРИЙ: ${recategorized}\n`);

// Обновляем статистику
menuData.statistics = {
    pizza: menu.pizza.length,
    calzone: menu.calzone.length,
    rolls: menu.rolls.length,
    bread: menu.bread.length,
    focaccia: menu.focaccia.length,
    sauce: menu.sauce.length,
    drinks: menu.drinks.length
};

// Обновляем описания категорий
menuData.categories = [
    { id: "pizza", name: "Пицца", count: menu.pizza.length, description: "Неаполитанская пицца 30 см и Pizza Piccolo 20 см" },
    { id: "calzone", name: "Кальцоне", count: menu.calzone.length, description: "Закрытая пицца с различными начинками (обычная и мини)" },
    { id: "rolls", name: "Роллы и Суши", count: menu.rolls.length, description: "Японские роллы, суши, гунканы" },
    { id: "bread", name: "Неаполитанский хлеб", count: menu.bread.length, description: "Классический и авторский неаполитанский хлеб" },
    { id: "focaccia", name: "Фокачча", count: menu.focaccia.length, description: "Итальянская фокачча с различными добавками" },
    { id: "sauce", name: "Соусы", count: menu.sauce.length, description: "Соусы для корочек и дополнительные" },
    { id: "drinks", name: "Напитки и десерты", count: menu.drinks.length, description: "Десерты и напитки" }
];

// Обновляем меню
menuData.menu = {
    pizza: menu.pizza,
    calzone: menu.calzone,
    rolls: menu.rolls,
    bread: menu.bread,
    focaccia: menu.focaccia,
    sauce: menu.sauce,
    drinks: menu.drinks
};

// Статистика
console.log('📊 ИТОГОВАЯ СТАТИСТИКА:');
console.table(menuData.statistics);

// Проверяем распределение
console.log('\n🍕 PIZZA (первые 5):');
menu.pizza.slice(0, 5).forEach(p => console.log('  -', p.title));

console.log('\n🥫 SAUCE (все):');
menu.sauce.forEach(p => console.log('  -', p.title));

console.log('\n🍣 ROLLS (первые 5):');
menu.rolls.slice(0, 5).forEach(p => console.log('  -', p.title));

// Сохраняем
fs.writeFileSync(
    './menu-corrected.json',
    JSON.stringify(menuData, null, 2),
    'utf8'
);

console.log('\n✅ ГОТОВО!');
console.log('💾 Сохранено в: menu-corrected.json\n');
