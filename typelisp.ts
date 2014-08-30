interface LObj {
  tag: string;
  str?: string;
  num?: number;
  car?: LObj;
  cdr?: LObj;
  fn?: (args: LObj) => LObj;
  args?: LObj;
  body?: LObj;
  env?: LObj;
}

var kLPar = '(';
var kRPar = ')';
var kQuote = "'";
var kNil: LObj = { tag: "nil", str: "nil" };

function safeCar(obj: LObj) {
  if (obj.tag == 'cons') {
    return obj.car;
  }
  return kNil;
}

function safeCdr(obj: LObj) {
  if (obj.tag == 'cons') {
    return obj.cdr;
  }
  return kNil;
}

function makeError(str: string) {
  return { tag: 'error', str: str };
}


var sym_table: {[key: string]: LObj;} = {};
function makeSym(str: string) {
  if (str == 'nil') {
    return kNil;
  } else if (!sym_table[str]) {
    sym_table[str] = { tag: 'sym', str: str };
  }
  return sym_table[str];
}

var sym_t = makeSym('t');
var sym_quote = makeSym('quote');
var sym_if = makeSym('if');
var sym_lambda = makeSym('lambda');
var sym_defun = makeSym('defun');
var sym_setq = makeSym('setq');

function makeNum(num: number) {
  return { tag: 'num', num: num };
}

function makeCons(a: LObj, d: LObj) {
  return { tag: 'cons', car: a, cdr: d };
}

function makeSubr(fn: (args: LObj) => LObj) {
  return { tag: 'subr', fn: fn };
}

function makeExpr(args: LObj, env: LObj) {
  return { tag: 'expr', args: safeCar(args), body: safeCdr(args), env: env };
}

function nreverse(lst: LObj) {
  var ret = kNil;
  while (lst.tag == 'cons') {
    var tmp = lst.cdr;
    lst.cdr = ret;
    ret = lst;
    lst = tmp;
  }
  return ret;
}

function pairlis(lst1: LObj, lst2: LObj) {
  var ret = kNil;
  while (lst1.tag == 'cons' && lst2.tag == 'cons') {
    ret = makeCons(makeCons(lst1.car, lst2.car), ret);
    lst1 = lst1.cdr;
    lst2 = lst2.cdr;
  }
  return nreverse(ret);
}

function isDelimiter (c: string) {
  return c == kLPar || c == kRPar || c == kQuote || /\s+/.test(c);
}

function skipSpaces(str: string) {
  return str.replace(/^\s+/, '');
}

function makeNumOrSym(str: string) {
  var num = parseInt(str);
  if (str == num.toString()) {
    return makeNum(num);
  }
  return makeSym(str);
}

interface Rpair {
  e: LObj;
  n: string;
}

function readAtom(str: string) {
  var next = ''
  for (var i = 0; i < str.length; i++) {
    if (isDelimiter(str[i])) {
      next = str.substring(i);
      str = str.substring(0, i);
      break;
    }
  }
  return {e: makeNumOrSym(str), n: next};
}

function read(str: string): Rpair {
  var str = skipSpaces(str);
  if (str == '') {
    return {e: makeError('empty input'), n: ''};
  } else if (str[0] == kRPar) {
    return {e: makeError('invalid syntax: ' + str), n: ''};
  } else if (str[0] == kLPar) {
    return readList(str.substring(1));
  } else if (str[0] == kQuote) {
    var tmp = read(str.substring(1));
    return {e: makeCons(sym_quote, makeCons(tmp.e, kNil)), n: tmp.n};
  }
  return readAtom(str);
}

function readList(str: string) {
  var ret = kNil;
  while (true) {
    str = skipSpaces(str);
    if (str.length == 0) {
      return {e: makeError('unfinished parenthesis'), n: ''};
    } else if (str[0] == kRPar) {
      break;
    }
    var tmp = read(str);
    var elm = tmp.e
    var next = tmp.n
    if (elm.tag == 'error') {
      return {e: elm, n: ''};
    }
    ret = makeCons(elm, ret);
    str = next;
  }
  return {e: nreverse(ret), n: str.substring(1)};
}

function printObj(obj: LObj) {
  if (obj.tag == 'num') {
    return obj.num.toString();
  } else if (obj.tag == 'sym' || obj.tag == 'nil') {
    return obj.str;
  } else if (obj.tag == 'error') {
    return '<error: ' + obj.str + '>';
  } else if (obj.tag == 'cons') {
    return printList(obj);
  } else if (obj.tag == 'subr' || obj.tag == 'expr') {
    return '<' + obj.tag + '>';
  }
  return '<unknown>';
}

function printList(obj: LObj) {
  var ret = '';
  var first = true;
  while (obj.tag == 'cons') {
    if (first) {
      first = false;
    } else {
      ret += ' ';
    }
    ret += printObj(obj.car);
    obj = obj.cdr;
  }
  if (obj.tag == 'nil') {
    return '(' + ret + ')'
  }
  return '(' + ret + ' . ' + printObj(obj) + ')'
}

function findVar(sym: LObj, env: LObj) {
  while (env.tag == 'cons') {
    var alist = env.car;
    while (alist.tag == 'cons') {
      if (alist.car.car == sym) {
        return alist.car;
      }
      alist = alist.cdr;
    }
    env = env.cdr;
  }
  return kNil;
}

var g_env = makeCons(kNil, kNil);

function addToEnv(sym: LObj, val: LObj, env: LObj) {
  env.car = makeCons(makeCons(sym, val), env.car);
}

