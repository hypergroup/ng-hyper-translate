
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

require.register("lang-js~plural@1.0.0", function (exports, module) {
/**
 * Pulled from the awesome http://docs.translatehouse.org/projects/localization-guide/en/latest/l10n/pluralforms.html?id=l10n/pluralforms
 */

var e = exports;

/**
 * Chinese
 */

(e.ay =
e.bo =
e.cgg =
e.dz =
e.fa =
e.id =
e.ja =
e.jbo =
e.ka =
e.kk =
e.km =
e.ko =
e.ky =
e.lo =
e.ms =
e.my =
e.sah =
e.su =
e.th =
e.tt =
e.ug =
e.vi =
e.wo =
e.zh = function zh(n) {
  return 0;
}).count = 1;

/**
 * German
 */

(e.af =
e.an =
e.anp =
e.as =
e.ast =
e.az =
e.bg =
e.bn =
e.brx =
e.ca =
e.da =
e.de =
e.doi =
e.el =
e.en =
e.eo =
e.es =
e.et =
e.eu =
e.ff =
e.fi =
e.fo =
e.fur =
e.fy =
e.gl =
e.gu =
e.ha =
e.he =
e.hi =
e.hna =
e.hu =
e.hy =
e.ia =
e.it =
e.kl =
e.kn =
e.ku =
e.lb =
e.mai =
e.ml =
e.mn =
e.mni =
e.mr =
e.nah =
e.nap =
e.nb =
e.ne =
e.nl =
e.nn =
e.no =
e.nso =
e.or =
e.pa =
e.pap =
e.pms =
e.ps =
e.pt =
e.rm =
e.rw =
e.sat =
e.sco =
e.sd =
e.se =
e.si =
e.so =
e.son =
e.sq =
e.sw =
e.sv =
e.ta =
e.te =
e.tk =
e.ur =
e.yo = function de(n) {
  return n !== 1 ? 1 : 0;
}).count = 2;

/**
 * French
 */

(e.ach =
e.ak =
e.am =
e.arn =
e.br =
e.fil =
e.fr =
e.gun =
e.ln =
e.mfe =
e.mg =
e.mi =
e.oc =
e.pt_BR =
e.tg =
e.ti =
e.tr =
e.uz =
e.wa = function fr(n) {
  return n > 1 ? 1 : 0;
}).count = 2;

/**
 * Arabic
 */

(e.ar = function ar(n) {
  return n === 0 ? 0 : n === 1 ? 1 : n === 2 ? 2 : n % 100 >= 3 && n % 100 <= 10 ? 3 : n % 100 >= 11 ? 4 : 5;
}).count = 6;

/**
 * Russian
 */

(e.be =
e.bs =
e.hr =
e.ru =
e.sr =
e.uk = function ru(n) {
  return n % 10 === 1 && n % 100 !== 11 ? 0 : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 1 : 2;
}).count = 3;

/**
 * Czech
 */

(e.cs =
e.sk = function cs(n) {
  return (n === 1) ? 0 : (n >= 2 && n <= 4) ? 1 : 2;
}).count = 3;

/**
 * Kashubian
 */

(e.csb = function csb(n) {
  return (n === 1) ? 0 : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 1 : 2;
}).count = 3;

/**
 * Polish
 */

(e.pl = function pl(n) {
  return n === 1 ? 0 : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 1 : 2;
}).count = 3;

/**
 * Icelandic
 */

(e.is = function is(n) {
  return (n % 10 !== 1 || n % 100 === 11) ? 1 : 0;
}).count = 2;

/**
 * Welsh
 */

(e.cy = function cy(n) {
  return (n === 1) ? 0 : (n === 2) ? 1 : (n !== 8 && n !== 11) ? 2 : 3;
}).count = 4;

/**
 * Irish
 */

(e.ga = function ga(n) {
  return (n === 1) ? 0 : n === 2 ? 1 : n < 7 ? 2 : n < 11 ? 3 : 4;
}).count = 5;

/**
 * Scottish Gaelic
 */

(e.gd = function gd(n) {
  return (n === 1 || n === 11) ? 0 : (n === 2 || n === 12) ? 1 : (n > 2 && n < 20) ? 2 : 3;
}).count = 4;

/**
 * Croatian
 */

(e.hr = function hr(n) {
  return n % 10 === 1 && n % 100 !== 11 ? 0 : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 1 : 2;
}).count = 3;

/**
 * Cornish
 */

(e.kw = function kw(n) {
  return (n === 1) ? 0 : (n === 2) ? 1 : (n === 3) ? 2 : 3;
}).count = 4;

/**
 * Lithuanian
 */

(e.lt = function lt(n) {
  return n % 10 === 1 && n % 100 !== 11 ? 0 : n % 10 >= 2 && (n % 100 < 10 || n % 100 >= 20) ? 1 : 2;
}).count = 3;

/**
 * Latvian
 */

(e.lv = function lv(n) {
  return n % 10 === 1 && n % 100 !== 11 ? 0 : n !== 0 ? 1 : 2;
}).count = 3;

/**
 * Mandinka
 */

(e.mnk = function mnk(n) {
  return n === 0 ? 0 : n === 1 ? 1 : 2;
}).count = 3;

/**
 * Maltese
 */

(e.mt = function mt(n) {
  return n === 1 ? 0 : n === 0 || ( n % 100 > 1 && n % 100 < 11) ? 1 : (n % 100 > 10 && n % 100 < 20 ) ? 2 : 3;
}).count = 4;

/**
 * Romanian
 */

(e.ro = function ro(n) {
  return n === 1 ? 0 : (n === 0 || (n % 100 > 0 && n % 100 < 20)) ? 1 : 2;
}).count = 3;

/**
 * Slovenian
 */

(e.sl = function sl(n) {
  return n % 100 === 1 ? 1 : n % 100 === 2 ? 2 : n % 100 === 3 || n % 100 === 4 ? 3 : 0;
}).count = 4;

/**
 * Macedonian
 */

(e.mk = function mk(n) {
  return n % 10 === 1 ? 0 : n % 10 === 2 ? 1 : 2;
}).count = 3;

});

