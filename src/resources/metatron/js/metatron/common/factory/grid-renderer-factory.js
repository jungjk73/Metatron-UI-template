define(["moment"], function (moment) {
	return function ($filter, $rootScope, ConfigManager, CommonUtil) {
		"use strict";

		function severityCircleFormatter(params) {
			var row = params.data;

			if (row == null)
				return "";

			var s = row.severity.toUpperCase();
			if (s == 'CR') {
				return "<span class=\"mu-icon circle txt-red\"></span>";
			} else if (s == 'MJ') {
				return "<span class=\"mu-icon circle txt-orangered\"></span>";
			} else if (s == 'MN') {
				return "<span class=\"mu-icon circle txt-yellow\"></span>";
			} else {
				return "<span class=\"mu-icon circle txt-green\"></span>";
			}
		}

		function severityFormatter(params) {
			var row = params.data;
			if (row == null)
				return "";

			var smap = ConfigManager.getSeverity();
			var color = "green";
			var s = row.severity.toUpperCase();
			if (s == 'CR')
				color = "red";
			else if (s == 'MJ')
				color = "orangered";
			else if (s == 'MN')
				color = "orange";

			var basicStyle = "width:55px;position:relative;top:-6px;cursor: default;pointer-events: none;";

			return '<div class="mu-btn mu-btn-icon mu-btn-color bg-' + color + '" style="' + basicStyle + '">' + smap[s] + '</div>';
		}

		function addButtonRenderer(params) {
			var eDiv = document.createElement('div');
			$(eDiv).css("height", "37px");
			$(eDiv).css("margin-top", "-6px");
			eDiv.innerHTML = '<button class="mu-btn mu-btn-icon"><i class="mu-icon add"></i></button>';
			return eDiv;
		}

		function deleteButtonRenderer(params) {
			var eDiv = document.createElement('div');
			$(eDiv).css("height", "37px");
			$(eDiv).css("margin-top", "-6px");
			eDiv.innerHTML = '<button class="mu-btn mu-btn-icon mu-icon-del"><i class="mu-icon del"></i></button>';
			var eButton = eDiv.querySelectorAll('.mu-btn')[0];
			eButton.addEventListener('click', function () {
				$rootScope.$broadcast(ConfigManager.getEvent("GRID_DELETE_BTN_EVENT"), params.data);
			});
			return eDiv;
		}


		function editButtonRenderer(params) {
			var eDiv = document.createElement('div');
			$(eDiv).css("height", "37px");
			$(eDiv).css("margin-top", "-6px");
			eDiv.innerHTML = '<button class="mu-btn mu-btn-icon mu-icon-edit"><i class="mu-icon edit"></i></button>';
			var eButton = eDiv.querySelectorAll('.mu-btn')[0];
			eButton.addEventListener('click', function () {
				params.data.editMode = !params.data.editMode;
				$rootScope.$broadcast(ConfigManager.getEvent("GRID_EDIT_BTN_EVENT"), params);
			});
			return eDiv;
		}

		/* HDFS Service Config Delete Button */
		function deleteButtonSvcRenderer(params) {
			if(params.data.useType != 'N') return '';
			var eDiv = document.createElement('div');
			$(eDiv).css("height", "37px");
			$(eDiv).css("margin-top", "-6px");
			eDiv.innerHTML = '<button class="mu-btn mu-btn-icon mu-icon-del"><i class="mu-icon del"></i></button>';
			var eButton = eDiv.querySelectorAll('.mu-btn')[0];
			eButton.addEventListener('click', function () {
				$rootScope.$broadcast(ConfigManager.getEvent("GRID_DELETE_BTN_SVC_EVENT"), params.data);
			});
			return eDiv;
		}

		/* HDFS Service Config Update Button */
		function editButtonSvcRenderer(params) {
			if(params.data.useType != 'N') return '';
			var eDiv = document.createElement('div');
			$(eDiv).css("height", "37px");
			$(eDiv).css("margin-top", "-6px");
			eDiv.innerHTML = '<button class="mu-btn mu-btn-icon mu-icon-edit"><i class="mu-icon edit"></i></button>';
			var eButton = eDiv.querySelectorAll('.mu-btn')[0];
			eButton.addEventListener('click', function () {			
				$rootScope.$broadcast(ConfigManager.getEvent("GRID_EDIT_BTN_SVC_EVENT"), params.data);
			});
			return eDiv;
		}

		// Resource Manager 에서 사용하는 Delete Button
		function deleteButtonRenderer_RM(params) {
			var col = params.colDef.field;
			var val = params.data[col];

			if (val == 'root.default') return "<span> </span>";		// root.default 는 삭제 안

			var eDiv = document.createElement('div');
			$(eDiv).css("height", "37px");
			$(eDiv).css("margin-top", "-6px");
			eDiv.innerHTML = '<button type="button" class="mu-btn mu-btn-icon mu-btn-color bg-red ml15" style="height:20px; margin-top:3px; padding:0 5px; line-height:20px;"><i class="mu-icon del"></i></button>';
			var eButton = eDiv.querySelectorAll('.mu-btn')[0];
			eButton.addEventListener('click', function () {
				$rootScope.$broadcast(ConfigManager.getEvent("GRID_DELETE_BTN_EVENT"), params.data);
			});
			return eDiv;
		}

		// Report 에서 사용하는 Delete Button
		function deleteButtonRenderer_RP(params) {
			var eDiv = document.createElement('div');
			$(eDiv).css("height", "37px");
			$(eDiv).css("margin-top", "-6px");
			eDiv.innerHTML = '<button class="mu-btn mu-btn-icon mu-icon-del"><i class="mu-icon del"></i></button>';
			var eButton = eDiv.querySelectorAll('.mu-btn')[0];
			eButton.addEventListener('click', function () {
				$rootScope.$broadcast(ConfigManager.getEvent("GRID_REPORT_DELETE_BTN_EVENT"), params.data);
				return false;
			});
			return eDiv;
		}


		function reportSettingButtonRenderer(params) {
			var eDiv = document.createElement('div');
			$(eDiv).css("height", "37px");
			$(eDiv).css("margin-top", "-6px");
			eDiv.innerHTML = '<button class="mu-btn mu-btn-icon mu-icon-setting"><i class="mu-icon setting"></i></button>';
			var eButton = eDiv.querySelectorAll('.mu-btn')[0];
			eButton.addEventListener('click', function () {
				params.data.targetEvent = params.colDef.field;
				$rootScope.$broadcast(ConfigManager.getEvent("GRID_SETTING_BTN_EVENT"), params.data);
			});
			return eDiv;
		}

		function numberFormatter(params) {
			var eCell = document.createElement('span');
			var number;
			if (!params.value || !isFinite(params.value)) {
				number = '0';
			} else {
				number = $filter('number')(params.value);
			}
			eCell.innerHTML = number;
			return eCell;
		}

		// 숫자는 number filter 적용, 문자는 그대로 출력
		function numberStringFormatter(params) {
			var eCell = document.createElement('span');
			var str;

			if(params.value === undefined) {
				str = '';
			} else {
				str = (!params.value || !isFinite(params.value)) ? params.value : $filter('number')(params.value);
			}
			
			eCell.innerHTML = str;
			return eCell;
		}

		function diskAllRenderer(params) {
			var value = params.value;
			if (value == undefined)
				value = 0;

			value = Math.floor(value);
			if (isNaN(value))
				value = 0;

			//if (value == "0") {
			//	value = "";
			//} else {
			value = value + "%";
			//}
			return '<div class="beaker"><span style="height:' + value + ';"><i>' + value + '</i></span><span></span></div>'
		}

		function tooltipRenderer(params) {
			if (params == null || params.data == null)
				return '';

			var col = params.column.colId;
			var val = params.data[col];
			val = (val == null) ? "" : val;
			return "<span title='" + val + "' class='title'>" + val + "</span>";
		}

		function gridCellSwitchRenderer(params) {
			if (params == null || params.data == null)
				return '';
			var col = params.column.colId;
			var val = params.data[col];
			val = (val == null) ? "" : val;
			return "<div class='ti_ico_switch'>" + val + "</div>";

		}

		function cellClickRenderer(params) {

			var eDiv = document.createElement('div');
			if (params.value != '') {
				eDiv.innerHTML = '<button class="btn-simple bg-blue" style="color : #fff">' + params.value + '</button>';
				var eButton = eDiv.querySelectorAll('.btn-simple')[0];
				eButton.addEventListener('click', function () {
					$rootScope.$broadcast(ConfigManager.getEvent("GRID_CELL_CLICK_EVENT"), params.data);
				});
			}

			return eDiv;
		}

		var entityMap = {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#x2F;', '`': '&#x60;', '=': '&#x3D;'}; 
		function escapeHtml (string) { 
			return String(string).replace(/[&<>"'`=\/]/g, function (s) { 
				return entityMap[s]; 
			}); 
		}		
	

		function retentionHistoryClickRenderer(params) {
			if(params == null || params.data == null) 
				return '';
			
			var col = params.column.colId;
			var val = params.data[col];	
			var eDiv = document.createElement('div');
			$(eDiv).css("height", "37px");		

			var cellContent = '';
			if(val !== null && val !=='') {			
				var title = val.split('@@');		
				var cmdResultMessageStr = params.data.cmdResultMessageStr.split('@@');
				var cmdSeqStr = params.data.cmdSeqStr.split('@@');
				var data = {
					jobId: params.data.jobId,
					jobSeq: params.data.jobSeq,
					cmdSeq: ''
				}						

				var id = 'reteintion-history-title-'+params.rowIndex;
				for(var i=0; i<title.length;i++) {					
					
					eDiv.innerHTML += "<div id='" + id + "' style='cursor:pointer'>" + escapeHtml(title[i]) + "</div>";				 
				}
			
				var eButtons = eDiv.querySelectorAll('#'+id);				
				_.forEach(eButtons, function(eButton, index){					
					eButton.addEventListener('click', function () {							
						data.cmdSeq = cmdSeqStr[index];				
						$rootScope.$broadcast(ConfigManager.getEvent("RETENTION_GRID_CELL_CLICK_EVENT"), data);					
					});
				});
			}
			return eDiv;
		}


		function retentionTooltipRenderer(params) {
			if(params == null || params.data == null) 
				return '';

			var col = params.column.colId;
			var val = params.data[col];	


			var cellContent = '';
			if(val !== null && val !=='') {			
				var title = val.split('@@');

				if(col == 'retentionPeriodCmdStr' && params.data.retentionPeriodPatternStr !== null) {
					title = params.data.retentionPeriodPatternStr.split('@@');
				}
				
				var titleClass = (col == 'inputCmdStr' || col == 'execCmdStr') ? 'retention-query-grid-title' : 'grid-title';				

				for(var i=0; i<title.length;i++) {
					cellContent += "<span title='" + escapeHtml(title[i]) + "' class='" + titleClass + "'>" + escapeHtml(title[i]) + "</span>";
					if(i < title.length)
						cellContent += '</br>'
				}
			}
			return cellContent;
		}


		function retentionJobNametooltipRenderer(params) {
			if(params == null || params.data == null) 
				return '';

			var col = params.column.colId;
			var val = params.data[col];	

			var title = val + '</br>Job ID: ' + params.data.jobId;

			var cellContent = "<span title='" + val + "' class='grid-title'>" + title + "</span>";
			
			return cellContent;
		}

		function cellClickRendererWithIcon(params) {

			var eDiv = document.createElement('div');
			if (params.value != '') {
				eDiv.innerHTML = '<button class="mu-btn mu-btn-icon" style="color : #fff"><i class="mu-icon search"></i></button>';
				var eButton = eDiv.querySelectorAll('.mu-btn')[0];
				eButton.addEventListener('click', function () {
					$rootScope.$broadcast(ConfigManager.getEvent("GRID_CELL_CLICK_EVENT"), params.data);
				});
			}

			return eDiv;
		}

		function dateFormatter(param) {
			return CommonUtil.dateFormatter(param.value);
		}

		function editableSelectBox(params) {
			var arr = ["Y", "N"];
			return getGridComboboxCode(params, arr);
		}

		function getOffset(el) {
			el = el.getBoundingClientRect();
			return {
				left: el.left + window.scrollX,
				top: el.top + window.scrollY
			}
		}

		function editableNumberinputBox(params) {
			var eDiv = document.createElement('div');
			$(eDiv).css("margin-top", "-5px");

			var textinput = document.createElement('input');
			$(textinput).val(params.value);
			$(textinput).css("height", "27px");
			$(textinput).css("text-align", "center");
			$(textinput).attr("type", "number");
			$(textinput).attr("min", "0");
			$(textinput).addClass('spinner-hide');

			$(textinput).on('change', function (event) {
				var field = params.colDef.field;
				params.node.data[field] = textinput.value;
				params.api.refreshView();
			});

			eDiv.appendChild(textinput);
			return eDiv;
		}

		function editableTextinputBox(params) {
			var eDiv = document.createElement('div');
			$(eDiv).css("margin-top", "-5px");

			var textinput = document.createElement('input');
			$(textinput).val(params.value);
			$(textinput).css("height", "27px");
			$(textinput).css("text-align", "center");
			$(textinput).attr("maxLength", "5");

			$(textinput).on('change', function (event) {
				var field = params.colDef.field;
				params.node.data[field] = textinput.value;
				params.api.refreshView();
			});

			eDiv.appendChild(textinput);
			return eDiv;
		}

		function editableTextinputBoxBasic(params) {
			var eDiv = document.createElement('div');
			$(eDiv).css("margin-top", "-5px");

			var textinput = document.createElement('input');
			$(textinput).val(params.value);
			$(textinput).css("height", "27px");
			$(textinput).css("text-align", "left");			

			$(textinput).on('change', function (event) {
				var field = params.colDef.field;
				params.node.data[field] = textinput.value;
				params.api.refreshView();
			});

			eDiv.appendChild(textinput);
			return eDiv;
		}

		/**
		 * editable 은 false 로 해야함
		 cellRenderer : GridRenderer.editableTextarea
		 cellRendererParams : {
                    maxLength : '100',
                    cols : '40',
                    rows : '5'
                }

		 * cellRendererParams 는 option
		 */
		function editableTextarea(params) {
			var eDiv = document.createElement('div');
			eDiv.innerHTML = '<span>' + params.value + '</span>';

			// 더블클릭하면 textarea
			$(eDiv).on('dblclick', function (event) {
				var taDiv = document.createElement('div');
				$(taDiv).addClass('cell-textarea-div');
				var top = $(event.target).offset().top - 10;
				var left = $(event.target).offset().left - 10;

				$(taDiv).css('position', 'fixed');
				$(taDiv).offset({top: top});
				$(taDiv).offset({left: left});

				var textarea = document.createElement('textarea');
				$(textarea).addClass('cell-textarea');
				textarea.maxLength = params.colDef.cellRendererParams && params.colDef.cellRendererParams.maxLength ? params.colDef.cellRendererParams.maxLength : "200";
				textarea.cols = params.colDef.cellRendererParams && params.colDef.cellRendererParams.cols ? params.colDef.cellRendererParams.cols : "60";
				textarea.rows = params.colDef.cellRendererParams && params.colDef.cellRendererParams.rows ? params.colDef.cellRendererParams.rows : "10";
				textarea.value = params.value.toString();

				// 그리드 모델 값 refresh, textarea 삭제
				$(document).on('click', function (event) {
					if (event.target.className != 'cell-textarea') {
						var field = params.colDef.field;
						params.node.data[field] = textarea.value;
						params.api.refreshView();
						$(document).find('.cell-textarea-div').remove();
						$(document).off();
					}
				});
				var gridBody = angular.element(document.getElementsByClassName("ag-body-viewport"));
				$(gridBody).scroll(function () {
					$(document).find('.cell-textarea-div').remove();
					$(document).off();
				});

				$(taDiv).append($(textarea));
				$(event.target).parent().parent().parent().parent().append(taDiv);
			});

			return eDiv;
		}

		function alarmStatusFormatter(params) {
			var row = params.data;

			if (row == null)
				return "";

			var s = row.status.toUpperCase();
			if (s == "O") {
				return "Occured";
			} else if (s == "C") {
				d;
				return "Clear";
			} else if (s == "A") {
				return "Acknowledge";
			} else if (s == "D") {
				return "Delete";
			} else {
				return row.status;
			}
		}


		function principalRenderer(params) {
			var eDiv = document.createElement('div');

			var col = params.colDef.field;
			var val = params.data[col];


			if (val == null || val == '') {
				val = 'Add Principal';
				$(eDiv).on('click', function () {
					$rootScope.$broadcast(ConfigManager.getEvent("ADD_PRINCIPAL_EVENT"), params.data);
				});
			} else {
				$(eDiv).on('click', function () {
					$rootScope.$broadcast(ConfigManager.getEvent("EDIT_PRINCIPAL_EVENT"), params.data);
				});
			}


			eDiv.innerHTML = '<span style="cursor : pointer" class="txt-blue">' + val + '</span>';

			return eDiv;
		}

		function hyphenRenderer(param) {
			var val = param.value;
			if (val == null || val == "")
				return "-";
			else
				// return val;
				return "<span title='" + val + "' class='title'>" + val + "</span>";
		}

		function jobStatusRenderer(param) {
			var val = param.value;
			if (val == "KILLED")
				return '<i class="mu-icon circle txt-red"></i>';
			else if (val == "ACCEPTED" || val == "RUNNING" || val == "FAILED")
				return '<i class="mu-icon circle txt-blue"></i>';
			else
				return '<i class="mu-icon circle txt-green"></i>';
		}

		function jobActionRenderer(params) {
			var row = params.data;
			if (row == null)
				return "";

			var s = row.state.toUpperCase();
			if (s == "RUNNING" || s == "SUBMITTED" || s == "ACCEPTED") {
				return '<button type="button" class="mu-btn mu-btn-xs mu-btn-color bg-red">Kill</button>';
			} else {
				return '<button type="button" class="mu-btn mu-btn-xs mu-btn-color bg-blue">Retry</button>';
			}
		}

		function durationFormatter(param) {
			return CommonUtil.durationFormatter(param.value);
		}

		function HpercentBarFormatter(params) {
			var value = params.value;
			if (!value)
				value = 0;

			value = Number(value).toFixed(2);
			var str = "<div class=\"ti_usage\"><div class=\"ti_us_bar ti_Grgre\" style=\"width:"
				+ value + "%\"></div><p>" + value + "%</p></div>";
			return str;
		}

		function permissionFormatter(params) {
			var row = params.data;
			if (row == null)
				return "";

			var str = "";
			if (row.type == "FILE")
				str = "-";
			else
				str = "d";

			str = str + CommonUtil.permissionConverter(params.value);

			return str;
		}

		function percentRender(params) {

			var textAlign = "left";
			if (params.colDef.field == params.data.sDate)
				textAlign = "right";

			var str = [];
			if (params.value != '0%') {
				str.push('<div style="width: 100%; height: 100%; border-right: 1px solid #ddd; text-align: ' + textAlign + '">');
				str.push('	<span style="display: inline-block; height: 10px; background-color: #00c853; color: #555; vertical-align: middle; width:' + params.value + '"></span>');
				str.push('</div>');
			} else {
				str.push('<div style="width: 100%; height: 100%; border-right: 1px solid #ddd;"></div>');
			}

			var div = $(params.eGridCell);
			div.css("padding-left", "0px");
			div.css("padding-right", "0px");

			return str.join('');
		}

		function fileDirectoryRenderer(params) {
			var row = params.data;
			if (row == null)
				return "";

			var type = row.type;
			if (type == "FILE")
				return '<a style="cursor:pointer;color:#428bca;text-decoration:none;background:transparent;">' + params.value + '</a>';
			else
				return params.value;
		}

		function unitRenderer(params) {
			var row = params.data;
			if (row == null)
				return "";

			var unit = (row.unit == null || row.unit == "") ? "" : row.unit;

			if (isNaN(params.value) == false)
				params.value = $filter('number')(params.value);

			return params.value + unit;
		}

		function plainTextRenderer(params) {
			var val = params.value;
			if (val == null)
				return "";

			return `<p title="${params.value}">${params.value}</p>`;
		}

		function smsSelectTypeRenderer(params) {
			var arr = ["All", "SMS", "Email"];
			return getGridComboboxCode(params, arr);
		}

		function getGridComboboxCode(params, arr) {
			var eDiv = document.createElement('div');
			$(eDiv).css("margin-top", "-5px");
			$(eDiv).addClass("mu-selectbox");

			var button = document.createElement('button');
			$(button).addClass("mu-value");
			$(button).css("min-width", "70px");
			button.innerText = (params.value == null) ? arr[0] : params.value;
			eDiv.appendChild(button);

			let removeList = function () {
				$(document).find('.mu-render').remove();
				$(document).off();
			};
			$(eDiv).on('click', function (event) {

				removeList();
				var obj = getOffset(eDiv);
				var scrollTop = $(window).scrollTop();
				var scrollLeft = $(window).scrollLeft();

				var taDiv = document.createElement('div');
				$(taDiv).css('position', 'fixed');
				$(taDiv).offset({top: obj.top + 28 - scrollTop});
				$(taDiv).offset({left: obj.left - scrollLeft});
				$(taDiv).addClass("mu-render");
				$(taDiv).css("min-width", "70px");
				$(taDiv).css("z-index", "99");

				var ul = document.createElement('ul');
				$(ul).addClass("mu-list");

				for (var i in arr) {
					var li = document.createElement('li');
					$(li).css("background-color", "#fff");
					$(li).val = arr[i];
					li.innerText = arr[i];

					var field = params.colDef.field;
					$(li).on('click', function (event) {
						var li_value = event.target.innerText;
						params.node.data[field] = li_value;
						params.api.refreshView();
						removeList();
					});
					ul.appendChild(li);
				}

				taDiv.appendChild(ul);
				$(event.target).parent().parent().parent().parent().append(taDiv);
			});


			var gridBody = angular.element(document.getElementsByClassName("ag-body-viewport"));
			$(gridBody).scroll(removeList);
			$(window).scroll(removeList);

			return eDiv;
		}

		function hdfsStatusRenderer(params) {
			var row = params.data;
			if (row == null)
				return "";

			var status = row.system_status;
			if (status == 'Dead') {
				return '<span class="txt-red" title="' + row.system_ip + '">' + params.value + '</span>';
			} else {
				return '<span title="' + row.system_ip + '">' + params.value + '</span>';
			}
		}

		function yarnStatusRenderer(params) {
			var row = params.data;
			if (row == null)
				return "";

			var status = row.processStatus;
			if (status == 'Dead') {
				return '<span class="txt-red" title="' + row.systemIp + '">' + params.value + '</span>';
			} else {
				return '<span title="' + row.systemIp + '">' + params.value + '</span>';
			}
		}

		function txtRedRenderer(params) {
			return '<span class="txt-red">' + params.value + '</span>';
		}

		function smsSelectTypeLabelRenderer(params) {
			var row = params.data;
			if (row == null)
				return "";

			var selectType = row.selectType;
			if (selectType == null) {
				return "All";
			} else {
				return selectType;
			}
		}

		function unitTransToTB(params) {
			let bytes = params.value;

			if (angular.isString(bytes)) {
				bytes = bytes.replace(/,/gi, '');
				bytes = Number(bytes);
			}

			if (bytes == 0) return '0 Tb';
			if (isNaN(bytes)) return '0 Tb';

			return (bytes/1024/1024/1024).toFixed(2) + ' Tb';

		}

		return {
			numberFormatter: numberFormatter,
			numberStringFormatter: numberStringFormatter,
			diskAllRenderer: diskAllRenderer,
			addButtonRenderer: addButtonRenderer,
			deleteButtonRenderer: deleteButtonRenderer,
			editButtonRenderer: editButtonRenderer,
			tooltipRenderer: tooltipRenderer,
			cellClickRenderer: cellClickRenderer,
			cellClickRendererWithIcon: cellClickRendererWithIcon,
			severityCircleFormatter: severityCircleFormatter,
			severityFormatter: severityFormatter,
			dateFormatter: dateFormatter,
			editableTextarea: editableTextarea,
			alarmStatusFormatter: alarmStatusFormatter,
			deleteButtonRenderer_RM: deleteButtonRenderer_RM,
			unitTransToTB:unitTransToTB,
			principalRenderer: principalRenderer,
			hyphenRenderer: hyphenRenderer,
			jobStatusRenderer: jobStatusRenderer,
			jobActionRenderer: jobActionRenderer,
			durationFormatter: durationFormatter,
			HpercentBarFormatter: HpercentBarFormatter,
			editableSelectBox: editableSelectBox,
			editableNumberinputBox: editableNumberinputBox,
			editableTextinputBox: editableTextinputBox,
			editableTextinputBoxBasic: editableTextinputBoxBasic,
			permissionFormatter: permissionFormatter,
			percentRender: percentRender,
			gridCellSwitchRenderer: gridCellSwitchRenderer,
			fileDirectoryRenderer: fileDirectoryRenderer,
			txtRedRenderer: txtRedRenderer,
			unitRenderer: unitRenderer,
			plainTextRenderer: plainTextRenderer,
			smsSelectTypeRenderer: smsSelectTypeRenderer,
			hdfsStatusRenderer: hdfsStatusRenderer,
			yarnStatusRenderer: yarnStatusRenderer,
			smsSelectTypeLabelRenderer: smsSelectTypeLabelRenderer,
			retentionHistoryClickRenderer: retentionHistoryClickRenderer,
			retentionTooltipRenderer: retentionTooltipRenderer,
			retentionJobNametooltipRenderer: retentionJobNametooltipRenderer,
			reportSettingButtonRenderer: reportSettingButtonRenderer,
			deleteButtonRenderer_RP: deleteButtonRenderer_RP,
			editButtonSvcRenderer: editButtonSvcRenderer,
			deleteButtonSvcRenderer: deleteButtonSvcRenderer
		};
	}
});