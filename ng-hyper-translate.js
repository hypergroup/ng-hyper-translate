
;(function(){

/**
 * Require the module at `name`.
 *
 * @param {String} name
 * @return {Object} exports
 * @api public
 */

function require(name) {
  var module = require.modules[name];
  if (!module) throw new Error('failed to require "' + name + '"');

  if (!('exports' in module) && typeof module.definition === 'function') {
    module.client = module.component = true;
    module.definition.call(this, module.exports = {}, module);
    delete module.definition;
  }

  return module.exports;
}

/**
 * Meta info, accessible in the global scope unless you use AMD option.
 */

require.loader = 'component';

/**
 * Internal helper object, contains a sorting function for semantiv versioning
 */
require.helper = {};
require.helper.semVerSort = function(a, b) {
  var aArray = a.version.split('.');
  var bArray = b.version.split('.');
  for (var i=0; i<aArray.length; ++i) {
    var aInt = parseInt(aArray[i], 10);
    var bInt = parseInt(bArray[i], 10);
    if (aInt === bInt) {
      var aLex = aArray[i].substr((""+aInt).length);
      var bLex = bArray[i].substr((""+bInt).length);
      if (aLex === '' && bLex !== '') return 1;
      if (aLex !== '' && bLex === '') return -1;
      if (aLex !== '' && bLex !== '') return aLex > bLex ? 1 : -1;
      continue;
    } else if (aInt > bInt) {
      return 1;
    } else {
      return -1;
    }
  }
  return 0;
}

/**
 * Find and require a module which name starts with the provided name.
 * If multiple modules exists, the highest semver is used. 
 * This function can only be used for remote dependencies.

 * @param {String} name - module name: `user~repo`
 * @param {Boolean} returnPath - returns the canonical require path if true, 
 *                               otherwise it returns the epxorted module
 */
require.latest = function (name, returnPath) {
  function showError(name) {
    throw new Error('failed to find latest module of "' + name + '"');
  }
  // only remotes with semvers, ignore local files conataining a '/'
  var versionRegexp = /(.*)~(.*)@v?(\d+\.\d+\.\d+[^\/]*)$/;
  var remoteRegexp = /(.*)~(.*)/;
  if (!remoteRegexp.test(name)) showError(name);
  var moduleNames = Object.keys(require.modules);
  var semVerCandidates = [];
  var otherCandidates = []; // for instance: name of the git branch
  for (var i=0; i<moduleNames.length; i++) {
    var moduleName = moduleNames[i];
    if (new RegExp(name + '@').test(moduleName)) {
        var version = moduleName.substr(name.length+1);
        var semVerMatch = versionRegexp.exec(moduleName);
        if (semVerMatch != null) {
          semVerCandidates.push({version: version, name: moduleName});
        } else {
          otherCandidates.push({version: version, name: moduleName});
        } 
    }
  }
  if (semVerCandidates.concat(otherCandidates).length === 0) {
    showError(name);
  }
  if (semVerCandidates.length > 0) {
    var module = semVerCandidates.sort(require.helper.semVerSort).pop().name;
    if (returnPath === true) {
      return module;
    }
    return require(module);
  }
  // if the build contains more than one branch of the same module
  // you should not use this funciton
  var module = otherCandidates.pop().name;
  if (returnPath === true) {
    return module;
  }
  return require(module);
}

/**
 * Registered modules.
 */

require.modules = {};

/**
 * Register module at `name` with callback `definition`.
 *
 * @param {String} name
 * @param {Function} definition
 * @api private
 */

require.register = function (name, definition) {
  require.modules[name] = {
    definition: definition
  };
};

/**
 * Define a module's exports immediately with `exports`.
 *
 * @param {String} name
 * @param {Generic} exports
 * @api private
 */

require.define = function (name, exports) {
  require.modules[name] = {
    exports: exports
  };
};
require.register("lang-js~interpolate@1.0.1", function (exports, module) {
/**
 * Expose the compile function
 */

exports = module.exports = compile;

/**
 * Expose the interpolate function
 */

exports.interpolate = interpolate;

/**
 * Interpolate a string without a compilation step
 *
 * THIS IS NOT RECOMMENDED FOR PRODUCTION USE
 *
 * @param {String} string
 * @param {Object?} params
 * @param {Object?} opts
 */

function interpolate(string, params, opts) {
  return compile(string, opts)(params).join('');
};

/**
 * Compile a string into an interpolate function
 *
 * @param {String} string
 * @param {Object?} opts
 * @return {Function}
 */

function compile(string, opts) {
  opts = opts || {};
  var open = escapeRegex(opts.open || '%{');
  var close = opts.close || '}';
  var char = close.charAt(0);
  var re = new RegExp('(' + escapeRegex(open) + ' *[^' + escapeRegex(char) + ']+ *' + escapeRegex(close) + ')', 'g');

  var params = 'params';

  var fallback = opts.fallback ?
        ' || ' + JSON.stringify(opts.fallback) :
        '';

  var rawParts = string.split(re);
  var parts = [], paramsObj = {};
  for (var i = 0, l = rawParts.length, part, prop; i < l; i++) {
    part = rawParts[i];

    // skip the blank parts
    if (!part) continue;

    // it's normal text
    if (part.indexOf(open) !== 0 && part.indexOf(close) !== part.length - close.length) {
      parts.push(JSON.stringify(part));
      continue;
    }

    // it's a interpolation part
    part = part.slice(open.length, -close.length);
    prop = formatProperty(part, params);
    part = prop[1] || part;
    paramsObj[part] = (paramsObj[part] || 0) + 1;
    parts.push(prop[0] + fallback);
  }

  var fn = new Function('exec, ' + params,
    params + ' = ' + params + ' || {};\nreturn [' + parts.join(', ') + '];').bind(null, exec);
  fn.params = paramsObj;
  return fn;
}

/**
 * Execute a function for a block
 *
 * @param {String} name
 * @param {String} contents
 * @param {Object} params
 * @return {Any}
 */

function exec(name, contents, params) {
  var fn = params[name];
  var type = typeof fn;
  if (type === 'function') return fn(contents, params);
  return type === 'undefined' ? contents : fn;
}

/**
 * Escape any reserved regex characters
 *
 * @param {String} str
 * @return {String}
 */

function escapeRegex(str) {
  return str.replace(/[\^\-\]\\]/g, function(c) {
    return '\\' + c;
  });
}

/**
 * Format a property accessor
 *
 * @param {String} prop
 * @param {String} params
 * @return {String}
 */

var re = /^[\w\d]+$/;
function formatProperty(prop, params) {
  if (!re.test(prop)) {
    var parts = prop.split(/ *: */);
    if (parts.length === 1) return [params + '[' + JSON.stringify(prop) + ']'];

    return ['exec("' + parts[0] + '", "' + parts[1] + '", ' + params + ')', parts[0]];
  }
  var int = parseInt(prop, 10);
  if (isNaN(int)) return [params + '.' + prop];
  return [params + '[' + prop + ']'];
}

});

require.register("directiv~core-reduce@1.0.0", function (exports, module) {
/**
 * Compile an object reducer
 *
 * @param {Object} obj
 * @param {Array?} keys
 * @param {Boolean?} ignoreKey
 * @param {Function}
 */

module.exports = function(obj, keys, ignoreKey) {
  return Array.isArray(obj) ?
    initArray(obj) :
    initObj(obj, keys || Object.keys(obj), ignoreKey);
};

function initArray(arr) {
  return (function(fn, acc) {
    for (var i = 0, l = this.length; i < l; i++) {
      acc = fn(acc, this[i], i);
    }
    return acc;
  }).bind(arr);
}

function initObj(obj, keys, ignoreKey) {
  var arr = keys.map(function(key) {
    return obj[key];
  });

  if (ignoreKey) return initArray(arr);

  return (function(ks, fn, acc) {
    for (var i = 0, l = this.length; i < l; i++) {
      acc = fn(acc, this[i], keys[i]);
    }
    return acc;
  }).bind(arr, keys);
}

});

require.register("lang-js~cardinal@0.1.2", function (exports, module) {
var e = exports;

function augment(fn, list) {
  fn.count = list.length;
  fn.formats = list;
}

augment(e.af =
 e.asa =
 e.az =
 e.bem =
 e.bez =
 e.bg =
 e.brx =
 e.cgg =
 e.chr =
 e.ee =
 e.el =
 e.eo =
 e.es =
 e.eu =
 e.fo =
 e.fur =
 e.gsw =
 e.ha =
 e.haw =
 e.hu =
 e.jgo =
 e.jmc =
 e.ka =
 e.kk =
 e.kkj =
 e.kl =
 e.ks =
 e.ksb =
 e.ky =
 e.lg =
 e.mas =
 e.mgo =
 e.ml =
 e.mn =
 e.nb =
 e.nd =
 e.ne =
 e.nn =
 e.nnh =
 e.nr =
 e.nyn =
 e.om =
 e.or =
 e.os =
 e.ps =
 e.rm =
 e.rof =
 e.rwk =
 e.saq =
 e.seh =
 e.sn =
 e.so =
 e.sq =
 e.ss =
 e.ssy =
 e.st =
 e.ta =
 e.te =
 e.teo =
 e.tig =
 e.tn =
 e.tr =
 e.ts =
 e.ug =
 e.uz =
 e.ve =
 e.vo =
 e.vun =
 e.wae =
 e.xh =
 e.xog = function af(n) {
if(typeof n==="string")n=parseInt(n,10);if(n===1)return"one";return"other"
}, ["one","other"]);

augment(e.ak =
 e.ln =
 e.mg =
 e.nso =
 e.pa =
 e.ti = function ak(n) {
if(typeof n==="string")n=parseInt(n,10);if(n===Math.floor(n)&&n>=0&&n<=1)return"one";return"other"
}, ["one","other"]);

augment(e.am =
 e.bn =
 e.fa =
 e.gu =
 e.hi =
 e.kn =
 e.mr =
 e.zu = function am(n) {
var i=Math.floor(Math.abs(n));if(typeof n==="string")n=parseInt(n,10);if(i===0||n===1)return"one";return"other"
}, ["one","other"]);

augment(e.ar = function ar(n) {
if(typeof n==="string")n=parseInt(n,10);if(n===0)return"zero";if(n===1)return"one";if(n===2)return"two";if(n%100===Math.floor(n%100)&&n%100>=3&&n%100<=10)return"few";if(n%100===Math.floor(n%100)&&n%100>=11&&n%100<=99)return"many";return"other"
}, ["zero","one","two","few","many","other"]);

augment(e.as =
 e.ast =
 e.ca =
 e.de =
 e.en =
 e.et =
 e.fi =
 e.fy =
 e.gl =
 e.it =
 e.nl =
 e.sv =
 e.sw =
 e.ur = function as(n) {
var i=Math.floor(Math.abs(n)),v=n.toString().replace(/^[^.]*\.?/,"").length;if(typeof n==="string")n=parseInt(n,10);if(i===1&&v===0)return"one";return"other"
}, ["one","other"]);

augment(e.be = function be(n) {
if(typeof n==="string")n=parseInt(n,10);if(n%10===1&&!(n%100===11))return"one";if(n%10===Math.floor(n%10)&&n%10>=2&&n%10<=4&&!(n%100>=12&&n%100<=14))return"few";if(n%10===0||n%10===Math.floor(n%10)&&n%10>=5&&n%10<=9||n%100===Math.floor(n%100)&&n%100>=11&&n%100<=14)return"many";return"other"
}, ["one","few","many","other"]);

augment(e.bm =
 e.bo =
 e.dz =
 e.id =
 e.ig =
 e.ii =
 e.ja =
 e.kde =
 e.kea =
 e.km =
 e.ko =
 e.lkt =
 e.lo =
 e.ms =
 e.my =
 e.root =
 e.sah =
 e.ses =
 e.sg =
 e.th =
 e.to =
 e.vi =
 e.yo =
 e.zh = function bm(n) {
return"other"
}, ["other"]);

augment(e.br = function br(n) {
if(typeof n==="string")n=parseInt(n,10);if(n%10===1&&!(n%100===11||n%100===71||n%100===91))return"one";if(n%10===2&&!(n%100===12||n%100===72||n%100===92))return"two";if(n%10===Math.floor(n%10)&&(n%10>=3&&n%10<=4||n%10===9)&&!(n%100>=10&&n%100<=19||n%100>=70&&n%100<=79||n%100>=90&&n%100<=99))return"few";if(!(n===0)&&n%1e6===0)return"many";return"other"
}, ["one","two","few","many","other"]);

augment(e.bs =
 e.hr =
 e.sr = function bs(n) {
var i=Math.floor(Math.abs(n)),v=n.toString().replace(/^[^.]*\.?/,"").length,f=parseInt(n.toString().replace(/^[^.]*\.?/,""),10);if(typeof n==="string")n=parseInt(n,10);if(v===0&&i%10===1&&(!(i%100===11)||f%10===1&&!(f%100===11)))return"one";if(v===0&&i%10===Math.floor(i%10)&&i%10>=2&&i%10<=4&&(!(i%100>=12&&i%100<=14)||f%10===Math.floor(f%10)&&f%10>=2&&f%10<=4&&!(f%100>=12&&f%100<=14)))return"few";return"other"
}, ["one","few","other"]);

augment(e.cs =
 e.sk = function cs(n) {
var i=Math.floor(Math.abs(n)),v=n.toString().replace(/^[^.]*\.?/,"").length;if(typeof n==="string")n=parseInt(n,10);if(i===1&&v===0)return"one";if(i===Math.floor(i)&&i>=2&&i<=4&&v===0)return"few";if(!(v===0))return"many";return"other"
}, ["one","few","many","other"]);

augment(e.cy = function cy(n) {
if(typeof n==="string")n=parseInt(n,10);if(n===0)return"zero";if(n===1)return"one";if(n===2)return"two";if(n===3)return"few";if(n===6)return"many";return"other"
}, ["zero","one","two","few","many","other"]);

augment(e.da = function da(n) {
var i=Math.floor(Math.abs(n)),t=parseInt(n.toString().replace(/^[^.]*\.?|0+$/g,""),10);if(typeof n==="string")n=parseInt(n,10);if(n===1||!(t===0)&&(i===0||i===1))return"one";return"other"
}, ["one","other"]);

augment(e.ff =
 e.fr =
 e.hy =
 e.kab = function ff(n) {
var i=Math.floor(Math.abs(n));if(typeof n==="string")n=parseInt(n,10);if(i===0||i===1)return"one";return"other"
}, ["one","other"]);

augment(e.fil = function fil(n) {
var i=Math.floor(Math.abs(n)),v=n.toString().replace(/^[^.]*\.?/,"").length,f=parseInt(n.toString().replace(/^[^.]*\.?/,""),10);if(typeof n==="string")n=parseInt(n,10);if(v===0&&(i===1||i===2||i===3||v===0&&(!(i%10===4||i%10===6||i%10===9)||!(v===0)&&!(f%10===4||f%10===6||f%10===9))))return"one";return"other"
}, ["one","other"]);

augment(e.ga = function ga(n) {
if(typeof n==="string")n=parseInt(n,10);if(n===1)return"one";if(n===2)return"two";if(n===Math.floor(n)&&n>=3&&n<=6)return"few";if(n===Math.floor(n)&&n>=7&&n<=10)return"many";return"other"
}, ["one","two","few","many","other"]);

augment(e.gd = function gd(n) {
if(typeof n==="string")n=parseInt(n,10);if(n===1||n===11)return"one";if(n===2||n===12)return"two";if(n===Math.floor(n)&&(n>=3&&n<=10||n>=13&&n<=19))return"few";return"other"
}, ["one","two","few","other"]);

augment(e.gv = function gv(n) {
var i=Math.floor(Math.abs(n)),v=n.toString().replace(/^[^.]*\.?/,"").length;if(typeof n==="string")n=parseInt(n,10);if(v===0&&i%10===1)return"one";if(v===0&&i%10===2)return"two";if(v===0&&(i%100===0||i%100===20||i%100===40||i%100===60||i%100===80))return"few";if(!(v===0))return"many";return"other"
}, ["one","two","few","many","other"]);

augment(e.he = function he(n) {
var i=Math.floor(Math.abs(n)),v=n.toString().replace(/^[^.]*\.?/,"").length;if(typeof n==="string")n=parseInt(n,10);if(i===1&&v===0)return"one";if(i===2&&v===0)return"two";if(v===0&&!(n>=0&&n<=10)&&n%10===0)return"many";return"other"
}, ["one","two","many","other"]);

augment(e.is = function is(n) {
var i=Math.floor(Math.abs(n)),t=parseInt(n.toString().replace(/^[^.]*\.?|0+$/g,""),10);if(typeof n==="string")n=parseInt(n,10);if(t===0&&i%10===1&&(!(i%100===11)||!(t===0)))return"one";return"other"
}, ["one","other"]);

augment(e.ksh = function ksh(n) {
if(typeof n==="string")n=parseInt(n,10);if(n===0)return"zero";if(n===1)return"one";return"other"
}, ["zero","one","other"]);

augment(e.kw =
 e.naq =
 e.se = function kw(n) {
if(typeof n==="string")n=parseInt(n,10);if(n===1)return"one";if(n===2)return"two";return"other"
}, ["one","two","other"]);

augment(e.lag = function lag(n) {
var i=Math.floor(Math.abs(n));if(typeof n==="string")n=parseInt(n,10);if(n===0)return"zero";if((i===0||i===1)&&!(n===0))return"one";return"other"
}, ["zero","one","other"]);

augment(e.lt = function lt(n) {
var f=parseInt(n.toString().replace(/^[^.]*\.?/,""),10);if(typeof n==="string")n=parseInt(n,10);if(n%10===1&&!(n%100>=11&&n%100<=19))return"one";if(n%10===Math.floor(n%10)&&n%10>=2&&n%10<=9&&!(n%100>=11&&n%100<=19))return"few";if(!(f===0))return"many";return"other"
}, ["one","few","many","other"]);

augment(e.lv = function lv(n) {
var v=n.toString().replace(/^[^.]*\.?/,"").length,f=parseInt(n.toString().replace(/^[^.]*\.?/,""),10);if(typeof n==="string")n=parseInt(n,10);if(n%10===0||n%100===Math.floor(n%100)&&n%100>=11&&n%100<=19||v===2&&f%100===Math.floor(f%100)&&f%100>=11&&f%100<=19)return"zero";if(n%10===1&&(!(n%100===11)||v===2&&f%10===1&&(!(f%100===11)||!(v===2)&&f%10===1)))return"one";return"other"
}, ["zero","one","other"]);

augment(e.mk = function mk(n) {
var i=Math.floor(Math.abs(n)),v=n.toString().replace(/^[^.]*\.?/,"").length,f=parseInt(n.toString().replace(/^[^.]*\.?/,""),10);if(typeof n==="string")n=parseInt(n,10);if(v===0&&(i%10===1||f%10===1))return"one";return"other"
}, ["one","other"]);

augment(e.mt = function mt(n) {
if(typeof n==="string")n=parseInt(n,10);if(n===1)return"one";if(n===0||n%100===Math.floor(n%100)&&n%100>=2&&n%100<=10)return"few";if(n%100===Math.floor(n%100)&&n%100>=11&&n%100<=19)return"many";return"other"
}, ["one","few","many","other"]);

augment(e.pl = function pl(n) {
var i=Math.floor(Math.abs(n)),v=n.toString().replace(/^[^.]*\.?/,"").length;if(typeof n==="string")n=parseInt(n,10);if(i===1&&v===0)return"one";if(v===0&&i%10===Math.floor(i%10)&&i%10>=2&&i%10<=4&&!(i%100>=12&&i%100<=14))return"few";if(v===0&&!(i===1)&&(i%10===Math.floor(i%10)&&i%10>=0&&i%10<=1||v===0&&(i%10===Math.floor(i%10)&&i%10>=5&&i%10<=9||v===0&&i%100===Math.floor(i%100)&&i%100>=12&&i%100<=14)))return"many";return"other"
}, ["one","few","many","other"]);

augment(e.pt = function pt(n) {
var i=Math.floor(Math.abs(n)),v=n.toString().replace(/^[^.]*\.?/,"").length,t=parseInt(n.toString().replace(/^[^.]*\.?|0+$/g,""),10);if(typeof n==="string")n=parseInt(n,10);if(i===1&&(v===0||i===0&&t===1))return"one";return"other"
}, ["one","other"]);

augment(e.ro = function ro(n) {
var i=Math.floor(Math.abs(n)),v=n.toString().replace(/^[^.]*\.?/,"").length;if(typeof n==="string")n=parseInt(n,10);if(i===1&&v===0)return"one";if(!(v===0)||n===0||!(n===1)&&n%100===Math.floor(n%100)&&n%100>=1&&n%100<=19)return"few";return"other"
}, ["one","few","other"]);

augment(e.ru =
 e.uk = function ru(n) {
var i=Math.floor(Math.abs(n)),v=n.toString().replace(/^[^.]*\.?/,"").length;if(typeof n==="string")n=parseInt(n,10);if(v===0&&i%10===1&&!(i%100===11))return"one";if(v===0&&i%10===Math.floor(i%10)&&i%10>=2&&i%10<=4&&!(i%100>=12&&i%100<=14))return"few";if(v===0&&(i%10===0||v===0&&(i%10===Math.floor(i%10)&&i%10>=5&&i%10<=9||v===0&&i%100===Math.floor(i%100)&&i%100>=11&&i%100<=14)))return"many";return"other"
}, ["one","few","many","other"]);

augment(e.shi = function shi(n) {
var i=Math.floor(Math.abs(n));if(typeof n==="string")n=parseInt(n,10);if(i===0||n===1)return"one";if(n===Math.floor(n)&&n>=2&&n<=10)return"few";return"other"
}, ["one","few","other"]);

augment(e.si = function si(n) {
var i=Math.floor(Math.abs(n)),f=parseInt(n.toString().replace(/^[^.]*\.?/,""),10);if(typeof n==="string")n=parseInt(n,10);if(n===0||n===1||i===0&&f===1)return"one";return"other"
}, ["one","other"]);

augment(e.sl = function sl(n) {
var i=Math.floor(Math.abs(n)),v=n.toString().replace(/^[^.]*\.?/,"").length;if(typeof n==="string")n=parseInt(n,10);if(v===0&&i%100===1)return"one";if(v===0&&i%100===2)return"two";if(v===0&&(i%100===Math.floor(i%100)&&i%100>=3&&i%100<=4||!(v===0)))return"few";return"other"
}, ["one","two","few","other"]);

augment(e.tzm = function tzm(n) {
if(typeof n==="string")n=parseInt(n,10);if(n===Math.floor(n)&&n>=0&&n<=1||n===Math.floor(n)&&n>=11&&n<=99)return"one";return"other"
}, ["one","other"]);
});

require.register("lang-js~ordinal@0.1.2", function (exports, module) {
var e = exports;

function augment(fn, list) {
  fn.count = list.length;
  fn.formats = list;
}

augment(e.af =
 e.am =
 e.ar =
 e.bg =
 e.cs =
 e.da =
 e.de =
 e.el =
 e.es =
 e.et =
 e.eu =
 e.fa =
 e.fi =
 e.fy =
 e.gl =
 e.he =
 e.hr =
 e.id =
 e.is =
 e.ja =
 e.km =
 e.kn =
 e.ko =
 e.ky =
 e.lt =
 e.lv =
 e.ml =
 e.mn =
 e.my =
 e.nb =
 e.nl =
 e.pa =
 e.pl =
 e.pt =
 e.root =
 e.ru =
 e.si =
 e.sk =
 e.sl =
 e.sr =
 e.sw =
 e.ta =
 e.te =
 e.th =
 e.tr =
 e.uk =
 e.ur =
 e.uz =
 e.zh =
 e.zu = function af(n) {
return"other"
}, ["other"]);

augment(e.az = function az(n) {
var i=Math.floor(Math.abs(n));if(typeof n==="string")n=parseInt(n,10);if(i%10===1||i%10===2||i%10===5||i%10===7||i%10===8||i%100===20||i%100===50||i%100===70||i%100===80)return"one";if(i%10===3||i%10===4||i%1e3===100||i%1e3===200||i%1e3===300||i%1e3===400||i%1e3===500||i%1e3===600||i%1e3===700||i%1e3===800||i%1e3===900)return"few";if(i===0||i%10===6||i%100===40||i%100===60||i%100===90)return"many";return"other"
}, ["one","few","many","other"]);

augment(e.bn = function bn(n) {
if(typeof n==="string")n=parseInt(n,10);if(n===1||n===5||n===7||n===8||n===9||n===10)return"one";if(n===2||n===3)return"two";if(n===4)return"few";if(n===6)return"many";return"other"
}, ["one","two","few","many","other"]);

augment(e.ca = function ca(n) {
if(typeof n==="string")n=parseInt(n,10);if(n===1||n===3)return"one";if(n===2)return"two";if(n===4)return"few";return"other"
}, ["one","two","few","other"]);

augment(e.cy = function cy(n) {
if(typeof n==="string")n=parseInt(n,10);if(n===0||n===7||n===8||n===9)return"zero";if(n===1)return"one";if(n===2)return"two";if(n===3||n===4)return"few";if(n===5||n===6)return"many";return"other"
}, ["zero","one","two","few","many","other"]);

augment(e.en = function en(n) {
if(typeof n==="string")n=parseInt(n,10);if(n%10===1&&!(n%100===11))return"one";if(n%10===2&&!(n%100===12))return"two";if(n%10===3&&!(n%100===13))return"few";return"other"
}, ["one","two","few","other"]);

augment(e.fil =
 e.fr =
 e.hy =
 e.lo =
 e.ms =
 e.ro =
 e.vi = function fil(n) {
if(typeof n==="string")n=parseInt(n,10);if(n===1)return"one";return"other"
}, ["one","other"]);

augment(e.gu =
 e.hi = function gu(n) {
if(typeof n==="string")n=parseInt(n,10);if(n===1)return"one";if(n===2||n===3)return"two";if(n===4)return"few";if(n===6)return"many";return"other"
}, ["one","two","few","many","other"]);

augment(e.hu = function hu(n) {
if(typeof n==="string")n=parseInt(n,10);if(n===1||n===5)return"one";return"other"
}, ["one","other"]);

augment(e.it = function it(n) {
if(typeof n==="string")n=parseInt(n,10);if(n===11||n===8||n===80||n===800)return"many";return"other"
}, ["many","other"]);

augment(e.ka = function ka(n) {
var i=Math.floor(Math.abs(n));if(typeof n==="string")n=parseInt(n,10);if(i===1)return"one";if(i===0||i%100===Math.floor(i%100)&&(i%100>=2&&i%100<=20||i%100===40||i%100===60||i%100===80))return"many";return"other"
}, ["one","many","other"]);

augment(e.kk = function kk(n) {
if(typeof n==="string")n=parseInt(n,10);if(n%10===6||n%10===9||n%10===0&&!(n===0))return"many";return"other"
}, ["many","other"]);

augment(e.mk = function mk(n) {
var i=Math.floor(Math.abs(n));if(typeof n==="string")n=parseInt(n,10);if(i%10===1&&!(i%100===11))return"one";if(i%10===2&&!(i%100===12))return"two";if((i%10===7||i%10===8)&&!(i%100===17||i%100===18))return"many";return"other"
}, ["one","two","many","other"]);

augment(e.mr = function mr(n) {
if(typeof n==="string")n=parseInt(n,10);if(n===1)return"one";if(n===2||n===3)return"two";if(n===4)return"few";return"other"
}, ["one","two","few","other"]);

augment(e.ne = function ne(n) {
if(typeof n==="string")n=parseInt(n,10);if(n===Math.floor(n)&&n>=1&&n<=4)return"one";return"other"
}, ["one","other"]);

augment(e.sq = function sq(n) {
if(typeof n==="string")n=parseInt(n,10);if(n===1)return"one";if(n%10===4&&!(n%100===14))return"many";return"other"
}, ["one","many","other"]);

augment(e.sv = function sv(n) {
if(typeof n==="string")n=parseInt(n,10);if((n%10===1||n%10===2)&&!(n%100===11||n%100===12))return"one";return"other"
}, ["one","other"]);
});

require.register("lang-js~translate@1.0.2", function (exports, module) {
/**
 * Module dependencies
 */

var plural = {
  cardinal: require('lang-js~cardinal@0.1.2'),
  ordinal: require('lang-js~ordinal@0.1.2')
};
var interpolate = require('lang-js~interpolate@1.0.1');
var reduce = require('directiv~core-reduce@1.0.0');

/**
 * Expose the translate function
 */

exports = module.exports = translate;

/**
 * Compile a translation function
 *
 * @param {String|Array|Object} cldr
 * @param {String} locale
 * @param {Object?} opts
 * @return {Function}
 */

function translate(cldr, locale, opts) {
  if (typeof cldr === 'string') return augment(interpolate(cldr, opts));

  opts = opts || {};

  var pluralize = lookup(locale, cldr._format || opts.pluralFormat);
  if (Array.isArray(cldr)) cldr = convertArray(cldr, pluralize, opts);

  validate(cldr, pluralize);

  var paramsObj = {};
  var cases = toFunctions(cldr, pluralize, opts, paramsObj);

  var key = cldr._plural_key || opts.pluralKey || 'smart_count';
  var validatePluralKey = typeof opts.validatePluralKey === 'undefined' ? true : opts.validatePluralKey;

  return augment(function(params) {
    if (typeof params === 'number') params = convertSmartCount(params, key);

    var count = parseInt(params[key], 10);
    if (validatePluralKey && isNaN(count)) throw new Error('expected "' + key + '" to be a number. got "' + (typeof params[key]) + '".');

    return (cases[count] || cases[pluralize(count || 0)])(params);
  }, Object.keys(paramsObj));
}

/**
 * Validate a cldr against a pluralize function
 *
 * @param {Object} cldr
 * @param {Function} pluralize
 */

function validate(cldr, pluralize) {
  pluralize.formats.forEach(function(key) {
    if (!cldr[key]) throw new Error('translation object missing required key "' + key + '"');
  });
}

/**
 * Convert a cldr object to an object of functions
 *
 * @param {Object} cldr
 * @param {Function} pluralize
 * @param {Object} opts
 * @param {Object} paramsObj
 * @return {Object}
 */

function toFunctions(cldr, pluralize, opts, paramsObj) {
  return Object.keys(cldr).reduce(function(acc, key) {
    if (key.indexOf('_') === 0) return acc;
    var value = cldr[key];
    if (typeof value !== 'string') return acc;
    var t = acc[key] = interpolate(value, opts);
    merge(paramsObj, t.params);
    return acc;
  }, {});
}

/**
 * Augment translate functions with params reduce functions
 *
 * @param {Function} fn
 * @param {Array} keys
 * @return {Function}
 */

function augment(fn, keys) {
  keys = keys || fn.params || [];
  if (!Array.isArray(keys)) keys = Object.keys(keys);
  fn.params = reduce(keys);
  fn.params.keys = keys;
  return fn;
}

/**
 * Lookup the plural function given a locale
 *
 * @param {String} locale
 * @param {String} format
 * @return {Function}
 */

function lookup(locale, format) {
  if (!locale) throw new Error('missing required "locale" parameter');
  format = format || 'cardinal';
  var p = plural[format];
  if (!p) throw new Error('unsupported plural format "' + format + '"');
  var fn = p[locale];
  if (fn) return fn;
  fn = plural[locale.split(/[\-_]/)[0]];
  if (fn) return fn;

  throw new Error('unsupported locale "' + locale + '"');
}

/**
 * Convert an array input to a CLDR object
 *
 * @param {Array} arr
 * @param {Function} pluralize
 * @param {Object} opts
 * @return {Object}
 */

function convertArray(arr, pluralize, opts) {
  if (arr.length !== pluralize.count) throw new Error('missing required length of plural formats: expected ' + pluralize.count + '; got ' + arr.length);

  return pluralize.formats.reduce(function(acc, key, i) {
    acc[key] = arr[i];
    return acc;
  }, {});
}

/**
 * Convert a number to a smart_count object
 *
 * @param {Number} val
 * @param {String} key
 * @return {Object}
 */

function convertSmartCount(val, key) {
  var obj = {};
  obj[key] = val;
  return obj;
}

/**
 * Merge b into a
 *
 * @param {Object} a
 * @param {Object} b
 */

function merge(a, b) {
  for (var key in b) {
    a[key] = b[key];
  };
}

});

require.register("ng-hyper-translate", function (exports, module) {
/**
 * Module dependencies
 */

var angular = window.angular;
var compileTranslation = require('lang-js~translate@1.0.2');

/**
 * Allow users to opt into displaying missing translation warnings
 */

if (typeof BROWSER_ENV === 'undefined') BROWSER_ENV = 'production';

/**
 * Initialize the ng-hyper-translate module
 */

var pkg = module.exports = angular.module('ng-hyper-translate', ['ng-hyper']);

pkg.value('hyperTranslateFallback', '');
pkg.value('hyperTranslateOpen', '%{');
pkg.value('hyperTranslateClose', '}');
pkg.value('hyperTranslateLocale', 'en');

pkg.factory('hyperTranslate', [
  'hyper',
  'hyperTranslateFallback',
  'hyperTranslateOpen',
  'hyperTranslateClose',
  'hyperTranslateLocale',
  function(hyper, fallback, open, close, locale) {
    var opts = {
      fallback: fallback,
      open: open,
      close: close,
      validatePluralKey: false
    };
    var cache = {};
    return function(path, $scope, fn) {
      return hyper.get(path, $scope, function(value, req) {
        if (!value) return fn();
        if (cache[value]) return fn(cache[value] );

        var conf = value;
        if (typeof value === 'string') conf = value.split(/ *\|\|\|\| */);
        if (Array.isArray(conf) && conf.length === 1) conf = conf[0];

        try {
          fn(cache[JSON.stringify(conf)] = compileTranslation(conf, locale, opts));
        } catch (err) {
          console.error(err.stack || err.message || err);
          fn();
        };
      });
    };
  }
]);

/**
 * Initialize the hyperTranslate directive
 */

pkg.directive('hyperTranslate', [
  'hyperTranslate',
  '$compile',
  'hyper',
  function(lookup, $compile, hyper) {
    function watchParams(params, $scope) {
      angular.forEach(params, function(path, target) {
        hyper.get(path, $scope, function(value, req) {
          $scope[target] = value;
        });
      });
    }

    // set the innerHTML on the element while compiling it with angular
    function setHtml(elem, $scope, str) {
      var child = $compile('<span class="ng-hyper-translate-binding">' + str + '</span>')($scope);
      elem.empty();
      elem.append(child);
    }

    function setHtmlText(elem, $scope, str) {
      elem.html(str);
    }

    return {
      restrict: 'A',
      scope: true,
      priority: 1000,
      compile: function compile(tElem, tAttrs, transclude) {
        var templates = childrenToParams(tElem.children());
        tElem.html('');
        var hasTemplates = !!Object.keys(templates).length;

        return function link($scope, elem, attrs) {
          var $setHtml = (hasTemplates ? setHtml : setHtmlText).bind(null, elem);
          var $setAttr = elem.attr.bind(elem);
          var $tmp;
          $scope.$watch(function() {
            return attrs.hyperTranslate;
          }, function(str) {
            if ($tmp) $tmp.$destroy();
            $tmp = $scope.$new();
            init($setHtml, $setAttr, watchParams, lookup, $tmp, templates, str);
          });
        };
      }
    };
  }
]);

/**
 * Initialize the translation expression and attach it to the element
 */

function init(setHtml, setAttr, watchParams, lookup, $scope, tmplSrc, str) {
  // create a new child scope and merge in template sources
  var $templates = $scope.$new();
  for (var tmpl in tmplSrc) {
    $templates[tmpl] = tmplSrc[tmpl];
  }

  // parse the translation express
  var conf = parse(str);
  var path = conf.path;
  var attr = conf.attr;
  var setter = attr === 'html' ? setHtml.bind(null, $scope) : setAttr.bind(null, attr);

  // lookup the path to the translation in the translate service
  var template = noop;
  lookup(path, $scope, function(fn) {
    template = fn ? fn : noop;
  });

  // watch the params and template
  watchParams(conf.params, $scope);
  $scope.$watch(evalTemplate, setter);

  // eval the template with the $templates child scope
  function evalTemplate() {
    return template($templates).join('');
  }

  // create a noop for when a template doesn't exist
  function noop() {
    return BROWSER_ENV === 'development' ? ['!__', path, '__!'] : [];
  }
}

/**
 * Parse a translate expression into a config
 */

function parse(hyperTranslate) {
  var attrParts = hyperTranslate.split('->');

  if (attrParts.length === 1) attrParts.unshift('html');
  var attr = attrParts[0].trim();
  var translations = attrParts[1].trim();

  var parts = translations.split('<-');
  var path = parts[0].trim();

  var params = {};
  angular.forEach((parts[1] || '').split(','), function(expr) {
    if (expr === '') return;
    var parts = expr.trim().split(' as ');
    var path = parts[0];
    var target = parts[1];

    // TODO we should probably offload this to hyper-path
    if (!target) {
      var pathParts = path.split('.');
      target = pathParts[pathParts.length - 1];
    }

    params[target] = path;
  });

  return {
    path: path,
    params: params,
    attr: attr
  };
}

function childrenToParams(params) {
  var acc = {};
  var param;
  for (var i = 0; i < params.length; i++) {
    param = angular.element(params[i]);
    var name = param.attr('name');
    if (!name) return acc;
    acc[name] = param.html();
  }
  return acc;
}

pkg.name = 'ng-hyper-translate';

});

if (typeof exports == "object") {
  module.exports = require("ng-hyper-translate");
} else if (typeof define == "function" && define.amd) {
  define("ng-hyper-translate", [], function(){ return require("ng-hyper-translate"); });
} else {
  (this || window)["ng-hyper-translate"] = require("ng-hyper-translate");
}
})()
