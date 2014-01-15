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
  'hyperStatus',
  function(hyper, status) {
    return {
      scope: true,
      restrict: 'A',
      link: function($scope, elem, attrs) {
        status.loading(elem);
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
          if (!name) return status.loading(elem);
          var res = polyglot.t(name, $scope);
          if (res === name) return elem.text('');
          elem.res(res);
          status.loaded(elem);
        }
      }
    };
  }
]);

pkg.name = 'ng-hyper-translate';
