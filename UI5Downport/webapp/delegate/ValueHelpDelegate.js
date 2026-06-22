sap.ui.define([
	"sap/ui/mdc/ValueHelpDelegate"
], function (ValueHelpDelegate) {
	"use strict";

	// Thin passthrough over the stock 1.120 ValueHelpDelegate. In 1.120 the stock
	// delegate already performs client-side JSON filtering: updateBindingInfo builds
	// sap.ui.model.Filter objects from the conditions and updateBinding applies them
	// via ListBinding.filter(). We keep our own module as the seam where behavior
	// downported from the latest version can be layered in later.
	return Object.assign({}, ValueHelpDelegate);
});
