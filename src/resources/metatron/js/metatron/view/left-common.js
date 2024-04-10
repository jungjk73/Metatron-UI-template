//Slide Menu
/**
 * Metatron Manager UI Development
 */
var menu1 , menu2 , menu3 ,menu1_over;
var slim = false;
var fs_first_show = function() {
	if(slim == true) {
		slimMenu();
		return;
	}

	var $depth1_item = $('.mu-slide-menu > li > ul');   //dashboard
	$depth1_item.each(function() {
		if(this.id == menu1)
		{
			if (!$(this).is(':visible')) {
				$(this).parent().not('.cluster').find('ul').slideToggle();
				$(this).parent().siblings().not('.cluster').find('ul').slideUp();
			}


			// $(this).parent().toggleClass('active');
			$(this).parent().addClass('active');
			$(this).parent().siblings().removeClass('active');

			if ($(this).parent().hasClass('active') ) {
				$(this).parent().find('button > i').removeClass('arr-down').addClass('arr-up');
				$(this).parent().siblings().not('.cluster').find('button > i').removeClass('arr-up').addClass('arr-down');
			} else {
				$(this).parent().find('button > i').removeClass('arr-up').addClass('arr-down');
			}

			if(menu2 != undefined)
			{
				$('.sub-mn > li > a').attr( "select", null );
				$('.sub-mn > li > a').css( "color", '#9da2a6' );
				$('.sub-mn > li > a').css( "background-color", '#2e3651' );
				var depth2 = $(this).find("li > a");
				depth2.each(function() {
					$(this).parent().find('> ul').hide();
					if(this.id == menu2)
					{
						$(this).css("color", "#44ced1");
						$(this).css("background-color", "#37405d");
						$(this).attr('select','true');
					}

				});

			}
		}
	});
};

var fe_slideMenu = function() {
	var $depth1_item = $('.mu-slide-menu > li > a');   //dashboard
	var $depth1_cont = $('.mu-slide-menu > li > ul');  //dashboard-content
	var $depth2_item = $('.mu-slide-menu > li > ul > li > a'); // dashboard-job
	var $depth2_cont = $('.mu-slide-menu > li > ul > li > ul');//dashboard-job-status
	var $cluster = $('.cluster');
	var $cluster_item = $('.cluster > a');
	var $cluster_cont = $('.cluster > ul >li');

	$depth1_item.parent().removeClass('active');
	$depth1_cont.hide();
	//$depth1_cont.first().show();
	//$cluster.addClass('active');
	$cluster.find('button > i').removeClass('arr-down').addClass('arr-up');

	$depth1_item.each(function() {
		$(this).on('click', function(event) {

			$('.slimScrollDiv').css('height','auto');
			$(this).parent().not('.cluster').find('ul').slideToggle();
			$(this).parent().siblings().not('.cluster').find('ul').slideUp();

            if(slim != true) {
                $(this).parent().toggleClass('active');
                $(this).parent().siblings().removeClass('active');
            }

			
			var p = $(this).parent().find("ul")[0];
			//menu1 = p.id;
			if ( $(this).parent().hasClass('active') ) {
				$(this).parent().find('button > i').removeClass('arr-down').addClass('arr-up');
				$(this).parent().siblings().not('.cluster').find('button > i').removeClass('arr-up').addClass('arr-down');
			} else {
				$(this).parent().find('button > i').removeClass('arr-up').addClass('arr-down');
			}
			
			$depth2_cont.hide();
		});
		
		$(this).on('mouseover', function() {
			var p = $(this).parent().find("ul")[0];
			menu1_over = p.id;
		});
		
		$(this).on('mouseleave', function() {
			$depth2_cont.hide();
		});
	});

	$cluster_item.on('click', function() {
		if ( $(this).parent().find('ul').is(':hidden') ) {
			$(this).parent().addClass('active');
			$(this).parent().find('ul').slideDown();
		} else {
			$(this).parent().removeClass('active');
			$(this).parent().find('ul').slideUp();
			$(this).parent().find('button > i').removeClass('arr-up').addClass('arr-down');
		}
	});
	
	$cluster_cont.each(function() {
		$(this).on('click', function() {
			var p = $(this).parent().find('> a');
			p.css("color", "#44ced1");
			$cluster_cont.not( p ).css( "color", "#9da2a6" );
		});
	});


	/**
	 * 2 depth 메뉴 클릭
	 */
	$depth2_item.each(function() {
		$(this).on('mouseenter', function() {
			$(this).parent().find('> ul').show();
			$(this).parent().siblings().find('> ul').hide();
		});
		
		$(this).on('click', function() {
			var m1 = $(this).parent().parent();
			menu1 = m1[0].id;
			menu2 = this.id;
			menu3 ="";


			$(this).css("color", "#44ced1");
			$(this).css("background-color", "#37405d");
			$(this).attr('select','true');

			$depth2_item.not(this).css("background-color", "#2e3651");
			$depth2_item.not( this ).css( "color", "#9da2a6" );
			$depth2_item.not( this ).attr( "select", null );

			if(slim == true) {
                changeSlimCss();
			}
		});
		$(this).on('mouseover', function() {
			if ($.powerTip) $.powerTip.hide();
			$(this).css("color", "#44ced1");
			$(this).css("background-color", "#37405d");
		});
		$(this).on('mouseleave', function() {
			if ( $(this).attr('select')=='true' ) {

			} else {
				$(this).css("background-color", "#2e3651");
				$(this).css("color", "#9da2a6");
			}

		});
	});
	
	$depth2_cont.each(function() {
		$(this).on('mouseleave', function() {
			$depth2_cont.hide();
		});
		$(this).on('click', function() {
			var p = $(this).parent().find('> a');	// 2depth 메뉴
			var pp = $(p).parent().parent();
			menu1 = pp[0].id;
			menu2 = p[0].id;


			$depth2_item.css("background-color", "#2e3651");
			$(this).find('> a').css("color", "#44ced1");
			p.css("color", "#44ced1");
			p.css("background-color", "#37405d");
			p.attr('select','true');

			$depth2_item.not( p ).css("background-color", "#2e3651");
			$depth2_item.not( p ).css( "color", "#9da2a6" );
			$depth2_item.not( p ).attr( "select", null );
            $(this).parent().find('> ul').hide();

			if(slim == true) {
                changeSlimCss();
			}

		});
	});
	
};

