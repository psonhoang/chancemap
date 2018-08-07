$('#menuToggle').click(function() {
	var canSee = $('#menuToggle').hasClass('is-active');
	if(canSee) {
	  $('#avatarHeader').hide();
	} else {
	  $('#avatarHeader').show();
	}
});