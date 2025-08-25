/**
 * Usage Chart Component
 * Displays usage trends over time using a simple line chart
 */

'use client';

interface UsageData {
  date: string;
  requests: number;
  cost: number;
  tokens: number;
  averageResponseTime: number;
}

interface UsageChartProps {
  data: UsageData[];
}

export function UsageChart({ data }: UsageChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage Trends</h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          No data available
        </div>
      </div>
    );
  }

  // Calculate max values for scaling
  const maxRequests = Math.max(...data.map(d => d.requests));
  const maxCost = Math.max(...data.map(d => d.cost));
  const maxTokens = Math.max(...data.map(d => d.tokens));

  // Simple SVG chart implementation
  const chartWidth = 800;
  const chartHeight = 300;
  const padding = 40;
  const innerWidth = chartWidth - 2 * padding;
  const innerHeight = chartHeight - 2 * padding;

  const getX = (index: number) => padding + (index / (data.length - 1)) * innerWidth;
  const getYRequests = (requests: number) => chartHeight - padding - (requests / maxRequests) * innerHeight;
  const getYCost = (cost: number) => chartHeight - padding - (cost / maxCost) * innerHeight;

  // Generate path strings for lines
  const requestsPath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getYRequests(d.requests)}`)
    .join(' ');

  const costPath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getYCost(d.cost)}`)
    .join(' ');

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Usage Trends</h3>
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-gray-600">Requests</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-gray-600">Cost ($)</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg width={chartWidth} height={chartHeight} className="w-full h-auto">
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f3f4f6" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width={chartWidth} height={chartHeight} fill="url(#grid)" />

          {/* Y-axis labels for requests */}
          {[0, 0.25, 0.5, 0.75, 1].map(ratio => (
            <g key={`requests-${ratio}`}>
              <line
                x1={padding}
                y1={chartHeight - padding - ratio * innerHeight}
                x2={chartWidth - padding}
                y2={chartHeight - padding - ratio * innerHeight}
                stroke="#e5e7eb"
                strokeWidth="1"
              />
              <text
                x={padding - 10}
                y={chartHeight - padding - ratio * innerHeight + 4}
                textAnchor="end"
                className="text-xs fill-gray-500"
              >
                {Math.round(maxRequests * ratio)}
              </text>
            </g>
          ))}

          {/* X-axis labels */}
          {data.map((d, i) => {
            if (i % Math.ceil(data.length / 7) === 0) {
              return (
                <text
                  key={i}
                  x={getX(i)}
                  y={chartHeight - padding + 20}
                  textAnchor="middle"
                  className="text-xs fill-gray-500"
                >
                  {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </text>
              );
            }
            return null;
          })}

          {/* Requests line */}
          <path
            d={requestsPath}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Cost line */}
          <path
            d={costPath}
            fill="none"
            stroke="#10b981"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {data.map((d, i) => (
            <g key={i}>
              <circle
                cx={getX(i)}
                cy={getYRequests(d.requests)}
                r="3"
                fill="#3b82f6"
                className="hover:r-4 transition-all cursor-pointer"
              >
                <title>{`${new Date(d.date).toLocaleDateString()}: ${d.requests} requests`}</title>
              </circle>
              <circle
                cx={getX(i)}
                cy={getYCost(d.cost)}
                r="3"
                fill="#10b981"
                className="hover:r-4 transition-all cursor-pointer"
              >
                <title>{`${new Date(d.date).toLocaleDateString()}: $${d.cost.toFixed(2)}`}</title>
              </circle>
            </g>
          ))}
        </svg>
      </div>

      {/* Summary stats */}
      <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-gray-600">Total Requests</p>
          <p className="font-semibold text-gray-900">
            {data.reduce((sum, d) => sum + d.requests, 0).toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-gray-600">Total Cost</p>
          <p className="font-semibold text-gray-900">
            ${data.reduce((sum, d) => sum + d.cost, 0).toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-gray-600">Total Tokens</p>
          <p className="font-semibold text-gray-900">
            {data.reduce((sum, d) => sum + d.tokens, 0).toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-gray-600">Avg Response Time</p>
          <p className="font-semibold text-gray-900">
            {Math.round(data.reduce((sum, d) => sum + d.averageResponseTime, 0) / data.length)}ms
          </p>
        </div>
      </div>
    </div>
  );
}