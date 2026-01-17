const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['https://savorybalance-ai.vercel.app', 'http://localhost:8000']
}));
app.use(helmet());
app.use(express.json());

// Load enhanced food database
const FOOD_DB = require('./data.json');

// Harris-Benedict Formula with Mifflin-St Jeor (more accurate)
function calculateTDEE(gender, weight, height, age, activity) {
    // Mifflin-St Jeor Equation (more accurate than Harris-Benedict)
    let bmr;
    if (gender === 'male') {
        bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
        bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }
    
    const multipliers = {
        sedentary: 1.2,
        lightly_active: 1.375,
        moderately_active: 1.55,
        very_active: 1.725,
        extra_active: 1.9
    };
    
    // Map user-friendly terms to our multiplier keys
    const activityMap = {
        sedentary: 'sedentary',
        moderately_active: 'moderately_active',
        active: 'very_active'
    };
    
    const activityKey = activityMap[activity] || 'moderately_active';
    return Math.round(bmr * multipliers[activityKey]);
}

// Calculate macros based on goal and body type
function calculateMacros(calories, goal, bodyType = 'ectomorph') {
    const macroRatios = {
        weight_loss: {
            ectomorph: { protein: 0.30, carbs: 0.40, fat: 0.30 },
            mesomorph: { protein: 0.35, carbs: 0.35, fat: 0.30 },
            endomorph: { protein: 0.40, carbs: 0.30, fat: 0.30 }
        },
        maintenance: {
            ectomorph: { protein: 0.25, carbs: 0.50, fat: 0.25 },
            mesomorph: { protein: 0.30, carbs: 0.40, fat: 0.30 },
            endomorph: { protein: 0.35, carbs: 0.35, fat: 0.30 }
        },
        weight_gain: {
            ectomorph: { protein: 0.25, carbs: 0.55, fat: 0.20 },
            mesomorph: { protein: 0.30, carbs: 0.50, fat: 0.20 },
            endomorph: { protein: 0.35, carbs: 0.45, fat: 0.20 }
        }
    };
    
    const ratios = macroRatios[goal]?.[bodyType] || macroRatios.maintenance.ectomorph;
    
    return {
        protein: Math.round((calories * ratios.protein) / 4),
        carbs: Math.round((calories * ratios.carbs) / 4),
        fat: Math.round((calories * ratios.fat) / 9),
        ratios: ratios
    };
}

// AI Meal Optimizer - uses genetic algorithm inspired approach
function optimizeFoods(calories, macros, goal, mealCount = 5) {
    const availableFoods = [...FOOD_DB];
    let remainingCal = calories;
    const selected = [];
    
    // Score foods based on nutritional value for goal
    const scoredFoods = availableFoods.map(food => {
        let score = 0;
        
        // Protein score (higher for muscle gain)
        if (goal === 'weight_gain') {
            score += (food.protein / food.calories) * 100;
        }
        
        // Calorie density score (lower for weight loss)
        if (goal === 'weight_loss') {
            score += 100 - (food.calories / 10);
        }
        
        // Fiber/Complex carbs score
        if (food.category.includes('Grains') || food.category.includes('Vegetables')) {
            score += 30;
        }
        
        // Shelf life score (longer is better for waste reduction)
        score += Math.min(food.shelf_life_days / 10, 20);
        
        // Waste factor (lower is better)
        score += (1 - food.waste_factor) * 50;
        
        return { ...food, score };
    }).sort((a, b) => b.score - a.score);
    
    // Distribute calories across meals
    const caloriesPerMeal = Math.round(calories / mealCount);
    
    // Select foods for each meal category
    const mealCategories = ['breakfast', 'lunch', 'dinner', 'snack'];
    const meals = {};
    
    mealCategories.forEach(category => {
        meals[category] = [];
        const categoryFoods = scoredFoods.filter(f => 
            f.meal_time.includes(category) || f.meal_time.includes('all')
        );
        
        // Take top 2-3 foods for this meal
        const mealFoods = categoryFoods.slice(0, 3).map(food => {
            const portions = Math.min(2, Math.floor(caloriesPerMeal * 0.6 / food.calories));
            return {
                food: food.food,
                portions,
                grams: portions * 100,
                calories: food.calories * portions,
                protein: food.protein * portions,
                carbs: food.carbs * portions,
                fat: food.fat * portions,
                shelf_life_days: food.shelf_life_days,
                storage: food.storage,
                category: food.category,
                color: food.color,
                meal_time: category
            };
        });
        
        meals[category] = mealFoods;
        selected.push(...mealFoods);
    });
    
    return { selected, meals };
}

