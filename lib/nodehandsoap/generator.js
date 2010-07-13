var WSDL = require("./parser").WSDL;
//var Compiler = require("./compiler").Compiler;
var Class = require("./class").Class;
var http = require("http");
var libxml = require("./libxmljs"); 
var sys = require("sys");

var Generator = new Class({

	constructor: function(port, host, url) {
		
		var self = this;
		this.read(port, host, url, function(error, doc) {
			self._wsdl = new WSDL(doc, url);
			//sys.debug(self._wsdl.doc.toString());
			//sys.debug(self._wsdl.interfaces().length);
			//sys.debug(self._wsdl.endpoints().length);
			//sys.debug(self._wsdl.interface().name);
			//sys.debug(self._wsdl.targetNamespace());
			sys.debug(self._wsdl.bindings()[0].actions.length);

		});
	},


	read: function(port, host, url, callback) {
		var request = http.createClient(port, host).request("GET", url, {"Host": host});
		
		request.addListener('response', function (response) {

			var result= "";
			response.setEncoding("utf8");
			response.addListener("data", function (chunk) {
			  result+= chunk;
			});
			response.addListener("end", function () {   
				//convert the result to an xml document
				var doc = libxml.parseXmlString(result);				
				callback(null, doc);
				
			});
		});       
		request.end();
	
	}
});

exports.Generator = Generator;