//Slim Menu
var fe_slimMenu = function() {
	var $header = $('header');
	var $slimMenu_btn = $('header h1 button');
	$slimMenu_btn.off('click');
	var $container = $('.mu-container');
	$slimMenu_btn.on('click', function() {
		if ( $(this).hasClass('slim') ) {
			slim = false;
			$header.removeClass('slim-type');
			$(this).removeClass('slim');
			$('.cluster').find('ul').slideDown();
			$('.slim-type .mu-slide-menu li a').fadeIn();
			$('.slim-type .mu-slide-menu li button').fadeIn();
			// $header.delay(10).animate({'width':'200px'}, 500);
			// $container.delay(10).animate({'margin-left':'200px'}, 500);

			// animation 추가하면 차트 나오는 화면에서는 무조건 버벅거림
			$header.css('width' , '200px');
			$container.css('margin-left' , '200px');
			fs_first_show();
		} else {
			slimMenu();
		}

		$header.trigger('headerResizeEvent');

	});
	
	var $menu_item = $('.mu-slide-menu > li');
	$menu_item.each(function() {
		$(this).on('mouseenter', function() {
			if ( $header.hasClass('slim-type') ) {
				$(this).addClass('active');
				$(this).siblings().removeClass('active');

				$(this).find('>ul').addClass('active');
				$(this).siblings().find('>ul').removeClass('active');

				$(this).find('.slimScrollDiv').addClass('active');
				$(this).find('>a >i').css('color','red');
			}
		});
	});
	$menu_item.mouseleave(function() {
		if ( $header.hasClass('slim-type') ) {
			$(this).removeClass('active');
			$(this).find('>ul').removeClass('active');
		}
	});
};


var slimMenu = function () {
	slim = true;
	var $header = $('header');
	var $container = $('.mu-container');
	var $slimMenu_btn = $('header h1 button');

	$header.addClass('slim-type');
	$slimMenu_btn.addClass('slim');
	$('.mu-slide-menu li').removeClass('active');
	$('.mu-slide-menu > li > ul').hide();
	$header.css({'width':'60px'}, 0);
	$container.css({'margin-left':'60px'}, 0);

    changeSlimCss();
};

var changeSlimCss = function () {
    var slimDepth1 = $('.mu-slide-menu > li ');
    slimDepth1.each(function () {
        var m = $(this).find('ul');
        m = m[0];
        if(m.id == menu1) {
            $(this).css("backgroundColor" , "#44ced1");
        }else {
            $(this).css("backgroundColor" , "");
        }
    });
}

var fe_slideMenu_offEvent = function() {
	var $depth1_item = $('.mu-slide-menu > li > a');   //dashboard
	var $depth1_cont = $('.mu-slide-menu > li > ul');  //dashboard-content
	var $depth2_item = $('.mu-slide-menu > li > ul > li > a'); // dashboard-job
	var $depth2_cont = $('.mu-slide-menu > li > ul > li > ul');//dashboard-job-status
	var $cluster = $('.cluster');
	var $cluster_item = $('.cluster > a');
	var $cluster_cont = $('.cluster > ul >li');


	$depth1_item.each(function() {
		$(this).off('click');

		$(this).off('mouseover');

		$(this).off('mouseleave');
	});

	$cluster_item.off('click');

	$cluster_cont.each(function() {
		$(this).off('click');
	});

	$depth2_item.each(function() {
		$(this).off('mouseenter');

		$(this).off('click');

		$(this).off('mouseover');
		$(this).off('mouseleave');
	});

	$depth2_cont.each(function() {
		$(this).off('mouseleave');
		$(this).off('click');
	});

};

var executeViewScript = function() {
	fe_slideMenu();
	$('#refreshButton').removeClass('arr-up').addClass('refresh');
	fe_slimMenu();
	fs_first_show();
};