/**
 * Module dependencies
 */

var angular = window.angular;
var Polyglot = require('polyglot');

/**
 * Initialize the ng-hyper-translate module
 */

var pkg = module.exports = angular.module('ng-hyper-translate', ['ng-hyper']);

pkg.factory('hyperTranslate', [
  'hyper',
  function(hyper) {
    return function(path, templates, $scope, fn) {
      var polyglot = new Polyglot();

      hyper.get(path, $scope, function(value, req) {
        if (!value) return;
        var name = '$$' + req.target;
        var phrases = {};
        phrases[name] = value;

        polyglot.extend(phrases);

        var res = polyglot.t(name, templates);
        if (res === name) return fn('');
        fn(res);
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
  function(translate, $compile, hyper) {
    return {
      restrict: 'A',
      scope: true,
      priority: 1000,
      compile: function compile(tElem, tAttrs, transclude) {
        var namedTemplates = childrenToParams(tElem.children());
        tElem.html('');
        var conf = parse(tAttrs.hyperTranslate, namedTemplates);
        var path = conf.path;
        var params = conf.params;
        var attr = conf.attr;
        var templates = conf.templates;

        return function link($scope, elem, attrs) {
          var template = '';

          if (attr === 'html') {
            $scope.$watch(function() {
              return template;
            }, function() {
              var child = $compile('<span class="ng-hyper-translate-binding">' + template + '</span>')($scope);
              // TODO do we need to do GC here or is it automatic?
              elem.empty();
              elem.append(child);
            });
          } else {
            $scope.$watch(function() {
              return $scope.$eval(template);
            }, function(value) {
              elem.attr(attr, value);
            });
          }

          translate(path, templates, $scope, function(templateStr) {
            template = attr === 'html' ?
              templateStr :
              '"' +
                templateStr
                  .replace(/\"/, '\\"')
                  .replace(/\{\{/, '" + ')
                  .replace(/\}\}/, ' + "') +
              '"';
          });

          angular.forEach(params, function(path, target) {
            hyper.get(path, $scope, function(value, req) {
              $scope[target] = value;
            });
          });
        };
      }
    };
  }
]);

function parse(hyperTranslate, namedTemplates) {
  var attrParts = hyperTranslate.split('->');

  if (attrParts.length === 1) attrParts.unshift('html');
  var attr = attrParts[0].trim();
  var translations = attrParts[1].trim();

  var parts = translations.split('<-');
  var path = parts[0].trim();

  var params = {};
  var templates = {};
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
    templates[target] = namedTemplates[target] || '{{' + target + '}}';
  });

  return {
    path: path,
    params: params,
    attr: attr,
    templates: templates
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
