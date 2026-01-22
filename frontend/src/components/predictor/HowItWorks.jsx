'use client';

export default function HowItWorks({ title, steps }) {
  return (
    <div className="card mb-8 bg-[#FFF8EB]">
      <h2 className="text-2xl font-bold text-niat-text mb-6 text-center">
        {title || 'How It Works'}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {steps.map((step, index) => (
          <div
            key={index}
            className="relative bg-white rounded-xl p-6 shadow-md border border-niat-border hover:shadow-lg transition-all duration-300"
          >
            {/* Step Number */}
            <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-br from-niat-primary to-accent-1 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
              {index + 1}
            </div>
            
            {/* Icon */}
            <div className="text-5xl mb-4 text-center">{step.icon}</div>
            
            {/* Title */}
            <h3 className="text-lg font-bold text-niat-text mb-2 text-center">
              {step.title}
            </h3>
            
            {/* Description */}
            <p className="text-sm text-niat-text-secondary text-center leading-relaxed">
              {step.description}
            </p>
            
            {/* Connector Line (not for last item) */}
            {index < steps.length - 1 && (
              <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-0.5 bg-gradient-to-r from-niat-primary to-accent-1 transform -translate-y-1/2 z-0">
                <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-0 h-0 border-l-4 border-l-accent-1 border-t-2 border-t-transparent border-b-2 border-b-transparent"></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

