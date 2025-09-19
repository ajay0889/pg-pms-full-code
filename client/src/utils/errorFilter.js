// Filter out browser extension and development-related errors
// This helps reduce noise in the console during development

const ignoredErrors = [
  'load_embeds.js',
  'message port closed',
  'Non-Error promise rejection captured',
  'ResizeObserver loop limit exceeded',
  'favicon.ico',
  'chrome-extension://',
  'moz-extension://',
  'Script error.',
  'Network request failed'
];

const ignoredWarnings = [
  'React Router Future Flag Warning',
  'startTransition',
  'relativeSplatPath'
];

// Override console.error to filter out noise
const originalError = console.error;
console.error = (...args) => {
  const message = args.join(' ');
  
  // Check if this is an error we want to ignore
  const shouldIgnore = ignoredErrors.some(pattern => 
    message.toLowerCase().includes(pattern.toLowerCase())
  );
  
  if (!shouldIgnore) {
    originalError.apply(console, args);
  }
};

// Override console.warn to filter out noise
const originalWarn = console.warn;
console.warn = (...args) => {
  const message = args.join(' ');
  
  // Check if this is a warning we want to ignore
  const shouldIgnore = ignoredWarnings.some(pattern => 
    message.includes(pattern)
  );
  
  if (!shouldIgnore) {
    originalWarn.apply(console, args);
  }
};

// Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  const message = event.reason?.message || event.reason;
  
  // Check if this is an error we want to ignore
  const shouldIgnore = ignoredErrors.some(pattern => 
    String(message).toLowerCase().includes(pattern.toLowerCase())
  );
  
  if (shouldIgnore) {
    event.preventDefault(); // Prevent the error from showing in console
  }
});

export default {
  ignoredErrors,
  ignoredWarnings
};
