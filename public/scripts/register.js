window.onload = function() {
	var is_org_acc = false;

	$('#checkbox3').click(() => {
		if(!is_org_acc) {
			$('#checkbox2').prop('checked', is_org_acc);
			is_org_acc = true;
		} else {
			is_org_acc = false; 
		}
	});

	$('#checkbox2').click(() => {
		if(is_org_acc) {
			is_org_acc = false;
		}
		$('#checkbox3').prop('checked', is_org_acc);
	});
};
