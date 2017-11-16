const fs = require('fs');
const path = require('path');
const parse = require('../parse');

const code = fs.readFileSync(path.join(__dirname, './component/test.vue'));

console.log(parse(code));
