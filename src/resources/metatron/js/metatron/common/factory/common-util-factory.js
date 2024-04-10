define(["moment"], function (moment) {
	return function ($rootScope, $filter, $window, ConfigManager, DataService) {
		"use strict";

		const REGEXP_ENG = /[a-zA-Z][a-zA-Z0-9]*/gi;
		const REGEXP_IP_AND_HOST = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3})$|^((([a-zA-Z]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9]))$/gi;
		const REGEXP_IP = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
		const REGEXP_PORT = /(6553[0-5]|655[0-2]\d|65[0-4]\d{2}|6[0-4]\d{3}|[1-5]\d{4}|[1-9]\d{0,3})/gi;
		const REGEXP_IP_PORT =  /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]){1}([:][0-9][0-9][0-9][0-9][0-9]?)$/;
		const REGEXP_PHONE_NUMBER =  /^([0-9]{2,3})-([0-9]{3,4})-([0-9]{4})$/;
		const REGEXP_EMAIL = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
		const REGEXP_CHANNEL_ID =  /^([0-9]{9})$/;

		var colorArr = ['#00c853','#e76049','#29c5ff','#ffea00','#ff3d00','#ffc000','#ff6600','#2979ff','#d500f9','#5d9cec','#888','#575757'];

		/**
		 * 클러스터 리스트 새로 고침
		 */
		function syncClusterData() {
			DataService.httpPost("/common/refreshClusterList", {}, function (data) {
				var result = null;
				if (data.result == 1 && data.data)
					result = data.data;

				// REFRESH_CLUSTER_LIST_EVENT 이벤트는 여기서만 broadcast 하는 것을 지향
				$rootScope.$broadcast(ConfigManager.getEvent("REFRESH_CLUSTER_LIST_EVENT"), result);
			});
		}

		/**
		 * 해당 값이 빈값인지 체크 후 true/false 반환
		 */
		function checkEmpty(val) {
			if(val == null)
				return true;

			val = val.toString();
			val = val.replace(/(\t+)|(\s+)/gi, "");
			if(val == "")
				return true;

			return false;
		}

		/**
		 * 시간차를 분으로 변환하여 리턴
		 */
		function diffOfDate(begin, end) {
			var diff = end.getTime() - begin.getTime();
			return Math.abs(diff / 1000 / 60);
		}

		/**
		 * Byte 단위를 변환
		 */
		function formatBytes(bytes, decimals, fixUnit, showUnit) {
			if (angular.isString(bytes)) {
				bytes = bytes.replace(/,/gi, '');
				bytes = Number(bytes);
			}

			if (bytes == 0) {
				if (showUnit == null || showUnit == true) {
					return '0 Byte';
				}else {
					return '0';
				}

			}

			var k = 1024;
			var dm = decimals + 0 || 3;
			var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

			var i = -1;
			if (fixUnit != null && fixUnit != "") {
				for (var j = 0; j < sizes.length; j++) {
					i++;
					if (sizes[j].toUpperCase() == fixUnit.toUpperCase()) {
						break;
					}
				}
			} else {
				i = Math.floor(Math.log(bytes) / Math.log(k));
			}

			var unit = "";
			if (showUnit == null || showUnit == true)
				unit = " " + sizes[i];
			else
				unit = "";

			return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + unit;
			//return $filter('number')(parseFloat((bytes / Math.pow(k, i)).toFixed(dm))) + unit;
		}

		/**
		 * 숫자여부 체크
		 */
		function checkNumber(str) {
			var num_regx=/^[0-9]*$/;
	    return num_regx.test(str);
		}

		/**
		 * 숫자 점찍기
		 */
		function numberFormatter(val) {
			var number;
			if (!val || !isFinite(val)) {
				number = '0';
			} else {
				number = $filter('number')(val);
			}
			return number;
		}

		function getFirstUpperCase(text, trimFlag) {
			var text2 = text.substr(0, 1).toUpperCase() + text.substr(1);
			var upperIdx = 0;
			for (var i = 0; i < text2.length; i++) {
				if (text2[i].match(/[A-Z]/) != null) {
					if (i != 0) {
						upperIdx = i;
						break;
					}
				}
			}

			text = text2.substring(0, upperIdx) + ' ' + text2.substring(upperIdx, text2.length);
			if (trimFlag != null && trimFlag == true)
				text.replace(/\s/gi, '');
			return text;
		}

		function dateFormatter(value) {
			if (typeof value == 'number')
				return moment(value).format('YYYY/MM/DD HH:mm:ss');
			else {
				if ( isNaN(Number(value)) == false ) {
					return moment(Number(value)).format('YYYY/MM/DD HH:mm:ss');
				} else {
					return moment(Number(moment(value).format('x'))).format('YYYY/MM/DD HH:mm:ss');
				}
			}
		}

		function durationFormatter(val) {
			var result = [];
			var d = moment.duration(val).get('d');
			if (d != null && d != 0) {
				if (d == 1)
					result.push(d + "day ");
				else
					result.push(d + "days ");
			}
			var h = moment.duration(val).get('h');
			if (result.length > 0 || (h != null && h != 0)) {
				if (h == 0)
					result.push("00:");
				else if (h.toString().length == 1)
					result.push("0" + h + ":");
				else
					result.push(h + ":");
			}

			var m = moment.duration(val).get('m');
			if (m != null && m == 0)
				result.push("00:");
			else if (m.toString().length == 1)
				result.push("0" + m + ":");
			else
				result.push(m + ":");

			var s = moment.duration(val).get('s');
			if (s != null && s == 0)
				result.push("00");
			else if (s.toString().length == 1)
				result.push("0" + s);
			else
				result.push(s);

			//var ms = moment.duration(val).get('ms');
			//if(ms != null && ms == 0)
			//	result.push("000");
			//else
			//	result.push(ms);

			return result.join('');
		}

		function permissionConverter(val) {
			if(val == null || val == "")
				return "";

			var result = [];
			var sVal = val.toString();
			for(var i=0; i<sVal.length; i++) {
				var num = parseInt(sVal.charAt(i));
				result.push((num & 4) == 0 ? '-' : 'r');
				result.push((num & 2) == 0 ? '-' : 'w');
				result.push((num & 1) == 0 ? '-' : 'x');
			}

			return result.join('');
		}


		/**
		 * DB 파티션 가져오기
		 */
		function setPartition(param) {
			if (param == null)
				param = {};

			var startTime = moment().subtract(1, 'days');
			var currentDate = moment();

			var dateArr = [];
			while (startTime <= currentDate) {
				dateArr.push("P" + startTime.format('YYYYMMDD'));
				startTime = startTime.add(1, 'days');
			}

			// setting
			param.partition = dateArr.join(",");
			return param;
		}


		/**
		 * http://ip:port/a/b/c 에서 ip 와 port 를 리턴
		 * @param url
		 * @returns {{ip: (*|string), port: (*|Function|string)}}
		 */
		function getIpAndPortFromUrl(url) {
			if(url == null || url == "")
				return null;

			let ip_port_regex = /(\d+)\.(\d+)\.(\d+)\.(\d+)(?:\.(\d+))?(?::(\d+))?/ig;
			let ipPort  = url.match(ip_port_regex);
			return ipPort[0];
		}

		/**
		 * 시작날짜, 종료 날짜 validation check
		 * @param start
		 * @param end
		 * @returns {boolean}
		 */
		function validateStartEndDate(startTime, endTime, searchPeriod) {

			if(checkEmpty(startTime)) {
				alert("Please select the start time.");
				return false;
			}
			if(checkEmpty(endTime)) {
				alert("Please select the end time.");
				return false;
			}

			var st = startTime.split(" ")[1];
			if(checkEmpty(st)) {
				alert("Please enter the start time.");
				return false;
			}
			var et = endTime.split(" ")[1];
			if(checkEmpty(et)) {
				alert("Please enter the end time.");
				return false;
			}

			if(new Date(startTime) == "Invalid Date" || new Date(endTime) == "Invalid Date") {
				alert("The time format is not correct.");
				return false;
			}
			var today = new Date();
			if (new Date(startTime) > today) {
				alert("The time must be less than today.");
				return false;
			}
			if (new Date(startTime) >= new Date(endTime)) {
				alert("End Time should be greater than Start Time.");
				return false;
			}
			if (new Date(endTime) > today) {
				endTime = today;
			}

			if(searchPeriod) {
				var t1 = moment(startTime);
				var t2 = moment(endTime);
				var diff = moment.duration(t2.diff(t1)).asDays();
				if(diff > searchPeriod) {
					alert('Please search within ' + searchPeriod + ' days.');
					return false;
				} 				
			}
			return true;
		}

		function isEndDateLargerThanToday(endTime){
			var today = new Date();
			if (new Date(endTime) > today) {
				return true;
			}else
				return false;
		}

		function replaceAll(target, str, replacement) {
			return target.split(str).join(replacement);
		}

		function isCountSafe(str, max){
			if (str && str.toString().length > max)
				return false;
			else return true;
		}

		function networkAlertHandler() {
			if($rootScope.alertFlag)
				return;

			alert("The network connection failed. Please login again.");
			
			$rootScope.alertFlag = true;
			sessionStorage.clear();
			$window.location = "/logout";
		}

		function getChartColorArr(){
			return colorArr;
		}

		/**
		 * 그리드 텍스트 정렬
		 * @param params
		 * @returns {*}
		 */
		function gridTextAlignCenterRenderer(params) {
			if(params == null || params.data == null)
				return '';

			var col = params.column.colId;
			var val = params.data[col] == null ? '0' : params.data[col];

			return "<div style='text-align : center;'><span>" + val + "</span></div>";
		}

		/**
		 * 그리드 날짜 변환
		 * @param value
		 * @returns {*|string}
		 */
		function gridDateFormatter(value) {
			let val = '';
			if (typeof value == 'object'){
				value = value.value;
			}

			if (typeof value == 'number') {
				if (value.length >= 13)
					val = moment(value).format('YYYY/MM/DD HH:mm:ss');
				else {
					let temp = moment.duration(value, 'milliseconds');
					val = temp.hours() + ' hrs ' + temp.minutes()+' mins';
				}
			}
			else {
				if ( isNaN(Number(value)) == false ) {
					val = moment(Number(value)).format('YYYY/MM/DD HH:mm:ss');
				} else {
					val = moment(Number(moment(value).format('x'))).format('YYYY/MM/DD HH:mm:ss');
				}
			}

			return "<div style='text-align : center;'><span>" + val + "</span></div>";
		}

		/**
		 * 문자열에 지정된 문자 왼쪽으로 붙이기		 
		 */
		function leftPad(digit, size, attatch) {
			var add = "";
			digit = digit.toString();
			if (digit.length < size) {
				var len = size - digit.length, i;
				for (i = 0; i < len; i++) {
					add += attatch;
				}
			}
			return add + digit;
		}

		return {
			REGEXP_ENG: REGEXP_ENG,
			REGEXP_IP_AND_HOST: REGEXP_IP_AND_HOST,
			REGEXP_IP: REGEXP_IP,
			REGEXP_PORT: REGEXP_PORT,
			REGEXP_IP_PORT : REGEXP_IP_PORT,
			REGEXP_PHONE_NUMBER : REGEXP_PHONE_NUMBER,
			REGEXP_CHANNEL_ID : REGEXP_CHANNEL_ID,
			REGEXP_EMAIL: REGEXP_EMAIL,
			syncClusterData: syncClusterData,
			checkEmpty: checkEmpty,
			setPartition : setPartition,
			diffOfDate: diffOfDate,
			formatBytes: formatBytes,
			numberFormatter: numberFormatter,
			getFirstUpperCase: getFirstUpperCase,
			dateFormatter: dateFormatter,
			durationFormatter: durationFormatter,
			permissionConverter: permissionConverter,
			getIpAndPortFromUrl : getIpAndPortFromUrl,
			validateStartEndDate: validateStartEndDate,
			isEndDateLargerThanToday : isEndDateLargerThanToday,
			replaceAll: replaceAll,
			isCountSafe: isCountSafe,
			networkAlertHandler: networkAlertHandler,
			getChartColorArr : getChartColorArr,
			gridTextAlignCenterRenderer: gridTextAlignCenterRenderer,
			gridDateFormatter: gridDateFormatter,
			checkNumber: checkNumber,
			leftPad: leftPad
		};
	}
});