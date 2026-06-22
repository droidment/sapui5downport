sap.ui.define([], function () {
	"use strict";

	return {
		"downport.action.ActiveWork": {
			requiresSelection: true,
			navigateOnSuccess: "activework"
		},
		"downport.action.PassiveWork": {
			requiresSelection: true
		},
		"downport.action.DuplicateProduct": {},
		"downport.action.ReorderStock": {},
		"downport.action.CreateOrder": {
			refreshSource: true
		}
	};
});
