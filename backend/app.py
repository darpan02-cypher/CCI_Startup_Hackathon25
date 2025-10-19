from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import numpy as np
from data_generator import generate_employee_data
from ml_model import BurnoutPredictor
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Global data storage
employee_data = None
predictor = None

def initialize_data():
    """Initialize or reload employee data"""
    global employee_data, predictor
    
    # Generate data
    employee_data = generate_employee_data(num_employees=50, num_days=30)
    
    # Train predictor
    predictor = BurnoutPredictor()
    predictor.train(employee_data)
    
    # Add predictions
    employee_data = predictor.predict(employee_data)
    
    print("✅ Data initialized successfully")

# Initialize on startup
initialize_data()

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "message": "Backend is running"})

@app.route('/api/employees', methods=['GET'])
def get_employees():
    """Get all employees with latest metrics"""
    
    # Get latest data for each employee
    latest_data = employee_data.loc[
        employee_data.groupby('employee_id')['date'].idxmax()
    ].copy()
    
    # Convert to list of dicts
    employees = []
    for _, row in latest_data.iterrows():
        employees.append({
            'id': row['employee_id'],
            'name': row['name'],
            'dept': row['department'],
            'burnout': float(row['burnout_risk_index']),
            'productivity': float(row['productivity_index']),
            'wellness': float(row['wellness_index']),
            'meetings': int(row['num_meetings']),
            'sleep': float(row['sleep_hours'])
        })
    
    return jsonify(employees)

@app.route('/api/summary', methods=['GET'])
def get_summary():
    """Get workforce summary statistics"""
    
    latest_data = employee_data.loc[
        employee_data.groupby('employee_id')['date'].idxmax()
    ]
    
    summary = {
        'total_employees': len(latest_data),
        'avg_burnout_risk': float(latest_data['burnout_risk_index'].mean()),
        'avg_productivity': float(latest_data['productivity_index'].mean()),
        'avg_wellness': float(latest_data['wellness_index'].mean()),
        'avg_meetings': float(latest_data['num_meetings'].mean()),
        'high_risk_count': int((latest_data['burnout_risk_index'] >= 0.7).sum())
    }
    
    return jsonify(summary)

@app.route('/api/departments', methods=['GET'])
def get_departments():
    """Get department-wise breakdown"""
    
    latest_data = employee_data.loc[
        employee_data.groupby('employee_id')['date'].idxmax()
    ]
    
    dept_summary = latest_data.groupby('department').agg({
        'employee_id': 'count',
        'burnout_risk_index': 'mean',
        'productivity_index': 'mean',
        'burnout_category': lambda x: (x == 'High').sum()
    }).reset_index()
    
    dept_summary.columns = ['department', 'employees', 'avg_burnout', 'avg_productivity', 'high_risk']
    
    departments = dept_summary.to_dict('records')
    
    return jsonify(departments)

@app.route('/api/chat', methods=['POST'])
def chat():
    """AI chat endpoint with Groq integration"""
    
    data = request.json
    message = data.get('message', '')
    
    # Get current metrics
    latest_data = employee_data.loc[
        employee_data.groupby('employee_id')['date'].idxmax()
    ]
    
    avg_burnout = latest_data['burnout_risk_index'].mean()
    avg_productivity = latest_data['productivity_index'].mean()
    avg_wellness = latest_data['wellness_index'].mean()
    high_risk = (latest_data['burnout_risk_index'] >= 0.7).sum()
    
    # Rule-based responses (fallback)
    response = generate_fallback_response(
        message.lower(), 
        latest_data, 
        avg_burnout, 
        avg_productivity, 
        avg_wellness, 
        high_risk
    )
    
    # Try Groq API if available
    groq_api_key = os.getenv('GROQ_API_KEY')
    if groq_api_key and groq_api_key != 'your_groq_api_key_here':
        try:
            from groq import Groq
            client = Groq(api_key=groq_api_key)
            
            context = f"""Current metrics:
- Total employees: {len(latest_data)}
- Average burnout risk: {avg_burnout:.2f}
- Average productivity: {avg_productivity:.2f}
- Average wellness: {avg_wellness:.2f}
- High-risk employees: {high_risk}

High-risk employees:
{latest_data[latest_data['burnout_risk_index'] >= 0.7][['name', 'department', 'burnout_risk_index', 'num_meetings', 'sleep_hours']].to_string(index=False)}
"""
            
            chat_completion = client.chat.completions.create(
                messages=[
                    {
                        "role": "system",
                        "content": f"You are an expert workplace wellness advisor. Provide concise, actionable insights about employee wellbeing and burnout. Context: {context}"
                    },
                    {
                        "role": "user",
                        "content": message
                    }
                ],
                model="mixtral-8x7b-32768",
                temperature=0.7,
                max_tokens=500
            )
            
            response = chat_completion.choices[0].message.content
            
        except Exception as e:
            print(f"Groq API error: {e}")
            # Fall back to rule-based response
    
    return jsonify({"response": response})

