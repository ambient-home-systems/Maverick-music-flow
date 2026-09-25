// One-off migration helper: rewrites bilingual translation helper calls to the
// English-only single-argument form.
//
//   this._m("English", "Hebrew")              -> this._m("English")
//   this._m("English", "Hebrew", { n })       -> this._m("English", { n })
//   this._localText("English", "Hebrew")      -> this._localText("English")
//   this._discoveryGenreLabel("En", "He", "De") -> this._discoveryGenreLabel("En")
//   const t = (en, he) => card._m(en, he); t("English", "Hebrew") -> t("English")
//
// Calls whose second argument is not a plain literal (string, template literal or
// a conditional/concatenation of those) are left untouched and listed for manual
// editing. Run from the repository root: node scripts/strip-translation-args.mjs
import fs from "node:fs";
import path from "node:path";
import * as acorn from "acorn";

const SRC_ROOT = path.resolve("src");
const EXCLUDED_DIRS = new Set(["localization", "vendor", "sendspin-js"]);
const HELPERS = new Map([
  ["_m", { keepParams: true }],
  ["_localText", { keepParams: false }],
  ["_discoveryGenreLabel", { keepParams: false }],
]);
const SCOPE_TYPES = new Set([
  "Program", "FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression",
  "BlockStatement", "ForStatement", "ForInStatement", "ForOfStatement", "SwitchStatement",
  "CatchClause", "StaticBlock",
]);
const FUNCTION_TYPES = new Set(["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"]);

function listFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (dir === SRC_ROOT && EXCLUDED_DIRS.has(entry.name)) continue;
      out.push(...listFiles(path.join(dir, entry.name)));
    } else if (entry.name.endsWith(".js")) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out.sort();
}

function childNodes(node) {
  const children = [];
  for (const key of Object.keys(node)) {
    if (key === "type" || key === "start" || key === "end" || key === "loc") continue;
    const value = node[key];
    if (Array.isArray(value)) {
      for (const item of value) if (item && typeof item.type === "string") children.push(item);
    } else if (value && typeof value.type === "string") {
      children.push(value);
    }
  }
  return children;
}

function patternNames(pattern, out = []) {
  if (!pattern) return out;
  switch (pattern.type) {
    case "Identifier": out.push(pattern.name); break;
    case "ObjectPattern": for (const prop of pattern.properties) patternNames(prop.type === "RestElement" ? prop.argument : prop.value, out); break;
    case "ArrayPattern": for (const element of pattern.elements) patternNames(element, out); break;
    case "RestElement": patternNames(pattern.argument, out); break;
    case "AssignmentPattern": patternNames(pattern.left, out); break;
    default: break;
  }
  return out;
}

// A "pure" expression can be dropped without losing side effects.
function isPure(node) {
  if (!node) return true;
  switch (node.type) {
    case "Literal":
    case "Identifier":
    case "ThisExpression":
      return true;
    case "TemplateLiteral":
      return node.expressions.every(isPure);
    case "MemberExpression":
      return isPure(node.object) && (!node.computed || isPure(node.property));
    case "ChainExpression":
      return isPure(node.expression);
    case "UnaryExpression":
      return ["!", "-", "+", "typeof", "void"].includes(node.operator) && isPure(node.argument);
    case "BinaryExpression":
    case "LogicalExpression":
      return isPure(node.left) && isPure(node.right);
    case "ConditionalExpression":
      return isPure(node.test) && isPure(node.consequent) && isPure(node.alternate);
    case "ArrayExpression":
      return node.elements.every(isPure);
    case "ObjectExpression":
      return node.properties.every((prop) => prop.type === "Property" && (!prop.computed || isPure(prop.key)) && isPure(prop.value));
    case "CallExpression":
      // Escaping / formatting helpers are the only calls that appear inside
      // translated text; they are pure but get listed for review.
      return node.callee.type === "MemberExpression" && !node.callee.computed
        && /^(_esc|_i18n|_m|_localText|toFixed|toLowerCase|toUpperCase|trim|join|slice|padStart|round|max|min|floor|ceil)$/.test(node.callee.property.name)
        && isPure(node.callee.object) && node.arguments.every(isPure);
    default:
      return false;
  }
}

