#!/usr/bin/env python3
import json
import random

print('Adding weight to products...')

with open('menu-final.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Weight ranges by category (in grams)
WEIGHT_RANGES = {
    'pizza-30cm': (400, 600),
    'piccolo-20cm': (150, 250),
    'calzone': (300, 500),
    'bread-focaccia-bread': (200, 400),
    'bread-focaccia-focaccia': (250, 450),
    'sauce': (50, 150),
    'rolls-sushi': (30, 50),
    'rolls-rolls': (200, 350),
    'combo': (800, 1500),
    'confectionery': (100, 300),
    'mors': (250, 500),
    'juice': (200, 400),
    'water': (500, 500),
    'soda': (330, 500),
    'beverages-other': (200, 500),
    'frozen': (300, 600),
    'aromatic-oils': (100, 250),
    'masterclass': (0, 0),
    'franchise': (0, 0)
}

total_products = 0
products_with_weight = 0

# Process each category
for category, products in data['menu'].items():
    weight_range = WEIGHT_RANGES.get(category, (200, 400))
    
    for product in products:
        total_products += 1
        
        # Skip if weight already exists
        if 'weight' in product:
            products_with_weight += 1
            continue
        
        # Add random weight within range
        if weight_range == (0, 0):
            product['weight'] = 0
        else:
            product['weight'] = random.randint(weight_range[0], weight_range[1])
        products_with_weight += 1

print(f'Total products: {total_products}')
print(f'Products with weight: {products_with_weight}')

# Save updated menu
with open('menu-final.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print('✅ Weight added to all products!')
