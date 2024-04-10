
define([], function() {
    return function(dependencies) {
        'use strict';
        
        var definition = {
            resolver: ['$q', '$rootScope', function($q, $rootScope) {
                var defer = $q.defer();
                require(dependencies, function() {
                    defer.resolve();
                    $rootScope.$apply();
                });

                return defer.promise;
            }]
        }

        return definition;
    }
});