// The dropped (Hebrew) argument must be text-like: literals or combinations of
// them. An embedded expression is acceptable when it is pure, or when exactly
// the same source text also appears in the English argument (so the call still
// runs there and dropping the duplicate loses nothing).
function isDroppableText(node, ctx) {
  if (!node) return false;
  const embedded = (expr) => isPure(expr) || (ctx && ctx.source.slice(expr.start, expr.end).length > 0 && ctx.english.includes(ctx.source.slice(expr.start, expr.end)));
  switch (node.type) {
    case "Literal":
      return typeof node.value === "string";
    case "TemplateLiteral":
      return node.expressions.every(embedded);
    case "ConditionalExpression":
      return embedded(node.test) && isDroppableText(node.consequent, ctx) && isDroppableText(node.alternate, ctx);
    case "BinaryExpression":
      return node.operator === "+" && (isDroppableText(node.left, ctx) || embedded(node.left)) && (isDroppableText(node.right, ctx) || embedded(node.right));
    case "LogicalExpression":
      return isDroppableText(node.left, ctx) && isDroppableText(node.right, ctx);
    default:
      return false;
  }
}

function containsCall(node) {
  if (!node) return false;
  if (node.type === "CallExpression") return true;
  return childNodes(node).some(containsCall);
}

// Matches arrow-function aliases that forward some of their parameters to a
// helper, e.g. `(en, he) => card._esc(card._m(en, he))` or
// `(id, icon, en, he) => ({ id, icon, label: card._m(en, he) })`. The Hebrew
// (and German) parameters must be used nowhere else in the body. Returns the
// helper name, the inner call and the parameter positions to drop.
function aliasInfo(init) {
  if (!init || init.type !== "ArrowFunctionExpression") return null;
  const paramNames = init.params.map((param) => (param.type === "Identifier" ? param.name : param.type === "AssignmentPattern" && param.left.type === "Identifier" ? param.left.name : null));
  if (paramNames.length < 2 || paramNames.includes(null)) return null;
  const calls = [];
  const idents = new Map();
  (function scan(node) {
    if (node.type === "CallExpression" && node.callee.type === "MemberExpression" && !node.callee.computed && HELPERS.has(node.callee.property.name)) calls.push(node);
    if (node.type === "Identifier") idents.set(node.name, (idents.get(node.name) || 0) + 1);
    for (const child of childNodes(node)) scan(child);
  })(init.body);
  if (calls.length !== 1) return null;
  const call = calls[0];
  const helper = call.callee.property.name;
  const argNames = call.arguments.map((arg) => (arg.type === "Identifier" ? arg.name : null));
  if (argNames.length < 2 || argNames.some((name) => name == null || !paramNames.includes(name))) return null;
  const keepParams = HELPERS.get(helper).keepParams;
  const droppedArgIndexes = keepParams ? [1] : call.arguments.map((_, index) => index).slice(1);
  const dropParamIndexes = droppedArgIndexes.map((index) => paramNames.indexOf(argNames[index]));
  // dropped parameters must appear exactly once in the body (as the helper argument)
  for (const index of dropParamIndexes) {
    if ((idents.get(paramNames[index]) || 0) !== 1) return null;
  }
  // parameters referenced by a default value of a dropped parameter are fine to lose,
  // but a dropped parameter must not be referenced by another parameter default
  for (const param of init.params) {
    if (param.type === "AssignmentPattern") {
      let referenced = false;
      (function scan(node) { if (node.type === "Identifier" && dropParamIndexes.some((i) => paramNames[i] === node.name)) referenced = true; for (const child of childNodes(node)) scan(child); })(param.right);
      if (referenced && !dropParamIndexes.includes(init.params.indexOf(param))) return null;
    }
  }
  return { helper, params: init.params, call, droppedArgIndexes, dropParamIndexes };
}

