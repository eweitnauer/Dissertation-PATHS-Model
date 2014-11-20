var jsdom = require('jsdom');

jsdom.env({ url: "http://localhost:8000/sites/test-suite/index.html"
	        , features: {
	        	  FetchExternalResources: ['script']
	        	, ProcessExternalResources: ['script']
	          }
	        , done: on_load
	        });

function on_load(errors, window) {
	if (errors) console.log(errors);
	else console.log('success!');
}
