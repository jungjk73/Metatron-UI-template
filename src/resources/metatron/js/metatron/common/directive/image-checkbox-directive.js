/*
 * Copyright (c) 2016. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
 * Morbi non lorem porttitor neque feugiat blandit. Ut vitae ipsum eget quam lacinia accumsan.
 * Etiam sed turpis ac ipsum condimentum fringilla. Maecenas magna.
 * Proin dapibus sapien vel ante. Aliquam erat volutpat. Pellentesque sagittis ligula eget metus.
 * Vestibulum commodo. Ut rhoncus gravida arcu.
 */

define(['app'], function(app) {
    app.directive("imageCheckBox", ['$compile', '$templateCache', function($compile, $templateCache) {
        'use strict';
        var template_check = '<span class="mu-checkbox-btn  mu-btn-color {{imageCheckBoxCtrl.status}}" style="margin-right: 5px ; margin-top: 5px;position:relative;"> ' +
                '<input type="checkbox" name="" value="" id="{{imageCheckBoxCtrl.label}}" class="mu-checkbox mu-checkbox-slave" style="display: none;">' +
                '<label for="{{imageCheckBoxCtrl.label}}" ng-click="imageCheckBoxCtrl.buttonClick($event)" style="display: none; cursor: pointer;"></label>' +
                '<button type="button" ng-click="imageCheckBoxCtrl.buttonClick($event)" class="image-btn" title="{{imageCheckBoxCtrl.tooltipText}}">{{imageCheckBoxCtrl.label}}</button>' +
                '</span>';
        var template_image = '<button  title="{{imageCheckBoxCtrl.tooltipText}}" class="mu-btn {{imageCheckBoxCtrl.imageCheck}} image-btn" ng-click="imageCheckBoxCtrl.buttonClick($event)" style="margin-right: 5px ; margin-top: 5px;">{{imageCheckBoxCtrl.label}}</button>' ;

        var getTemplate = function(contentType){
            var template = '';
            switch(contentType){
                case 'check':
                    template = template_check;
                    break;
                case 'image':
                    template = template_image;
                    break;
                default :
                    template = template_check;
            }

            return template;
        };
        return {
            restrict: "E",
            controllerAs : "imageCheckBoxCtrl",
            scope: {
                status : "@",
                checked : "@",
                label : "@",
                data:"=?",
                onChange:"&",
                useChecked : "@",
                buttonType:"@",
                useTooltip:"@",
                tooltipText:"@"
            },
            controller : ["$scope", "$q", "$element","$attrs", function($scope, $q, $element ,$attrs) {
                var unbind = [];
                var imageCheckBoxCtrl = this;
                imageCheckBoxCtrl.status = "";
                imageCheckBoxCtrl.imageCheck = "";
                imageCheckBoxCtrl.checked = false;
                imageCheckBoxCtrl.data = {};

                var use_checked = "false";
                var button_type = "check";
                var $checkBtn;
                var chkBoxChecked = false; // chekbox 체크여부

                function checkBtnClick() {
                    if(button_type == 'check') {
                        var $chk_box = $($element[0].getElementsByClassName("mu-checkbox"));
                        var $chk_label= $($element[0].getElementsByClassName(".mu-checkbox + label"));

                        if ( $checkBtn.hasClass('check') ) {
                            if(chkBoxChecked) {
                                $checkBtn.siblings($chk_box).prop('checked',false);
                                $checkBtn.siblings($chk_label).hide();
                            }else {
                                $checkBtn.siblings($chk_box).prop('checked',true);
                                $checkBtn.siblings($chk_label).show();
                            }
                            
                        } else {
                            if(chkBoxChecked) {
                                $checkBtn.siblings($chk_box).prop('checked',true);
                                $checkBtn.siblings($chk_label).show();
                            }else {
                                $checkBtn.siblings($chk_box).prop('checked',false);
                                $checkBtn.siblings($chk_label).hide();
                            }
                           
                        }
                    }else{
                        if ( $checkBtn.hasClass('check') ) {
                            imageCheckBoxCtrl.imageCheck = "mu-btn-color bg-blue";
                        } else {
                            imageCheckBoxCtrl.imageCheck = "border-blue";
                        }
                    }
                }                
               

                imageCheckBoxCtrl.buttonClick = function (event) {
                    var target = $(event.currentTarget);
                    
                    if(target.is(':button')) {
                        chkBoxChecked = false;
                    }else {
                        chkBoxChecked = true;
                    }
                    
                    $checkBtn =  $($element[0].getElementsByClassName('image-btn'));
                    if(use_checked == "true"){
                        $checkBtn.toggleClass('check');
                        if(imageCheckBoxCtrl.data.checked == "false" || imageCheckBoxCtrl.data.checked == null)
                            imageCheckBoxCtrl.data.checked = "true";
                        else
                            imageCheckBoxCtrl.data.checked = "false";


                        $scope.onChange({
                            event : event,
                            value : imageCheckBoxCtrl.data
                        });
                    }
                };

                function labelChange(value) {
                    if(!value)
                        return;

                    imageCheckBoxCtrl.label =value;
                }

                function dataChange(value) {
                    if(!value)
                        return;

                    imageCheckBoxCtrl.data = value;
                    if(!imageCheckBoxCtrl.data.hasOwnProperty("checked")) {
                        imageCheckBoxCtrl.data.checked = "false";
                    }
                }

                function tooltipTextChange(value) {
                    imageCheckBoxCtrl.tooltipText = value;
                }

                function statusChange(value) {
                    if(!value)
                        return;

                    imageCheckBoxCtrl.status = value;
                }

                function checkedChange(value) {
                    if(!value)
                        return;

                    if(!$checkBtn)
                        $checkBtn =  $($element[0].getElementsByClassName('image-btn'));


                    if(imageCheckBoxCtrl.data.checked == "true") {
                        $checkBtn.addClass("check")
                    }else{
                        $checkBtn.removeClass("check")
                    }

                    checkBtnClick();
                }

                function clear() {
                    unbind.forEach(function(fn) {
                        fn();
                    });
                    $scope.$destroy();
                    imageCheckBoxCtrl = null;

                    //target.off("remove", clear);
                }


                function addEventHandler() {
                    unbind = [$scope.$on('$destroy', clear),
                        $scope.$watch("data", dataChange),
                        $scope.$watch("checked", checkedChange),
                        $scope.$watch("status", statusChange),
                        $scope.$watch("label", labelChange),
                        $scope.$watch("tooltipText", tooltipTextChange),
                       ];
                }

                function initialize() {
                    if($attrs.useChecked)
                        use_checked = $attrs.useChecked;

                    if($attrs.buttonType)
                        button_type = $attrs.buttonType;

                    if($attrs.useTooltip){
                        $(document).on('mouseover', '.image-btn', function( event ) {
                            // console.log("mouseover :" + event.target);
                        });
                    }

                    addEventHandler();
                }

                initialize();
            }],
            link: function ($scope, $element, $attrs) {
                $element.html(getTemplate($attrs.buttonType));
                $compile($element.contents())($scope);
            }
        }
    }]);

});