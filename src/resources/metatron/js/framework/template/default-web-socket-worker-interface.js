define([], function() {
	return function(WindowReloadDetect, ConfigManager) {
    'use strict';
    
    	// property
		var _worker = new Worker("");
		_worker.postMessage({
            operation: "connect",
            url:""
        });
	
    	// method
    	this.send = function(data) {
    		_worker.postMessage({
    			operation: "send",
    			data:data
    		});
    	}
    	
    	this.close = function() {
    		_worker.postMessage({
    			operation: "close"
    		});   		
    	}
    	
    	
    	// event-listener
    	_worker.onmessage = function(e) {
    		var data = e.data;
    	}
    	
    	
		WindowReloadDetect.addOperation(close);
	}
});