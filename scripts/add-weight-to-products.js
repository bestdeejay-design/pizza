// Add weight to all products in menu-final.json
const fs = require('fs');

console.log('Adding weight to products...');

const data = JSON.parse(fs.readFileSync('menu-final.json', 'utf8'));

// Weight ranges by category (in grams)
const WEIGHT_RANGES = {
    'pizza-30cm': { min: 400, max: 600 },
    'piccolo-20cm': { min: 150, max: 250 },
    'calzone': { min: 300, max: 500 },
    'bread-focaccia-bread': { min: 200, max: 400 },
    'bread-focaccia-focaccia': { min: 250, max: 450 },
    'sauce': { min: 50, max: 150 },
    'rolls-sushi': { min: 30, max: 50 },
    'rolls-rolls': { min: 200, max: 350 },
    'combo': { min: 800, max: 1500 },
    'confectionery': { min: 100, max: 300 },
    'mors': { min: 250, max: 500 },
    'juice': { min: 200, max: 400 },
    'water': { min: 500, max: 500 },
    'soda': { min: 330, max: 500 },
    'beverages-other': { min: 200, max: 500 },
    'frozen': { min: 300, max: 600 },
    'aromatic-oils': { min: 100, max: 250 },
    'masterclass': { min: 0, max: 0 },
    'franchise': { min: 0, max: 0 }
};

let totalProducts = 0;
let productsWithWeight = 0;

// Process each category
Object.keys(data.menu).forEach(category => {
    const range = WEIGHT_RANGES[category] || { min: 200, max: 400 };
    
    data.menu[category].forEach(product => {
        totalProducts++;
        
        // Skip if weight already exists
        if (product.weight) {
            productsWithWeight++;
            return;
        }
        
        // Add random weight within range
        if (range.min === 0 && range.max === 0) {
            product.weight = 0;
        } else {
            product.weight = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
        }
        productsWithWeight++;
    });
});

console.log(`Total products: ${totalProducts}`);
console.log(`Products with weight: ${productsWithWeight}`);

// Save updated menu
fs.writeFileSync('menu-final.json', JSON.stringify(data, null, 2));
console.log('✅ Weight added to all products!');
