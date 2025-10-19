'use client';

import { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Send, User, Bot, TrendingUp, TrendingDown, AlertCircle, Heart, Clock, MessageSquare, Filter, RefreshCw } from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000/api';

export default function WorkaHolyDashboard() {
  const [employees, setEmployees] = useState([]);
  const [summary, setSummary] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: 'Hi! I\'m your AI Workforce Analytics Assistant. Ask me anything about employee wellbeing, burnout risks, or productivity insights.' }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const chatEndRef = useRef(null);

  // Fetch data from backend
  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const fetchData = async () => {
    try {
      setDataLoading(true);
      
      const [employeesRes, summaryRes, deptsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/employees`),
        fetch(`${API_BASE_URL}/summary`),
        fetch(`${API_BASE_URL}/departments`)
      ]);

      const employeesData = await employeesRes.json();
      const summaryData = await summaryRes.json();
      const deptsData = await deptsRes.json();

      setEmployees(employeesData);
      setSummary(summaryData);
      setDepartments(deptsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const handleRefreshData = async () => {
    try {
      await fetch(`${API_BASE_URL}/refresh`, { method: 'POST' });
      await fetchData();
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = { role: 'user', content: inputMessage };
    setChatMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: inputMessage })
      });

      const data = await response.json();
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (error) {
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter data
  const filteredEmployees = employees.filter(emp => 
    (selectedDepartment === 'all' || emp.dept === selectedDepartment) &&
    (selectedEmployee === 'all' || emp.id === selectedEmployee)
  );

  // Chart data
  const chartData = filteredEmployees.slice(0, 8).map(emp => ({
    name: emp.name.split('_')[1] || emp.name,
    burnout: (emp.burnout * 100).toFixed(0),
    productivity: (emp.productivity * 100).toFixed(0),
    wellness: (emp.wellness * 100).toFixed(0)
  }));

  const riskDistribution = [
    { name: 'Low Risk', value: filteredEmployees.filter(e => e.burnout < 0.5).length, color: '#10b981' },
    { name: 'Medium Risk', value: filteredEmployees.filter(e => e.burnout >= 0.5 && e.burnout < 0.7).length, color: '#f59e0b' },
    { name: 'High Risk', value: filteredEmployees.filter(e => e.burnout >= 0.7).length, color: '#ef4444' }
  ];

  const MetricCard = ({ title, value, change, icon: Icon, color }) => (
    <div className="bg-white rounded-lg shadow p-4 border-l-4" style={{ borderLeftColor: color }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 font-medium">{title}</p>
          <p className="text-2xl font-bold mt-1" style={{ color }}>{value}</p>
          {change && (
            <div className="flex items-center mt-1">
              {change > 0 ? <TrendingUp className="w-4 h-4 text-green-600" /> : <TrendingDown className="w-4 h-4 text-red-600" />}
              <span className={`text-sm ml-1 ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {Math.abs(change)}%
              </span>
            </div>
          )}
        </div>
        <Icon className="w-8 h-8" style={{ color }} />
      </div>
    </div>
  );

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Work-a-Holy Analytics</h1>
              <p className="text-sm text-gray-600">AI-Powered Workforce Wellbeing Dashboard</p>
            </div>
            <button 
              onClick={handleRefreshData}
              className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Data
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Controls & Metrics */}
          <div className="lg:col-span-2 space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center mb-3">
                <Filter className="w-5 h-5 text-gray-600 mr-2" />
                <h3 className="font-semibold text-gray-900">Filters</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <select 
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Departments</option>
                    {departments.map(dept => (
                      <option key={dept.department} value={dept.department}>
                        {dept.department}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                  <select 
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Employees</option>
                    {employees
                      .filter(emp => selectedDepartment === 'all' || emp.dept === selectedDepartment)
                      .map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                      ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Metric Cards */}
            {summary && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard 
                  title="Burnout Risk" 
                  value={`${(summary.avg_burnout_risk * 100).toFixed(0)}%`}
                  change={-5}
                  icon={AlertCircle}
                  color="#ef4444"
                />
                <MetricCard 
                  title="Productivity" 
                  value={`${(summary.avg_productivity * 100).toFixed(0)}%`}
                  change={7}
                  icon={TrendingUp}
                  color="#10b981"
                />
                <MetricCard 
                  title="Wellness Score" 
                  value={`${(summary.avg_wellness * 100).toFixed(0)}%`}
                  change={3}
                  icon={Heart}
                  color="#3b82f6"
                />
                <MetricCard 
                  title="Avg Meetings" 
                  value={summary.avg_meetings.toFixed(1)}
                  icon={Clock}
                  color="#f59e0b"
                />
              </div>
            )}

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Employee Metrics Comparison</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="burnout" fill="#ef4444" name="Burnout %" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="productivity" fill="#10b981" name="Productivity %" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Risk Distribution</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={riskDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {riskDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Employee List */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b">
                <h3 className="font-semibold text-gray-900">Employee Details</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Department</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Burnout</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Productivity</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Meetings</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Sleep</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredEmployees.map(emp => (
                      <tr key={emp.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">{emp.name}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{emp.dept}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 text-xs font-semibold rounded ${
                            emp.burnout >= 0.7 ? 'bg-red-100 text-red-800' : 
                            emp.burnout >= 0.5 ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-green-100 text-green-800'
                          }`}>
                            {(emp.burnout * 100).toFixed(0)}%
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">{(emp.productivity * 100).toFixed(0)}%</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{emp.meetings}/day</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{emp.sleep}h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Panel - AI Chat */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow h-[calc(100vh-180px)] flex flex-col sticky top-6">
              <div className="px-4 py-3 bg-blue-600 rounded-t-lg">
                <div className="flex items-center">
                  <MessageSquare className="w-5 h-5 text-white mr-2" />
                  <h3 className="font-semibold text-white">AI Assistant</h3>
                </div>
                <p className="text-xs text-blue-100 mt-1">Ask about employee wellbeing & insights</p>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex items-start max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        msg.role === 'user' ? 'bg-blue-600 ml-2' : 'bg-gray-200 mr-2'
                      }`}>
                        {msg.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-gray-600" />}
                      </div>
                      <div className={`rounded-lg px-3 py-2 ${
                        msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-lg px-4 py-3">
                      <div className="flex space-x-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Quick Suggestions */}
              <div className="px-4 py-2 border-t bg-gray-50">
                <p className="text-xs text-gray-600 mb-2">Quick questions:</p>
                <div className="flex flex-wrap gap-2">
                  {['Who needs intervention?', 'Meeting overload?', 'Sleep analysis'].map((q) => (
                    <button
                      key={q}
                      onClick={() => setInputMessage(q)}
                      className="text-xs px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input */}
              <div className="p-4 border-t">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ask about employee metrics..."
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={isLoading || !inputMessage.trim()}
                    className="bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}