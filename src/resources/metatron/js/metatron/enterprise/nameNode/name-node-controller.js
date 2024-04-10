define(["app"], function(app) {
	app.controller("NameNodeCtrl", ["$rootScope", "$scope", "$http", "ConfigManager", "GridRenderer",
		function($rootScope, $scope, $http, ConfigManager, GridRenderer) {
			"use strict";

			// property
			var nameNodeCtrl = this;
			var unbind = [];
			var restUrl = ConfigManager.getConst("ENTERPRISE_URL");

            var requestTimeout = 20000;      // 지정된 시간동안 연결 안되면 cancel


			nameNodeCtrl.nameNodeListColDef = [
				{
					headerName: "NameNode",
					headerClass : "align-left",
					field: "nameNode",
					width: 150,
					editable: false
					// cellRenderer: GridRenderer.editableTextarea,
					// cellRendererParams : {
					// 	maxLength : '100',
					// 	cols : '40',
					// 	rows : '5'
					// }
				},
				{
					headerName: "State",
					field: "state",
					width: 150,
					cellStyle : textAlignFunc
				},
				{
					headerName: "Hostname",
					field: "host",
					width: 150,
					cellStyle : textAlignFunc
				},
				{
					headerName: "ID",
					field: "namenode_id",
					width: 130,
					cellStyle : textAlignFunc
				},
				{
					headerName: "Edit Count",
					field: "image_count",
					width: 100,
					cellStyle : textAlignFunc
				}
			];



			nameNodeCtrl.fsImageBackupListColDef = [
				{
					headerName : 'Name',
					headerClass : 'align-left',
					field : 'name',
					width : 200,
					cellRenderer: GridRenderer.tooltipRenderer
				},
				{
					headerName : 'Path',
					field : 'path',
					width : 180,
					cellRenderer: GridRenderer.tooltipRenderer
				},
				{
					headerName : 'TxId',
					field : 'txid',
					width : 80,
					cellStyle : textAlignFunc
				},
				{
					headerName : 'Last Modified Time',
					field : 'lastModifiedTime',
					width : 150,
					cellRenderer: GridRenderer.dateFormatter
				},
				{
					headerName : 'Size',
					field : 'size',
					width : 80,
					cellStyle : textAlignFunc
				}
			];




			// <metatron-grid-column header-text="Name" header-class="align-left" field="name" width="150" text-align="left" render="tooltipRenderer"></metatron-grid-column>
			// 	<metatron-grid-column header-text="Path" field="path" text-align="center"  width="150"  render="tooltipRenderer"></metatron-grid-column>
			// 	<metatron-grid-column header-text="TxId" field="txid"  text-align="center" width="150"></metatron-grid-column>
			// 	<metatron-grid-column header-text="Last Modified Time" field="lastModifiedTime" width="130" text-align="center" render="dateFormatter"></metatron-grid-column>
			// 	<metatron-grid-column header-text="Size" field="size" width="100" text-align="center"></metatron-grid-column>




            /**
             * NameNode List
             * 마지막 저장된 이미지의 정보
             * fsImage 정보
             */
			function getLastCheckpointStatus(){
				console.log('/hdfs/image  로 주소 변경 예정!!!!!!!!!!!!!!!!!!');
				$http.get(restUrl+'/hdfs/images', {cache : false, timeout: requestTimeout}).then(function(result){
					if (result.status == 200) {
						if(result.data.hasOwnProperty("body")) {
							var data = result.data.body;
							var keys = Object.keys(data);

							nameNodeCtrl.lastCheckImage = {};

							nameNodeCtrl.nameNodeList = [];

							var initNamenodeId = '';

							$.each(keys, function(idx){
								var key = this;

								if (idx == 0) initNamenodeId = key;

								if (data[key].is_active == true) {
									data[key].nameNode = 'Active';

									var latest_checkpoint_txid = data[key].latest_checkpoint_txid;

									$.each(data[key].images, function(){
										var image = this;
										if (image.txid == latest_checkpoint_txid) {
											nameNodeCtrl.lastCheckImage = image;
											nameNodeCtrl.lastCheckImage.host = data[key].host;
											nameNodeCtrl.lastCheckImage.namenode_id = data[key].namenode_id;
											nameNodeCtrl.lastCheckImage.lastModifiedTime = $.format.date(nameNodeCtrl.lastCheckImage.lastModifiedTime, 'yyyy/MM/dd HH:mm:ss');
										}
									});
								} else {
									data[key].nameNode = 'Standby';
								}

								data[key].state = nameNodeCtrl.nameNodeStateObj[data[key].host];

								nameNodeCtrl.nameNodeList.push(data[key]);
							});

							getEditlogListByHost(initNamenodeId);		// Edit Log

							getHdfsValidation();		// Namenode 왼쪽 테이블 정보


						}
					}
				});
			}


			/**
			 * Namenode 정보
			 * Last Seen TxId
			 * Last Checkpointed TxId
			 * Last Merged Time
			 * Status
			 */
			function getHdfsValidation(){
				nameNodeCtrl.lastCheckImage.missing = 'Missing';

				$http.get(restUrl+'/hdfs/validation' , {cache : false, timeout: requestTimeout}).then(function(result){

					console.debug('/hdfs/validation', result);

					if(result.status == 200) {
						if (result.data.body.missing == true) {
							nameNodeCtrl.lastCheckImage.missing = 'Normal';
						}

						nameNodeCtrl.lastCheckImage.latestSeenTxId = result.data.body.latestSeenTxId;
						nameNodeCtrl.lastCheckImage.latestCheckpointedTxId = result.data.body.latestCheckpointedTxId;

					}
				}, function(error){
					console.error('error',error);
					getHdfsValidation();
				});
			}




			/**
			 * FSImage Backup
			 */
			nameNodeCtrl.imageBackup = function(){
				$http.post(restUrl+'/hdfs/image/backup' ,{}).then(function(result){
					if (result.status == 202) alert('Backup Success!!');
					console.log(result);
					getFSImageBackupStatus();
				}, function(failResponse){});
			};






			/**
			 * Edit Log List
			 * 선택된 호스트에 대한 Edit Log List
			 */
			function getEditlogListByHost(initNamenodeId){
				// $http.get(restUrl+'/hdfs/journal/editlog' ,{cache : false, timeout: requestTimeout}).then(function(result){
				$http.get(restUrl+'/hdfs/editlog' ,{cache : false, timeout: requestTimeout}).then(function(result){
					console.debug("hdfs edit log : " , result);
					if(result.status == 200) {
						if(result.data.hasOwnProperty("body")) {
							// var arr = jsonToArray(result.body, 'edits');
							var arr = result.data.body[initNamenodeId];
							getEditlogListByTxId(arr.latest_seen_txid, initNamenodeId);
							// nameNodeCtrl.fsEditlogListSizes = arr.length;
							// nameNodeCtrl.fsEditlogList = arr.slice(0, 10);
						}
					} else {
						console.log(result.status);
					}
				}, function(failResponse){
					console.error(restUrl+'/hdfs/editlog',failResponse);
					getEditlogListByHost(initNamenodeId);
				});
			}


			/**
			 * Edit Log List
			 * Last Seen TxId
			 */
			function getEditlogListByTxId(txid, nnId) {
				$http.get(restUrl+'/hdfs/editlog?since='+txid ,{cache : false, timeout: requestTimeout}).then(function(result){
					console.debug('[/hdfs/editlog?since='+txid+']', result.data.body);
					if (result.status == 200) {
						nameNodeCtrl.fsEditlogList = result.data.body[nnId].edits;
						nameNodeCtrl.fsEditlogListSizes = nameNodeCtrl.fsEditlogList.length;
					}
				}, function(failResponse){
					console.error(restUrl+'/hdfs/editlog',failResponse);
				});
			}





			/**
			 * Journal Node Status List
			 since: 조회를 하고자 하는 edit log의 end_txid를 기준으로 과거 로그 조회 (default=모든 txid)
			 limit: 조회결과의 최대 결과 수 (default=10)
			 sort: txid를 기준으로 정렬 (default=내림차순:desc)
			 */
			function getJournalNodeStatus(){
				$http.get(restUrl+'/cluster/daemon' ,{cache : false, timeout: requestTimeout}).success(function(result){
					if (result.status == 200) {
						if(result.hasOwnProperty("body")) {

							nameNodeCtrl.journalNodeList = [];
							nameNodeCtrl.zookeeperList = [];

							nameNodeCtrl.nameNodeStateObj = {};

							var hdfs = result.body.hdfs;
							$.each(hdfs.daemons, function(){
								if (this.name.toLowerCase() == 'journalnode') {
									nameNodeCtrl.journalNodeList.push(this);
								}

								if (this.name.toLowerCase() == 'namenode') {
									nameNodeCtrl.nameNodeStateObj[this.host] = this.state;
								}
							});


							var zookeeper = result.body.zookeeper;
							$.each(zookeeper.daemons, function(){
								nameNodeCtrl.zookeeperList.push(this);
							});

						}
					}

					getLastCheckpointStatus();

				});
			}





			nameNodeCtrl.getEditLogList = function(row){
				getEditlogListByHost(row[0].data.namenode_id);
			};






			/**
			 * Image Backup Status
			 */
			function getFSImageBackupStatus(){
				$http.get(restUrl+'/hdfs/image/backup' ,{cache : false, timeout: requestTimeout}).then(function(successResponse){
					if (successResponse.status == 200) {
						nameNodeCtrl.fsImageBackupList = [];
						var data = successResponse.data.body;
						var keys = Object.keys(data);
						$.each(keys, function(){
							nameNodeCtrl.fsImageBackupList = $.merge(nameNodeCtrl.fsImageBackupList, data[this]);
						});
					}
				}, function(failResponse){});
			}






			function destroy() {
				unbind.forEach(function(fn) {
					fn();
				});
			}



			function addEventListener() {
				unbind = [
					$scope.$on('$destroy', destroy)
				];
			}

			function sortArray(field, reverse, primer){

				var key = primer ?
					function(x) {return primer(x[field])} :
					function(x) {return x[field]};

				reverse = !reverse ? 1 : -1;

				return function (a, b) {
					return a = key(a), b = key(b), reverse * ((a > b) - (b > a));
				}
			}

			function jsonToArray (data, dist) {
				var arr = $.map(data, function(value) {
					return [value];
				});

				var returnArr = [];
				for(var i in arr) {
					if(arr[i].hasOwnProperty(dist)) {
						for(var j in arr[i][dist]) {
							var o = arr[i][dist][j];
							if (dist =='images' && o['lastModifiedTime'])
								o['lastModifiedTime'] =  $.format.date(o['lastModifiedTime'], "yyyy.MM.dd HH:mm:ss");		// 서버에서 오는 날짜 타입 변환

							o['namenode_id'] = arr[i]['namenode_id'];
							returnArr.push(o);
						}
					}
				}
				return returnArr;
			}


			function textAlignFunc(params) {
				return {"text-align": "center" , "vertical-align":"middle"};
			}


			function initialize() {
				addEventListener();

				// getLastCheckpointStatus();
				getJournalNodeStatus();
				getFSImageBackupStatus();

				// 메뉴 레이아웃 조정
				// setTimeout(function(){
				// 	$('header').height( $('#container').height()+100 );
				// 	$('.mu-container').height( $('#container').height()+100 );
                 //    $('.ag-fresh-light .ag-root').css('border-bottom','0');
				// }, 500);




			}

			initialize();


		}]);
});