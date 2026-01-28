'use client';

/**
 * Avatar Component - Google-style profile picture generator
 * 
 * Generates a profile picture with:
 * - First letter of the name
 * - Background color: #991B1C (niat-primary)
 * - Text color: #FFF8EB
 * 
 * @param {Object} props
 * @param {string} props.name - User's full name (first_name + last_name or email)
 * @param {string} props.size - Size class (default: 'w-10 h-10')
 * @param {string} props.className - Additional CSS classes
 */
export default function Avatar({ name, size = 'w-20 h-20', className = '' }) {
  // Get first letter of the name
  const getInitials = (name) => {
    if (!name) return '?';
    
    // Remove extra spaces and split
    const parts = name.trim().split(/\s+/);
    
    if (parts.length === 0) return '?';
    
    // If single word, return first letter
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    
    // If multiple words, return first letter of first word
    return parts[0].charAt(0).toUpperCase();
  };

  const initials = getInitials(name);
  const textSize = 'text-4xl';
  // Always generate Google-style avatar with NIAT brand colors
  return (
    <div
      className={`${size} rounded-full flex items-center justify-center font-semibold ${textSize} ${className}`}
      style={{
        backgroundColor: '#991B1C',
        color: '#FFF8EB'
      }}
      role="img"
      aria-label={name ? `${name}'s avatar` : 'User avatar'}
    >
      {initials}
    </div>
  );
}