function processFile(file) {
  const source = fs.readFileSync(file, "utf8");
  let ast;
  try {
    ast = acorn.parse(source, { ecmaVersion: "latest", sourceType: "module", locations: true });
  } catch (error) {
    return { file, edits: [], flagged: [{ line: 0, reason: `parse error: ${error.message}` }], review: [] };
  }

  // Pass 1: scope tree with declarations.
  const scopeOf = new Map(); // node -> scope
  const declScopes = [];
  function declare(scope, name, info) {
    if (!scope.decls.has(name)) scope.decls.set(name, info);
    else scope.decls.set(name, { kind: "multiple" });
  }
  function nearestFunctionScope(scope) {
    let current = scope;
    while (current && !FUNCTION_TYPES.has(current.node.type) && current.node.type !== "Program") current = current.parent;
    return current;
  }
  function build(node, parentScope) {
    let scope = parentScope;
    if (SCOPE_TYPES.has(node.type)) {
      scope = { node, parent: parentScope, decls: new Map() };
      scopeOf.set(node, scope);
      declScopes.push(scope);
      if (FUNCTION_TYPES.has(node.type)) {
        for (const param of node.params) for (const name of patternNames(param)) declare(scope, name, { kind: "param" });
        if (node.type === "FunctionExpression" && node.id) declare(scope, node.id.name, { kind: "function" });
      }
      if (node.type === "CatchClause" && node.param) for (const name of patternNames(node.param)) declare(scope, name, { kind: "param" });
    }
    if (node.type === "VariableDeclaration") {
      const target = node.kind === "var" ? nearestFunctionScope(scope) : scope;
      for (const declarator of node.declarations) {
        const names = patternNames(declarator.id);
        const alias = declarator.id.type === "Identifier" ? aliasInfo(declarator.init) : null;
        for (const name of names) declare(target, name, alias ? { kind: "alias", alias, declarator } : { kind: "other" });
      }
    }
    if (node.type === "FunctionDeclaration" && node.id) declare(parentScope, node.id.name, { kind: "function" });
    if (node.type === "ClassDeclaration" && node.id) declare(parentScope, node.id.name, { kind: "other" });
    if (node.type === "ImportDeclaration") for (const spec of node.specifiers) declare(parentScope, spec.local.name, { kind: "other" });
    for (const child of childNodes(node)) build(child, scope);
  }
  build(ast, null);

  function resolve(scope, name) {
    for (let current = scope; current; current = current.parent) {
      if (current.decls.has(name)) return current.decls.get(name);
    }
    return null;
  }

  // Pass 2: collect edits.
  const edits = [];
  const flagged = [];
  const review = [];
  const aliasesHandled = new Set();
  const line = (node) => node.loc.start.line;

  const aliasInnerCalls = new Set();
  for (const scope of declScopes) for (const decl of scope.decls.values()) if (decl.kind === "alias") aliasInnerCalls.add(decl.alias.call);

  function planCall(node, helper, keepParams, describe, dropIndexes = null) {
    const args = node.arguments;
    if (args.some((arg) => arg.type === "SpreadElement")) {
      flagged.push({ line: line(node), reason: `${describe}: spread argument` });
      return;
    }
    const ctx = { source, english: source.slice(args[0]?.start ?? 0, args[0]?.end ?? 0) };
    if (dropIndexes) {
      // alias call: drop the listed argument positions when present
      const present = dropIndexes.filter((index) => index < args.length);
      if (!present.length) return;
      if (!present.every((index) => isDroppableText(args[index], ctx))) {
        flagged.push({ line: line(node), reason: `${describe}: argument at a dropped position is ${present.map((index) => args[index].type).join("/")}` });
        return;
      }
      for (const index of present) {
        if (containsCall(args[index])) review.push({ line: line(node), reason: `${describe}: dropped text contained a call expression` });
        edits.push({ start: args[index - 1].end, end: args[index].end, text: "", line: line(node) });
      }
      return;
    }
    if (args.length < 2) return;
    if (helper === "_discoveryGenreLabel") {
      if (args.length > 3 || !args.slice(1).every((arg) => isDroppableText(arg, ctx))) {
        flagged.push({ line: line(node), reason: `${describe}: non-literal label arguments` });
        return;
      }
      edits.push({ start: args[0].end, end: args[args.length - 1].end, text: "", line: line(node) });
      return;
    }
    if (args.length > 3 || (args.length === 3 && !keepParams)) {
      flagged.push({ line: line(node), reason: `${describe}: unexpected argument count ${args.length}` });
      return;
    }
    const second = args[1];
    if (second.type === "ObjectExpression") {
      review.push({ line: line(node), reason: `${describe}: second argument is already a params object (left unchanged)` });
      return;
    }
    if (!isDroppableText(second, ctx)) {
      flagged.push({ line: line(node), reason: `${describe}: second argument is ${second.type}` });
      return;
    }
    if (containsCall(second)) review.push({ line: line(node), reason: `${describe}: dropped text contained a call expression` });
    edits.push({ start: args[0].end, end: second.end, text: "", line: line(node) });
  }

  function walk(node, scope) {
    if (scopeOf.has(node)) scope = scopeOf.get(node);
    if (node.type === "CallExpression" && !aliasInnerCalls.has(node)) {
      const callee = node.callee;
      if (callee.type === "MemberExpression" && !callee.computed && callee.property.type === "Identifier" && HELPERS.has(callee.property.name)) {
        planCall(node, callee.property.name, HELPERS.get(callee.property.name).keepParams, `${callee.property.name}()`);
      } else if (callee.type === "Identifier") {
        const decl = resolve(scope, callee.name);
        if (decl?.kind === "alias") {
          const info = decl.alias;
          if (!aliasesHandled.has(decl.declarator)) {
            aliasesHandled.add(decl.declarator);
            for (const index of info.dropParamIndexes) {
              edits.push({ start: info.params[index - 1].end, end: info.params[index].end, text: "", line: line(decl.declarator) });
            }
            for (const index of info.droppedArgIndexes) {
              edits.push({ start: info.call.arguments[index - 1].end, end: info.call.arguments[index].end, text: "", line: line(decl.declarator) });
            }
          }
          planCall(node, info.helper, false, `${callee.name}() alias of ${info.helper}`, info.dropParamIndexes);
        }
      }
    }
    for (const child of childNodes(node)) walk(child, scope);
  }
  walk(ast, null);

  // Apply edits from the end; drop edits nested inside another removed range.
  edits.sort((a, b) => a.start - b.start || b.end - a.end);
  const kept = [];
  let lastEnd = -1;
  for (const edit of edits) {
    if (edit.start < lastEnd) continue; // nested in a removed range
    kept.push(edit);
    lastEnd = edit.end;
  }
  let output = source;
  for (const edit of [...kept].reverse()) {
    output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
  }
  if (output !== source) {
    acorn.parse(output, { ecmaVersion: "latest", sourceType: "module" }); // must still parse
    fs.writeFileSync(file, output);
  }
  return { file, edits: kept, flagged, review };
}

let totalEdits = 0;
const allFlagged = [];
const allReview = [];
for (const file of listFiles(SRC_ROOT)) {
  const result = processFile(file);
  const rel = path.relative(process.cwd(), file);
  if (result.edits.length) console.log(`${rel}: ${result.edits.length} call(s) rewritten`);
  totalEdits += result.edits.length;
  for (const item of result.flagged) allFlagged.push(`${rel}:${item.line} ${item.reason}`);
  for (const item of result.review) allReview.push(`${rel}:${item.line} ${item.reason}`);
}
console.log(`\nTotal rewritten: ${totalEdits}`);
if (allReview.length) {
  console.log(`\nRewritten but worth a look (${allReview.length}):`);
  for (const item of allReview) console.log(`  ${item}`);
}
if (allFlagged.length) {
  console.log(`\nLEFT FOR MANUAL EDITING (${allFlagged.length}):`);
  for (const item of allFlagged) console.log(`  ${item}`);
}
