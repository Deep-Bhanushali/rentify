'use client';

import { 
  Package, 
  Calendar, 
  DollarSign, 
  Clock, 
  TrendingUp, 
  Users,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react';

// Metric Card Component
interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
  };
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'yellow' | 'purple' | 'red';
}

export function MetricCard({ title, value, change, icon, color }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    purple: 'bg-purple-100 text-purple-600',
    red: 'bg-red-100 text-red-600',
  };

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className={`flex-shrink-0 rounded-md p-3 ${colorClasses[color]}`}>
            {icon}
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd className="flex items-baseline">
                <div className="text-2xl font-semibold text-gray-900">{value}</div>
                {change && (
                  <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                    change.type === 'increase' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    <TrendingUp className={`h-4 w-4 flex-shrink-0 self-center ${
                      change.type === 'increase' ? '' : 'transform rotate-180'
                    }`} />
                    <span className="sr-only">{change.type === 'increase' ? 'Increased' : 'Decreased'} by</span>
                    {change.value}%
                  </div>
                )}
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

// Recent Activity Card Component
interface RecentActivityCardProps {
  title: string;
  activities: Array<{
    id: string;
    title: string;
    description: string;
    time: string;
    status?: 'pending' | 'completed' | 'rejected' | 'accepted';
    avatar?: string;
  }>;
}

export function RecentActivityCard({ title, activities }: RecentActivityCardProps) {
  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'completed':
      case 'accepted':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">{title}</h3>
        <div className="flow-root">
          <ul className="-mb-8">
            {activities.map((activity, index) => (
              <li key={activity.id}>
                <div className="relative pb-8">
                  {index !== activities.length - 1 && (
                    <span
                      className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                      aria-hidden="true"
                    />
                  )}
                  <div className="relative flex space-x-3">
                    <div>
                      <span className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center ring-8 ring-white">
                        {getStatusIcon(activity.status)}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                      <div>
                        <p className="text-sm text-gray-900 font-medium">{activity.title}</p>
                        <p className="text-sm text-gray-500">{activity.description}</p>
                      </div>
                      <div className="text-right text-sm whitespace-nowrap text-gray-500">
                        {activity.time}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// Chart Card Component
interface ChartCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export function ChartCard({ title, description, children, actions }: ChartCardProps) {
  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">{title}</h3>
            {description && (
              <p className="mt-1 text-sm text-gray-500">{description}</p>
            )}
          </div>
          {actions && (
            <div className="flex space-x-2">
              {actions}
            </div>
          )}
        </div>
        <div className="mt-4">
          {children}
        </div>
      </div>
    </div>
  );
}

// Calendar Card Component
interface CalendarCardProps {
  title: string;
  currentDate: Date;
  onDateChange?: (date: Date) => void;
  events?: Array<{
    id: string;
    title: string;
    date: Date;
    type: 'pickup' | 'return' | 'maintenance';
  }>;
}

export function CalendarCard({ title, currentDate, onDateChange, events = [] }: CalendarCardProps) {
  const getEventColor = (type: string) => {
    switch (type) {
      case 'pickup':
        return 'bg-green-100 text-green-800';
      case 'return':
        return 'bg-blue-100 text-blue-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Simple calendar implementation
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  // Get first day of month
  const firstDay = new Date(year, month, 1);
  // Get last day of month
  const lastDay = new Date(year, month + 1, 0);
  
  // Get days in month
  const daysInMonth = lastDay.getDate();
  
  // Get day of week for first day (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfWeek = firstDay.getDay();
  
  // Create calendar days array
  const days = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push(null);
  }
  
  // Add days of the month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }
  
  // Get events for a specific day
  const getEventsForDay = (day: number) => {
    if (!day) return [];
    const date = new Date(year, month, day);
    return events.filter(event => 
      event.date.getDate() === date.getDate() &&
      event.date.getMonth() === date.getMonth() &&
      event.date.getFullYear() === date.getFullYear()
    );
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg leading-6 font-medium text-gray-900">{title}</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onDateChange && onDateChange(new Date(year, month - 1, 1))}
              className="p-1 rounded-md hover:bg-gray-100"
            >
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-medium text-gray-900">
              {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </span>
            <button
              onClick={() => onDateChange && onDateChange(new Date(year, month + 1, 1))}
              className="p-1 rounded-md hover:bg-gray-100"
            >
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => (
            <div 
              key={index} 
              className={`min-h-20 p-1 border rounded-md ${
                day ? 'bg-white' : 'bg-gray-50'
              }`}
            >
              {day && (
                <>
                  <div className="text-sm font-medium text-gray-900 mb-1">{day}</div>
                  <div className="space-y-1">
                    {getEventsForDay(day).slice(0, 2).map((event) => (
                      <div 
                        key={event.id} 
                        className={`text-xs p-1 rounded truncate ${getEventColor(event.type)}`}
                      >
                        {event.title}
                      </div>
                    ))}
                    {getEventsForDay(day).length > 2 && (
                      <div className="text-xs text-gray-500">
                        +{getEventsForDay(day).length - 2} more
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Quick Actions Card Component
interface QuickActionsCardProps {
  title: string;
  actions: Array<{
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    onClick: () => void;
    color: 'blue' | 'green' | 'yellow' | 'purple' | 'red';
  }>;
}

export function QuickActionsCard({ title, actions }: QuickActionsCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600 hover:bg-blue-200',
    green: 'bg-green-100 text-green-600 hover:bg-green-200',
    yellow: 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200',
    purple: 'bg-purple-100 text-purple-600 hover:bg-purple-200',
    red: 'bg-red-100 text-red-600 hover:bg-red-200',
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">{title}</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={action.onClick}
              className={`flex items-center p-4 rounded-lg text-left transition-colors ${colorClasses[action.color]}`}
            >
              <div className="flex-shrink-0">
                {action.icon}
              </div>
              <div className="ml-4">
                <h4 className="text-sm font-medium">{action.title}</h4>
                <p className="text-sm opacity-75">{action.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}