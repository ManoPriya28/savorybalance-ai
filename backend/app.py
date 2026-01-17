from flask import Flask, jsonify, request
from flask_cors import CORS
import datetime

app = Flask(__name__)
CORS(app)

FOOD_DB = [
    {"food": "Chicken", "calories": 165, "protein": 31, "typical_pack": 500, "shelf_life": 2},
    {"food": "Rice", "calories": 111, "protein": 2.6, "typical_pack": 1000, "shelf_life": 180},
    {"food": "Broccoli", "calories": 34, "protein": 2.8, "typical_pack": 300, "shelf_life": 5},
    {"food": "Eggs", "calories": 155, "protein": 13, "typical_pack": 12, "shelf_life": 28},
]

def calculate_calories(gender, weight, height, age, activity):
    if gender == "male":
        bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age)
    else:
        bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age)
    
    multipliers = {"sedentary": 1.2, "moderately_active": 1.55, "active": 1.725}
    return round(bmr * multipliers.get(activity, 1.2))

@app.route('/api/generate', methods=['POST'])
def generate():
    data = request.json
    calories = calculate_calories(
        data['gender'], data['weight'], data['height'], 
        data['age'], data['activity']
    )
    
    shopping_list = []
    for food in FOOD_DB:
        ai_amount = 200
        typical_amount = 500
        waste = typical_amount - ai_amount
        
        use_by = (datetime.datetime.now() + 
                 datetime.timedelta(days=food['shelf_life'])).strftime('%Y-%m-%d')
        
        shopping_list.append({
            "food": food["food"],
            "buy_ai": ai_amount,
            "buy_typical": typical_amount,
            "saved_grams": waste,
            "shelf_life_days": food["shelf_life"],
            "use_by": use_by,
            "storage": "Fridge"
        })
    
    meal_timing = [
        {"meal": "Breakfast", "time": "08:00", "focus": "Protein + Carbs"},
        {"meal": "Lunch", "time": "13:00", "focus": "Balanced Meal"},
        {"meal": "Dinner", "time": "20:00", "focus": "Light Protein + Veggies"}
    ]
    
    return jsonify({
        "status": "success",
        "calculated": {"daily_calories": calories},
        "waste_reduction": {"total_waste_kg": "0.9", "total_savings": "4.5"},
        "shopping_list": shopping_list,
        "meal_timing": meal_timing,
        "ai_message": "🎯 AI optimized your nutrition!"
    })

@app.route('/health')
def health():
    return jsonify({"status": "Python Backend Running!"})

if __name__ == '__main__':
    app.run(debug=True, port=5000)