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
            template:'<div class="mu-selectbox inner-check-type" style="z-index:999;width:{{checkSelectBoxCtrl.width}}">'+
                        '<button class="mu-value" ng-click="checkSelectBoxCtrl.valueBtnClick($event)"  style="width:{{checkSelectBoxCtrl.width}}; background-color: #fff">{{checkSelectBoxCtrl.chkSelectedLavels}}</button><div></div>'+
                        '<ul class="mu-list">'+
                        '<li id="allCheckedArea" ng-click="checkSelectBoxCtrl.allSelectValueClick()"><span>ALL</span><input type="checkbox" name="" class="mu-checkbox" id="all_checked_chk"><label for="All_checked_chk"></label> </li>' +
                        '<li ng-repeat="element in checkSelectBoxCtrl.nodeList track by $index" ng-click="checkSelectBoxCtrl.selectValueClick($event , element)" id="{{element[checkSelectBoxCtrl.valueKey]}}_label">' +
                            '<span>{{element[checkSelectBoxCtrl.labelKey]}}</span>' +
                            '<input type="checkbox" name="" class="mu-checkbox" id="{{element[checkSelectBoxCtrl.valueKey]}}_checked_{{checkSelectBoxCtrl.id}}"><label for="{{element[checkSelectBoxCtrl.valueKey]}}_checked"></label> </li>'+
                        '</ul>' +
                     '</div>',
            scope: {
                checkAll : "@",
                data : "=",
                selectedValue : "=",
                valueKey : "@",
                labelKey :"@",
                onChange : "&",
                width: "@",
            },            
            controller : ["$scope", "$rootScope", "$q", "$element", "$attrs", function($scope, $rootScope, $q , $element, $attrs) {
                var unbind = [];
                var checkSelectBoxCtrl = this;
                checkSelectBoxCtrl.valueKey = "value";
                checkSelectBoxCtrl.labelKey = "label";
                checkSelectBoxCtrl.id = "";
                checkSelectBoxCtrl.width = $scope.width || '200px';
                checkSelectBoxCtrl.chkSelectedValues = [];     // 체크 데이타
                checkSelectBoxCtrl.checkAll = $scope.checkAll || false;

                var $checkAllElement = $element.find('#allCheckedArea');

                var body = angular.element($("body"));
                body.bind('click', function(e){                    
                    if(!$(e.target).parent().hasClass("mu-selectbox")) {
                        if(!$(e.target).parent().parent().hasClass("mu-selectbox")){
                            if(!$(e.target).parent().parent().parent().hasClass("mu-selectbox")){
                                var list = angular.element(document.getElementsByClassName("mu-selectbox"));
                                list.removeClass("on");
                            }
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


                function checkAll() {            
                    $element.find('li').removeClass('check');
                    $element.find('.mu-checkbox').prop('checked', false);

                    checkSelectBoxCtrl.nodeList = _.filter(checkSelectBoxCtrl.nodeList, function(item) {
                        item.checked = false;                           
                        return item;
                    });
                    checkSelectBoxCtrl.chkSelectedValues = _.map(checkSelectBoxCtrl.nodeList, function(item){ return item.value });
                    $checkAllElement.addClass('check');
                    $checkAllElement.find('.mu-checkbox').prop('checked', true);      
                    checkSelectBoxCtrl.chkSelectedLavels = 'ALL';              
                }

                // 전체선택
                checkSelectBoxCtrl.allSelectValueClick = function(event) {
                    checkAll();
                    $scope.onChange({
                        event : event,
                        value : checkSelectBoxCtrl.chkSelectedValues
                    });
                };

                checkSelectBoxCtrl.selectValueClick = function(event,element) {
                    var $curr = $(event.currentTarget);
                    var $parent = $curr.parent().parent();

                    if($checkAllElement.find('.mu-checkbox').is(":checked")) {
                        checkSelectBoxCtrl.chkSelectedValues = [];
                    }
                    //$parent.removeClass("on");
                    checkSelectBoxCtrl.selectedData = element;
                    if(!checkSelectBoxCtrl.selectedData.hasOwnProperty("checked"))
                        checkSelectBoxCtrl.selectedData.checked = false;


                    checkSelectBoxCtrl.selectedData.checked = !checkSelectBoxCtrl.selectedData.checked;

                    if(checkSelectBoxCtrl.selectedData.checked == true) {
                        $curr.addClass("check");
                        $curr.find('.mu-checkbox').prop('checked',true);
                        checkSelectBoxCtrl.chkSelectedValues.push(checkSelectBoxCtrl.selectedData.value);
                    }else{
                        $curr.removeClass("check");
                        $curr.find('.mu-checkbox').prop('checked',false);
                        checkSelectBoxCtrl.chkSelectedValues = _.filter(checkSelectBoxCtrl.chkSelectedValues, function(item) {
                            return item != checkSelectBoxCtrl.selectedData.value;
                        });
                    }   

                    if(checkSelectBoxCtrl.chkSelectedValues.length == checkSelectBoxCtrl.nodeList.length || checkSelectBoxCtrl.chkSelectedValues.length == 0) {
                        checkAll();
                    }else {                        
                        checkSelectBoxCtrl.chkSelectedLavels = checkSelectBoxCtrl.chkSelectedValues.join(", ");
                        $checkAllElement.removeClass('check');
                        $checkAllElement.find('.mu-checkbox').prop('checked', false);
                    }

                    $scope.onChange({
                        event : event,
                        value : checkSelectBoxCtrl.chkSelectedValues
                    });
                };

                function dataChange (value) {
                    if(!value)
                        return;

                    checkSelectBoxCtrl.nodeList = value;

                    if(!checkSelectBoxCtrl.chkSelectedValues) {
                        //checkSelectBoxCtrl.selectedData = value[0]
                        chkAll();
                    }else{
                        getSelectedData();
                    }                    
                }

                function getSelectedData () {

                    if(checkSelectBoxCtrl.chkSelectedValues.length == checkSelectBoxCtrl.nodeList.length) { // 전체선택
                         checkAll();
                    }else {
                        $checkAllElement.removeClass('check');
                        $checkAllElement.find('.mu-checkbox').prop('checked', false);
                        for(var i=0; i<checkSelectBoxCtrl.chkSelectedValues.length; i++) {
                            var value = checkSelectBoxCtrl.chkSelectedValues[i];
                            $element.find('#'+value+'_label').addClass('check');
                            $element.find('#'+value+'_label').find('.mu-checkbox').prop('checked', true);
                            _.findWhere(checkSelectBoxCtrl.nodeList, {value: value}).checked = true;
                        }
                    }                    
                }

                function selectedValueChange(value) {
                    if(!value)
                        return;

                    checkSelectBoxCtrl.chkSelectedValues = value;

                    if(checkSelectBoxCtrl.nodeList) {
                        getSelectedData();
                    }
                }

                function addEventHandler() {
                    unbind = [$scope.$on('$destroy', clear),
                        $scope.$watch("data", dataChange),
                        $scope.$watch("selectedValue", selectedValueChange)],
                        $scope.$watch(function(){                                               
                            return ($element.find('.mu-checkbox').length == checkSelectBoxCtrl.nodeList.length+1);
                        }, initCheckAll)
                }

                function clear() {
                    unbind.forEach(function(fn) {
                        fn();
                    });
                    $scope.$destroy();
                    //target.off("remove", clear);
                }

                function initCheckAll() {                    
                    if(checkSelectBoxCtrl.checkAll === 'all') {                        
                        checkSelectBoxCtrl.chkSelectedValues = _.map(checkSelectBoxCtrl.nodeList, function(item){ return item.value });
                        $checkAllElement.addClass('check');
                        $checkAllElement.find('.mu-checkbox').prop('checked', true);
                        checkSelectBoxCtrl.chkSelectedLavels = 'ALL';
                    }   
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
            link: function postLink($scope, $element, $attrs, controller) { 

            }
        }
    }]);

});