var _spinner = null;
var _spinnerTarget = null;
function makeSpin() {
	if (_spinner != null) return;

	var opts = {
		lines: 12, // The number of lines to draw
		length: 19, // The length of each line
		width: 10, // The line thickness
		radius: 30, // The radius of the inner circle
		corners: 1, // Corner roundness (0..1)
		rotate: 0, // The rotation offset
		direction: 1, // 1: clockwise, -1: counterclockwise
		color: '#000', // #rgb or #rrggbb or array of colors
		speed: 1, // Rounds per second
		trail: 60, // Afterglow percentage
		shadow: false, // Whether to render a shadow
		hwaccel: true, // Whether to use hardware acceleration
		className: 'spinner', // The CSS class to assign to the spinner
		zIndex: 2e9, // The z-index (defaults to 2000000000)
		top: '50%', // Top position relative to parent
		left: '50%', // Left position relative to parent
		scale: 0.5
	};

	_spinnerTarget = document.getElementById('indicator');
	_spinner = new Spinner(opts).spin(_spinnerTarget);
}

var _indicatorCount = [];
var _indicatorTime = null;
var _blockUI = null;
function showIndicator() {
	if (_indicatorCount.length == 0) {

		if (!_blockUI) {
			// _blockUI = $.blockUI({
			// 	message: null,
			// 	overlayCSS: {
			// 		opacity: 0
			// 	}
			// });
			_blockUI = $('.mu-content').block({
				message: null,
				overlayCSS: {
					opacity: 0
				}
			});
		}

		makeSpin();

		_spinner.spin(_spinnerTarget);

		_indicatorTime = setInterval(function () {
			_indicatorCount = [];
			console.log("TIMEOUT INDICATOR", _indicatorCount.length);
			hideIndicator();
		}, 90000);
	}

	_indicatorCount.push(new Date());
}

function hideIndicator() {
	clearInterval(_indicatorTime);

	_indicatorCount.pop();

	if (_indicatorCount.length != 0) {
		return;
	}

	// $.unblockUI();
    $('.mu-content').unblock();
	_blockUI = null;
	_spinner.stop(_spinnerTarget);
}

function lazyHideIndicator() {
	setTimeout(function () {
		hideIndicator();
	}, 300);
}

function sel(parentID, childID) {
	var id = "#" + parentID;
	if (childID != undefined && childID != "")
		id += " #" + childID;

	return $(id);
}

function ap($scope) {
	if ($scope.$$phase != '$apply' && $scope.$$phase != '$digest') {
		$scope.$digest();
	}
}

function camelCase(s) {
	return s.replace(/\-(\w)/g, function (i, m) {
		return m.toUpperCase();
	});
}

function camelToUnderscore(s) {
	return s.replace(/([A-Z])/g, function ($1) {
		return "_" + $1.toLowerCase();
	});
}

function objectJoin(obj, sep) {
	var arr = [], p, i = 0;
	for (p in obj)
		arr[i++] = obj[p];
	return arr.join(sep);
}

function getStyleSheetPropertyValue(selectorText, propertyName) {
	for (var s = document.styleSheets.length - 1; s >= 0; s--) {
		var cssRules = document.styleSheets[s].cssRules ||
			document.styleSheets[s].rules || [];
		for (var c = 0; c < cssRules.length; c++) {
			if (cssRules[c].selectorText === selectorText)
				return cssRules[c].style[propertyName];
		}
	}
	return null;
}

function changeObjectValue(source, target) {
	if (!source || !target) {
		return source;
	}

	for (var key in source) {
		if (!target.hasOwnProperty(key)) {
			continue;
		}

		source[key] = target[key];
	}

	return source;
}

function lowerCaseToUpperCase(list, field) {
	if (!list || list.lenght == 0) {
		return list;
	}

	for (var i = 0, l = list.length; i < l; i++) {
		var v = list[i][field];
		if (!v || v == "") {
			continue;
		}

		list[i][field] = v.toUpperCase();
	}

	return list;
}

function isParent(parentID, child) {
	var p = child.parentNode;
	if (!p || p.tagName == "BODY") {
		return false;
	}

	var ret = false;
	if (p.id == parentID) {
		ret = true;
	} else {
		ret = isParent(parentID, p);
	}

	return ret
}

function fastParseNumber(value) {
	return +value;
}

function serializeData(data) {
	if (!angular.isObject(data)) {
		return ((data == null) ? "" : data.toString());
	}

	var buffer = [];
	for (var name in data) {
		if (!data.hasOwnProperty(name)) {
			continue;
		}

		var value = data[name];
		buffer.push(encodeURIComponent(name) + "=" + encodeURIComponent((value == null) ? "" : value));
	}

	var source = buffer.join("&").replace(/%20/g, "+");
	return (source);
}

function setTheme(t) {
	$('html').removeClass('theme-LIGHT');
	$('html').removeClass('theme-DARK');
	$('html').addClass('theme-' + t);

	//배경이 흰색으로 먼저 바껴서..
	var container = angular.element(document.getElementsByClassName("mu-container"));
	if (t == 'LIGHT') {
		$('body').css("color", "#000");
	} else {
		$('body').css("color", "#9da2a6");
	}
}

function removePopup() {
	var alarm = angular.element(document.getElementById("alarmDiv"));
	alarm.remove();

	var render = angular.element(document.getElementsByClassName("mu-render"));
	render.remove();
}