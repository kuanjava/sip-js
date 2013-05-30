// Generated by CoffeeScript 1.4.0
(function() {
  var modules, runTests, tests, util;

  util = require('util');

  runTests = function(tests) {
    if (tests.length === 0) {
      return process.exit();
    } else {
      return tests[0](function() {
        console.log('ok');
        return runTests(tests.slice(1, tests.length));
      });
    }
  };

  modules = process.argv.slice(2, +process.argv.length + 1 || 9e9);

  if (modules.length === 0) {
    modules = ['parser', 'digest', 'rport'];
  }

  console.log(modules);

  tests = (modules.map(function(a) {
    return require('./' + a).tests;
  })).reduce(function(a, b) {
    return a.concat(b);
  });

  runTests(tests);

}).call(this);