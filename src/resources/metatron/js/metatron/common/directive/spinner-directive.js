define(['app'], function(app) {
    app.directive("metatronSpinner", ['$compile', '$templateCache', function($compile, $templateCache) {
        'use strict';

        return {
            restrict: "E",
            transclude: true,
            scope: {
                step: "@",
                readonly: "@",
                theme : "@",
                onDataChange: "&",
                width : "@",
                value : "="
            },
            link: function postLink($scope, $element, $attrs, controller) {
                console.log('\n\n',$attrs.readonly);
                var step ;
                var DEFAULT_STEP = 1;
                var spinner ;
                var spinnerDiv;
                var value;
                var DEFAULT_VALUE;
                var target = angular.element($element);
                var theme = $attrs.theme == undefined ? '' : $attrs.theme;
                var unbind = [];
                var width = $attrs.width == undefined ? '100' : $attrs.width;
                let readonly = $attrs.readonly == null ? true : $attrs.readonly;
                function createSpinnerComp() {
                    let _readonlyHTML = (readonly == 'true' || readonly == true) ? "readonly='readonly'" : "";
                    spinnerDiv = $('<div class="mu-selectbox '+theme+'"></div>');
                    spinner = $('<input type="number" min="1" class="spinner-hide mu-value" '+_readonlyHTML+' style="width: '+ width +'px; min-width : '+ width + 'px; height: 30px;">');

                    spinnerDiv.append(spinner);
                    target.append(spinnerDiv);
                    target.attr("id", $scope.id);

                    spinner.spinner({
                        icons: { down: "mu-icon arr-down", up: "mu-icon arr-up" },
                        change: function( event, ui ) {
                            value = $(this).val();
                            dataChange();
                        },
                        stop: function( event, ui ) {
                            value = $(this).val();
                            dataChange();
                        },spin: function( event, ui ) {
                            if ( ui.value < 0 ) {
                                $( this ).spinner( "value", 0 );
                                return false;
                            }
                        }
                    });

                    spinner.spinner( "value", DEFAULT_VALUE );
                }

                function dataChange(){
                    if( $scope.onDataChange ) {
                        $scope.onDataChange({event: value});
                    }
                }

                function setAttr() {
                    step = ($attrs.step == null) ? DEFAULT_STEP:$attrs.step;
                    value = ($attrs.value == null) ? DEFAULT_VALUE:$attrs.value;
                }

                function getUniqueId() {
                    return (new Date()).getTime() + Math.floor((Math.random() * 1000) + 1);
                }

                function valueChange(v) {
                    if (!value)
                        return;

                    DEFAULT_VALUE = v;
                    spinner.spinner( "value", DEFAULT_VALUE );
                }

                function initialize() {
                    $scope.id = "datetime-" + getUniqueId();
                    setAttr();
                    addEventHandler();
                    createSpinnerComp();
                }

                function addEventHandler() {
                    unbind = [ $scope.$watch("value", valueChange)];
                }


                // clear-memory
                function clear() {
                    target.off("remove", clear);
                }

                target.on("remove", clear);
                initialize();
            }
        }
    }]);

});