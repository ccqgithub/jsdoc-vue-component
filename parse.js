const espree = require('espree');
const estraverse = require('estraverse');
const escodegen = require('escodegen');
const log = require('./util').log;
const skips = ['ExperimentalSpreadProperty'];

function parseProps(item) {
  log('parse props begin ...');

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
        let type;
        let required;
        let def;
        let validator;

        prop.value.properties.forEach(item => {
          if (item.key.name == 'type') {
            type = item;
          }
          if (item.key.name == 'required') {
            required = item;
          }
          if (item.key.name == 'default') {
            def = item;
          }
          if (item.key.name == 'validator') {
            validator = item;
          }
        });

        // prop.type
        if (type) {
          // type: function
          if (type.value.type == 'FunctionExpression') {
            let args = type.value.params.map(arg => {
              return escodegen.generate(arg);
            });
            obj.type = `Function(${args.join(',')})`;
          }
          // type: Number ...
          if (type.value.type == 'Identifier') {
            obj.type = type.value.name;
          }
        }

        // prop.required
        if (required) {
          if (required.value.type == 'Identifier') {
            obj.required = required.value.name + '(var)';
          }
          if (required.value.type == 'Literal') {
            obj.required = required.value.value;
          }
        }

        // prop: default
        if (def) {
          // default: function() {}
          if (def.value.type == 'FunctionExpression') {
            let args = def.value.params.map(arg => {
              return escodegen.generate(arg);
            });
            obj.default = `Function(${args.join(',')})`;
          }
          // default: a
          if (def.value.type == 'Identifier') {
            obj.default = def.value.name + '(var)';
          }
          // default: 2
          if (def.value.type == 'Literal') {
            obj.default = def.value.value;
          }
        }

        // prop: validator
        if (validator) {
          // default: function() {}
          if (validator.value.type == 'FunctionExpression') {
            let args = validator.value.params.map(arg => {
              return escodegen.generate(arg);
            });
            obj.validator = `Function(${args.join(',')})`;
          }
          // default: Identifier
          if (validator.value.type == 'Identifier') {
            obj.validator = validator.value.name + '(var)';
          }
        }

        props.push(obj);
      }
    });
  }

  return props;
}

function parseMethods(item) {
  log('parse methods begin ...');

  let methods = [];

  // error methods format
  if (item.value.type != 'ObjectExpression') return methods;

  item.value.properties.forEach(prop => {
    if (!prop.value) return;

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
  log('parse components begin ...');

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

function parseEvents(ast) {
  // find emits
  let events = [];
  let emitList = [];

  estraverse.traverse(ast, {
    enter: function (node, parent) {
      if (skips.indexOf(node.type) != -1) return estraverse.VisitorOption.Skip;

      if (node.type == 'CallExpression') {
        if (node.callee.property.name == '$emit') {
          emitList.push(node);
        }
      }
    },
    leave: function (node, parent) {
      //
    }
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

  return events;
}

function parseCode(code) {
  log('parse code begin ...');

  const ast = espree.parse(code, {
    ecmaVersion: 9,
    sourceType: 'module',
    ecmaFeatures: {
      experimentalObjectRestSpread: true
    }
  });

  const parsed = {
    name: '',
    options: [],
    props: [],
    events: [],
    components: [],
    computeds: [],
  };

  // find exports
  let exportObj = null;
  estraverse.traverse(ast, {
    enter: function (node, parent) {
      if (skips.indexOf(node.type) != -1) return estraverse.VisitorOption.Skip;

      // export default
      if (node.type == 'ExportDefaultDeclaration') {
        exportObj = node.declaration;
        this.break();
      }

      // module.exports
      if (
        node.type == 'AssignmentExpression'
        && node.left.type == 'MemberExpression'
        && node.left.object.name == 'module'
        && node.left.property.name == 'exports'
      ) {
        exportObj = node.right;
        this.break();
      }
    }
  });

  if (!exportObj) return parsed;

  let propertyList = exportObj.properties || [];

  // events
  parsed.events = parseEvents(ast);

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
