const path = require('path');
const fs = require('fs');
const compiler = require('vue-template-compiler');
const stripIndent = require('strip-indent');
const indentString = require('indent-string');
const parse = require('./parse');

// get markdown comment
function getMarkDown(obj) {
  let md = '';

  // name
  let name = obj.name;
  if (name) {
    md += stripIndent(`
      ## Name
      > ${name};
    `);
  }

  // props
  md += stripIndent(`
    ## Props
    | Name  | Type | Required | Default | validator |
    | ----- | ---- | ------- | ------- | ------- |
  `);
  let props = obj.props || {};
  if (Array.isArray(props)) {
    let newProps = {};
    props.forEach(propName => newProps[propName] = {name: propName});
    props = newProps;
  }
  Object.keys(props).forEach(propName => {
    let item = props[propName];
    let type = getTypeString(item.type);
    let def = typeof item.default === 'function' ? item.default.toString() : String(item.default);
    md += stripIndent(`| ${propName} | \`${type}\` | \`${def}\` |` + '\n');
  });
  if (!Object.keys(props).length) {
    md += '| | | |';
  }

  // events
  md += stripIndent(`
    ## Events
    | Name  | Value |
    | ----- | ----- |
  `);
  let events = [];
  code.replace(/\$emit\(('|")\s*(.+?)\s*\1/g, function($0, $1, $2) {
    events.push({
      name: $2
    });
  });
  events.forEach(item => {
    md += stripIndent(`| ${item.name} | unknown |` + '\n');
  });
  if (!events.length) {
    md += stripIndent(`|  |  |`);
  }

  // methods
  md += stripIndent(`
    ## Methods
    | Name  | Params Length |
    | ----- | ----- |
  `);
  let methods = obj.methods || '';
  Object.keys(methods).forEach(name => {
    let method = methods[name];
    let argLength = method.length;
    md += stripIndent(`| ${name} | ${argLength} |` + '\n');
  });
  if (!Object.keys(props).length) {
    md += '| | | |';
  }

  // Components
  md += stripIndent(`
    ## Components
  `);
  let components = obj.components || {};
  Object.keys(components).forEach(key => {
    md += stripIndent(`
      - ${key}
    `);
  });

  // options
  md += stripIndent(`
    ## Options
  `);
  Object.keys(obj).forEach(key => {
    md += stripIndent(`
      - ${key}
    `);
  });

  return md;
}

// cache parsed md
const markdownCodes = {};

// handlers
exports.handlers = {
  beforeParse (e) {
    if (/\.vue$/.test(e.filename)) {
      const parsedComponent = compiler.parseComponent(e.source);
      const code = parsedComponent.script ? parsedComponent.script.content : '';
      const parsed = parse(code);
      const md = getMarkDown(parsed);

      markdownCodes[e.filename] = md;

      e.source = code;
    }
  },
  jsdocCommentFound(e) {
    //
  },
  symbolFound(e) {
    if (
      /\.vue$/.test(e.filename)
      && e.astnode.type === 'ExportDefaultDeclaration'
      && e.comment.indexOf('@vue') != -1
    ) {
      let md = markdownCodes[e.filename];
      e.comment = e.comment.replace(/@vue/, md);
    }
  },
  newDoclet(e) {
    if (/\.vue$/.test(e.doclet.meta.filename)) {
      // console.log(e.doclet)
    }
  }
}

// defineTags
exports.defineTags = function (dictionary) {
  dictionary.defineTag('vue', {
    mustHaveValue: false,
    onTagged (doclet, tag) {
      const componentName = doclet.meta.filename.split('.').slice(0, -1).join('.');

      doclet.scope = 'vue';
      doclet.kind = 'module';
      doclet.alias = 'vue-' + componentName;
    }
  });
}
