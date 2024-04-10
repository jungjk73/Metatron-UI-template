var Socket = (function (url) {
	'use strict';

	/**
	 * Websocket API ReadyState
	 * @type {string}
	 * Value	State	Description
	 *	0		UNSENT	Client has been created. open() not called yet.
	 *	1		OPENED	open() has been called.
	 *	2		HEADERS_RECEIVED	send() has been called, and headers and status are available.
	 *	3		LOADING	Downloading; responseText holds partial data.
	 *	4		DONE	The operation is complete.
	 */

		// constant
	var START_CHAR = "response_start";
	var END_CHAR = "response_end";
	var SEND_TIMER_CYCLE = 200;
	var RECEIVE_TIMER_CYCLE = 1000;
	var RECEIVE_SPLIT_NUM = 1000;

	var SOCKET_CLOSE_TIME = (1000 * 5);
	var SOCKET_USED_FLAG = false;
	var SOCKET_CONNECTING = false;

	// property
	var _socket = null;
	var _sTimer = null;
	var _sendData = [];
	var _rTimer = null;
	var _receiveData = [];
	var _receiveTotal = 0;

	var _url = url;

	// method
	var clast;
	function connect() {

		// henry 웹소켓 내재화 20220124
		var _host = location.hostname + ":" + location.port;
		_url = "ws://"+ _host +"/metatron/websocket";

		if(SOCKET_CONNECTING)
			return;

		// 연결 전 소켓 close
		close();

		try {
			_socket = new WebSocket(_url);
			SOCKET_CONNECTING = true;
		} catch (e) {
			console.error(e);
		}

		_socket.onopen = function () {
			console.debug("WebSocket: Open [URL : "+_url+"]");
			SOCKET_CONNECTING = false;

			// send timer
			if (_sTimer == null && _sendData && _sendData.length > 0) {
				_sTimer = setInterval(function () {
					if(_socket == null) {
						clearInterval(_sTimer);
						_sTimer = null;
						connect();
						return;
					}

					if (_socket.readyState == 1) {
						clearInterval(_sTimer);
						_sTimer = null;
						send();
					}
				}, SEND_TIMER_CYCLE);
			}

			// receive timer
			if (_rTimer == null) {
				_rTimer = setInterval(receiveDataHandler, RECEIVE_TIMER_CYCLE);
			}

			// connect 후 5초 동안 요청이 없으면 socket close
			// Chrome DEVtool의 Network탭에서 확인시 5.02초간 Pending 상태로 대기 후 close.
			SOCKET_USED_FLAG = false;
			setTimeout(function() {
				console.debug("------------------socket used;", SOCKET_USED_FLAG);
				if(SOCKET_USED_FLAG)
					return;

				close();
			}, SOCKET_CLOSE_TIME);
		};

		_socket.onerror = function (event) {
			console.debug("WebSocket: Failed", event);
			reconnect();
		};

		_socket.onclose = function (event) {
			console.debug("WebSocket: Closed [URL : "+_url+"]", _url, event);
		};

		_socket.onmessage = function (message) {
			//console.debug("WebSocket: Received Data", message);
			var r = message.data;
			_receiveData.push(r);

			if (r != START_CHAR && r != END_CHAR)
				_receiveTotal++;

			if (r == END_CHAR) {
				if (_receiveTotal < RECEIVE_SPLIT_NUM) {
					var d = parser(_receiveData.join(""));
					_receiveData = [];
					_receiveTotal = 0;
					self.postMessage(d);
				}
			}
		};
	}


	// function
	var last;
	function close() {
		if (_socket == null || (_socket.readyState > 1 && _socket.readyState != 3)) {
			return;
		}

		console.debug("WebSocket: Close [URL : " + _url + ", State : " + _socket.readyState + ", Connection Flag : " + SOCKET_CONNECTING + "]");
		SOCKET_CONNECTING = false;
		_socket.close();
		if (_socket != null) {
			_socket.onopen = null;
			_socket.onerror = null;
			_socket.onclose = null;
			_socket.onmessage = null;
		}
		_socket = null;
		_receiveData = [];
		_receiveTotal = 0;
	}

	function send(data) {
		if (data != null)
			_sendData.push(data);

		if (!_socket || _socket.readyState != 1) {
			connect();
		} else {
			console.debug("WebSocket: Send Data [URL : "+_url+"] ", data);
			let d;
			SOCKET_USED_FLAG = true;
			while (d = _sendData.shift()) {
				_socket.send(d);
			}
		}
	}

	function parser(data) {

		var start = data.indexOf(START_CHAR) + START_CHAR.length;
		if (start > -1) {
			data = data.substring(start, data.length);
		}
		var end = data.indexOf(END_CHAR);
		if (end > -1) {
			data = data.substring(0, end);
		}

		if (data == null || data == "")
			return;

		return JSON.parse(data);
	}

	function receiveDataHandler() {
		if (_socket && _socket.readyState == 1) {
			clearInterval(_rTimer);
			_rTimer = null;
		}

		if (_receiveData == null || _receiveData.length == 0)
			return;

		var raw = _receiveData;
		if (_receiveTotal > RECEIVE_SPLIT_NUM)
			raw = _receiveData.splice(0, RECEIVE_SPLIT_NUM);

		var d = parser(raw.join(""));
		self.postMessage(d);
	}

	function reconnect(interval) {
		console.debug("WebSocket: Reconnect-------------------------------------------------------------");

		if(interval == null)
			interval = 3000;

		close();
		setTimeout(connect, interval);
	}

	this.$get = function () {
		return {
			addOperation: addOperation
		};
	};

	return {
		connect: connect,
		send: send,
		close: close,
		reconnect: reconnect
	};
});

// Web-Worker 용 Interface
var _socket = null;
self.addEventListener("message", function (e) {
	var d = e.data;
	switch (d.operation) {
		case "connect":
			console.debug("WebSocket: Connect [URL : "+d.url+"]");
			_socket = new Socket(d.url);
			_socket.connect();
			break;
		case "send":
			_socket.send(d.data);
			break;
		case "close":
			_socket.close();
			break;
		case "reconnect":
			_socket.reconnect(d.data);
			break;
	}
}); 