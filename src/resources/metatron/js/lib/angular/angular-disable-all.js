if (typeof module !== "undefined" && typeof exports !== "undefined" && module.exports === exports){
	  module.exports = 'disableAll';
	}

(function(angular) {
	    'use strict';
	    angular.module('disableAll', [])
	    .directive("disableAll",[function($compile, GridRenderer ,DataService){
	    	return {
	        	restrict: "EA",
	            replace: true,
	            link: function (scope, element, attrs) {
	                var disabledElement = (attrs.disableElementId) ? document.getElementById(attrs.disableElementId) : element[0];
	                scope.$watch(attrs.disableAll, function (isDisabled) {
                        isDisabled = isDisabled == 'Y' ? true : false;
	                    if (isDisabled)
	                        disableAll(disabledElement);
	                    else
	                        enableAll(disabledElement);
	                });

	                
	                function disableAll(element) {
	        	        angular.element(element).addClass('disable-all');
	        	        disableElements(element.getElementsByTagName('input'));
	        	        disableElements(element.getElementsByTagName('button'));
	        	        disableElements(element.getElementsByTagName('textarea'));
	        	        disableElements(element.getElementsByTagName('select'));
	        	        disableElements(element.getElementsByTagName('li'));
	        	        disableElements(element.getElementsByTagName('ul'));
	        	        element.addEventListener('click', preventDefault, true);
                    }
                    function enableAll (element) {
	        	        angular.element(element).removeClass('disable-all');
	        	        element.style.color = 'inherit';
	        	        enableElements(element.getElementsByTagName('input'));
	        	        enableElements(element.getElementsByTagName('button'));
	        	        enableElements(element.getElementsByTagName('textarea'));
	        	        enableElements(element.getElementsByTagName('select'));
	        	        enableElements(element.getElementsByTagName('li'));
	        	        enableElements(element.getElementsByTagName('ul'));
	        	        element.removeEventListener('click', preventDefault, true);
                    }
                    function preventDefault (event) {
	        	        for (var i = 0; i < event.target.attributes.length; i++) {
	        	            var atts = event.target.attributes[i];
	        	            if(atts.name === "skip-disable"){
	        	                return true;
	        	            }
	        	        }
	        	        event.stopPropagation();
	        	        event.preventDefault();
	        	        return false;
                    }
                    function disableElements (elements) {
	        	        var len = elements.length;
	        	        for (var i = 0; i < len; i++) {
	        	            var shouldDisable = true;
	        	            for (var j = 0; j < elements[i].attributes.length; j++) {
	        	                var atts = elements[i].attributes[j];
	        	                if(atts.name === "skip-disable"){
	        	                    shouldDisable = false;

	        	                }
	        	            }
	        	            if (shouldDisable && elements[i].disabled === false) {
	        	                elements[i].disabled = true;
	        	                elements[i].disabledIf = true;
	        	            }
	        	        }
                    }
                    function enableElements(elements) {
	        	        var len = elements.length;
	        	        for (var i = 0; i < len; i++) {
	        	            if (elements[i].disabled === true && elements[i].disabledIf === true) {
	        	                elements[i].disabled = false;
	        	                elements[i].disabledIf = null;
	        	            }
	        	        }
                    }
                    scope.$on('$destroy', function() {
	                    enableAll(disabledElement);
	                });
	            }
	        };
	    }])    
	})( angular );
