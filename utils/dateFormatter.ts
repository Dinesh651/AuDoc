export const formatDateToMonthDayYear = (dateString: string): string => {
  const date = new Date(dateString + 'T00:00:00'); // Add T00:00:00 to ensure UTC interpretation and prevent timezone issues
  if (isNaN(date.getTime())) {
    return dateString; // Return original if invalid date
  }
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};