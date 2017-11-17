const path = require('path');
const fs = require('fs');
const compiler = require('vue-template-compiler');
const stripIndent = require('strip-indent');
const indentString = require('indent-string');
const parse = require('./parse');
const log = require('./util').log;
const config = require('./util').config;

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
  let props = obj.props || [];
  props.forEach(prop => {
    md += stripIndent(`| ${prop.name} | ${prop.type} | ${prop.required} | ${prop.default} | ${prop.validator} |` + '\n');
  });
  if (!props.length) {
    md + '|  |  |  |  |  |';
  }

  // events
  md += stripIndent(`
    ## Events
    | Name  | Data | Code |
    | ----- | ----- | ----- |
  `);
  let events = obj.events || [];
  events.forEach(item => {
    md += stripIndent(`| ${item.name} | ${item.data} | ${JSON.stringify(item.code)} |` + '\n');
  });
  if (!events.length) {
    md += stripIndent(`|  |  |`);
  }

  // methods
  md += stripIndent(`
    ## Methods
    | Name  | Code |
    | ----- | ----- |
  `);
  let methods = obj.methods || [];
  methods.forEach(item => {
    md += stripIndent(`| ${item.name} | ${item.code} |` + '\n');
  });
  if (!methods.length) {
    md += '| | |';
  }

  // Components
  md += stripIndent(`
    ## Components
  `);
  let components = obj.components || [];
  components.forEach(key => {
    md += stripIndent(`
      - ${key}
    `);
  });

  // options
  md += stripIndent(`
    ## Options
  `);
  let options = obj.options || [];
  options.forEach(key => {
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
      log(`parse file begin: ${e.filename}`);

      const parsedComponent = compiler.parseComponent(e.source);
      const code = parsedComponent.script ? parsedComponent.script.content : '';
      const parsed = parse(code);
      const md = getMarkDown(parsed);

      markdownCodes[e.filename] = md;

      e.source = code;
    }
  },
  jsdocCommentFound(e) {
    const tag = '@' + config.tag;

    if (
      /\.vue$/.test(e.filename)
      && e.comment.indexOf(tag) != -1
    ) {
      let md = markdownCodes[e.filename];
      e.comment = e.comment.replace(tag, md);
    }
  }
}

// defineTags
exports.defineTags = function (dictionary) {
  const tag = config.tag;

  dictionary.defineTag(tag, {
    mustHaveValue: false,
    onTagged (doclet, tag) {
      const componentName = doclet.meta.filename.split('.').slice(0, -1).join('.');

      doclet.scope = 'vue';
      doclet.kind = 'module';
      doclet.alias = 'vue-' + componentName;
    }
  });
}
