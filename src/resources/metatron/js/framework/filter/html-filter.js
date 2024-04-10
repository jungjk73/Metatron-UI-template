define([], function () {
	return function ($sce) {
		return function (text) {
			return $sce.trustAsHtml(text);
		}
	}
});