// Generate intelligent meal timing
function generateMealTiming(wake = "07:00", sleep = "23:00", mealCount = 5) {
    // Convert time strings to minutes
    const wakeMinutes = timeToMinutes(wake);
    const sleepMinutes = timeToMinutes(sleep);
    const eatingWindow = sleepMinutes - wakeMinutes - 60; // 1 hour before sleep
    
    // Distribute meals evenly
    const interval = Math.floor(eatingWindow / (mealCount + 1));
    
    const meals = [];
    const mealNames = ["Breakfast", "Morning Snack", "Lunch", "Afternoon Snack", "Dinner"];
    const mealFocus = [
        "Protein + Complex Carbs",
        "Fruits/Nuts",
        "Balanced Meal",
        "Protein Shake/Yogurt",
        "Light Protein + Veggies"
    ];
    
    for (let i = 0; i < mealCount; i++) {
        const mealTime = wakeMinutes + 60 + (interval * (i + 1)); // Start eating 1hr after waking
        const timeStr = minutesToTime(mealTime);
        
        meals.push({
            meal: mealNames[i],
            time: timeStr,
            focus: mealFocus[i],
            timing_note: i === 0 ? "Within 1 hour of waking" : 
                        i === mealCount - 1 ? "3 hours before sleep" : "Optimal spacing"
        });
    }
    
    return meals;
}

// Helper: Time string to minutes
function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

