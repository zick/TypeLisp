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
var kNil = { tag: "nil", str: "nil" };

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

function readAtom(str: string) {
  var next = ''
  for (var i = 0; i < str.length; i++) {
    if (isDelimiter(str[i])) {
      next = str.substring(i);
      str = str.substring(0, i);
      break;
    }
  }
  return [makeNumOrSym(str), next];
}

function read(str: string) {
  var str = skipSpaces(str);
  if (str == '') {
    return [makeError('empty input'), ''];
  } else if (str[0] == kRPar) {
    return [makeError('invalid syntax: ' + str), ''];
  } else if (str[0] == kLPar) {
    return [makeError('noimpl'), ''];
  } else if (str[0] == kQuote) {
    return [makeError('noimpl'), ''];
  }
  return readAtom(str);
}

declare var process;
var stdin = process.openStdin();
stdin.setEncoding('utf8');
process.stdout.write('> ');
stdin.on('data', function (input) {
  console.log(read(input));
  process.stdout.write('> ');
});
