/**
 * Module dependencies
 */

var angular = window.angular;
var Polyglot = require('polyglot');

/**
 * Initialize the ng-hyper-translate module
 */

var pkg = module.exports = angular.module('ng-hyper-translate', ['ng-hyper']);

/**
 * Initialize the hyperTranslate directive
 */

pkg.directive('hyperTranslate', [
  'hyper',
  function(hyper) {
    return {
      scope: true,
      restrict: 'A',
      link: function($scope, elem, attrs) {
        var polyglot = new Polyglot();

        var transParts = attrs.hyperTranslate.split('<-');
        var key = transParts[0].trim();
        var params = transParts[1];

        var name;
        hyper.get(key, $scope, function(value, req) {
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
          if (res === name) return elem.text('');
          elem.text(res);
        }
      }
    };
  }
]);

pkg.name = 'ng-hyper-translate';
