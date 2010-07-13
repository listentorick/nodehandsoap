var sys = require("sys");
var http = require("http");
var Class = require("./class").Class;
var libxml = require("./libxmljs"); 

var BaseService = new Class({

	constructor: function (){		
		//construct our base xml document
		
		this._doc = new libxml.Document();
		this._envelope = this._doc.node('Envelope');
		this._envelope.namespace("xsi", "http://www.w3.org/2001/XMLSchema-instance");
		this._envelope.namespace("xsd", "http://www.w3.org/2001/XMLSchema");
		this._envelope.namespace("soap", "http://schemas.xmlsoap.org/soap/envelope/");

		this._header = this._envelope.node("Header");
		this._header.namespace("soap", "http://schemas.xmlsoap.org/soap/envelope/");
		
		this._body = this._envelope.node("Body");
		this._body.namespace("soap", "http://schemas.xmlsoap.org/soap/envelope/");		
	},
	
	
	/** 
	* @param action The action xml node
	*/
	addActionParameter: function(action, parameterName, parameterValue) {
		var actionParameterNode = action.node(parameterName,{}, parameterValue);
		var actionNamespace = action.namespace();
		var actionNamespacePrefix = actionNamespace.prefix();
		var actionNamespaceHref = actionNamespace.href();
		var ns = actionParameterNode.namespace(actionNamespacePrefix,actionNamespaceHref);
		return actionParameterNode;
	},
	
	/**
	* Constructs an action
	* @param actionName The name of the action.
	* returns {Object} The action node.
	*/
	addAction: function(actionName, namespacePrefix, namespaceUrl) {
		var elem = this._body.node(actionName);
		var ns = elem.namespace(namespacePrefix, namespaceUrl);	
		return elem	
	}

});

exports.BaseService = BaseService;