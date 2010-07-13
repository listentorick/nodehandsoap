var CodeWriter = function() {
	this._indentation = 0;
	this._indentationString = "";
	this._buffer;
};

CodeWriter.prototype = {

	begin: function(text) {
		this.puts(text);
	},
		
	end: function(text) {
		this.puts(text);
	},
	
	puts: function(text) {
		this._buffer += text.replace(/^(.*)$/,this._createIndentationString);
		this._buffer += "\n";
	},
	
	_createIndentationString: function(){
		for(var i=0;i<this._indentation;i++){
			this._indentationString += " ";
		}
	},
	
	indent: function() {
		this._indentation++;
		this._createIndentationString();
	},
	
	unindent: function() {
		this._indentation --;
		this._createIndentationString();
	},

	toString: function() {
		return this._buffer;
	}
};