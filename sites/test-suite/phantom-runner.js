var page = require('webpage').create();

page.onConsoleMessage = function(msg, lineNum, sourceId) {
  //console.log('CONSOLE: ' + msg + ' (from line #' + lineNum + ' in "' + sourceId + '")');
  console.log('CONSOLE: ' + msg);
};

page.open('http://localhost:8000/sites/test-suite/index.html', function(status) {
  if (status !== 'success') {
    console.log('FAIL to load');
  } else {
    console.log('loaded!')
  }
  //phantom.exit();
});
