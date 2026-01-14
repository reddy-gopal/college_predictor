export default function CollegeCard({ college, index }) {
  // Handle backend response format
  const collegeName = college.college_name || college.name || 'Unknown College';
  const courseName = college.course_name || college.course || 'Unknown Course';
  const branch = college.branch_display || college.branch || '';
  const degree = college.degree_display || college.degree || '';
  const location = college.college_location || college.location || '';
  const state = college.college_state || college.state || 'N/A';
  const collegeType = college.college_type || '';
  const openingRank = college.opening_rank || 'N/A';
  const closingRank = college.closing_rank || 'N/A';
  const year = college.year || '';
  const quota = college.quota_display || college.quota || '';
  const seatType = college.seat_type_display || college.seat_type || '';
  
  // Format rank range
  const rankRange = openingRank !== 'N/A' && closingRank !== 'N/A'
    ? openingRank === closingRank
      ? openingRank
      : `${openingRank} - ${closingRank}`
    : 'N/A';

  // Determine card color based on college type
  const getCardGradient = () => {
    if (collegeType?.toLowerCase().includes('government')) {
      return 'from-blue-50 to-blue-100 border-blue-200';
    }
    return 'from-gray-50 to-white border-gray-200';
  };

  return (
    <div className={`group relative bg-gradient-to-br ${getCardGradient()} border-2 rounded-xl p-6 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 h-full flex flex-col`}>
      {/* Badge */}
      <div className="absolute top-4 right-4">
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md">
          ✓ Eligible
        </div>
      </div>

      {/* College Header */}
      <div className="mb-4 pr-16">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center text-white font-bold text-sm">
            #{index + 1}
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary transition-colors line-clamp-2">
              {collegeName}
            </h3>
          </div>
        </div>
        <div className="mt-2">
          <p className="text-primary font-semibold text-base mb-1">{courseName}</p>
          {branch && (
            <span className="inline-block bg-primary/10 text-primary text-xs font-medium px-2 py-1 rounded mr-2 mb-1">
              {branch}
            </span>
          )}
          {degree && (
            <span className="inline-block bg-secondary/10 text-secondary text-xs font-medium px-2 py-1 rounded mb-1">
              {degree}
            </span>
          )}
        </div>
      </div>

      {/* Details Section */}
      <div className="space-y-3 mb-4 flex-1">
        {location && (
          <div className="flex items-start gap-2 text-gray-700">
            <span className="text-lg mt-0.5">📍</span>
            <span className="text-sm flex-1">
              <span className="font-medium">{location}</span>
              {state && state !== 'N/A' && (
                <span className="text-gray-500">, {state}</span>
              )}
            </span>
          </div>
        )}
        
        {collegeType && (
          <div className="flex items-center gap-2 text-gray-700">
            <span className="text-lg">🏛️</span>
            <span className="text-sm font-medium">{collegeType}</span>
          </div>
        )}
        
        <div className="bg-gradient-to-r from-accent-1/20 to-accent-2/20 rounded-lg p-3 border border-accent-1/30">
          <div className="flex items-center gap-2 text-gray-900">
            <span className="text-lg">🎯</span>
            <div className="flex-1">
              <div className="text-xs text-gray-600 mb-1">Rank Range</div>
              <div className="font-bold text-primary">{rankRange}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          {year && (
            <div className="flex items-center gap-1.5 text-gray-600 bg-gray-50 rounded px-2 py-1.5">
              <span>📅</span>
              <span className="font-medium">{year}</span>
            </div>
          )}
          {quota && (
            <div className="flex items-center gap-1.5 text-gray-600 bg-gray-50 rounded px-2 py-1.5">
              <span>🏷️</span>
              <span className="font-medium truncate">{quota}</span>
            </div>
          )}
        </div>

        {seatType && (
          <div className="flex items-center gap-2 text-gray-600 bg-gray-50 rounded px-2 py-1.5 text-xs">
            <span>💺</span>
            <span className="font-medium">{seatType}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-gray-200/50 mt-auto">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Result #{index + 1}
          </div>
          <div className="text-xs text-primary font-semibold">
            View Details →
          </div>
        </div>
      </div>
    </div>
  );
}
