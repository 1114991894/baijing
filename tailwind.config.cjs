module.exports = {
  content: ['./dist/**/*.html', './build.mjs', './*.js'],
  theme: {
    extend: {
      colors: {
        primary: '#083E78',
        accent: '#28B8A0',
        hover: '#22C0E0',
        dark: '#0F172A',
        light: '#FFFFFF',
        section: '#F4FAFF',
        neutral: '#E2E8F0',
        secondary: '#333333',
        gold: '#C4A965',
        goldlight: '#E0C887',
        ink: '#04182F'
      },
      fontFamily: {
        sans: ['Noto Sans SC', 'system-ui', 'sans-serif'],
        serif: ['Noto Serif SC', 'serif'],
        num: ['Sora', 'Noto Sans SC', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        elevated: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
        hover: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }
    }
  }
};
