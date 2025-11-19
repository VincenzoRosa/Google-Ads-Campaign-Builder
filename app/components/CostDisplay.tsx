'use client';

import React from 'react';
import { DollarSign, TrendingUp, Info } from 'lucide-react';
import { CostBreakdown } from '../types/campaign';

interface CostDisplayProps {
  cost: CostBreakdown;
  title?: string;
}

export default function CostDisplay({ cost, title = "API Cost" }: CostDisplayProps) {
  return (
    <div className="bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-200 rounded-lg p-6 shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <DollarSign className="w-5 h-5 mr-2 text-green-600" />
          {title}
        </h3>
        <div className="flex items-center text-green-700 bg-green-100 px-3 py-1 rounded-full">
          <TrendingUp className="w-4 h-4 mr-1" />
          <span className="text-sm font-medium">{cost.model}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-white rounded-lg p-4 border border-green-100">
          <div className="text-xs text-gray-600 mb-1">Input Tokens</div>
          <div className="text-2xl font-bold text-gray-800">
            {cost.inputTokens.toLocaleString()}
          </div>
          <div className="text-sm text-green-600 font-medium mt-1">
            ${cost.inputCost.toFixed(4)}
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-blue-100">
          <div className="text-xs text-gray-600 mb-1">Output Tokens</div>
          <div className="text-2xl font-bold text-gray-800">
            {cost.outputTokens.toLocaleString()}
          </div>
          <div className="text-sm text-blue-600 font-medium mt-1">
            ${cost.outputCost.toFixed(4)}
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-100 to-blue-100 rounded-lg p-4 border-2 border-green-300">
          <div className="text-xs text-gray-700 font-semibold mb-1">Total Cost</div>
          <div className="text-3xl font-bold text-green-700">
            ${cost.totalCost.toFixed(4)}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            {cost.totalTokens.toLocaleString()} tokens
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 flex items-start space-x-2">
        <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue-800">
          This cost reflects the OpenAI API usage for this generation.
          Actual billing depends on your OpenAI account and pricing tier.
        </p>
      </div>
    </div>
  );
}
