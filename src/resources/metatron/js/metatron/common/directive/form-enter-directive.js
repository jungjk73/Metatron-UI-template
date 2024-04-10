define(['app'], function(app) {
   'use strict';
   app.directive("formEnter", function(){
          return function (scope, element, attrs) {
                element.bind("keydown keypress", function (event) {
                    if(event.which === 13) {
                        scope.$apply(function (){
                            scope.$eval(attrs.formEnter);
                        });
                        event.preventDefault();
                    }
                });
            };
        })
});