// Helper: Minutes to time string
function minutesToTime(minutes) {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Calculate use-by date with urgency level
function getUseByInfo(shelfLifeDays) {
    const today = new Date();
    const useByDate = new Date(today);
    useByDate.setDate(today.getDate() + shelfLifeDays);
    
    let urgency = 'low';
    let urgencyColor = '#10B981';
    let urgencyIcon = '🟢';
    
    if (shelfLifeDays <= 3) {
        urgency = 'high';
        urgencyColor = '#EF4444';
        urgencyIcon = '🔴';
    } else if (shelfLifeDays <= 7) {
        urgency = 'medium';
        urgencyColor = '#F59E0B';
        urgencyIcon = '🟡';
    }
    
    return {
        date: useByDate.toISOString().split('T')[0],
        formatted: useByDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        urgency,
        urgencyColor,
        urgencyIcon,
        days_remaining: shelfLifeDays
    };
}

// Calculate environmental impact
function calculateEnvironmentalImpact(wasteReductionKg) {
    const CO2_PER_KG_FOOD = 2.5; // kg CO2 per kg food waste
    const WATER_PER_KG_FOOD = 1000; // liters water per kg food
    const LAND_PER_KG_FOOD = 2.5; // m² land per kg food
    
    return {
        co2_saved: (wasteReductionKg * CO2_PER_KG_FOOD).toFixed(2),
        water_saved: (wasteReductionKg * WATER_PER_KG_FOOD).toFixed(0),
        land_saved: (wasteReductionKg * LAND_PER_KG_FOOD).toFixed(2),
        equivalent_trees: Math.round(wasteReductionKg * 0.5)
    };
}

// Main API endpoint
app.post('/api/generate', (req, res) => {
    try {
        const { age, gender, weight, height, activity, goal, wake, sleep } = req.body;
        
        console.log(`📊 Processing request for ${gender}, ${age}y, ${goal} goal`);
        
        // 1. Calculate calorie needs
        const calories = calculateTDEE(gender, weight, height, age, activity);
        const macros = calculateMacros(calories, goal);
        
        // 2. AI optimize food selection
        const { selected, meals } = optimizeFoods(calories, macros, goal);
        
        // 3. Generate zero-waste shopping list
        const shoppingList = [];
        let totalWaste = 0;
        let totalSavings = 0;
        let totalCost = 0;
        
        selected.forEach(item => {
            // AI calculates exact needed amount (considering waste factor)
            const aiAmount = Math.max(item.grams, 50);
            const wasteFactor = FOOD_DB.find(f => f.food === item.food)?.waste_factor || 0.2;
            const adjustedAmount = Math.round(aiAmount * (1 + wasteFactor));
            
            // Typical people buy in standard packages
            const typicalAmount = Math.ceil(adjustedAmount / item.typical_pack) * item.typical_pack;
            const wasteGrams = typicalAmount - adjustedAmount;
            
            // Cost estimation ($/kg rough average)
            const costPerKg = item.category.includes('Premium') ? 25 : 
                             item.category.includes('Organic') ? 15 : 8;
            const cost = (adjustedAmount / 1000) * costPerKg;
            
            const useByInfo = getUseByInfo(item.shelf_life_days);
            
            shoppingList.push({
                food: item.food,
                buy_ai: adjustedAmount,
                buy_typical: typicalAmount,
                saved_grams: wasteGrams,
                shelf_life_days: item.shelf_life_days,
                use_by: useByInfo.date,
                formatted_date: useByInfo.formatted,
                urgency: useByInfo.urgency,
                urgency_color: useByInfo.urgencyColor,
                urgency_icon: useByInfo.urgencyIcon,
                storage: item.storage,
                category: item.category,
                color: item.color,
                cost: cost.toFixed(2),
                meal_time: item.meal_time
            });
            
            totalWaste += wasteGrams / 1000;
            totalSavings += (wasteGrams / 1000) * costPerKg;
            totalCost += cost;
        });
        
        // 4. Generate meal timing
        const mealTiming = generateMealTiming(wake, sleep);
        
        // 5. Calculate environmental impact
        const environmentalImpact = calculateEnvironmentalImpact(totalWaste);
        
        // 6. Prepare AI insights
        const aiInsights = generateAIInsights(goal, totalWaste, totalSavings, environmentalImpact);
        
        // 7. Response
        res.json({
            status: "success",
            timestamp: new Date().toISOString(),
            user_data: { age, gender, weight, height, activity, goal, wake, sleep },
            calculated: {
                daily_calories: calories,
                daily_macros: macros,
                bmr_explanation: "Based on Mifflin-St Jeor equation (most accurate)"
            },
            waste_reduction: {
                total_waste_kg: totalWaste.toFixed(2),
                total_savings: totalSavings.toFixed(2),
                weekly_savings: (totalSavings * 7).toFixed(2),
                yearly_savings: (totalSavings * 365).toFixed(2),
                total_cost: totalCost.toFixed(2)
            },
            environmental_impact: environmentalImpact,
            shopping_list: shoppingList,
            meal_timing: mealTiming,
            meal_breakdown: meals,
            ai_insights: aiInsights,
            recommendations: generateRecommendations(goal, totalWaste)
        });
        
    } catch (error) {
        console.error('❌ API Error:', error);
        res.status(500).json({
            status: "error",
            message: "Internal server error",
            error: error.message
        });
    }
});

// Generate AI insights
function generateAIInsights(goal, wasteReduction, savings, environmental) {
    const insights = [];
    
    if (wasteReduction > 1) {
        insights.push(`🎯 You're preventing ${wasteReduction.toFixed(2)}kg of food waste weekly!`);
        insights.push(`💰 That's $${savings.toFixed(2)} saved weekly ($${(savings * 52).toFixed(0)} yearly)`);
    }
    
    insights.push(`🌍 Environmental Impact: Saving ${environmental.co2_saved}kg CO2, ${environmental.water_saved}L water weekly`);
    
    if (goal === 'weight_loss') {
        insights.push("⚡ For weight loss: Prioritize high-protein, high-fiber foods to stay full longer");
    } else if (goal === 'weight_gain') {
        insights.push("💪 For muscle gain: Time protein intake around workouts for optimal absorption");
    }
    
    insights.push("🛒 Pro Tip: Shop with exact quantities to avoid impulse buys and waste");
    
    return insights;
}

// Generate personalized recommendations
function generateRecommendations(goal, wasteReduction) {
    const recs = [];
    
    recs.push({
        title: "Storage Optimization",
        description: "Store perishables properly to extend shelf life",
        tips: ["Use airtight containers", "Keep veggies in crisper drawers", "Freeze meats in portions"]
    });
    
    recs.push({
        title: "Meal Prep Strategy",
        description: "Based on your waste reduction potential",
        tips: wasteReduction > 0.5 ? 
            ["Prep 3 days at a time", "Cook grains in bulk", "Portion proteins before freezing"] :
            ["Daily fresh prep", "Cook as needed", "Use leftovers creatively"]
    });
    
    if (goal === 'weight_loss') {
        recs.push({
            title: "Weight Loss Focus",
            description: "Nutrition strategies for sustainable weight loss",
            tips: ["Drink water before meals", "High-volume, low-calorie veggies", "Mindful eating practices"]
        });
    }
    
    return recs;
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: "✅ SavoryBalance AI Backend Running",
        version: "2.0.0",
        endpoints: {
            generate: "POST /api/generate",
            health: "GET /health"
        },
        food_items: FOOD_DB.length,
        uptime: process.uptime()
    });
});

// Test endpoint
app.get('/test', (req, res) => {
    const sampleData = {
        age: 28,
        gender: "female",
        weight: 68,
        height: 170,
        activity: "moderately_active",
        goal: "maintenance",
        wake: "07:00",
        sleep: "23:00"
    };
    res.json({
        message: "Test endpoint - use POST /api/generate with this sample data",
        sample_data: sampleData
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 SavoryBalance AI Backend running on http://localhost:${PORT}`);
    console.log(`📊 API: POST http://localhost:${PORT}/api/generate`);
    console.log(`🩺 Health: http://localhost:${PORT}/health`);
    console.log(`🧪 Test: http://localhost:${PORT}/test`);
    console.log(`🍎 Food Database: ${FOOD_DB.length} items loaded`);
});