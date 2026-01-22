'use client';

import { useState } from 'react';

export default function FAQ({ items }) {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleItem = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="card mb-8 bg-white">
      <h2 className="text-2xl font-bold text-niat-text mb-6 text-center">
        Frequently Asked Questions
      </h2>
      <div className="space-y-4">
        {items.map((item, index) => (
          <div
            key={index}
            className="border border-niat-border rounded-lg overflow-hidden transition-all duration-300 hover:shadow-md"
          >
            <button
              onClick={() => toggleItem(index)}
              className="w-full px-6 py-4 text-left flex items-center justify-between bg-white hover:bg-niat-navbar transition-colors duration-200"
            >
              <span className="font-semibold text-niat-text pr-4">
                {item.question}
              </span>
              <svg
                className={`w-5 h-5 text-niat-primary flex-shrink-0 transition-transform duration-300 ${
                  openIndex === index ? 'transform rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            <div
              className={`overflow-hidden transition-all duration-300 ${
                openIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="px-6 py-4 bg-niat-navbar border-t border-niat-border">
                <p className="text-niat-text-secondary leading-relaxed">
                  {item.answer}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

