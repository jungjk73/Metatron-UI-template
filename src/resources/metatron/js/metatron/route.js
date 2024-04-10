define([], function () {
	return {
		defaultRoutePath: "overviewDashboard",
		routes: {
			"/dashboard/overview": {
				name: "overviewDashboard",
				templateUrl: "/dashboard/overview/dashboard.html",
				dependencies: [
					"metatron/dashboard/overview/overview-dashboard-controller",
					"metatron/common/controller/popup/rawdata-grid-popup-controller",
					"lib/jquery/jquery.powertip.min",
				]
			},
			"/dashboard/job": {
				name: "jobDashboard",
				templateUrl: "/dashboard/job/dashboard.html",
				dependencies: [
					"metatron/enterprise/resourceManagement/resource-management-controller",
					"metatron/dashboard/job/job-dashboard-controller",
					"metatron/activities/job/job-detail-popup-controller",
				]
			},
			"/dashboard/metric": {
				name: "metricDashboard",
				templateUrl: "/dashboard/metric/dashboard.html",
				dependencies: [
					"metatron/dashboard/metric/metric-dashboard-controller",
					"metatron/common/controller/popup/rawdata-grid-popup-controller",
					"metatron/common/directive/date-time-selector-directive",	
					"lib/jquery/jquery.powertip.min",
					"lib/jquery/jquery-mousestop"
				]
			},
			"/dashboard/metricNew": {
				name: "metricDashboardNew",
				templateUrl: "/dashboard/metric/dashboard-new.html",
				dependencies: [
					"metatron/dashboard/metric/metric-dashboard-factory",
					"metatron/dashboard/metric/metric-dashboard-new-controller"
				]
			},
			"/dashboard/heatMap": {
				name: "heatMapDashboard",
				templateUrl: "/dashboard/heatMap/dashboard.html",
				dependencies: [
					"metatron/common/directive/select-box-directive",
					"metatron/dashboard/heatmap/heatmap-dashboard-controller"
				]
			},
			"/dashboard/router": {
				name: "routerDashboard",
				templateUrl: "/dashboard/router/dashboard.html",
				dependencies: [
					"metatron/common/directive/select-box-directive",
					"metatron/dashboard/router/router-dashboard-controller"
				]
			},
			"/services/hdfs/status": {
				name: "hdfsStatus",
				templateUrl: "/services/hdfs/status.html",
				dependencies: [
					"lib/jquery/jquery.powertip.min",
					"metatron/common/directive/component-event-directive",
					"metatron/common/controller/popup/rawdata-grid-popup-controller",
					"metatron/service/hdfs/hdfs-status-controller"
				]
			},	
			"/services/hdfs/overview": {
				name: "hdfsOverview",
				templateUrl: "/services/hdfs/overview.html",
				dependencies: [
					"metatron/service/hdfs/hdfs-overview-controller"
				]
			},
			"/services/hdfs/rpcMonitoring": {
				name: "rpcMonitoring",
				templateUrl: "/services/hdfs/rpc-monitoring.html",
				dependencies: [
					"metatron/common/directive/component-event-directive",
					"metatron/common/directive/date-time-selector-directive",	
					"metatron/service/hdfs/rpc-monitoring-controller"
				]
			},
			"/services/presto/status": {
				name: "prestoStatus",
				templateUrl: "/services/presto/status.html",
				dependencies: [
					"metatron/common/directive/component-event-directive",
					"metatron/common/directive/select-box-directive",
					"metatron/activities/job/job-detail-popup-controller",
					"metatron/service/presto/presto-status-controller"
				]
			},
			// "/services/kafka/status": {
			// 	name: "kafkaStatus",
			// 	templateUrl: "/services/kafka/status.html",
			// 	dependencies: [
			// 		"metatron/common/directive/component-event-directive",
			// 		"metatron/service/kafka/kafka-status-controller"
			// 	]
			// },
			"/services/kafka/status": {
				name: "kafkaStatus",
				templateUrl: "/services/kafka_new/status.html",
				dependencies: [	
					"metatron/common/directive/select-box-directive",
					"metatron/common/directive/date-time-selector-directive",	
					"metatron/service/kafka_new/kafka-status-controller"
				]
			},
			"/services/redis/status": {
				name: "redisStatus",
				templateUrl: "/services/redis/status.html",
				dependencies: [	
					"metatron/common/directive/select-box-directive",
					"metatron/common/directive/date-time-selector-directive",	
					"metatron/service/redis/redis-status-controller",							
					"lib/jquery/jquery.powertip.min",
				]
			},
			"/services/analysis/history": {
				name: "analysisHistory",
				templateUrl: "/services/analysis/history.html",
				dependencies: [
					"metatron/service/analysis/analysis-history-controller",
					"metatron/common/directive/select-box-directive",
					"metatron/common/directive/ng-infinite-scroll",
					"metatron/common/directive/date-time-selector-directive"
				]
			},
			"/services/analysis/qos": {
				name: "analysisQos",
				templateUrl: "/services/analysis/qos.html",
				dependencies: [
					"metatron/service/analysis/analysis-qos-controller",
					"metatron/common/directive/date-time-selector-directive",
					"metatron/common/directive/select-box-directive"
				]
			},
			"/services/yarn/status": {
				name: "yarnStatus",
				templateUrl: "/services/yarn/status.html",
				dependencies: [
					"lib/jquery/jquery.powertip.min",
					"metatron/common/directive/select-box-directive",
					"metatron/common/directive/component-event-directive",
					"metatron/common/controller/popup/rawdata-grid-popup-controller",
					"metatron/service/yarn/yarn-status-controller"
				]
			},
			"/services/yarn/queue": {
				name: "yarnQue",
				templateUrl: "/services/yarn/queue.html",
				dependencies: [					
					"metatron/common/directive/select-box-directive",
					"metatron/common/directive/date-time-selector-directive",
					"metatron/common/directive/component-event-directive",					
					"metatron/service/yarn/yarn-queue-controller"
				]
			},
			"/services/druid/status": {
				name: "druidStatus",
				templateUrl: "/services/druid/status.html",
				dependencies: [
					"metatron/service/druid/druid-status-controller"
				]
			},
			"/services/hdfs/fileBrowser": {
				name: "fileBrowser",
				templateUrl: "/services/hdfs/file_browser.html",
				dependencies: [
					"metatron/service/hdfs/filebrowser/popup/file-browser-popup-controller",
					"metatron/service/hdfs/filebrowser/file-browser-utils",
					"metatron/service/hdfs/filebrowser/file-browser-controller"
				]
			},
			"/services/flink/status": {
				name: "flinkStatus",
				templateUrl: "/services/flink/status.html",
				dependencies: [	
					"metatron/common/directive/select-box-directive",
					"metatron/common/directive/date-time-selector-directive",								
					"metatron/service/flink/flink-status-controller"
				]
			},
			"/activities/job/history": {
				name: "jobHistory",
				templateUrl: "/activities/job/history.html",
				dependencies: [
					"metatron/activities/job/job-history-controller",
					"metatron/activities/job/job-detail-popup-controller",
					"metatron/common/directive/select-box-directive",
					"metatron/common/directive/date-time-selector-directive",
					"metatron/common/directive/checkbox-directive",
					"metatron/common/directive/search-condition-directive",
					"metatron/common/directive/agGridPaging-directive",
					"metatron/common/directive/component-event-directive",
				]
			},
			"/activities/system/status": {
				name: "systemStatus",
				templateUrl: "/activities/system/status.html",
				dependencies: [
					"metatron/common/directive/component-event-directive",
					"metatron/common/directive/agGridPaging-directive",
					"metatron/common/directive/select-box-directive",
					"metatron/activities/system/system-status-controller",
				]
			},
			"/activities/system/history": {
				name: "systemHistory",
				templateUrl: "/activities/system/history.html",
				dependencies: [
					"metatron/common/directive/search-condition-directive",
					"metatron/common/directive/select-box-directive",
					"metatron/common/directive/date-time-selector-directive",
					"metatron/activities/system/history-controller"
				]
			},
			"/activities/system/memory-history": {
				name: "systemMemoryHistory",
				templateUrl: "/activities/system/memory-history.html",
				dependencies: [					
					"metatron/common/directive/select-box-directive",
					"metatron/common/directive/date-time-selector-directive",
					"metatron/activities/system/memory-history-controller"
				]
			},
			"/activities/switch/switchMonitoring": {
				name: "switchMonitoring",
				templateUrl: "/activities/switch/switchMonitoring.html",
				dependencies: [
					"metatron/common/directive/select-box-directive",
					"metatron/common/directive/date-time-selector-directive",
					"metatron/activities/switch/switch-monitoring-controller"
				]
			},
			"/activities/switch/switchHistory": {
				name: "switchHistory",
				templateUrl: "/activities/switch/switchHistory.html",
				dependencies: [
					"metatron/common/directive/select-box-directive",
					"metatron/common/directive/date-time-selector-directive",
					"metatron/activities/switch/switch-history-controller"
				]
			},
			"/activities/alarm/status": {
				name: "alarmStatus",
				templateUrl: "/activities/alarm/status.html",
				dependencies: [
					"metatron/common/directive/select-box-directive",
					"metatron/activities/alarm/alarm-status-controller"

				]
			},
			"/activities/alarm/configuration": {
				name: "alarmConfiguration",
				templateUrl: "/activities/alarm/configuration.html",
				dependencies: [
					"metatron/common/directive/component-event-directive",
					"metatron/common/directive/select-box-directive",
					"metatron/common/directive/spinner-directive",
					"metatron/activities/alarm/popup/user-contact-popup-controller",
					"metatron/activities/alarm/popup/alarm-configuration-popup-controller",
					"metatron/activities/alarm/alarm-configuration-controller",
					"metatron/data/hdfs/popup/flume-popup-controller"
				]
			},
			"/activities/alarm/smsConfiguration": {
				name: "smsConfiguration",
				templateUrl: "/activities/alarm/smsConfiguration.html",
				dependencies: [
					"metatron/common/directive/select-box-directive",
					"metatron/common/directive/component-event-directive",
					"metatron/activities/alarm/sms-configuration-controller"
				]
			},
			"/activities/alarm/history": {
				name: "alarmHistory",
				templateUrl: "/activities/alarm/history.html",
				dependencies: [
					"metatron/activities/alarm/alarm-history-controller",
					"metatron/common/directive/agGridPaging-directive",
					"metatron/common/directive/select-box-directive",
					"metatron/common/directive/date-time-selector-directive"
				]
			},
			"/administrator/user-management": {
				name: "userManagement",
				templateUrl: "/administrator/user-management.html",
				dependencies: [
					"metatron/administrator/user-management-controller",
					"metatron/common/directive/date-time-selector-directive"
				]
			},
			"/administrator/configuration": {
				name: "configuration",
				templateUrl: "/administrator/configuration.html",
				dependencies: [
					"metatron/administrator/configuration-controller",
					"metatron/common/directive/date-time-selector-directive",
					"metatron/common/directive/select-box-directive"
				]
			},
			"/administrator/service-management": {
				name: "serviceManagement",
				templateUrl: "/administrator/service-management.html",
				dependencies: [
					"metatron/common/directive/image-checkbox-directive",
					"metatron/common/directive/select-box-directive",
					"metatron/administrator/service-management-controller",
				]
			},
			"/administrator/provisioning": {
				name: "provisioning",
				templateUrl: "/administrator/provisioning.html",
				dependencies: [
					"metatron/common/directive/image-checkbox-directive",
					"metatron/common/directive/check-selectbox-directive",
					"metatron/administrator/provisioning-controller",
				]
			},
			"/administrator/host-management": {
				name: "hostManagement",
				templateUrl: "/administrator/host-management.html",
				dependencies: [
					"metatron/common/service/csv-service",
					"metatron/common/directive/ng-csv",
					"metatron/common/directive/component-event-directive",
					"metatron/administrator/host-management-controller",
					"metatron/common/directive/select-box-directive"
				]
			},
			"/administrator/application-management": {
				name: "applicationManagement",
				templateUrl: "/administrator/application-management.html",
				dependencies: [
					"metatron/common/directive/image-checkbox-directive",
					"metatron/common/directive/check-selectbox-directive",
					"metatron/common/directive/select-box-directive",
					"metatron/administrator/process-management-controller",
					"metatron/administrator/application-management-controller"
				]
			},
			"/administrator/cache/management": {
				name: "cacheManagement",
				templateUrl: "/administrator/cache/management.html",
				dependencies: [
					"metatron/service/hdfs/filebrowser/file-browser-utils",
					"metatron/service/hdfs/filebrowser/popup/file-browser-popup-controller",
					"metatron/administrator/cache/cache-management-controller"
				]
			},
			"/enterpriseModule/resourceManagement": {
				name: "resourceManagement",
				templateUrl: "/enterprise/resourceManagement/resource_management.html",
				dependencies: [
					"metatron/common/directive/select-box-directive",
					"metatron/enterprise/resourceManagement/resource-management-controller"
				]
			},
			"/enterpriseModule/nameNode": {
				name: "nameNode",
				templateUrl: "/enterprise/nameNode/name_node.html",
				dependencies: [
					"metatron/enterprise/nameNode/name-node-controller"
				]
			},
			"/enterpriseModule/securityManagement": {
				name: "securityManagement",
				templateUrl: "/enterprise/securityManagement/security_management.html",
				dependencies: [
					"metatron/enterprise/securityManagement/security-management-controller",
					"metatron/common/directive/select-box-directive"
				]
			},
			"/enterpriseModule/jobManagement": {
				name: "jobManagement",
				templateUrl: "/enterprise/job/management.html",
				dependencies: [
					"metatron/enterprise/job/job-management-controller",
					"metatron/common/directive/select-box-directive",
					"lib/moment/moment-duration-format"
				]
			},
			"/data/job/count": {
				name: "jobCount",
				templateUrl: "/data/job/count.html",
				dependencies: [
					"metatron/data/job/job-count-controller",
					"metatron/common/directive/select-box-directive",
					"metatron/common/directive/date-time-selector-directive"
				]
			},
			"/data/hdfs/dailySummary": {
				name: "dailySummary",
				templateUrl: "/data/hdfs/dailySummary.html",
				dependencies: [					
					"metatron/data/hdfs/daily-summary-controller",
					"metatron/common/directive/select-box-directive",
					"metatron/common/directive/date-time-selector-directive",
					"metatron/data/hdfs/popup/service-config-popup-controller"
				]
			},
			"/data/hdfs/serviceSummary": {
				name: "serviceSummary",
				templateUrl: "/data/hdfs/serviceSummary.html",
				dependencies: [
					"metatron/data/hdfs/service-summary-controller",
					"metatron/common/directive/select-box-directive",
					"metatron/common/directive/date-time-selector-directive",
					"metatron/data/hdfs/popup/service-config-popup-controller"
				]
			},
			"/data/hdfs/flume": {
				name: "flume/:procType",
				templateUrl: "/data/hdfs/flume.html",
				dependencies: [
					"metatron/data/hdfs/flume-controller",
					"metatron/data/hdfs/popup/flume-popup-controller",
					"metatron/common/directive/select-box-directive",
					"metatron/common/directive/date-time-selector-directive",
					"lib/jquery/jquery.powertip.min",
					"lib/jquery/jquery-mousestop"
				]
			},

			"/activities/retention/configuration": {
				name: "retentionjobConfiguration",
				templateUrl: "/activities/retention/configuration/retentionjob-configuration.html",
				dependencies: [
					"metatron/common/directive/date-time-selector-directive",                   
					"metatron/common/directive/image-checkbox-directive",
					"metatron/common/directive/check-selectbox-new-directive",
					"metatron/common/directive/select-box-directive",
					"metatron/common/directive/agGridPaging-new-directive",
					"metatron/common/directive/only-number-directive",
					"metatron/common/service/csv-service",
					"metatron/common/directive/ng-csv",
					"metatron/common/directive/component-event-directive",
				
					"metatron/activities/retention/configuration/retentionjob-configuration.ctrl",
					"metatron/activities/retention/configuration/retentionjob-configuration.service",
					"metatron/activities/retention/configuration/retentionjob-configuration-query-generator.service",
				]
			},
			"/activities/retention/history": {
				name: "retentionjobHistory",
				templateUrl: "/activities/retention/history/retentionjob-history.html",
				dependencies: [
					"metatron/common/directive/date-time-selector-directive",                   
					"metatron/common/directive/image-checkbox-directive",
					"metatron/common/directive/check-selectbox-new-directive",
					"metatron/common/directive/select-box-directive",
					"metatron/common/directive/agGridPaging-new-directive",					
					"metatron/activities/retention/history/retentionjob-history.ctrl",
					"metatron/activities/retention/history/retentionjob-history.service"
				]
			},
			"/administrator/report": {
				name: "report",
				templateUrl: "/administrator/report.html",				
				dependencies: [
					"metatron/administrator/report/report-controller",
					"metatron/administrator/report/popup/report-connection-popup-controller",
					"metatron/common/directive/calendar-directive",
					"metatron/common/directive/only-number-directive",
					"metatron/common/directive/date-time-selector-directive",
					"metatron/common/directive/form-enter-directive",
					"metatron/common/directive/select-box-directive",        
				]
			},
			"/administrator/code-management": {
				name: "common-code",
				templateUrl: "/administrator/code-management.html",				
				dependencies: [
					"metatron/administrator/code-management-controller",
					"metatron/common/directive/only-number-directive",
					"metatron/common/directive/form-enter-directive"        
				]
			},
			"/administrator/menu-management": {
				name: "menu",
				templateUrl: "/administrator/menu-management.html",				
				dependencies: [
					"metatron/administrator/menu-management-controller",
					"metatron/common/directive/only-number-directive",
					"metatron/common/directive/form-enter-directive"        
				]
			}

		}
	};
});