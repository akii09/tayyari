/**
 * Provider Breakdown Component
 * Displays provider or model usage breakdown with charts
 */

'use client';

interface BreakdownData {
  [key: string]: {
    requests: number;
    cost: number;
    tokens: number;
    averageResponseTime?: number;
  };
}

interface ProviderBreakdownProps {
  title: string;
  data: BreakdownData;
  totalRequests: number;
  totalCost: number;
}

export function ProviderBreakdown({ title, data, totalRequests, totalCost }: ProviderBreakdownProps) {
  const sortedEntries = Object.entries(data)
    .sort(([,a], [,b]) => b.requests - a.requests)
    .slice(0, 10); // Show top 10

  const getProviderColor = (index: number) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-purple-500',
      'bg-red-500',
      'bg-indigo-500',
      'bg-pink-500',
      'bg-gray-500',
      'bg-orange-500',
      'bg-teal-500',
    ];
    return colors[index % colors.length];
  };

  const getProviderColorLight = (index: number) => {
    const colors = [
      'bg-blue-100',
      'bg-green-100',
      'bg-yellow-100',
      'bg-purple-100',
      'bg-red-100',
      'bg-indigo-100',
      'bg-pink-100',
      'bg-gray-100',
      'bg-orange-100',
      'bg-teal-100',
    ];
    return colors[index % colors.length];
  };

  if (sortedEntries.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="flex items-center justify-center h-32 text-gray-500">
          No data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      
      {/* Pie Chart */}
      <div className="flex items-center justify-center mb-6">
        <div className="relative w-32 h-32">
          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
            {sortedEntries.reduce((acc, [name, stats], index) => {
              const percentage = (stats.requests / totalRequests) * 100;
              const strokeDasharray = `${percentage} ${100 - percentage}`;
              const strokeDashoffset = -acc.offset;
              
              acc.offset += percentage;
              acc.elements.push(
                <circle
                  key={name}
                  cx="50"
                  cy="50"
                  r="15.915"
                  fill="transparent"
                  stroke={getProviderColor(index).replace('bg-', '#')}
                  strokeWidth="8"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-300 hover:stroke-width-10"
                />
              );
              
              return acc;
            }, { offset: 0, elements: [] as JSX.Element[] }).elements}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">{sortedEntries.length}</div>
              <div className="text-xs text-gray-500">Items</div>
            </div>
          </div>
        </div>
      </div>

      {/* Legend and Stats */}
      <div className="space-y-3">
        {sortedEntries.map(([name, stats], index) => {
          const requestPercentage = (stats.requests / totalRequests) * 100;
          const costPercentage = totalCost > 0 ? (stats.cost / totalCost) * 100 : 0;
          
          return (
            <div key={name} className="flex items-center justify-between">
              <div className="flex items-center space-x-3 flex-1">
                <div className={`w-3 h-3 rounded-full ${getProviderColor(index)}`}></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate capitalize">
                    {name}
                  </p>
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span>{stats.requests} requests</span>
                    <span>${stats.cost.toFixed(2)}</span>
                    {stats.tokens && <span>{stats.tokens.toLocaleString()} tokens</span>}
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {requestPercentage.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500">
                  ${(stats.cost / stats.requests).toFixed(4)}/req
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress Bars */}
      <div className="mt-4 space-y-2">
        {sortedEntries.slice(0, 5).map(([name, stats], index) => {
          const percentage = (stats.requests / totalRequests) * 100;
          
          return (
            <div key={name} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600 capitalize truncate">{name}</span>
                <span className="text-gray-900 font-medium">{percentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${getProviderColor(index)} transition-all duration-300`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Top Provider</p>
            <p className="font-semibold text-gray-900 capitalize">
              {sortedEntries[0]?.[0] || 'None'}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Coverage</p>
            <p className="font-semibold text-gray-900">
              {sortedEntries.length > 0 
                ? `${((sortedEntries[0][1].requests / totalRequests) * 100).toFixed(1)}%`
                : '0%'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}