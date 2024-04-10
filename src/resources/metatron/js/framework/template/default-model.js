define([], function() {
    'use strict';

    var model = (function() {
    	// property
    	var prop = 0;
    	
    	// method
        return {
        	prop:prop,
            set: function(data) {
                for ( var key in data) {
                    if (this.hasOwnProperty(key))
                        this[key] = data[key];
                }
            }
        }
    });

    return model;
});