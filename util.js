let config = {
  log: true
}

try {
  const env = require('jsdoc/env')
  config = Object.assign({}, config, env.conf['jsdoc-vue-component']);
} catch (e) {
  console.log(e);
}

function log(message) {
  if (!config.log) return;
  console.log('jsdoc-vue-component: ');
  console.log(message);
}

exports.config = config;
