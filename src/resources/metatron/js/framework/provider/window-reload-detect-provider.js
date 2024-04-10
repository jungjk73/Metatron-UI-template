define([], function() {
    return function() {
        'use strict';
        
        // property
        var operations = [];

        // function
        function addOperation(callback) {
        	operations.push(callback);
        }

        function callOperation(e) {
    		e = e || window.event;
    		e.preventDefault = true;
    		e.cancelBubble = true;
        	operations.forEach(function(fn) {
                fn();
            });       	
        }

        
        // event-handler
    	window.onbeforeunload = function(e) {
    		return callOperation(e);
    	}

    	window.onunload = function(e) {
    		return callOperation(e);
    	}

    	document.onkeydown = function(e) {
    		if (e.keyCode !=116) {
    			return;
    		}

    		return callOperation(e);
    	}


		this.$get = function() {
			return {
				addOperation: addOperation
			}
		}
    }
});