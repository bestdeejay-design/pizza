const fs = require('fs');

console.log('🔧 Объединяю меню из pizza.txt и 2.txt с точными фото...\n');

// Загружаю данные из pizza.txt (пицца и кальцоне)
const pizzaTxtHtml = fs.readFileSync('./pizza.txt', 'utf8');
const menuFrom2 = JSON.parse(fs.readFileSync('./raw-content/menu-from-2-accurate.json', 'utf8'));

// Извлекаю пиццу и кальцоне из pizza.txt
const pizzaProducts = [];
const productRegex = /js-store-prod-name js-product-name[^>]*>([^<]+)<\/div>/gi;
let match;

while ((match = productRegex.exec(pizzaTxtHtml)) !== null) {
    const title = match[1]?.trim();
    
    if (!title || title.length < 3 || title.length > 150) continue;
    
    // Ищем цену
    const priceContext = pizzaTxtHtml.substring(match.index, match.index + 1000);
    const priceMatch = priceContext.match(/data-product-price-def="(\d+)"/);
    const price = priceMatch ? parseInt(priceMatch[1]) : 0;
    
    // Ищем фото (точное совпадение по позиции)
    const imgMatch = priceContext.match(/data-original=["'](https:\/\/static\.tildacdn\.com\/[^"']+\.jpe?g[^"']*)["']/i);
    const image = imgMatch ? imgMatch[1] : null;
    
    // Пропускаем заголовки
    if (/^пицц$|^кальцоне$|^наш|^отзыв|^франш|^статьи|^акции|^контакт|^партнерств$/i.test(title)) {
        continue;
    }
    
    // Пропускаем дубликаты
    if (pizzaProducts.find(p => p.title === title)) continue;
    
    const category = categorizeItem(title);
    
    // Добавляем только пиццу и кальцоне
    if (category === 'pizza' || category === 'calzone') {
        pizzaProducts.push({
            title: title,
            price: price,
            category: category,
            image: image
        });
    }
}

function categorizeItem(title) {
    const t = title.toLowerCase();
    if (t.includes('кальцоне')) return 'calzone';
    if (t.includes('салат')) return 'salad';
    if (t.includes('паста')) return 'pasta';
    if (t.includes('соус')) return 'sauce';
    if (t.includes('фокачч')) return 'focaccia';
    if (t.includes('хлеб')) return 'bread';
    if (t.includes('ролл') || t.includes('суши') || t.includes('маки')) return 'rolls';
    if (t.includes('напитк') || t.includes('кола') || t.includes('трюфель') || t.includes('печень')) return 'drinks';
    if (t.includes('пицца') || t.includes('pizza') || t.includes('суп') || t.includes('тесто')) return 'pizza';
    return 'other';
}

// Назначаю ID
let idCounter = 1;
pizzaProducts.forEach(p => p.id = idCounter++);
menuFrom2.products.forEach(p => p.id = idCounter++);

// Создаю итоговое меню
const finalMenu = {
    metadata: {
        project: "Pizza Napoli RSC",
        source: "https://pizzanapolirsc.ru/",
        collectedAt: new Date().toISOString(),
        totalProducts: pizzaProducts.length + menuFrom2.products.length,
        description: "Полное меню пиццерии Pizza Napoli - все категории с фото"
    },
    statistics: {
        pizza: pizzaProducts.filter(p => p.category === 'pizza').length,
        calzone: pizzaProducts.filter(p => p.category === 'calzone').length,
        rolls: menuFrom2.products.filter(p => p.category === 'rolls').length,
        bread: menuFrom2.products.filter(p => p.category === 'bread').length,
        focaccia: menuFrom2.products.filter(p => p.category === 'focaccia').length,
        sauce: menuFrom2.products.filter(p => p.category === 'sauce').length,
        drinks: menuFrom2.products.filter(p => p.category === 'drinks').length,
        other: menuFrom2.products.filter(p => p.category === 'other').length
    },
    categories: [
        { id: "pizza", name: "Пицца", count: pizzaProducts.filter(p => p.category === 'pizza').length, description: "Неаполитанская пицца 30 см и Pizza Piccolo 20 см" },
        { id: "calzone", name: "Кальцоне", count: pizzaProducts.filter(p => p.category === 'calzone').length, description: "Закрытая пицца с различными начинками (обычная и мини)" },
        { id: "rolls", name: "Роллы и Суши", count: menuFrom2.products.filter(p => p.category === 'rolls').length, description: "Японские роллы, суши, гунканы" },
        { id: "bread", name: "Неаполитанский хлеб", count: menuFrom2.products.filter(p => p.category === 'bread').length, description: "Классический и авторский неаполитанский хлеб" },
        { id: "focaccia", name: "Фокачча", count: menuFrom2.products.filter(p => p.category === 'focaccia').length, description: "Итальянская фокачча с различными добавками" },
        { id: "sauce", name: "Соусы", count: menuFrom2.products.filter(p => p.category === 'sauce').length, description: "Соусы для корочек и дополнительные" }
    ],
    menu: {
        pizza: pizzaProducts.filter(p => p.category === 'pizza'),
        calzone: pizzaProducts.filter(p => p.category === 'calzone'),
        rolls: menuFrom2.products.filter(p => p.category === 'rolls'),
        bread: menuFrom2.products.filter(p => p.category === 'bread'),
        focaccia: menuFrom2.products.filter(p => p.category === 'focaccia'),
        sauce: menuFrom2.products.filter(p => p.category === 'sauce'),
        drinks: menuFrom2.products.filter(p => p.category === 'drinks')
    }
};

// Статистика
console.log('📊 ИЗВЛЕЧЕНО:');
console.table({
    'Из pizza.txt': pizzaProducts.length,
    'Из 2.txt': menuFrom2.products.length,
    'Всего': finalMenu.metadata.totalProducts,
    'С фото': [...pizzaProducts, ...menuFrom2.products].filter(p => p.image).length
});

console.log('\n📋 КАТЕГОРИИ:');
console.table(finalMenu.statistics);

// Сохраняю
fs.writeFileSync(
    './menu-final-with-images.json',
    JSON.stringify(finalMenu, null, 2),
    'utf8'
);

console.log('\n✅ ГОТОВО!');
console.log('💾 Сохранено в: menu-final-with-images.json\n');
