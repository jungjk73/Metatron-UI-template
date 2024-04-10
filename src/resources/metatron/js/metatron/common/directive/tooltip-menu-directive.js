define([], function() {
    return function($rootScope) {
        "use strict";

        return {
            restrict: "E",
            transclude: true,
            scope: {
                show: "=",
                selfClose: "@"
            },
            template: "<div ng-transclude></div>",
            link: function postLink($scope, element, attrs, controller) {
                var target = angular.element(element);
                var tBind = null;
                var isSelfHide = false;

                // method

                // function
                function initialize() {
                    target.css("display", "none");
                    target.attr("use-layout", "false");
                    
                    if (!$scope.selfClose) {
                        $scope.selfClose = "false";
                    }
                }

                function showTooltip() {
                    tBind = $scope.$on("hideAllTooltipMenu", onHideAllTooltipMenuHandler);
                    angular.element("body").bind("click", onClickBodyHandler);
                    target.css("display", "block");

                    isSelfHide = true;
                    $rootScope.$broadcast("hideAllTooltipMenu");
                }

                function hideTooltip() {
                    if (tBind) {
                        tBind();
                        tBind = null;
                    }

                    angular.element("body").unbind("click", onClickBodyHandler);
                    target.css("display", "none");
                    $scope.show = false;
                    
                    if ($scope.$root.$$phase != '$apply' && $scope.$root.$$phase != '$digest') {
                        $scope.$apply();
                    }
                }
                
                function isParent(parent, child) {
                    var p = child.parentNode
                    if (!p || p.tagName == "BODY") {
                        return false;
                    }

                    var ret = false;
                    if (p == parent) {
                        ret =  true;
                    } else {
                        ret = isParent(parent, p);
                    }
                    return ret;                  
                }

                // event-listener
                function onChangeShowHandler(value) {
                    if (value == true || value == "true") {
                        showTooltip();
                    } else {
                        hideTooltip();
                    }
                }

                function onClickBodyHandler(event) {
                    var t = angular.element(event.target).attr("class");
                    if ((!t || t.indexOf("tooltip-trigger") == -1)) {                        
                        if ($scope.selfClose == "true") {
                            if (!isParent(element[0], event.target)) {
                                hideTooltip();
                            }
                        } else {
                            hideTooltip();
                        }
                    }
                }

                function onHideAllTooltipMenuHandler(event, value) {
                    if (isSelfHide) {
                        isSelfHide = false;
                        return;
                    }

                    hideTooltip();
                }
                
                $scope.$watch("show", onChangeShowHandler);

                initialize();
            }
        }
    }
});