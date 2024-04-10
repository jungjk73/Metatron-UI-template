/**
 * Project: Metatron Manager UI Development
 * Company: Mobigen
 * Writer: UX Development Team, LJS
 * Last Date: 2016-11-07
 */

//Slide Menu
var fe_slideMenu = function() {
	var $depth1_item = $('.mu-slide-menu > li > a');
	var $depth1_cont = $('.mu-slide-menu > li > ul');
	var $depth2_item = $('.mu-slide-menu > li > ul > li > a');
	var $depth2_cont = $('.mu-slide-menu > li > ul > li > ul');
	var $cluster = $('.cluster');
	var $cluster_item = $('.cluster > a');

	$depth1_item.parent().removeClass('active');
	$depth1_cont.hide();
	$depth1_cont.first().show();
	$cluster.addClass('active');
	$cluster.find('button > i').removeClass('arr-down').addClass('arr-up');

	$depth1_item.each(function() {
		$(this).on('click', function() {
			$depth2_cont.hide();
			$('.slimScrollDiv').css('height','auto');
			$(this).parent().not('.cluster').find('>ul').slideToggle();
			//$(this).parent().siblings().find('ul').slideUp();
			$(this).parent().siblings().not('.cluster').find('>ul').slideUp();

			$(this).parent().toggleClass('active');
			$(this).parent().siblings().removeClass('active');

			if ( $(this).parent().hasClass('active') ) {
				$(this).parent().find('button > i').removeClass('arr-down').addClass('arr-up');
				$(this).parent().siblings().not('.cluster').find('button > i').removeClass('arr-up').addClass('arr-down');
			} else {
				$(this).parent().find('button > i').removeClass('arr-up').addClass('arr-down');
			}
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
	})

	$depth2_item.parent().find('> ul').hide();
	$depth2_item.each(function() {
		$(this).on('mouseenter', function() {
			$(this).parent().find('> ul').show();
			$(this).parent().siblings().find('> ul').hide();
		});
	});
}

//Slim Menu
var fe_slimMenu = function() {
	var $header = $('header');
	var $slimMenu_btn = $('header h1 button');
	var $container = $('.mu-container');

	$slimMenu_btn.on('click', function() {
		if ( $(this).hasClass('slim') ) {
			$header.removeClass('slim-type');
			$(this).removeClass('slim');
			$('.cluster').find('ul').slideDown();
			$('.slim-type .mu-slide-menu li a').fadeIn();
			$('.slim-type .mu-slide-menu li button').fadeIn();
			$header.delay(100).animate({'width':'200px'}, 500);
			$container.delay(100).animate({'margin-left':'200px'}, 500);
		} else {
			$header.addClass('slim-type');
			$(this).addClass('slim');
			$('.mu-slide-menu li').removeClass('active');
			$('.mu-slide-menu > li > ul').hide();
			$header.delay(100).animate({'width':'60px'}, 500);
			$container.delay(100).animate({'margin-left':'60px'}, 500);
		}
	});

	var $menu_item = $('.mu-slide-menu > li');
	$menu_item.each(function() {
		$(this).on('mouseenter', function() {
			if ( $header.hasClass('slim-type') ) {
				//console.log('test');
				$(this).addClass('active');
				$(this).siblings().removeClass('active');

				$(this).find('>ul').addClass('active');
				$(this).siblings().find('>ul').removeClass('active');

				$(this).find('.slimScrollDiv').addClass('active');
			}
		});
	});
	$menu_item.mouseleave(function() {
		//alert('test');
		if ( $header.hasClass('slim-type') ) {
			$(this).removeClass('active');
		}
	});
}

//Tabs
var fe_tabs = function() {
	var $tab_wrap = $('.mu-tab');
	var $tab_item = $('.mu-tab > li > a');

	//$tab_wrap.find('> li:first-child').addClass('active');

	$tab_item.each(function() {
		$(this).on('click', function() {
			$(this).parent().addClass('active');
			$(this).parent().siblings().removeClass('active');
		});
	});
}

//Pagination align
var fe_pagination = function() {
	var $pagination_wrap = $('.pagination-wrap');
	var $pagination = $('.mu-pagination.center');
	var $page_sort = $('.pagination-wrap .page-sort');
	var $page_sort_width = $page_sort.width();
	var $pagination_width = $pagination.width() - $page_sort_width - 12;

	$pagination.css('width',$pagination_width);
}

/* Select Check */
var fe_checkselect = function() {
	var $chk_elmt = $('.inner-check-type .mu-list li');

	$chk_elmt.each(function() {
		$(this).on('click', function() {
			$(this).toggleClass('check');

			if ( $(this).hasClass('check') ) {
				$(this).find('.mu-checkbox').prop('checked',true);
			} else {
				$(this).find('.mu-checkbox').prop('checked',false);
			}
		});
	});
}

/* Checkbox Button */
var fe_checkbtn = function() {
	var $chk_btn = $('.mu-checkbox-btn > button'),
		$chk_box = $('.mu-checkbox-btn > .mu-checkbox'),
		$chk_label = $('.mu-checkbox-btn > .mu-checkbox + label');

	$chk_label.hide();

	$chk_btn.each(function() {
		$(this).on('click', function() {
			$(this).toggleClass('check');

			if ( $(this).hasClass('check') ) {
				$(this).siblings($chk_box).prop('checked',true);
				$(this).siblings($chk_label).show();
			} else {
				$(this).siblings($chk_box).prop('checked',false);
				$(this).siblings($chk_label).hide();
			}
		});
	});
}

$(function() {
	fe_slideMenu();
	fe_slimMenu();
	fe_tabs();
	fe_pagination();
	fe_checkselect();
	fe_checkbtn();

	//Gnb height
	$('header').height( $(document).height() );
})
