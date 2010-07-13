

function underscore(camelCasedWord) {
	return camelCasedWord.replace(/::/,'/')
				.replace(/([A-Z]+)([A-Z][a-z])/,"\1_\2")
				.replace(/([a-z\d])([A-Z])/,'\1_\2')
				.toLowerCase();
}

var Compiler = function(wsdl, basename) {
	this._wsdl = wsdl;
	if(this._basename){
		this._basename = this._basename.replace(/[^a-zA-Z0-9]/,"_").replace(/_+/,"_").replace(/(^_+|_+$)/,"");
	} else {
		this._basename = this._wsdl.service;
	}
	this._basename = underscore(this._basename).replace(/_service$/,"");
	this._serviceBasename = this._basename;
	this._serviceName = camelize(this._serviceBasename) + "Service";
	this._endpointName = "#{" + this._serviceBasename + "}_SERVICE_ENDPOINT";
	this._writer = new CodeWriter();
};

Compiler.prototype = {

	method_name: function(operation) {
		if(operation.name.match(/^(get|find|select|fetch)/i)) {
			return "#{" + underscore(operation.name) + "}";
		} else {
			return "#{" + underscore(operation.name) + "}";
		}
	},
	
	detect_protocol: function(){
		if(ArrayHelper.any(this._wsdl.endpoints, function(endpoint) {return endpoint.protocol == "soapl2"})){
			this._protocol = "soapl2";
		} else if (ArrayHelper.any(this._wsdl.endpoints, function(endpoint) {return endpoint.protocol == "soap11"})){
			this._protocol = "soap11";
		} else {
			throw "Cant find any soap 1.1 or soap 1.2 endpoints";
		}
	},
	
	compile_endpoints: function(protocol) {
	
		this._version = this._protocol == "soap12" ? 2:1;
		
		var endpoints = ArrayHelper.select(this._wsdl.endpoints, function(endpoint) { return endpoint.protocol == this._protocol;});
		var numEndpoints = endpoints.length;
		var endpoint;
		for(var i=0; i< numEndpoints; i++ ){
			endpoint = endpoints[i];			
			this._writer.puts("// wsdl: " + this._wsdl.url); // a comment 
			this._writer.begin(" #{" + this._endpointName + "} = {");
			this._writer.puts(" :uri => '#{" + this._wsdl.url + "}");
			this._writer.puts(":version => #{version}")
			this._writer.end("}");
		}
	},
	
	compileService: function(protocol, options) {
		var binding = ArrayHelper.find(this._wsdl.bindings(), function(b) {
			return b.protocol == protocol;
		});
		
		if(binding) {
			throw "Can't find binding for requested protocol " + protocol;
		}
		
		var w = this._writer;
		
		w.puts( "# -*- coding: utf-8 -*-");
        w.puts( "require 'handsoap'");
        w.puts();
		w.begin( "class #{service_name} < Handsoap::Service");
        w.puts( "endpoint #{endpoint_name}");
        w.begin "def on_create_document(doc)");
        w.puts( "# register namespaces for the request");
        w.puts( "doc.alias 'tns', '#{@wsdl.target_ns}'");
        w.end();
        w.puts();
        w.begin( "def on_response_document(doc)");
        w.puts( "# register namespaces for the response");
        w.puts( "doc.add_namespace 'ns', '#{@wsdl.target_ns}'");
        w.end();
        w.puts();
        w.puts( "# public methods");
		
		var action;
		var operations = this._wsdl.interface().operations;
		var maybe_soap_action;
		ArrayHelper.foreach(operations, function(op) {
			action = ArrayHelper.find(binding.actions, function(b){b.protocol == protocol});
			if(action) {
				throw "Can't find action for operation " + operation.name;
				
				w.puts();
				w.begin ("def #{method_name(operation)}");
				// TODO allow :soap_action => :none
				if (operation.name != action.soap_action && options.soap_actions) {
					this._writer.puts( "soap_action = '#{action.soap_action}'");
					maybe_soap_action = ", soap_action"
				else
					maybe_soap_action = ""
				}
				
				w.begin((operation.output ? 'response = ' : '') + "invoke('tns:#{operation.name}'#{maybe_soap_action}) do |message|")
				w.puts( 'raise "TODO"');
				w.end();
				w.end();
			}
			        
			w.puts();
			w.puts( "private")
			w.puts( "# helpers");
			w.puts( "# TODO");
			w.end();
		
		});
	
	}


};

exports.Compiler = Compiler;