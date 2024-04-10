define([ "app", "moment" ], function(app, moment) {
	app.controller("KafkaStatusCtrl", ["$rootScope", "$scope","$interval", "DataService", "ConfigManager", "GridRenderer", "ngDialog",
	    function($rootScope, $scope, $interval, DataService, ConfigManager, GridRenderer, ngDialog) {
			"use strict";
	
			// property
			var kafkaStatusCtrl = this;
			var systemSeq = "";
			const INTERVAL_TIME = 1000 * 60;
			var interval;
			var loader = false;
			var unbind = [];

			var colorArr = ['#ff3d00','#00c853','#29c5ff','#d500f9','#e76049','#ffea00','#ffc000','#ff6600','#2979ff','#5d9cec','#888','#575757'];

			kafkaStatusCtrl.brokerAliveCount = 0;
			kafkaStatusCtrl.brokerDeadCount = 0;
			kafkaStatusCtrl.partitionActiveCount = 0;
			kafkaStatusCtrl.partitionOfflineCount = 0;
			kafkaStatusCtrl.partitionUnderCount = 0;
			kafkaStatusCtrl.underreplicatedCount = 0;
			kafkaStatusCtrl.leaderCount = 0;
			kafkaStatusCtrl.topicCount = 0;


			// event-handler

			function addEventListener() {
				unbind = [
					$scope.$on('$destroy', destroy),
					$scope.$on(ConfigManager.getEvent("CHANGE_SYSTEM_SEQ_EVENT"), onChangeSystemSeqEventHandler)
				];
			}

			function destroy() {
				unbind.forEach(function(fn) {
					$interval.cancel(interval);
					ngDialog.closeAll();
					fn();
				});
				kafkaStatusCtrl.topicMessage = null;
				kafkaStatusCtrl.underreplicatedGridData = null;
				kafkaStatusCtrl.kafkaServerStatusGridData = null;
				kafkaStatusCtrl.topicPopupGridData = null;
				kafkaStatusCtrl.topicDetailPopupData = null;
				kafkaStatusCtrl.brokerMessagesInChartData = null;
				kafkaStatusCtrl.brokerBytesInChartData = null;
				kafkaStatusCtrl.brokerBytesOutChartData = null;
				kafkaStatusCtrl.brokerChartData = null;
				kafkaStatusCtrl.topicBytesInOutChartData = null;
				kafkaStatusCtrl.networkProcessIdleChartData = null;
				kafkaStatusCtrl.topicMessagesInChartData = null;
				kafkaStatusCtrl.networkRequestChartData = null;
				kafkaStatusCtrl.serverMessagesInChartData = null;
				kafkaStatusCtrl.maxLagChartData = null;
				kafkaStatusCtrl.brokerDetailGridData = null;
				kafkaStatusCtrl.topicDetailGridData = null;
				kafkaStatusCtrl = null;
			}

			function onChangeSystemSeqEventHandler(event, data){
				systemSeq = ConfigManager.getSystemSeq();
				getData();
				createTimer();
			}


			// method

			function getData(){
                getStatusCountList();
				getKafkaServerMetricsGridList();
				// getBrokerDetailList();
				// getTopicDetailList();
				// getBrokerChartData();
				getTopicChartData();
			}


            /**
             * 상단
             */
			function getStatusCountList(){

                DataService.httpPost("/service/kafka/getStatusCountList", {}, function(result){

                    if (result.result == 1) {
                        // kafkaStatusCtrl.brokerAliveCount = result.data.brokerAliveDeadCount[0].alive;
                        // kafkaStatusCtrl.brokerDeadCount = result.data.brokerAliveDeadCount[0].dead;

                        kafkaStatusCtrl.partitionActiveCount = result.data.partitionActiveUnderLeaderCount[0].active;
                        kafkaStatusCtrl.partitionOfflineCount = result.data.partitionOfflineCount[0].offline;
                        kafkaStatusCtrl.partitionUnderCount = result.data.partitionActiveUnderLeaderCount[0].under;

                        kafkaStatusCtrl.underreplicatedCount = result.data.partitionActiveUnderLeaderCount[0].underreplicated;

                        // kafkaStatusCtrl.underreplicatedCount = result.data.underreplicatedCount[0].underreplicated;
                        // kafkaStatusCtrl.leaderCount = result.data.partitionActiveUnderLeaderCount[0].leaderCount;
                        // kafkaStatusCtrl.topicCount = result.data.topicCount[0].topic;
                    } else {
                    }
                });

				DataService.httpPost("/service/kafka/getMessagesCountByTopic", {}, function(result){
					var statsBar = ['border-coral','border-green', 'border-blue', 'border-yellow', 'border-orange', 'border-sky', 'border-dodgerblue', 'border-orangered', 'border-purple', 'border-red'];

					kafkaStatusCtrl.topicMessage = {};

					kafkaStatusCtrl.topicMessage.col = 'col-1';

					if (result.data.messagesCountByTopic && result.data.messagesCountByTopic.length > 0) {
						kafkaStatusCtrl.topicMessage = result.data.messagesCountByTopic;

                        if(result.data.messagesCountByTopic.length > 2)
						    kafkaStatusCtrl.topicMessage.col = 'col-'+result.data.messagesCountByTopic.length;
                        else
                            kafkaStatusCtrl.topicMessage.col = 'col-2';

						for (var i = 0 , j = result.data.messagesCountByTopic.length ; i < j ; i += 1){
							result.data.messagesCountByTopic[i].statsBar = statsBar[i] == null ? statsBar[i-statsBar.length] : statsBar[i];
						}

						kafkaStatusCtrl.topicMessage.list = result.data.messagesCountByTopic;
					}
				});
            }

            /**
             * Underreplicated 팝업 열기
             */
            kafkaStatusCtrl.kafkaUnderreplicatedPop = function(){

				DataService.httpPost("/service/kafka/getUnderreplicatedPopupData", {}, function(result){
					if (result.result ==1)
						kafkaStatusCtrl.underreplicatedGridData = result.data.underreplicatedPopupData;
				});

                //admin 사용자만 변경가능함.
                var popup = ngDialog.open({
                    template: "/services/kafka_underreplicated_popup_template.html",
                    className: "ngdialog-theme-default custom-width",
                    showClose: false,
                    disableAnimation: true,
                    cache: false,
                    closeByDocument: false,
                    closeByEscape: false,
                    scope: $scope
                });

            };

			/**
			 * Kafka Server Status Grid
			 */
			function getKafkaServerMetricsGridList(){
				var param = {};
				param.partition = getPartition();
				param.type = 'KAFKA_BROKER_STATE';

				DataService.httpPost("/service/kafka/getKafkaServerMetricsGridList", param, function(result){
					if (result.result ==1)
						kafkaStatusCtrl.kafkaServerStatusGridData = result.data.kafkaServerMetricsGridList;
				});
			}

            /**
             * Topic 팝업 열기
			 */
			kafkaStatusCtrl.kafkaTopicPop = function(){
				DataService.httpPost("/service/kafka/getTopicPopupData", {systemSeq : systemSeq}, function(result){
					if (result.result ==1)
						kafkaStatusCtrl.topicPopupGridData = result.data.topicPopupData;
				});

                //admin 사용자만 변경가능함.
                var popup = ngDialog.open({
                    template: "/services/kafka_topic_popup_template.html",
                    className: "ngdialog-theme-default custom-width",
                    showClose: false,
                    disableAnimation: true,
                    cache: false,
                    closeByDocument: false,
                    closeByEscape: false,
                    scope: $scope
                });
            };

            /**
             * TopicDetail 팝업 열기
             */
            kafkaStatusCtrl.kafkaTopicDetailPop = function(event){
                var param = {};
                param.systemSeq = systemSeq;
                param.topic = event.data.topic;

				DataService.httpPost("/service/kafka/getTopicDetailPopupData", param, function(result){
					if (result.result ==1)
						kafkaStatusCtrl.topicDetailPopupData = result.data.topicDetailPopupData;
				});

                //admin 사용자만 변경가능함.
                var popup = ngDialog.open({
                    template: "/services/kafka_detail_popup_template.html",
                    className: "ngdialog-theme-default custom-width",
                    showClose: false,
                    disableAnimation: true,
                    cache: false,
                    closeByDocument: false,
                    closeByEscape: false,
                    scope: $scope
                });
            };

			kafkaStatusCtrl.chartZoomOut = function(chart_id){
				let temp = zingchart.exec(chart_id, 'getseriesvalues', {});
				if (temp && temp.length > 0)
					zingchart.exec(chart_id, 'viewall');
			};

            /**
             * 팝업 닫기
             */
            kafkaStatusCtrl.closeDialog = function(){
                ngDialog.closeAll();

                kafkaStatusCtrl.topicPopupGridData = null;
                kafkaStatusCtrl.underreplicatedGridData = null;
                kafkaStatusCtrl.topicDetailPopupData = null;
            };

			/**
			 * Broker 차트 데이터
			 */
			function getBrokerChartData(){
				DataService.httpPost("/service/kafka/getBrokerChartData", {systemSeq : systemSeq}, function(result){
					var systemNameList = result.data.systemNameList;
					kafkaStatusCtrl.brokerMessagesInChartData = createChartObj('Messages In', systemNameList, result.data.brokerMessagesInList);
					kafkaStatusCtrl.brokerBytesInChartData = createChartObj('Bytes In', systemNameList, result.data.brokerBytesInList);
					kafkaStatusCtrl.brokerBytesOutChartData = createChartObj('Bytes Out', systemNameList, result.data.brokerBytesOutList);

					var graphset = {
						"layout":"3x1",
						"graphset":[
							kafkaStatusCtrl.brokerMessagesInChartData,
							kafkaStatusCtrl.brokerBytesInChartData,
							kafkaStatusCtrl.brokerBytesOutChartData
						]
					};

					kafkaStatusCtrl.brokerChartData = graphset;
				});
			}

			/**
			 * Topic 차트 데이터
			 */
			function getTopicChartData(){
				var param = {};
				param.partition = getPartition();

				DataService.httpPost("/service/kafka/getTopicChartData", param, function(result){
					var topicNameList = result.data.topicNameList;
					var systemNameList = result.data.systemNameList;
                    var networkProcessIdleDistList = result.data.networkProcessIdleDistList;
                    var networkRequestDistList = result.data.networkRequestDistList;

					kafkaStatusCtrl.topicBytesInOutChartData = createChartObj('Bytes In / Out (Topic)',['Bytes In','Bytes Out'], topicNameList, [result.data.topicBytesInList, result.data.topicBytesOutList], '(MB)');
                    kafkaStatusCtrl.networkProcessIdleChartData = createChartObj('Network Process Idle', [''], networkProcessIdleDistList, [result.data.networkProcessIdle], '');
                    kafkaStatusCtrl.topicMessagesInChartData = createChartObj('Messages In (Topic)', [''], topicNameList, [result.data.topicMessagesInList], '(MB)');
                    kafkaStatusCtrl.networkRequestChartData = createChartObj('Network Request', [''], networkRequestDistList, [result.data.networkRequest], '');
                    kafkaStatusCtrl.serverMessagesInChartData = createChartObj('Messages In (Server)', [''], systemNameList, [result.data.serverMessagesInList], '(MB)');
                    kafkaStatusCtrl.maxLagChartData = createChartObj('Max Lag', [''], systemNameList, [result.data.maxLag], '');

				});
			}

			/**
			 *
			 * @param title		: 차트 타이틀
			 * @param chartList	: 차트 종류 (ex, ['BytesIn','BytesOut'] )
			 * @param nameList	: 차트 당 Legend 리스트 (ex, ['METATRON_DATA', 'METATRON_DATA2'] )
			 * @param arrList	: 차트 리스트 (label - value)
			 * @returns
			 */
			function createChartObj(title, chartList, nameList, arrList, unit) {
				var d = new Date();
				var chartSeries = [];

				for (var i = 0 , m = arrList.length; i < m ; i += 1)
				{
					var chartObj = arrList[i];

					for (var k = 0 , n = nameList.length; k < n ; k += 1) {
						var list = chartObj[nameList[k]];
						var v = [];
						if(!list || list.length == 0)
							continue ;

						for(var j = 0 , p = list.length; j < p ; j +=1)
						{
							var vv = [];
							vv.push(list[j].insert_time);
							vv.push(list[j].value);

							v.push(vv);
						}

						var chartText = chartList[i] != '' ? chartList[i]+' - ' : '';

						var sv = {};
						sv.values = v;
						if (chartList.length > 1) {
							sv.lineColor = colorArr[i] == null ? colorArr[(i)-colorArr.length] : colorArr[i];
							sv.backgroundColor = colorArr[i] == null ? colorArr[(i)-colorArr.length] : colorArr[i];
						} else {
							sv.lineColor = colorArr[i+k] == null ? colorArr[(i+k)-colorArr.length] : colorArr[i+k];
							sv.backgroundColor = colorArr[i+k] == null ? colorArr[(i+k)-colorArr.length] : colorArr[i+k];
						}


						sv.alpha = 0.7;
						sv.lineWidth = "1px";
						sv.text= chartText + nameList[k];
						sv.tooltip = {"visible" : false};
						// sv.guideLabel = {
						// 	"text": "%t : %V",
						// 	"font-color": colorArr[i+k] == null ? colorArr[(i+k)-colorArr.length] : colorArr[i+k],
						// 	"border-color": colorArr[i+k] == null ? colorArr[(i+k)-colorArr.length] : colorArr[i+k],
						// 	"background-color" : "#fff"
						// };
						chartSeries.push(sv);
					}

				}

				var graph = {
					type: "area",
					gui:{
						contextMenu:{
							visible:false
						}
					},
					theme : 'dark',
					backgroundColor : "transparent",
					plot :{
						marker : {
							visible : false
						}
					},
					plotarea:{
						marginBottom: '25',
						marginTop: '10%',
						marginRight : 'dynamic',
						marginLeft : 'dynamic'
					},
					crosshairX : {
						shared:false,
						scaleLabel:{
							backgroundColor:"#383737",
							color:"#C0C0C0",
							borderColor:"#C0C0C0",
							"visible":true,
							"border-width":"1px"
						},
						plotLabel:{
							multiple: false,
							borderRadius:1,
							paddingRight : '15px',
							fontFamily : "Malgun Gothic",
							fontSize : 11,
							borderColor:"none",
							"thousands-separator":","
						}
					},
					scaleX : {
						placement : "default",
						step : "60000", //1분단위
						item : {
							//visible : false
							fontColor:"#fff"
						},
						guide : {
							visible:false
						},
						tick : {
							lineWidth : "1px"
						},
						transform : {
							type : "date",
							text : "%H:%i"
						}
					},
					scaleY : {
						item : {
							fontColor:"#fff",
							thousandsSeparator:","
						},
						guide : {
							visible:false
						}
						// ,label : {
						// 	text : unit,
						// 	fontColor : '#fff',
						// 	fontAngle : 0,
						// 	offsetY : -90,
                         //    offsetX : 10
						// }
					},
					title : {
						text: title,
                        offsetY : -10,
						fontSize: 15,
						fontColor: "#fff"
					},
					legend : {
						visible : false

					},
					series: chartSeries
			};

			graph["no-data"] = {
				"color": "#fff",
				"margin-top": "7%",
				"font-size": "16px",
				"background-color": "none",
				"text": "No data."
			};

				return graph;
			}

			/**
			 * Broker Detail
			 * 리스트 호출
			 */
			function getBrokerDetailList(){
				DataService.httpPost("/service/kafka/getBrokerDetailList", {systemSeq : systemSeq}, function(result){
					if (result.result == 1) {
						kafkaStatusCtrl.brokerDetailGridData = result.data.brokerDetailList;
					}
					else {
					}
				} ,true);
			}

			/**
			 * Topic Detail
			 */
			function getTopicDetailList(){
				DataService.httpPost("/service/kafka/getTopicDetailList", {systemSeq : systemSeq}, function(result){
					if (result.result == 1) {
						kafkaStatusCtrl.topicDetailGridData = result.data.topicDetailList;
					}
					else {

					}
				} ,true);
			}

			function getPartition() {

				var partition = "";
				var partition_arr = [];
				var preDate = moment(new Date());
				preDate = moment(preDate).add(-1, 'days');
				partition_arr.push("P" + moment(preDate).format('YYYYMMDD'));
				partition_arr.push("P" + moment().format('YYYYMMDD'));

				partition = partition_arr.join(",");

				return partition;
			}

			function createTimer() {
				if (interval != null) {
					$interval.cancel(interval);
					interval = null;
				}
				interval = $interval(getData, INTERVAL_TIME);
			}

			function initialize() {
				$('.mu-box-cell').attr('style','padding : 0px !important');


				addEventListener();
				getData();
				createTimer();
			}

			initialize();
	}]);
});