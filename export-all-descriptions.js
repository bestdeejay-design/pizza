/**
 * ЭКСПОРТ ВСЕХ ОПИСАНИЙ В КРАСИВЫЙ ФАЙЛ
 */

const fs = require('fs');
const path = require('path');

// Читаем API данные
const apiData = JSON.parse(fs.readFileSync(
    path.join(__dirname, 'original-site-data', 'tilda-api-collection.json'), 
    'utf8'
));

// Создаем красивый Markdown файл
let md = `# 🍕 ОПИСАНИЯ ПРОДУКТОВ ИЗ TILDA API\n\n`;
md += `**Дата сбора**: ${new Date().toLocaleString('ru-RU')}\n`;
md += `**Всего товаров**: ${apiData.total}\n\n`;
md += `---\n\n`;

// Группируем по категориям
const byCategory = {};
apiData.products.forEach(p => {
    if (!byCategory[p.category]) {
        byCategory[p.category] = [];
    }
    byCategory[p.category].push(p);
});

// Выводим по категориям
Object.keys(byCategory).forEach(cat => {
    const categoryName = {
        'pizza-30cm': '🍕 Пицца 30 см',
        'pizza-piccolo-20cm': '🍕 Pizza Piccolo 20 см',
        'suchi-rolls': '🍣 Суши & Роллы'
    }[cat] || cat;
    
    md += `## ${categoryName}\n\n`;
    
    byCategory[cat].forEach((p, i) => {
        md += `### ${i+1}. ${p.title}\n\n`;
        md += `**Цена**: ${p.price}р.\n\n`;
        
        if (p.raw.text && p.raw.text.length > 0) {
            md += `**Описание**:\n`;
            md += `${p.raw.text}\n\n`;
        }
        
        if (p.raw.weight) {
            md += `**Вес**: ${p.raw.weight}гр\n\n`;
        }
        
        md += `---\n\n`;
    });
});

// Сохраняем
const outputFile = path.join(__dirname, 'ALL_PRODUCT_DESCRIPTIONS.md');
fs.writeFileSync(outputFile, md);

console.log(`✅ Создан файл: ${outputFile}`);
console.log(`📊 Размер: ${md.length} символов`);
console.log(`📝 Товаров: ${apiData.total}`);

// Также создаем JSON для программного использования
const jsonOutput = {
    collectedAt: new Date().toISOString(),
    total: apiData.total,
    products: apiData.products.map(p => ({
        category: p.category,
        title: p.title,
        price: p.price,
        description: p.raw.text || null,
        url: p.raw.url || null
    }))
};

const jsonFile = path.join(__dirname, 'product-descriptions.json');
fs.writeFileSync(jsonFile, JSON.stringify(jsonOutput, null, 2));

console.log(`✅ Создан JSON: ${jsonFile}`);