def generate_fallback_response(msg, data, avg_burnout, avg_prod, avg_wellness, high_risk):
    """Generate rule-based chat response"""
    
    if 'burnout' in msg or 'risk' in msg:
        high_risk_emp = data[data['burnout_risk_index'] >= 0.7]
        if len(high_risk_emp) > 0:
            names = ', '.join(high_risk_emp['name'].head(3).tolist())
            return f"Currently tracking {len(data)} employees. {len(high_risk_emp)} are at high burnout risk (≥70%). Critical cases: {names}. Recommend immediate intervention: reduce meeting load 30%, mandate PTO, and schedule wellness checks."
        return f"Team is in good health overall. Average burnout risk is {avg_burnout*100:.0f}%."
    
    if 'productivity' in msg or 'performance' in msg:
        low_prod = data[data['productivity_index'] < 0.6]
        return f"Average productivity is {avg_prod*100:.0f}%. {len(low_prod)} employees below target. Key factors: meeting burden (avg {data['num_meetings'].mean():.1f} meetings/day) and sleep quality (avg {data['sleep_hours'].mean():.1f}h). Consider blocking focus time and encouraging better work-life balance."
    
    if 'meeting' in msg or 'calendar' in msg:
        overloaded = data[data['num_meetings'] > 7]
        if len(overloaded) > 0:
            names = ', '.join(overloaded['name'].head(3).tolist())
            return f"Team average: {data['num_meetings'].mean():.1f} meetings/day. {len(overloaded)} employees are meeting-overloaded (>7/day): {names}. Recommendation: Implement no-meeting days, decline non-essential meetings, and batch similar meetings together."
        return f"Meeting load is manageable at {data['num_meetings'].mean():.1f} meetings/day average."
    
    if 'sleep' in msg or 'wellness' in msg:
        poor_sleep = data[data['sleep_hours'] < 6.5]
        if len(poor_sleep) > 0:
            return f"Average sleep: {data['sleep_hours'].mean():.1f}h/night. {len(poor_sleep)} employees getting insufficient sleep (<6.5h). Sleep deprivation correlates with higher burnout risk. Recommend sleep hygiene training and enforcing after-hours boundaries."
        return f"Team wellness is good. Average sleep: {data['sleep_hours'].mean():.1f}h/night."
    
    if 'intervention' in msg or 'action' in msg or 'recommend' in msg:
        critical = data[data['burnout_risk_index'] >= 0.8]
        high = data[(data['burnout_risk_index'] >= 0.7) & (data['burnout_risk_index'] < 0.8)]
        
        response = "Priority interventions:\\n"
        if len(critical) > 0:
            response += f"🚨 Critical ({len(critical)}): Immediate workload reduction 40%, mandatory 3-day PTO.\\n"
        if len(high) > 0:
            response += f"⚠️ High ({len(high)}): Reduce meetings 30%, weekly check-ins.\\n"
        response += "📊 Overall: Focus on meeting reduction and sleep improvement for maximum impact."
        return response
    
    return f"I'm analyzing {len(data)} employees. Average burnout: {avg_burnout*100:.0f}%, productivity: {avg_prod*100:.0f}%, wellness: {avg_wellness*100:.0f}%. {high_risk} employees need attention. Ask me about specific risks, productivity, or recommendations!"

@app.route('/api/refresh', methods=['POST'])
def refresh_data():
    """Regenerate data"""
    initialize_data()
    return jsonify({"status": "success", "message": "Data refreshed"})

if __name__ == '__main__':
    app.run(debug=True, port=5000)