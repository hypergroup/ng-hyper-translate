/**
 * Module dependencies
 */

var angular = window.angular;
var compileTranslation = require('lang-js-translate');
var compileRelative = require('lang-js-relative');

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
        if (cache[value]) return fn(cache[value]);

        var conf = value;
        if (typeof value === 'string') conf = value.split(/ *\|\|\|\| */);
        if (Array.isArray(conf) && conf.length === 1) conf = conf[0];

        var format = conf._format;

        var t;

        try {
          t = cache[JSON.stringify(conf)] = format === 'relative' ?
             compileRelative(conf, locale, opts) :
             compileTranslation(conf, locale, opts);
        } catch (err) {
          console.error(err);
          return fn();
        };

        fn(t, format);
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
    function watchParams(params, $scope, opts) {
      opts = opts || {};
      angular.forEach(params, function(path, target) {
        hyper.get(path, $scope, function update(value, req) {
          if (opts.format === 'relative', target === (opts.key || 'time') && value) {
            $scope[target] = Math.floor((new Date(value) - new Date()) / 1000);
            if (isNaN($scope[target])) $scope[target] = 0;
          } else {
            $scope[target] = value;
          }
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
          var $tmp = [];
          $scope.$watch(function() {
            return attrs.hyperTranslate;
          }, function(str) {
            str.split(/ *\; */).forEach(function(part, i) {
              if ($tmp[i]) $tmp[i].$destroy();
              $tmp[i] = $scope.$new();
              init($setHtml, $setAttr, watchParams, lookup, $tmp[i], templates, part);
            });
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

  // parse the translation express
  var conf = parse(str);
  var path = conf.path;
  var attr = conf.attr;
  var setter = attr === 'html' ? setHtml.bind(null, $scope) : setAttr.bind(null, attr);

  // use the children templates if we're setting the inner html
  if (attr === 'html') {
    for (var tmpl in tmplSrc) {
      $templates[tmpl] = tmplSrc[tmpl];
    }
  }

  // lookup the path to the translation in the translate service
  var template = noop;
  // TODO figure out how to pass the relative time key
  var opts = {};
  lookup(path, $scope, function(fn, format) {
    template = fn ? fn : noop;
    opts.format = format;
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
