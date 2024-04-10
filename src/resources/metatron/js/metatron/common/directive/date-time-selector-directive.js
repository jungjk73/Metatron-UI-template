define(['app','moment'], function (app, moment) {
	app.directive("dateTimeSelector", ['$compile', '$templateCache', function ($compile, $templateCache) {
		'use strict';

		return {
			restrict: "E",
			transclude: true,
			scope: {
				sDateTime: "=",			//"yyyy-mm-dd HH:mm:ss"	 	//형태
				eDateTime: "=",			//"yyyy-mm-dd HH:mm:ss"	 	//형태
				onDataChange: "&",
				useTimeField : "@",
				useEndField: "@",
				seperator: "@",
				timeFormat: "@",
				dateInputSize : "@",		// start date input size / end date input size
				theme: "@",
				step: "@"
			},
			link: function postLink($scope, $element, $attrs, controller) {
				var DEFAULT_SEPERATOR = "&nbsp; ~ &nbsp;";
				var DEFAULT_TIME_FORMAT = "HH:mm";
				var DEFAULT_TIME_STEP = 10;

				// property
				var unbind = [];
				var target = angular.element($element);
				var seperator;
				var timeFormat;
				var step;
				var sDate;
				var eDate;
				var sTime;
				var valid_sTime;
				var eTime;
				var valid_eTime;
				var sdateDiv;
				var stimeDiv;
				var sDateInput;
				var sTimeInput;
				var edateDiv;
				var etimeDiv;
				var eDateInput;
				var eTimeInput;
				var theme = $attrs.theme == undefined ? '' : $attrs.theme;
				var useTimeField = $attrs.useTimeField == undefined ? true : $attrs.useTimeField;
				var useEndField = $attrs.useEndField == undefined ? true : $attrs.useEndField;
				var dateInputSize = $attrs.dateInputSize == undefined ? '74px' : $attrs.dateInputSize+'px';


				$scope.id = "";

				// clear memory
				function clear() {
					unbind.forEach(function (fn) {
						fn();
					});

					sDateInput.datepicker("destroy");
					eDateInput.datepicker("destroy");

					target = null;
					$scope.$destroy();
					target.off("remove", clear);
				}

				target.on("remove", clear);

				function dateTimeChange() {
					if ($scope.onDataChange) {
						var sDateTime = sDate + " " + sTime;
						var eDateTime = eDate + " " + eTime;
						$scope.sDateTime = sDateTime;
						$scope.eDateTime = eDateTime;
						var e = {sDateTime: sDateTime, eDateTime: eDateTime};
						$scope.onDataChange({event: e});
					}
				}

				/**
				 * unique ID 리턴
				 */
				function getUniqueId() {
					return (new Date()).getTime() + Math.floor((Math.random() * 1000) + 1);
				}

				/**
				 * 시작시간 change 이벤트 핸들러
				 */
				function sDateTimeChange(value) {
					if (!value)
						return;
					var ar = value.split(" ");
					sDate = ar[0];
					sDateInput.val(sDate);

					sTime = ar[1];
					valid_sTime = sTime;
					sTimeInput.val(sTime);
				}

				/**
				 * 종료시간 change 이벤트 핸들러
				 */
				function eDateTimeChange(value) {
					if (!value)
						return;
					var ar = value.split(" ");
					eDate = ar[0];
					eDateInput.val(eDate);

					eTime = ar[1];
					valid_eTime = eTime;
					eTimeInput.val(eTime);
				}

				/**
				 * 속성 감시 이벤트 핸들러
				 */
				function addEventHandler() {
					unbind = [
						$scope.$watch("sDateTime", sDateTimeChange),
						// $scope.$watch(function ($scope) {
						// 	console.log($scope.id);
						// 	return $scope.sDateTime;
						// }, sDateTimeChange),
						$scope.$watch("eDateTime", eDateTimeChange)
					];
				}

				/**
				 * directive attr값 setting
				 */
				function setAttr() {
					seperator = ($attrs.seperator == null) ? DEFAULT_SEPERATOR : $attrs.seperator;
					timeFormat = ($attrs.timeFormat == null) ? DEFAULT_TIME_FORMAT : $attrs.timeFormat;
					step = ($attrs.step == null) ? DEFAULT_TIME_STEP : $attrs.step;
				}

				/**
				 * 현재시간 return
				 */
				function setCurrentTime() {

					// date
					var d = new Date();
					$("#" + $scope.id).children(".date").datepicker('setDate', d);

					var f = Globalize.format(d, "yyyy-MM-dd");
					sDate = eDate = f;

					// end time
					d.setMinutes(d.getMinutes() - (d.getMinutes() % 10));
					eTimeInput.timespinner("value", d.getHours() + ":" + d.getMinutes());

					// start time
					d.setMinutes(d.getMinutes() - DEFAULT_TIME_STEP);
					sTimeInput.timespinner("value", d.getHours() + ":" + d.getMinutes());
				}

				/**
				 * start, end 컴포넌트 생성
				 */
				function createDateTimeComp() {
					sdateDiv = angular.element('<div class="mu-datepicker"></div>');
					sDateInput = angular.element('<input type="text" class="date" value="" id="sdate_'+$scope.id+'" readonly="readonly">');
					stimeDiv = angular.element('<div class="mu-selectbox ' + theme + '"></div>');
					sTimeInput = angular.element('<input class="spinner mu-value stime-value" style="width: '+dateInputSize+'; min-width: '+dateInputSize+'; height: 30px;">');
					seperator = DEFAULT_SEPERATOR;
					edateDiv = angular.element('<div class="mu-datepicker"></div>');
					eDateInput = angular.element('<input type="text" class="date" value="" id="edate_'+$scope.id+'" readonly="readonly">');
					etimeDiv = angular.element('<div class="mu-selectbox ' + theme + '" ></div>');
					eTimeInput = angular.element('<input class="spinner mu-value etime-value" style="width: '+dateInputSize+'; min-width: '+dateInputSize+'; height: 30px;">');

					sdateDiv.append(sDateInput);
					stimeDiv.append(sTimeInput);
					target.append(sdateDiv);
					if (useTimeField == true || useTimeField == 'true')
						target.append(stimeDiv);

					if (useEndField == true || useEndField == 'true') {
						target.append(seperator);
						edateDiv.append(eDateInput);
						etimeDiv.append(eTimeInput);
						target.append(edateDiv);
						if (useTimeField == true || useTimeField == 'true')
							target.append(etimeDiv);
					}


					target.attr("id", $scope.id);

					//timespinner
					$.widget("ui.timespinner", $.ui.spinner, {
						options: {
							page: 60 / DEFAULT_TIME_STEP,				// hours
							step: 60 * 1000 * DEFAULT_TIME_STEP		// seconds
						},
						_parse: function (value) {
							if (typeof value === "string") {
								if (Number(value) == value) {
									return Number(value);
								}
								var glovalValue = Globalize.parseDate(value, DEFAULT_TIME_FORMAT);
								return +glovalValue;
							}
							return value;
						},
						_format: function (value) {
							return Globalize.format(new Date(value), DEFAULT_TIME_FORMAT);
						}
					});

					sDateInput.datepicker({
						dateFormat: 'yy-mm-dd',
						maxDate: new Date()
					});

					sDateInput.on("change", function () {
						sDate = $(this).val();
						dateTimeChange();
					});

					eDateInput.datepicker({
						dateFormat: 'yy-mm-dd',
						maxDate: new Date()
					});
					eDateInput.on("change", function () {
						eDate = $(this).val();
						dateTimeChange();
					});

					sTimeInput.timespinner({
						icons: {down: "mu-icon arr-down", up: "mu-icon arr-up"},
						change: function (event, ui) {
							let reg = new RegExp('^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$');
							let isTime = reg.test($(this).val());
							if (isTime) {sTime = $(this).val();}
							else {sTime = valid_sTime;}

							dateTimeChange();
						},
						stop: function (event, ui) {
							let reg = new RegExp('^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$');
							let isTime = reg.test($(this).val());
							if (isTime) {sTime = $(this).val();}
							else {sTime = valid_sTime;}
							dateTimeChange();
						}
					});

					eTimeInput.timespinner({
						icons: {down: "mu-icon arr-down", up: "mu-icon arr-up"},
						change: function (event, ui) {
							let reg = new RegExp('^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$');
							let isTime = reg.test($(this).val());
							if (isTime) {eTime = $(this).val();}
							else {eTime = valid_eTime;}

							dateTimeChange();
						},
						stop: function (event, ui) {
							let reg = new RegExp('^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$');
							let isTime = reg.test($(this).val());
							if (isTime) {eTime = $(this).val();}
							else {eTime = valid_eTime;}

							dateTimeChange();
						}
					});
					setCurrentTime();

				}

				/**
				 * 초기 함수
				 */
				function initialize() {
					$scope.id = "datetime-" + getUniqueId();
					addEventHandler();
					setAttr();
					createDateTimeComp();

					$(document).on('focusout', '.stime-value', function(){
						let reg = new RegExp('^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$');
						let isTime = reg.test($(this).val());
						if (isTime) sTime = $(this).val();
						else $(this).val(valid_sTime);
					});
					$(document).on('focusout', '.etime-value', function(){
						let reg = new RegExp('^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$');
						let isTime = reg.test($(this).val());
						if (isTime) eTime = $(this).val();
						else $(this).val(valid_eTime);
					});
					$(document).on('keypress', '.stime-value', function(e){
						if (e.which == 13) {
							let reg = new RegExp('^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$');
							let isTime = reg.test($(this).val());
							if (isTime) {sTime = $(this).val();}
							else $(this).val(valid_sTime);
						}
					});
					$(document).on('keypress', '.etime-value', function(e){
						if (e.which == 13) {
							let reg = new RegExp('^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$');
							let isTime = reg.test($(this).val());
							if (isTime) eTime = $(this).val();
							else $(this).val(valid_eTime);
						}
					});
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