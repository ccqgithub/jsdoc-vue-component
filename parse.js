const esprima = require('esprima');
const esquery = require('esquery');
const escodegen = require('escodegen');

function parseProps(item) {
  let props = [];

  // props: [], array
  if (item.value.type == 'ArrayExpression') {
    item.value.elements.forEach(elem => {
      // props: ['a']
      if (elem.type == 'Literal') {
        props.push({
          name: elem.value
        });
      }
      // props: [var]
      if (elem.type == 'Identifier') {
        props.push({
          name: elem.name + '(var)'
        });
      }
    });
  }

  // props: {}, object
  if (item.value.type == 'ObjectExpression') {
    item.value.properties.forEach(prop => {
      // test: Type
      if (prop.value.type == 'Identifier') {
        props.push({
          name: prop.key.name,
          type: prop.value.name
        });
      }
      // test: {type: Type}
      if (prop.value.type == 'ObjectExpression') {
        let obj = {
          name: prop.key.name
        };
        // console.log(prop.value.properties)
        let type = esquery(prop.value, '[key.name="type"]');
        let required = esquery(prop.value, '[key.name="required"]');
        let def = esquery(prop.value, '[key.name="default"]');
        let validator = esquery(prop.value, '[key.name="validator"]');

        // prop.type
        if (type.length) {
          // type: function
          if (type[0].value.type == 'FunctionExpression') {
            let args = type[0].value.params.map(arg => {
              return escodegen.generate(arg);
            });
            obj.type = `Function(${args.join(',')})`;
          }
          // type: Number ...
          if (type[0].value.type == 'Identifier') {
            obj.type = type[0].value.name;
          }
        }

        // prop.required
        if (required.length) {
          if (required[0].value.type == 'Identifier') {
            obj.required = required[0].value.name + '(var)';
          }
          if (required[0].value.type == 'Literal') {
            obj.required = required[0].value.value;
          }
        }

        // prop: default
        if (def.length) {
          // default: function() {}
          if (def[0].value.type == 'FunctionExpression') {
            let args = def[0].value.params.map(arg => {
              return escodegen.generate(arg);
            });
            obj.default = `Function(${args.join(',')})`;
          }
          // default: a
          if (def[0].value.type == 'Identifier') {
            obj.default = def[0].value.name + '(var)';
          }
          // default: 2
          if (def[0].value.type == 'Literal') {
            obj.default = def[0].value.value;
          }
        }

        // prop: validator
        if (validator.length) {
          // default: function() {}
          if (validator[0].value.type == 'FunctionExpression') {
            let args = validator[0].value.params.map(arg => {
              return escodegen.generate(arg);
            });
            obj.validator = `Function(${args.join(',')})`;
          }
          // default: Identifier
          if (validator[0].value.type == 'Identifier') {
            obj.validator = validator[0].value.name + '(var)';
          }
        }

        props.push(obj);
      }
    });
  }

  return props;
}

function parseMethods(item) {
  let methods = [];

  // error methods format
  if (item.value.type != 'ObjectExpression') return methods;

  item.value.properties.forEach(prop => {
    if (prop.value.type == 'FunctionExpression') {
      let params = prop.value.params.map(p => {
        return escodegen.generate(p);
      });
      methods.push({
        name: prop.key.name,
        code: `Function(${params.join(',')})`
      });
    }

    if (prop.value.type == 'Identifier') {
      methods.push({
        name: prop.key.name,
        code: prop.value.name + '(var)'
      });
    }
  });

  return methods;
}

function parseComponents(item) {
  let components = [];

  // error format
  if (item.value.type != 'ObjectExpression') components;

  item.value.properties.forEach(prop => {
    if (prop.value.type == 'Identifier') {
      components.push(prop.value.name + '(var)');
    }
    if (prop.value.type == 'Literal') {
      components.push(prop.value.value);
    }
  });

  return components;
}

function parseCode(code) {
  const ast = esprima.parseModule(code);
  const propertyList = esquery(ast, "ExportDefaultDeclaration > .declaration > .properties");

  const parsed = {
    name: '',
    options: [],
    props: [],
    events: [],
    components: [],
    computeds: [],
  };

  // find emits
  let events = [];
  let emitList = esquery(ast, 'ExpressionStatement > .expression[type="CallExpression"]');

  emitList = emitList.filter(emit => {
    let find = esquery(emit, '.callee > .property[name="$emit"]');
    return find.length;
  });

  emitList.forEach(emit => {
    let obj = {
      code: escodegen.generate(emit)
    };

    if (!emit.arguments.length) return;

    if (emit.arguments[0].type == 'Literal') {
      obj.name = emit.arguments[0].value;
    }

    if (emit.arguments[1]) {
      obj.data = escodegen.generate(emit.arguments[1]);
    }

    events.push(obj);
  });

  parsed.events = events;

  // other
  propertyList.forEach(item => {
    // options
    parsed.options.push(item.key.name);

    switch(item.key.name) {
      case 'name':
        parsed.name = item.value.value;
        break;
      case 'props':
        parsed.props = parseProps(item);
        break;
      case 'methods':
        parsed.methods = parseMethods(item);
        break;
      case 'components':
        parsed.components = parseComponents(item);
        break;
      case 'computed':
        parsed.computeds = parseMethods(item);
        break;
    }
  });

  // console.log(parsed)
  return parsed;
}
module.exports = parseCode;
