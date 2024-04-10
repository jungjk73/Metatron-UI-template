define([], function () {
	return function ($rootScope, $timeout, WindowReloadDetect, ConfigManager) {
		"use strict";

		// property
		var worker = new Worker("/resources/js/metatron/common/worker/websocket-worker.js");
		worker.onmessage = function (e) {
			var data = e.data;
			console.debug("onMessage Socket Result : " , e.data);
			if (data == null)
				return;

			var l = data.length;
			for (var i = 0; i < l; i++) {
				var resultEventName = "WEBSOCKET_DATA_RECEIVE_EVENT";
				if (data[i].hasOwnProperty("resultEvent") && data[i].resultEvent != null)
					resultEventName = data[i].resultEvent;

				$rootScope.$broadcast(ConfigManager.getEvent(resultEventName), data[i]);
			}
		};


		// function
		function initialize() {
			// socket 연결
			worker.postMessage({
				operation: "connect",
				url: ConfigManager.getConst("SOCKET_URL")
			});

			// 새로고침 시, socket close
			WindowReloadDetect.addOperation(closeSocket);
		}

		// 2016/03/17 rhcpn
		// Browser가 refresh 된 시점에 아래의 함수가 실행 된다. 하지만 실제로는 동작 하지 않는데,
		// Web-Worker로 직접 명령을 보낼 수 없기 때문에 메세지를 전송해야하는데 Worker에 메세지가
		// 도달 되기 전에 화면 refresh가 완료 되기 때문이다. 따라서 WebSocket을 Worker에 올려서 사용
		// 해야 하는 경우에는 WebSocket-Server 쪽에서 가급적 클라이언트 소켓에 대한 관리를 신경 써줘야
		// 한다.
		function closeSocket() {
			worker.postMessage({
				operation: "close"
			});
		}

		function request(parameter) {
			if (parameter == null) {
				log.error("Parameter is Empty");
				return;
			}

			var req = [];
			if (!Array.isArray(parameter)) {
				req.push(parameter);
			} else {
				req = parameter;
			}

			worker.postMessage({
				operation: 'send',
				data: JSON.stringify(req)
			});
		}

		function reconnect(interval) {
			worker.postMessage({
				operation: 'reconnect',
				data: interval
			});
		}

		function reconnectToNewURL(url) {
			closeSocket();
			worker.postMessage({
				operation: "connect",
				url: url
			});
		}

		initialize();

		return {
			callRequest: function (parameter) {
				request(parameter);
			},
			reconnect: function (interval) {
				reconnect(interval);
			},
			reconnectToNewURL : function(url){
				reconnectToNewURL(url);
			}
		};
	};
});