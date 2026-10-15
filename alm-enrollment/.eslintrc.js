// App Builder actions run on Node (CommonJS), not in the browser like the site code
module.exports = {
  env: { node: true, browser: false },
  parserOptions: { sourceType: 'script' },
  rules: {
    strict: 'off',
    // OpenWhisk request fields (__ow_headers, __ow_method)
    'no-underscore-dangle': ['error', { allow: ['__ow_headers', '__ow_method'] }],
    'max-len': ['error', { code: 120, ignoreStrings: true, ignoreTemplateLiterals: true }],
  },
};