require.register("lang-js~translate@1.0.1", function (exports, module) {
/**
 * Module dependencies
 */

var plural = require('lang-js~plural@1.0.0');
var interpolate = require('lang-js~interpolate@1.0.1');
var reduce = require('directiv~core-reduce@1.0.0');

/**
 * Expose the translate function
 */

exports = module.exports = translate;

/**
 * Compile a translation function
 *
 * @param {String|Array} arr
 * @param {String} locale
 * @param {Object?} opts
 * @return {Function}
 */

function translate(arr, locale, opts) {
  if (typeof arr === 'string') return augment(interpolate(arr, opts));

  opts = opts || {};

  var fn = lookup(locale);
  if (fn.count !== arr.length) throw new Error('missing required length of plural formats: expected ' + fn.count + '; got ' + arr.length);

  var fns = [];
  var paramsObj = {};
  for (var i = 0, l = arr.length, t; i < l; i++) {
    t = interpolate(arr[i], opts);
    fns.push(t);
    merge(paramsObj, t.params);
  }

  var key = opts.pluralKey || 'smart_count';
  var validatePluralKey = typeof opts.validatePluralKey === 'undefined' ? true : opts.validatePluralKey;

  return augment(function(params) {
    if (typeof params === 'number') params = convert(params, key);

    var count = parseInt(params[key], 10);
    if (validatePluralKey && isNaN(count)) throw new Error('expected "' + key + '" to be a number. got "' + (typeof params[key]) + '".');

    return fns[fn(count || 0)](params);
  }, Object.keys(paramsObj));
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
 * @return {Function}
 */

function lookup(locale) {
  if (!locale) throw new Error('missing required "locale" parameter');
  var fn = plural[locale];
  if (fn) return fn;
  fn = plural[locale.split(/[\-_]/)[0]];
  if (fn) return fn;

  throw new Error('unsupported locale "' + locale + '"');
}

/**
 * Convert a number to a smart_count object
 *
 * @param {Number} val
 * @param {String} key
 * @return {Object}
 */

function convert(val, key) {
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
var compileTranslation = require('lang-js~translate@1.0.1');

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

        var arr = Array.isArray(value) ? value : value.split(/ *\|\|\|\| */);
        var str = arr.length > 1 ? arr : value;

        try {
          fn(cache[value] = compileTranslation(str, locale, opts));
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

    return {
      restrict: 'A',
      scope: true,
      priority: 1000,
      compile: function compile(tElem, tAttrs, transclude) {
        var templates = childrenToParams(tElem.children());
        tElem.html('');

        return function link($scope, elem, attrs) {
          var $setHtml = setHtml.bind(null, elem);
          var $setAttr = elem.attr.bind(elem);
          var $tmp;
          $scope.$watch(function() {
            return $scope.$eval('"' + tAttrs.hyperTranslate + '"');
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