function eval1(obj: LObj, env: LObj) {
  if (obj.tag == 'nil' || obj.tag == 'num' || obj.tag == 'error') {
    return obj;
  } else if (obj.tag == 'sym') {
    var bind = findVar(obj, env);
    if (bind == kNil) {
      return makeError(obj.str + ' has no value');
    }
    return bind.cdr;
  }

  var op = safeCar(obj);
  var args = safeCdr(obj);
  if (op == sym_quote) {
    return safeCar(args);
  } else if (op == sym_if) {
    if (eval1(safeCar(args), env) == kNil) {
      return eval1(safeCar(safeCdr(safeCdr(args))), env);
    }
    return eval1(safeCar(safeCdr(args)), env);
  } else if (op == sym_lambda) {
    return makeExpr(args, env);
  } else if (op == sym_defun) {
    var expr = makeExpr(safeCdr(args), env);
    var sym = safeCar(args);
    addToEnv(sym, expr, g_env);
    return sym;
  } else if (op == sym_setq) {
    var val = eval1(safeCar(safeCdr(args)), env);
    var sym = safeCar(args);
    var bind = findVar(sym, env);
    if (bind == kNil) {
      addToEnv(sym, val, g_env);
    } else {
      bind.cdr = val;
    }
    return val;
  }
  return apply(eval1(op, env), evlis(args, env), env);
}

function evlis(lst: LObj, env: LObj) {
  var ret = kNil;
  while (lst.tag == 'cons') {
    var elm = eval1(lst.car, env);
    if (elm.tag == 'error') {
      return elm;
    }
    ret = makeCons(elm, ret);
    lst = lst.cdr;
  }
  return nreverse(ret);
}

function progn(body: LObj, env: LObj) {
  var ret = kNil;
  while (body.tag == 'cons') {
    ret = eval1(body.car, env);
    body = body.cdr;
  }
  return ret;
}

function apply(fn: LObj, args: LObj, env: LObj) {
  if (fn.tag == 'error') {
    return fn;
  } else if (args.tag == 'error') {
    return args;
  } else if (fn.tag == 'subr') {
    return fn.fn(args);
  } else if (fn.tag == 'expr') {
    return progn(fn.body, makeCons(pairlis(fn.args, args), fn.env));
  }
  return makeError('noimpl');
}

function subrCar(args: LObj) {
  return safeCar(safeCar(args));
}

function subrCdr(args: LObj) {
  return safeCdr(safeCar(args));
}

function subrCons(args: LObj) {
  return makeCons(safeCar(args), safeCar(safeCdr(args)));
}

function subrEq(args: LObj) {
  var x = safeCar(args);
  var y = safeCar(safeCdr(args));
  if (x.tag == 'num' && y.tag == 'num') {
    if (x.num == y.num) {
      return sym_t;
    }
    return kNil;
  } else if (x == y) {
    return sym_t;
  }
  return kNil;
}

function subrAtom(args: LObj) {
  if (safeCar(args).tag == 'cons') {
    return kNil;
  }
  return sym_t;
}

function subrNumberp(args: LObj) {
  if (safeCar(args).tag == 'num') {
    return sym_t;
  }
  return kNil;
}

function subrSymbolp(args: LObj) {
  if (safeCar(args).tag == 'sym') {
    return sym_t;
  }
  return kNil;
}

function subrAddOrMul(fn: (x: number, y: number) => number, init_val: number) {
  return function(args: LObj): LObj {
    var ret = init_val;
    while (args.tag == 'cons') {
      if (args.car.tag != 'num') {
        return makeError('wrong type');
      }
      ret = fn(ret, args.car.num);
      args = args.cdr
    }
    return makeNum(ret);
  }
}
var subrAdd = subrAddOrMul(function(x, y){ return x + y; }, 0);
var subrMul = subrAddOrMul(function(x, y){ return x * y; }, 1);

function subrSubOrDivOrMod(fn: (x: number, y: number) => number) {
  return function(args: LObj): LObj {
    var x = safeCar(args);
    var y = safeCar(safeCdr(args));
    if (x.tag != 'num' || y.tag != 'num') {
      return makeError('wrong type');
    }
    return makeNum(fn(x.num, y.num));
  }
}
var subrSub = subrSubOrDivOrMod(function(x, y){ return x - y; });
var subrDiv = subrSubOrDivOrMod(function(x, y){ return x / y; });
var subrMod = subrSubOrDivOrMod(function(x, y){ return x % y; });

addToEnv(makeSym('car'), makeSubr(subrCar), g_env);
addToEnv(makeSym('cdr'), makeSubr(subrCdr), g_env);
addToEnv(makeSym('cons'), makeSubr(subrCons), g_env);
addToEnv(makeSym('eq'), makeSubr(subrEq), g_env);
addToEnv(makeSym('atom'), makeSubr(subrAtom), g_env);
addToEnv(makeSym('numberp'), makeSubr(subrNumberp), g_env);
addToEnv(makeSym('symbolp'), makeSubr(subrSymbolp), g_env);
addToEnv(makeSym('+'), makeSubr(subrAdd), g_env);
addToEnv(makeSym('*'), makeSubr(subrMul), g_env);
addToEnv(makeSym('-'), makeSubr(subrSub), g_env);
addToEnv(makeSym('/'), makeSubr(subrDiv), g_env);
addToEnv(makeSym('mod'), makeSubr(subrMod), g_env);
addToEnv(sym_t, sym_t, g_env);

declare var process;
var stdin = process.openStdin();
stdin.setEncoding('utf8');
process.stdout.write('> ');
stdin.on('data', function (input) {
  console.log(printObj(eval1(read(input).e, g_env)));
  process.stdout.write('> ');
});
