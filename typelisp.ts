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
    return {e: makeCons(makeSym('quote'), makeCons(tmp.e, kNil)), n: tmp.n};
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
  return makeError('noimpl');
}

addToEnv(makeSym('t'), makeSym('t'), g_env);

declare var process;
var stdin = process.openStdin();
stdin.setEncoding('utf8');
process.stdout.write('> ');
stdin.on('data', function (input) {
  console.log(printObj(eval1(read(input).e, g_env)));
  process.stdout.write('> ');
});
