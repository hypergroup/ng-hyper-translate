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
    return function(path, params, $scope, fn) {
      var polyglot = new Polyglot();

      var name;
      hyper.get(path, $scope, function(value, req) {
        if (!value) return;
        name = '$$' + req.target;
        var phrases = {};
        phrases[name] = value;

        polyglot.extend(phrases);
        translate();
      });

      if (!params) return;
      angular.forEach(params.split(','), function(expr) {
        var parts = expr.trim().split(' as ');
        var path = parts[0];
        var target = parts[1];

        hyper.get(path, $scope, function(value, req) {
          var t = target || req.target;
          $scope[t] = value;
          translate();
        });
      });

      function translate() {
        if (!name) return;
        var res = polyglot.t(name, $scope);
        if (res === name) return fn('');
        fn(res);
      }
    };
  }
]);

/**
 * Initialize the hyperTranslate directive
 */

pkg.directive('hyperTranslate', [
  'hyperTranslate',
  function(translate) {
    return {
      restrict: 'A',
      link: function($scope, elem, attrs) {
        var attrParts = attrs.hyperTranslate.split('->');

        if (attrParts.length === 1) attrParts.unshift('text');
        var attr = attrParts[0].trim();
        var translations = attrParts[1].trim();

        var parts = translations.split('<-');
        var path = parts[0].trim();
        var params = parts[1] || '';
        translate(path, params, $scope, function(value) {
          attr === 'text'
            ? elem.text(value)
            : elem.attr(attr, value);
        });
      }
    };
  }
]);

pkg.name = 'ng-hyper-translate';
