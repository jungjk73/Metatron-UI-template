(function () {
	var hostname = location.hostname;
	if (hostname == "localhost" || hostname == "~호스트IP") {
		return;
	}

	try {
		window.console.log = function () {
			return false;
		}
		window.console.info = function () {
			return false;
		}
		window.console.debug = function () {
			return true;
		}
		window.console.warning = function () {
			return false;
		}
		window.console.error = function () {
			return true;
		}
	} catch (e) {
	}
})();