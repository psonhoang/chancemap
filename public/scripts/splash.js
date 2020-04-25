$(document).ready(function () {
	$("#bigLogo").hide().fadeIn(3000);
	
	var n = 1;

	$("#exploreBtn").click(function() {
		var target = "#aboutUs";
		if(n % 2 == 0) target = "#callToAction";
	    $('html, body').animate({
	        scrollTop: $(target).offset().top
	    }, 1000);
	    n++;
	});
});