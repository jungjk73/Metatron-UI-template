var StompClient = (function (url) {
	'use strict';

	self.importScripts("/resources/js/lib/stomp/stomp.js");

	// constant
	var RECEIVE_TIMER_CYCLE = 1000;
	var RECEIVE_SPLIT_NUM = 1000;

	// property
	var _client = null;
	var _rTimer = null;
	var _receiveData = [];
	var _receiveTotal = 0;

	var _url = url;

	// method
	function connect() {
		close();
		try {
			// 객체 생성
			_client = Stomp.client(_url);

			// heartbeat 설정(둘 다 0일경우 disable)
			_client.heartbeat.outgoing = 0;
			_client.heartbeat.incoming = 0;

			// 연결
			_client.connect({}, connectResultHandler, errorResultHandler);
		} catch (e) {
			console.error(e);
		}
	}


	// function
	function close(callback) {
		if (!_client) {
			return;
		}

		if (callback == null || callback == true) {
			_client.disconnect(closeResultHandler);
		} else {
			_client.disconnect();
		}
		_client = null;
	}

	function receiveDataHandler() {
		if (_client && _client.ws.readyState == 1) {
			clearInterval(_rTimer);
			_rTimer = null;
		}

		if (_receiveData == null || _receiveData.length == 0)
			return;

		var raw = _receiveData;
		if (_receiveTotal > RECEIVE_SPLIT_NUM)
			raw = _receiveData.splice(0, RECEIVE_SPLIT_NUM);

		var d = JSON.parse(raw.join(""));
		self.postMessage(d);
	}

	function connectResultHandler() {
		console.debug("MQ: Open");

		// listener 설정
		_client.subscribe("/topic/alarmSummaryTopic", subscribeResultHandler, {});

		// receive timer
		if (_rTimer == null) {
			_rTimer = setInterval(receiveDataHandler, RECEIVE_TIMER_CYCLE);
		}
	}

	function errorResultHandler(event) {
		// console.debug("MQ: Failed to connection", event);
		closeResultHandler();
	}

	function closeResultHandler(event) {
		// console.debug("MQ: Closed to connection", url, event);
		close(false);
		setTimeout(connect, 5000);
	}

	function subscribeResultHandler(message) {
		//console.debug("MQ: Received Data", message);

		_receiveTotal++;
		var r = message.body;
		_receiveData.push(r);

		if (_receiveTotal < RECEIVE_SPLIT_NUM) {
			var d = JSON.parse(_receiveData.join(""));
			_receiveData = [];
			_receiveTotal = 0;
			self.postMessage(d);
		}
	}

	this.$get = function () {
		return {
			addOperation: addOperation
		};
	};

	return {
		connect: connect,
		close: close
	};
});

// Web-Worker 용 Interface
var _client = null;
self.addEventListener("message", function (e) {
	var d = e.data;
	switch (d.operation) {
		case "connect":
			_client = new StompClient(d.url);
			_client.connect();
			break;
		case "close":
			_client.close();
			break;
	}
}); 