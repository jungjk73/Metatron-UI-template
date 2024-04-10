/*
 * Copyright (c) 2016. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
 * Morbi non lorem porttitor neque feugiat blandit. Ut vitae ipsum eget quam lacinia accumsan.
 * Etiam sed turpis ac ipsum condimentum fringilla. Maecenas magna.
 * Proin dapibus sapien vel ante. Aliquam erat volutpat. Pellentesque sagittis ligula eget metus.
 * Vestibulum commodo. Ut rhoncus gravida arcu.
 */

define(['app'], function(app) {
    app.directive("checkSelectBox", ['$compile', '$templateCache', function($compile, $templateCache) {
        'use strict';
        return {
            restrict: "E",
            controllerAs : "checkSelectBoxCtrl",
            template:'<div class="mu-selectbox inner-check-type" style="width:200px">'+
                        '<button class="mu-value" ng-click="checkSelectBoxCtrl.valueBtnClick($event)"  style="width:200px; background-color: #fff">{{checkSelectBoxCtrl.selectedData[checkSelectBoxCtrl.labelKey]}}</button>'+
                        '<ul class="mu-list">'+
                        '<li ng-repeat="element in checkSelectBoxCtrl.nodeList track by $index" ng-click="checkSelectBoxCtrl.selectValueClick($event , element)" >' +
                            '<span>{{element[checkSelectBoxCtrl.labelKey]}}</span>' +
                            '<input type="checkbox" name="" class="mu-checkbox" id="{{element[checkSelectBoxCtrl.valueKey]}}_checked_{{checkSelectBoxCtrl.id}}"><label for="{{element[checkSelectBoxCtrl.valueKey]}}_checked_{{checkSelectBoxCtrl.id}}"></label> </li>'+
                        '</ul>' +
                     '</div>',
            scope: {
                checkAll : "@",
                data : "=",
                selectedValue : "@",
                valueKey : "@",
                labelKey :"@",
                onChange : "&"
            },
            controller : ["$scope", "$rootScope", "$q","$attrs", function($scope, $rootScope, $q , $attrs) {
                var unbind = [];
                var checkSelectBoxCtrl = this;
                checkSelectBoxCtrl.valueKey = "value";
                checkSelectBoxCtrl.labelKey = "label";
                checkSelectBoxCtrl.id = "";

                var body = angular.element($("body"));
                body.bind('click', function(e){
                    console.log(e.target.parent);

                    if(!$(e.target).parent().hasClass("mu-selectbox")) {
                        if(!$(e.target).parent().parent().hasClass("mu-selectbox")){
                            var list = angular.element(document.getElementsByClassName("mu-selectbox"));
                            list.removeClass("on");
                        }

                    }
                });

                checkSelectBoxCtrl.valueBtnClick = function(event) {
                    var $curr = $(event.currentTarget);
                    var $parent = $curr.parent();
                    if($parent.hasClass("on"))
                        $parent.removeClass("on");
                    else
                        $parent.addClass("on");
                };

                checkSelectBoxCtrl.selectValueClick = function(event,element) {
                    var $curr = $(event.currentTarget);
                    var $parent = $curr.parent().parent();
                    //$parent.removeClass("on");
                    checkSelectBoxCtrl.selectedData = element;
                    if(!checkSelectBoxCtrl.selectedData.hasOwnProperty("checked"))
                        checkSelectBoxCtrl.selectedData.checked = false;


                    checkSelectBoxCtrl.selectedData.checked = !checkSelectBoxCtrl.selectedData.checked;

                    if(checkSelectBoxCtrl.selectedData.checked == true) {
                        $curr.addClass("check");
                        $curr.find('.mu-checkbox').prop('checked',true);
                    }else{
                        $curr.removeClass("check");
                        $curr.find('.mu-checkbox').prop('checked',false);
                    }

                    $scope.onChange({
                        event : event,
                        value : checkSelectBoxCtrl.selectedData
                    });
                };

                function dataChange (value) {
                    if(!value)
                        return;

                    checkSelectBoxCtrl.nodeList = value;

                    if(!checkSelectBoxCtrl.selectedValue) {
                        checkSelectBoxCtrl.selectedData = value[0]
                    }else{
                        getSelectedData();
                    }
                }

                function getSelectedData () {
                    for(var i = 0 ; i < checkSelectBoxCtrl.nodeList.length ; i++) {
                        var el = checkSelectBoxCtrl.nodeList[i];

                        if(el[checkSelectBoxCtrl.valueKey] == checkSelectBoxCtrl.selectedValue) {
                            checkSelectBoxCtrl.selectedData = el;
                            break;
                        }

                    }
                }

                function selectedValueChange(value) {
                    if(!value)
                        return;

                    checkSelectBoxCtrl.selectedValue = value;

                    if(checkSelectBoxCtrl.nodeList) {
                        getSelectedData();
                    }
                }

                function addEventHandler() {
                    unbind = [$scope.$on('$destroy', clear),
                        $scope.$watch("data", dataChange),
                        $scope.$watch("selectedValue", selectedValueChange)];
                }

                function clear() {
                    unbind.forEach(function(fn) {
                        fn();
                    });
                    $scope.$destroy();
                    //target.off("remove", clear);
                }

                function setAttrs() {
                    if($attrs.labelKey)
                        checkSelectBoxCtrl.labelKey = $attrs.labelKey;

                    if($attrs.valueKey)
                        checkSelectBoxCtrl.valueKey = $attrs.valueKey;

                    checkSelectBoxCtrl.id = "chk_" + Math.floor(Math.random() * 1000);
                }
                function initialize() {
                    addEventHandler();
                    setAttrs();
                }
                initialize();
            }],
            compile : function compile () {
                return {
                    
                }
            },
            link: function postLink($scope, $element, $attrs, controller) { }
        }
    }]);

});