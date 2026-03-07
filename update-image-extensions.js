// Скрипт для обновления расширений изображений в menu-final.json
// Меняет .jpg и .png на .webp

const fs = require('fs');

console.log('🔍 Чтение menu-final.json...');
const menuData = JSON.parse(fs.readFileSync('menu-final.json', 'utf8'));

let updatedCount = 0;
let totalCount = 0;

// Проходим по всем категориям
Object.keys(menuData.menu).forEach(category => {
    menuData.menu[category].forEach(product => {
        if (product.image) {
            totalCount++;
            
            // Меняем расширения
            const oldImage = product.image;
            product.image = product.image.replace(/\.(jpg|jpeg|png)$/i, '.webp');
            
            if (oldImage !== product.image) {
                updatedCount++;
                
                // Показываем первые 10 изменений
                if (updatedCount <= 10) {
                    console.log(`  ${oldImage} → ${product.image}`);
                }
            }
        }
    });
});

console.log(`\n✅ Обновлено ${updatedCount} из ${totalCount} изображений`);

// Сохраняем
const outputPath = 'menu-final.json';
fs.writeFileSync(outputPath, JSON.stringify(menuData, null, 2));

console.log(`💾 Сохранено в ${outputPath}`);
console.log(`📦 Размер: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);

console.log('\n✨ Готово! Все изображения теперь используют .webp');
