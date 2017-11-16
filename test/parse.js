const fs = require('fs');
const path = require('path');
const parse = require('../parse');

const code = fs.readFileSync(path.join(__dirname, './component/test.vue'));
console.log('=========begin code=======')
console.log(parse(code));
console.log('=========end code=======')

const code2 = fs.readFileSync(path.join(__dirname, './component/login.vue'));
console.log('=========begin code2=======')
console.log(parse(code2));
console.log('=========end code2=======')
