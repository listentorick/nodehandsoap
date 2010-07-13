var sys = require("sys");
var http = require("http");
var Class = require("./class").Class;
var libxml = require("./libxmljs"); 
var ArrayHelper = require("./arrayhelper");


var Interface = new Class({
	constructor: function (name, operations){	
		this.name = name;
		this.operations = operations || [];
	}
});

var Binding = new Class({
	constructor: function (name, optional){	
		this.name = name;
		optional = optional || {};
		this.actions = optional.actions || [];
		this.protocol = optional.protocol;
		this.interface = optional.interface;
		this.transport = optional.transport;
		this.style = optional.style;
		this.encoding = optional.encoding;
		this.verb = optional.verb;
	}
});

var Endpoint = new Class({
	constructor: function(name, protocol, binding, url) {
		this.name = name;
		this.protocol = protocol;
		this.binding = binding;
		this.url = url;
	}
});

var Operation = new Class({
	constructor: function(name, optional) {
		this.name = name;
		optional = optional || {};
		this.input = optional.input;
		this.output = optional.output;
	}
});

var Action = new Class({
	constructor: function(name, optional) {
		this.name = name;
		optional = optional || {};
		this.soap_action = optional.soap_action;
		this.location = optional.location;
	}
});

var WSDL = new Class({

	constructor: function(doc, url) {
		this.url = url;
		this.doc = doc;
	},
	
	ns: {
		'wsdl1':'http://schemas.xmlsoap.org/wsdl/', 
		'wsdl2':'http://www.w3.org/ns/wsdl/',
		'soap11': 'http://schemas.xmlsoap.org/wsdl/soap/',
		'soap12': 'http://schemas.xmlsoap.org/wsdl/soap12/',
		'http': 'http://schemas.xmlsoap.org/wsdl/http/'
	},
	
	protocolFromNamespace: function (node) {
        var href = node.namespace().href();
		switch(href) {
			case "http://schemas.xmlsoap.org/wsdl/soap/":
			  return WSDL.soap11;
			case "http://schemas.xmlsoap.org/wsdl/soap12/":
			  return WSDL.soap12;
			case "http://schemas.xmlsoap.org/wsdl/http/":
			  return WSDL.http;
			default:
			  throw "Unknown namespace " + href;
		}
	},	

	isWSDL2: function(node) {
		var href = node.namespace().href();
		switch(href){
			case this.ns.wsl2:
				return true;
			case this.ns.wsdl1:
				return false;
			default:
				throw  "Unknown namespace " + href;
		}
	},
	
	service: function() {
		if(!this._services) {
			services = this.doc.find("//wsdl1:service|//wsdl2:service", this.ns);
			if(services.length!=1) {
				throw "Expected exactly 1 service in WSDL";
			}
			this._services = services[0].attr("name").value();
		}
		return this._services;
    },
	
	
	interface: function(){
		if(!this._interface) {
			var allInterfaces = this.interfaces();
			var numInterfaces = allInterfaces.length;
			var allBindings;
			var binding;
			var interface;
			if(numInterfaces!=1){
				// There are more than one portType, so we take a pick
				allBindings = this.bindings();
				
				for(var i=0; i<numInterfaces; i++){
					interface = allInterfaces[i];
					binding = ArrayHelper.find(allBindings,function(b) {
						return b.name == interface.name;
					});
					if(b.protocol == WSDL.soap11 || b.protocol == WSDL.soap12){
						this._interface = interface;
					}
				}
				if(!this._interface) {
					throw "Can't find a suitable soap 1.1 or 1.2 interface/portType in WSDL";
				}
			} else {
				this._interface = allInterfaces[0];
			}
		}
		return this._interface;
	},
	
	targetNamespace: function() {
        var targetNamespace = this.doc.root().attr("targetNamespace").value();
		if(!targetNamespace) {
			throw "Attribute targetNamespace not defined";
		}
		return targetNamespace;
    },
		
	preferredProtocol: function(){
		if(!this._preferredProtocol){
			var endpoints = this.endpoints();
			if(ArrayHelper.any(endpoints, function(e){return e.protocol == WSDL.soap12;})){
				this._preferredProtocol = WSDL.soap12;
			}else if (ArrayHelper.any(endpoints, function(e){return e.protocol == WSDL.soap11;})){
				this._preferredProtocol = WSDL.soap11;
			}else {
				throw "Can't find any soap 1.1 or soap 1.2 endpoints";
			}
		}
	
		return this._preferredProtocol;
	},
			  
	interfaces: function(){
		if(!this._interfacesInstances) {
		  var ports = this.doc.find("//wsdl1:portType|//wsdl2:interface", this.ns);
		  var numPorts = ports.length;
		  var port;
		  var operations;
		  var numOperations;
		  var operation;
		  var inputNode;
		  var outputNode;
		  var operationName;
		  var operationInstances = [];
		  this._interfacesInstances = [];
	
		  for(var i=0; i<numPorts;i++){
			port = ports[i];
			operations = port.find("./wsdl1:operation|./wsdl2:operation", this.ns);
			numOperations = operations.length;
			for(var j=0;j<numOperations;j++){
				operation = operations[j];
				if (this.isWSDL2(operation)) {
					inputNode = operation.find("./wsdl2:input",this.ns)[0];
					input = inputNode.attr("element").value();
					outputNode = operation.find("./wsdl2:output",this.ns)[0];
					output = outputNode.attr("element").value();
				
				} else {
					inputNode = operation.find("./wsdl1:input",this.ns)[0];
					input = inputNode.attr("message").value();
					outputNode = operation.find("./wsdl1:output",this.ns)[0];
					output = outputNode.attr("message").value();
				}
				operationName = operation.attr("name").value();
				operationInstances.push(new Operation(operationName,{input:input,output:output}));
			}
			
			this._interfacesInstances.push(new Interface(port.attr("name").value(),operationInstances));
		  }
		}
		return this._interfacesInstances;
	},
	
	endpoints: function(){
		 if(!this._endpoints) { 
			 var binding;
			 var ports = this.doc.find("//wsdl1:service/wsdl1:port|//wsdl2:service/wsdl2:endpoint", this.ns);
			 var port;
			 var location;
			 var protocol;
			 var address;
			 var numPorts = ports.length;
			 var portName;
			 this._endpoints = [];
			 
			 for(var i=0; i<numPorts;i++){
				port = ports[i];
				if (this.isWSDL2(port)) {
					location = port.attr("address").value();
					protocol =  WSDL.binding;
				} else {
					address = port.find("./soap11:address|./soap12:address|./http:address", this.ns)[0];
					location = address.attr("location").value();
					protocol = this.protocolFromNamespace(address);
				}
				portName = port.attr("name").value();
				this._endpoints.push(new Endpoint(portName, protocol, binding, location));
			 }
		 }
		 
		 return this._endpoints;
	},
	
	bindings: function(){
		if(!this._bindingInstances) {
			 var bindings = this.doc.find("//wsdl1:binding|//wsdl2:binding", this.ns);
			 var binding;
			 var numBindings = bindings.length;
			 this._bindingInstances = [];
			 var soapBinding;
			 var bindingName;
			 var bindingType;
			 var protocol;
			 var actions;
			 var numActions;
			 var style;
			 var encoding;
			 var operation;
			 var operationName;
			 var soapOperation;
			 var soapAction;
			 var location;
			 var things =[];
			 var interface;
			 for(var i=0; i<numBindings;i++){
				binding = bindings[i];
				if(this.isWSDL2(binding)) {
					 throw "WSDL 2.0 not supported";
				}
				soapBinding = binding.find("./soap11:binding|./soap12:binding|./http:binding", this.ns)[0];
				protocol = this.protocolFromNamespace(soapBinding);
				actions = [];
				style = null;
				encoding = null;
				actions =  binding.find("./wsdl1:operation", this.ns);
				for(var j=0; j<numActions;j++) {
					operation = actions[j];
					soapOperation = operation.find("./soap11:operation|./soap12:operation|./http:operation", this.ns)[0];
					if(soapOperation.attr("style")) {
						if (style && style != soapOperation.attr("style")) {
							throw "Mixed styles not supported";
						}
						style = soapOperation.attr("style");
					}
					things = operation.find(this.constructBindingQuery(),this.ns);
					ArrayHelper.foreach(things,function(thing) {
						if (encoding && encoding != thing.attr("use").value()) {
							encoding = thing.attr("use").value();
						}
					});
					operationName = operation.attr("name").value();
					soapAction = soapOperation.attr("soapAction").value();
					location = soapOperation.attr("location").value();
					actions.push(new Action(operation.attr, soapAction, location ));
				}
				
				this._bindingInstances.push(new Binding( this._getAttributeValue(binding,"name"), {
						protocol: protocol,
						interface: this._getAttributeValue(binding,"type"),
						transport: this._getAttributeValue(soapBinding,"transport"),
						style: style,
						encoding: encoding,
						verb: this._getAttributeValue(soapBinding,"verb"),
						actions: actions
					})
				);
								
			}
		}
		
		return this._bindingInstances;
	
	},
	
	_getAttributeValue: function(node, attributeName) {
		var att = node.attr(attributeName);
		var res = null;
		if(att) {
			res = att.value();
		}
		return res;
	}

	
});

WSDL.soap11 = "soap11";
WSDL.soap12 = "soap12";
WSDL.binding = "";
WSDL.http = "http";


exports.WSDL = WSDL;